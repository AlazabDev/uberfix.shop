/**
 * UF.Bot voice relay — browser <-> Azure Voice Live (Foundry agent az-agent-maint).
 * The Entra token never reaches the browser; this function holds it and relays frames.
 * No agent-version is sent, so Voice Live always uses the latest published agent version.
 */
const PROJECT_ENDPOINT = (Deno.env.get('AZ_FOUNDRY_PROJECT_ENDPOINT') ?? '').replace(/\/+$/, '');
const AGENT_NAME = Deno.env.get('AZ_FOUNDRY_AGENT_NAME') ?? 'az-agent-maint';
const TENANT = Deno.env.get('AZ_TENANT_ID') ?? '';
const CLIENT_ID = Deno.env.get('AZ_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('AZ_CLIENT_SECRET') ?? '';
const API_VERSION = Deno.env.get('AZ_VOICE_LIVE_API_VERSION') ?? '2026-07-15';
const MAX_FRAME = 256 * 1024;

const match = PROJECT_ENDPOINT.match(/^https:\/\/([^.]+)\.services\.ai\.azure\.com\/api\/projects\/([^/?]+)/i);
const RESOURCE = match?.[1] ?? '';
const PROJECT = match?.[2] ?? '';

let cached: { value: string; exp: number } | null = null;
async function getToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 120_000) return cached.value;
  const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, scope: 'https://ai.azure.com/.default' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Entra token ${res.status}: ${data.error_description ?? data.error}`);
  cached = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return cached.value;
}

const ALLOWED_CLIENT_TYPES = new Set([
  'session.update', 'input_audio_buffer.append', 'input_audio_buffer.clear', 'input_audio_buffer.commit',
  'conversation.item.create', 'response.create', 'response.cancel',
]);

Deno.serve(async (req) => {
  if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
    const configured = !!(RESOURCE && PROJECT && TENANT && CLIENT_ID && CLIENT_SECRET);
    let auth = 'not-configured';
    if (configured) {
      try {
        await getToken();
        auth = 'ok';
      } catch (e) {
        const m = String(e?.message ?? e);
        auth = /invalid_client|client secret|AAD7000215/i.test(m) ? 'secret-rejected' : 'token-error';
      }
    }
    return new Response(JSON.stringify({ ok: auth === 'ok', agent: AGENT_NAME, version: 'latest', configured, auth }), {
      status: auth === 'ok' ? 200 : 503,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
  }
  if (!RESOURCE || !PROJECT) return new Response('voice not configured', { status: 503 });

  const { socket: client, response } = Deno.upgradeWebSocket(req);
  const pending: string[] = [];
  let upstream: WebSocket | null = null;

  const fail = (message: string) => {
    try { client.send(JSON.stringify({ type: 'error', error: { message } })); } catch { /* closed */ }
    try { client.close(1011, 'upstream'); } catch { /* closed */ }
  };

  client.onmessage = (ev) => {
    if (typeof ev.data !== 'string' || ev.data.length > MAX_FRAME) return;
    let type = '';
    try { type = JSON.parse(ev.data).type; } catch { return; }
    if (!ALLOWED_CLIENT_TYPES.has(type)) return;
    if (upstream?.readyState === WebSocket.OPEN) upstream.send(ev.data);
    else if (pending.length < 200) pending.push(ev.data);
  };
  client.onclose = () => { try { upstream?.close(); } catch { /* noop */ } };

  client.onopen = async () => {
    try {
      const token = await getToken();
      const url = new URL(`wss://${RESOURCE}.services.ai.azure.com/voice-live/realtime`);
      url.searchParams.set('api-version', API_VERSION);
      url.searchParams.set('agent-name', AGENT_NAME);
      url.searchParams.set('agent-project-name', PROJECT);
      url.searchParams.set('authorization', `Bearer ${token}`);
      upstream = new WebSocket(url.toString());
      upstream.onopen = () => { for (const m of pending.splice(0)) upstream!.send(m); };
      upstream.onmessage = (e) => { if (client.readyState === WebSocket.OPEN) client.send(typeof e.data === 'string' ? e.data : ''); };
      upstream.onerror = () => { console.error('Voice Live upstream error'); fail('تعذر الاتصال بخدمة الصوت'); };
      upstream.onclose = (e) => {
        if (e.code !== 1000) console.error('Voice Live closed', e.code, e.reason);
        try { client.close(1000, 'done'); } catch { /* closed */ }
      };
    } catch (e) {
      console.error('voice token error', e);
      fail('تعذر تجهيز جلسة الصوت');
    }
  };
  return response;
});
