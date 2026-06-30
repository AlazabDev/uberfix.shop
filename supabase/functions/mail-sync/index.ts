import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

console.log('[mail-sync] module init: loading imapflow...');
let ImapFlow: any;
let simpleParser: any;
try {
  ({ ImapFlow } = await import('npm:imapflow@1.0.164'));
  console.log('[mail-sync] imapflow loaded');
  ({ simpleParser } = await import('npm:mailparser@3.7.1'));
  console.log('[mail-sync] mailparser loaded');
} catch (e) {
  console.error('[mail-sync] import failed:', (e as Error).message);
}

/**
 * mail-sync: pulls new messages from Migadu IMAP into mail_messages cache.
 * - Triggered by authenticated admin/manager OR by pg_cron (service role).
 * - Incremental: tracks last_uid per folder in mail_sync_state.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const cronSecret = Deno.env.get('MAIL_CRON_SECRET') ?? '';
    const providedCron = req.headers.get('x-cron-secret') ?? '';
    const isCron = cronSecret.length > 0 && providedCron === cronSecret;

    if (!isCron) {
      const authHeader = req.headers.get('Authorization') ?? '';
      if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
      const sb = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: claimsData } = await sb.auth.getClaims(authHeader.replace('Bearer ', ''));
      const claims = claimsData?.claims;
      if (!claims?.sub) return json({ error: 'Unauthorized' }, 401);
      const admin0 = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
      const { data: roles } = await admin0.from('user_roles').select('role').eq('user_id', claims.sub);
      const rs = (roles ?? []).map((r: any) => r.role);
      if (!rs.includes('admin') && !rs.includes('manager')) return json({ error: 'Forbidden' }, 403);
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
    const account = Deno.env.get('MIGADU_USER')!;
    const folder = 'INBOX';

    const { data: state } = await admin
      .from('mail_sync_state')
      .select('last_uid')
      .eq('account', account)
      .eq('folder', folder)
      .maybeSingle();
    const lastUid = state?.last_uid ?? 0;

    const client = new ImapFlow({
      host: Deno.env.get('MIGADU_IMAP_HOST') ?? 'imap.migadu.com',
      port: 993,
      secure: true,
      auth: { user: account, pass: Deno.env.get('MIGADU_PASS')! },
      logger: false,
    });

    let imported = 0;
    let maxUid = lastUid;
    let errorMsg: string | null = null;

    console.log('[mail-sync] connecting to IMAP', lastUid);
    try {
      await client.connect();
      console.log('[mail-sync] connected');
      const lock = await client.getMailboxLock(folder);
      console.log('[mail-sync] mailbox locked, fetching envelopes');
      try {
        const status = await client.status(folder, { uidNext: true, messages: true });
        const uidNext = (status as any).uidNext ?? lastUid + 1;
        const startUid = Math.max(lastUid + 1, uidNext - 50); // last 50 envelopes only on first run
        const range = `${startUid}:*`;
        const CAP = 50;
        for await (const msg of client.fetch(range, {
          uid: true,
          envelope: true,
          internalDate: true,
          flags: true,
          size: true,
        }, { uid: true })) {
          if (!msg.uid || msg.uid <= lastUid) continue;
          const env = msg.envelope ?? {};
          const from = env.from?.[0];
          const flags = msg.flags ? Array.from(msg.flags as Set<string>) : [];
          await admin.from('mail_messages').upsert({
            account,
            folder,
            uid: msg.uid,
            message_id: env.messageId ?? null,
            from_addr: from?.address ?? null,
            from_name: from?.name ?? null,
            to_addrs: (env.to ?? []).map((a: any) => ({ address: a.address, name: a.name })),
            cc_addrs: (env.cc ?? []).map((a: any) => ({ address: a.address, name: a.name })),
            subject: env.subject ?? '(بدون موضوع)',
            preview: null,
            is_read: flags.includes('\\Seen'),
            is_starred: flags.includes('\\Flagged'),
            is_sent: false,
            internal_date: msg.internalDate ? new Date(msg.internalDate as Date).toISOString() : new Date().toISOString(),
            raw_size: msg.size ?? null,
          }, { onConflict: 'account,folder,uid' });
          if (msg.uid > maxUid) maxUid = msg.uid;
          imported++;
          if (imported % 10 === 0) {
            await admin.from('mail_sync_state').upsert({
              account, folder, last_uid: maxUid, last_synced_at: new Date().toISOString(), last_error: null,
            }, { onConflict: 'account,folder' });
          }
          if (imported >= CAP) break;
        }
      } finally {
        lock.release();
      }
      await client.logout();
    } catch (e) {
      errorMsg = (e as Error).message;
      console.error('[mail-sync] IMAP error', errorMsg);
      try { await client.close(); } catch (_) { /* noop */ }
    }

    await admin.from('mail_sync_state').upsert({
      account,
      folder,
      last_uid: maxUid,
      last_synced_at: new Date().toISOString(),
      last_error: errorMsg,
    }, { onConflict: 'account,folder' });

    return json({ success: !errorMsg, imported, last_uid: maxUid, error: errorMsg });
  } catch (e) {
    console.error('[mail-sync] fatal', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}