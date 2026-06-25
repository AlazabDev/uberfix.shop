/**
 * Azure OpenAI low-level REST client (Edge Function compatible).
 * Handles Chat Completions + Assistants (Threads/Runs) + simple SSE streaming.
 */

// Accept both new (AZ_MODEL_*) and legacy (AZURE_OPENAI_*) secret names.
const RAW_ENDPOINT = (
  Deno.env.get('AZ_MODEL_ENDPOINT') ??
  Deno.env.get('AZURE_OPENAI_ENDPOINT') ??
  ''
).replace(/\/+$/, '');
const API_KEY =
  Deno.env.get('AZ_MODEL_API_KEY') ??
  Deno.env.get('AZURE_OPENAI_API_KEY') ??
  '';

// Normalize endpoint:
//   - strip trailing /responses, /chat/completions, /embeddings  (the Foundry "Get code" pastes these)
//   - keep /openai/v1 when present  → triggers V1 (Foundry) mode
//   - strip /openai or /openai/vN otherwise → classic resource root
let NORMALIZED = RAW_ENDPOINT
  .replace(/\/(responses|chat\/completions|embeddings|completions)$/i, '');
const IS_V1 = /\/openai\/v1$/i.test(NORMALIZED);
if (!IS_V1) {
  NORMALIZED = NORMALIZED.replace(/\/openai(\/v\d+)?$/i, '');
}
const ENDPOINT = NORMALIZED;
const API_VER  = Deno.env.get('AZURE_OPENAI_API_VERSION') ?? '2024-10-21';

export const AZURE = {
  endpoint: ENDPOINT,
  apiVersion: API_VER,
  mode: (IS_V1 ? 'v1' : 'classic') as 'v1' | 'classic',
  agentId:
    Deno.env.get('AZ_AGENT_ID') ??
    Deno.env.get('AZURE_OPENAI_AGENT_ID') ??
    '',
  agentDeployment:
    Deno.env.get('AZ_AGENT_DEPLOYMENT') ??
    Deno.env.get('AZURE_OPENAI_AGENT_DEPLOYMENT') ??
    '',
  modelDeployment:
    Deno.env.get('AZ_MODEL_DEPLOYMENT') ??
    Deno.env.get('AZURE_OPENAI_MODEL_DEPLOYMENT') ??
    '',
  configured: !!(ENDPOINT && API_KEY),
};

function headers(extra: Record<string, string> = {}): HeadersInit {
  // Foundry v1 also accepts `api-key`, but Bearer is the documented default.
  const auth: Record<string, string> = AZURE.mode === 'v1'
    ? { Authorization: `Bearer ${API_KEY}`, 'api-key': API_KEY }
    : { 'api-key': API_KEY };
  return { ...auth, 'Content-Type': 'application/json', ...extra };
}

async function req(
  pathClassic: string,
  pathV1: string,
  init: RequestInit & { query?: Record<string,string> } = {},
) {
  if (!AZURE.configured) throw new Error('Azure OpenAI not configured');
  const path = AZURE.mode === 'v1' ? pathV1 : pathClassic;
  const url = new URL(`${ENDPOINT}${path}`);
  if (AZURE.mode === 'classic') url.searchParams.set('api-version', API_VER);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);
  const res = await fetch(url, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Azure ${res.status}: ${text.slice(0, 500)}`);
  }
  return res;
}

// ─── Chat Completions ────────────────────────────────────────────────
export interface ChatMessage { role: 'system'|'user'|'assistant'|'tool'; content: string; tool_call_id?: string; name?: string; }
export interface ChatOptions {
  deployment?: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' } | { type: 'json_schema'; json_schema: any };
  tools?: any[];
  tool_choice?: any;
  stream?: boolean;
}

export async function chatCompletion(opts: ChatOptions): Promise<any> {
  const dep = opts.deployment || AZURE.modelDeployment;
  const res = await req(
    `/openai/deployments/${dep}/chat/completions`,
    `/chat/completions`,
    {
    method: 'POST',
    body: JSON.stringify({
      ...(AZURE.mode === 'v1' ? { model: dep } : {}),
      messages: opts.messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.max_tokens,
      response_format: opts.response_format,
      tools: opts.tools,
      tool_choice: opts.tool_choice,
    }),
  });
  return res.json();
}

export async function chatCompletionStream(opts: ChatOptions): Promise<Response> {
  const dep = opts.deployment || AZURE.modelDeployment;
  return req(
    `/openai/deployments/${dep}/chat/completions`,
    `/chat/completions`,
    {
    method: 'POST',
    body: JSON.stringify({
      ...(AZURE.mode === 'v1' ? { model: dep } : {}),
      messages: opts.messages,
      temperature: opts.temperature ?? 0.3,
      max_tokens: opts.max_tokens,
      stream: true,
    }),
    headers: { 'Accept': 'text/event-stream' },
  });
}

// ─── Assistants (Agent) API ──────────────────────────────────────────
export async function createThread(): Promise<any> {
  const r = await req(`/openai/threads`, `/threads`, { method: 'POST', body: '{}' });
  return r.json();
}

export async function addMessage(threadId: string, content: string): Promise<any> {
  const r = await req(`/openai/threads/${threadId}/messages`, `/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role: 'user', content }),
  });
  return r.json();
}

export async function startRun(threadId: string, opts: { instructions?: string; tools?: any[]; assistantId?: string }): Promise<any> {
  const body: any = { assistant_id: opts.assistantId || AZURE.agentId };
  if (opts.instructions) body.instructions = opts.instructions;
  if (opts.tools) body.tools = opts.tools;
  const r = await req(`/openai/threads/${threadId}/runs`, `/threads/${threadId}/runs`, { method: 'POST', body: JSON.stringify(body) });
  return r.json();
}

export async function getRun(threadId: string, runId: string): Promise<any> {
  const r = await req(`/openai/threads/${threadId}/runs/${runId}`, `/threads/${threadId}/runs/${runId}`, { method: 'GET' });
  return r.json();
}

export async function submitToolOutputs(threadId: string, runId: string, outputs: { tool_call_id: string; output: string }[]): Promise<any> {
  const r = await req(
    `/openai/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
    `/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
    {
    method: 'POST',
    body: JSON.stringify({ tool_outputs: outputs }),
  });
  return r.json();
}

export async function listMessages(threadId: string, limit = 10): Promise<any> {
  const r = await req(`/openai/threads/${threadId}/messages`, `/threads/${threadId}/messages`, { method: 'GET', query: { limit: String(limit) } });
  return r.json();
}