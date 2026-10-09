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

import { APP_TOOLS, APP_TOOL_NAMES, buildToolCtx, runAppTool } from './app-tools.ts';

type Msg = { role: string; content: string };
const MAX_TOOL_ROUNDS = 8;
let toolsRejected = false; // Foundry may refuse request-level tools; then the agent's own tools are used.

function contextNote(userId: string | null, roles: string[]): string {
  return [
    'أنت UF.Bot، الوكيل الذكي المدمج في نظام UberFix لإدارة الصيانة.',
    userId ? `المستخدم مسجّل الدخول. أدواره: ${roles.join(', ') || 'customer'}.` : 'المستخدم زائر غير مسجّل.',
    'لديك أدوات تصل لأي جدول وأي دالة وأي صفحة في النظام، وتعمل بصلاحيات المستخدم الحالي.',
    'نفّذ الطلبات مباشرة دون طلب تأكيد. استخدم navigate_to لفتح الصفحة المناسبة عند الحاجة.',
    'مراحل الطلب تُغيَّر عبر call_function باسم fn_transition_request_stage وليس بتعديل العمود مباشرة.',
  ].join('\n');
}

/** Streams the agent reply (re-encoded as chat-completions SSE deltas) and executes in-app tool calls. */
export async function streamFoundryAgent(
  messages: Msg[], cors: Record<string, string>, authHeader: string | null = null,
): Promise<Response> {
  const token = await getToken();
  const ctx = await buildToolCtx(authHeader);
  const agent: Record<string, string> = { type: 'agent_reference', name: AGENT_NAME };
  if (AGENT_VERSION) agent.version = AGENT_VERSION;

  const history = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-20)
    .map((m) => ({ type: 'message', role: m.role, content: m.content.slice(0, 3000) }));
  const toolsItem = { type: 'additional_tools', role: 'developer', tools: APP_TOOLS };
  const firstInput: unknown[] = [toolsItem, { type: 'message', role: 'developer', content: contextNote(ctx.userId, ctx.roles) }, ...history];

  const call = async (body: Record<string, unknown>) => {
    const send = (b: Record<string, unknown>) => fetch(`${ENDPOINT}/openai/responses?api-version=${API_VERSION}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent, stream: true, ...b }),
    });
    let res = await send(body);
    if (res.status === 400 && !toolsRejected) {
      const t = await res.text();
      if (!t.includes('additional_tools')) return new Response(t, { status: 400 });
      console.error('Foundry rejected in-app tools; retrying without them', t.slice(0, 600));
      toolsRejected = true;
      const strip = (body.input as any[] | undefined)?.filter((x) => x?.type !== 'additional_tools');
      res = await send({ ...body, input: strip });
    }
    return res;
  };

  const transcript: unknown[] = toolsRejected ? firstInput.slice(1) : firstInput;
  const first = await call({ input: transcript });
  if (!first.ok || !first.body) {
    const t = await first.text();
    console.error('Foundry agent error', first.status, t.slice(0, 800));
    const status = first.status === 429 ? 429 : first.status === 401 || first.status === 403 ? 503 : 502;
    return new Response(JSON.stringify({ error: 'تعذر الاتصال بوكيل UF.Bot حالياً' }), {
      status, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const enc = new TextEncoder();
  const out = new ReadableStream({
    async start(ctrl) {
      const sse = (obj: unknown) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
      const emit = (text: string) => sse({ choices: [{ delta: { content: text } }] });
      try {
        let res: Response = first;
        for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
          const { responseId, calls, items } = await pump(res, emit);
          if (!calls.length) break;
          void responseId;
          if (round === MAX_TOOL_ROUNDS) { emit('\n(تم بلوغ الحد الأقصى لخطوات التنفيذ)'); break; }
          const outputs = [];
          transcript.push(...items);
          for (const c of calls) {
            let args: Record<string, unknown> = {};
            try { args = JSON.parse(c.arguments || '{}'); } catch { /* empty */ }
            let result: unknown;
            try {
              result = APP_TOOL_NAMES.has(c.name)
                ? await runAppTool(c.name, args as Record<string, any>, ctx)
                : { ok: false, error: `أداة غير معروفة: ${c.name}` };
            } catch (e) { result = { ok: false, error: e instanceof Error ? e.message : String(e) }; }
            sse({ ufbot_tool: { name: c.name } });
            outputs.push({ type: 'function_call_output', call_id: c.call_id, output: JSON.stringify(result).slice(0, 60_000) });
          }
          for (const a of ctx.actions.splice(0)) sse({ ufbot_action: a });
          transcript.push(...outputs);
          res = await call({ input: transcript });
          if (!res.ok || !res.body) {
            console.error('Foundry follow-up error', res.status, (await res.text()).slice(0, 500));
            emit('عذراً، تعذر إكمال التنفيذ.');
            break;
          }
        }
        for (const a of ctx.actions.splice(0)) sse({ ufbot_action: a });
      } catch (e) {
        console.error('UF.Bot stream error', e);
        emit('عذراً، حدث خطأ أثناء المعالجة.');
      } finally {
        ctrl.enqueue(enc.encode('data: [DONE]\n\n'));
        ctrl.close();
      }
    },
  });
  return new Response(out, { headers: { ...cors, 'Content-Type': 'text/event-stream' } });
}

type FnCall = { call_id: string; name: string; arguments: string };

async function pump(res: Response, emit: (t: string) => void): Promise<{ responseId: string | null; calls: FnCall[]; items: unknown[] }> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let responseId: string | null = null;
  const calls: FnCall[] = [];
  const items: unknown[] = [];
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
        if (ev.response?.id) responseId = ev.response.id;
        if (ev.type === 'response.output_item.done') console.log('item', JSON.stringify(ev.item).slice(0, 400));
        if (ev.type === 'response.output_text.delta' && ev.delta) emit(ev.delta);
        if (ev.type === 'response.output_item.done' && ['reasoning', 'function_call', 'message'].includes(ev.item?.type)) items.push(ev.item);
        if (ev.type === 'response.output_item.done' && ev.item?.type === 'function_call') {
          calls.push({ call_id: ev.item.call_id, name: ev.item.name, arguments: ev.item.arguments ?? '{}' });
        } else if (ev.type === 'response.failed' || ev.type === 'error') {
          console.error('Foundry stream failure', JSON.stringify(ev).slice(0, 500));
          emit('عذراً، حدث خطأ أثناء المعالجة.');
        }
      } catch { /* partial */ }
    }
  }
  return { responseId, calls, items };
}
