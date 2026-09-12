/**
 * وسيط المسارات القديمة: يحوّل الطلبات إلى الباب الرسمي.
 *   REST     -> /functions/v1/api
 *   JSON-RPC -> /functions/v1/mcp
 */
import { corsHeaders } from './cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const REST_TARGET = `${SUPABASE_URL}/functions/v1/api`;
const MCP_TARGET = `${SUPABASE_URL}/functions/v1/mcp`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

export function serveLegacyShim(shimName: string): void {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const url = new URL(req.url);

    if (req.method === 'GET') {
      if (url.pathname.endsWith('/health')) {
        return json({ ok: true, shim: shimName, rest_api: REST_TARGET, mcp_server: MCP_TARGET });
      }
      return json({
        name: `${shimName} (deprecated shim)`,
        message_ar: 'هذا المسار مهجور. استخدم /functions/v1/api للتطبيقات و/functions/v1/mcp للوكلاء.',
        rest_api: REST_TARGET,
        mcp_server: MCP_TARGET,
      });
    }

    if (req.method !== 'POST') {
      return json({ success: false, error: 'Method not allowed', message_ar: 'الطريقة غير مسموحة' }, 405);
    }

    const raw = await req.text();
    let parsed: Record<string, unknown> = {};
    try {
      const candidate = JSON.parse(raw);
      if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) parsed = candidate;
    } catch {
      return json({ success: false, error: 'Invalid JSON body', message_ar: 'محتوى الطلب غير صالح' }, 400);
    }

    const isJsonRpc = typeof parsed.jsonrpc === 'string';
    const headers = new Headers({ 'Content-Type': 'application/json' });
    const apiKey = req.headers.get('x-api-key');
    const auth = req.headers.get('Authorization');
    if (apiKey) headers.set('x-api-key', apiKey);
    if (auth) headers.set('Authorization', auth);
    headers.set('apikey', ANON_KEY);
    headers.set('accept', isJsonRpc ? 'application/json, text/event-stream' : 'application/json');

    const res = await fetch(isJsonRpc ? MCP_TARGET : REST_TARGET, {
      method: 'POST',
      headers,
      body: raw,
    });

    const outHeaders = new Headers({
      'Content-Type': res.headers.get('content-type') ?? 'application/json',
    });
    for (const [key, value] of Object.entries(corsHeaders)) outHeaders.set(key, value);
    outHeaders.set('x-uberfix-deprecated', 'use /functions/v1/api or /functions/v1/mcp');
    return new Response(res.body, { status: res.status, headers: outHeaders });
  });
}
