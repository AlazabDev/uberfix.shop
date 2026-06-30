import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';

interface SendPayload {
  to: string | string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  inReplyTo?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: cErr } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (cErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    // Role check (admin/manager)
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roleRows } = await admin.from('user_roles').select('role').eq('user_id', userId);
    const roles = (roleRows ?? []).map((r: any) => r.role);
    if (!roles.includes('admin') && !roles.includes('manager')) {
      return json({ error: 'Forbidden' }, 403);
    }

    const body = (await req.json()) as SendPayload;
    if (!body?.to || !body?.subject || (!body.html && !body.text)) {
      return json({ error: 'Missing required fields: to, subject, html|text' }, 400);
    }

    const user = Deno.env.get('MIGADU_USER')!;
    const pass = Deno.env.get('MIGADU_PASS')!;
    const host = Deno.env.get('MIGADU_SMTP_HOST') ?? 'smtp.migadu.com';

    const client = new SMTPClient({
      connection: {
        hostname: host,
        port: 465,
        tls: true,
        auth: { username: user, password: pass },
      },
    });

    const toList = Array.isArray(body.to) ? body.to : [body.to];

    await client.send({
      from: user,
      to: toList,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject,
      content: body.text ?? '',
      html: body.html,
      replyTo: body.replyTo,
      inReplyTo: body.inReplyTo,
    });
    await client.close();

    // Persist in Sent folder cache
    await admin.from('mail_messages').insert({
      account: user,
      folder: 'SENT',
      from_addr: user,
      from_name: 'UberFix',
      to_addrs: toList,
      cc_addrs: body.cc ?? [],
      subject: body.subject,
      preview: (body.text ?? body.html ?? '').slice(0, 200),
      body_text: body.text,
      body_html: body.html,
      is_read: true,
      is_sent: true,
      internal_date: new Date().toISOString(),
    });

    return json({ success: true });
  } catch (e) {
    console.error('[mail-send]', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}