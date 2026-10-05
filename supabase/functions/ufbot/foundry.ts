/**
 * Azure AI Foundry Agent (new Agents / agent.version) — az-agent-maint.
 * Invoked through the project's OpenAI-compatible Responses endpoint with an
 * `agent_reference`. Foundry project agents require Microsoft Entra ID auth
 * (service principal, scope https://ai.azure.com/.default); API keys are not accepted.
 *
 * Secrets:
 *   AZ_FOUNDRY_PROJECT_ENDPOINT  https://<resource>.services.ai.azure.com/api/projects/<project>
 *   AZ_FOUNDRY_AGENT_NAME        az-agent-maint
 *   AZ_FOUNDRY_AGENT_VERSION     optional (e.g. 26) — omit to use latest
 *   AZ_TENANT_ID / AZ_CLIENT_ID / AZ_CLIENT_SECRET   service principal
 */

const ENDPOINT = (Deno.env.get('AZ_FOUNDRY_PROJECT_ENDPOINT') ?? '').replace(/\/+$/, '');
const AGENT_NAME = Deno.env.get('AZ_FOUNDRY_AGENT_NAME') ?? 'az-agent-maint';
const AGENT_VERSION = Deno.env.get('AZ_FOUNDRY_AGENT_VERSION') ?? '';
const TENANT = Deno.env.get('AZ_TENANT_ID') ?? '';
const CLIENT_ID = Deno.env.get('AZ_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('AZ_CLIENT_SECRET') ?? '';
const API_VERSION = Deno.env.get('AZ_FOUNDRY_API_VERSION') ?? '2025-11-15-preview';

export const foundryConfigured = !!(ENDPOINT && TENANT && CLIENT_ID && CLIENT_SECRET);

let cachedToken: { value: string; exp: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.value;
  const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://ai.azure.com/.default',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Entra token ${res.status}: ${data.error_description ?? data.error}`);
  cachedToken = { value: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

type Msg = { role: string; content: string };

/** Streams the agent reply, re-encoded as chat-completions SSE deltas for the widget. */
export async function streamFoundryAgent(messages: Msg[], cors: Record<string, string>): Promise<Response> {
  const token = await getToken();
  const agent: Record<string, string> = { type: 'agent_reference', name: AGENT_NAME };
  if (AGENT_VERSION) agent.version = AGENT_VERSION;

  const input = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 3000) }));

  const upstream = await fetch(`${ENDPOINT}/openai/responses?api-version=${API_VERSION}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent, input, stream: true }),
  });

  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text();
    console.error('Foundry agent error', upstream.status, t.slice(0, 800));
    const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? 503 : 502;
    return new Response(JSON.stringify({ error: 'تعذر الاتصال بوكيل UberFix حالياً' }), {
      status, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const reader = upstream.body.getReader();
  const out = new ReadableStream({
    async start(ctrl) {
      const emit = (text: string) =>
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf('\n')) !== -1) {
            const line = buf.slice(0, i).replace(/\r$/, '');
            buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            const json = line.slice(5).trim();
            if (!json || json === '[DONE]') continue;
            try {
              const ev = JSON.parse(json);
              if (ev.type === 'response.output_text.delta' && ev.delta) emit(ev.delta);
              else if (ev.type === 'response.failed' || ev.type === 'error') {
                console.error('Foundry stream failure', JSON.stringify(ev).slice(0, 500));
                emit('عذراً، حدث خطأ أثناء المعالجة.');
              }
            } catch { /* partial */ }
          }
        }
      } finally {
        ctrl.enqueue(enc.encode('data: [DONE]\n\n'));
        ctrl.close();
      }
    },
  });
  return new Response(out, { headers: { ...cors, 'Content-Type': 'text/event-stream' } });
}
