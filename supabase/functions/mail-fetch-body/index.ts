import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { ImapFlow } from 'npm:imapflow@1.0.164';
import { simpleParser } from 'npm:mailparser@3.7.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claimsData } = await sb.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = claimsData?.claims?.sub;
    if (!userId) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userId);
    const rs = (roles ?? []).map((r: any) => r.role);
    if (!rs.includes('admin') && !rs.includes('manager')) return json({ error: 'Forbidden' }, 403);

    const { messageId, uid, folder = 'INBOX' } = await req.json();
    if (!messageId && !uid) return json({ error: 'messageId or uid required' }, 400);

    // Find row
    const { data: row } = await admin
      .from('mail_messages')
      .select('id, uid, folder, body_text, body_html')
      .eq('id', messageId)
      .maybeSingle();
    if (!row) return json({ error: 'Message not found' }, 404);
    if (row.body_text || row.body_html) {
      return json({ body_text: row.body_text, body_html: row.body_html, cached: true });
    }

    const client = new ImapFlow({
      host: Deno.env.get('MIGADU_IMAP_HOST') ?? 'imap.migadu.com',
      port: 993,
      secure: true,
      auth: { user: Deno.env.get('MIGADU_USER')!, pass: Deno.env.get('MIGADU_PASS')! },
      logger: false,
    });

    let text = '', html = '', hasAtt = false;
    try {
      await client.connect();
      const lock = await client.getMailboxLock(row.folder || folder);
      try {
        const msg = await client.fetchOne(String(row.uid), { source: true }, { uid: true });
        if (msg?.source) {
          const parsed: any = await simpleParser(msg.source as Uint8Array);
          text = parsed.text ?? '';
          html = parsed.html || parsed.textAsHtml || '';
          hasAtt = Array.isArray(parsed.attachments) && parsed.attachments.length > 0;
        }
      } finally { lock.release(); }
      await client.logout();
    } catch (e) {
      try { await client.close(); } catch (_) {}
      throw e;
    }

    const preview = (text || html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 200);
    await admin.from('mail_messages').update({
      body_text: text || null,
      body_html: html || null,
      has_attachments: hasAtt,
      preview,
    }).eq('id', row.id);

    return json({ body_text: text, body_html: html, cached: false });
  } catch (e) {
    console.error('[mail-fetch-body]', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}