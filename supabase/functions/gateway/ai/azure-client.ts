/**
 * Azure OpenAI low-level REST client (Edge Function compatible).
 * Handles Chat Completions + Assistants (Threads/Runs) + simple SSE streaming.
 */

const RAW_ENDPOINT = (Deno.env.get('AZURE_OPENAI_ENDPOINT') ?? '').replace(/\/+$/, '');
// Normalize: accept resource root OR a URL already containing /openai/<anything>.
const ENDPOINT = RAW_ENDPOINT.replace(/\/openai(\/v\d+)?$/i, '');
const API_KEY  = Deno.env.get('AZURE_OPENAI_API_KEY') ?? '';
const API_VER  = Deno.env.get('AZURE_OPENAI_API_VERSION') ?? '2024-10-21';

export const AZURE = {
  endpoint: ENDPOINT,
  apiVersion: API_VER,
  agentId: Deno.env.get('AZURE_OPENAI_AGENT_ID') ?? '',
  agentDeployment: Deno.env.get('AZURE_OPENAI_AGENT_DEPLOYMENT') ?? '',
  modelDeployment: Deno.env.get('AZURE_OPENAI_MODEL_DEPLOYMENT') ?? '',
  configured: !!(ENDPOINT && API_KEY),
};

function headers(extra: Record<string, string> = {}): HeadersInit {
  return { 'api-key': API_KEY, 'Content-Type': 'application/json', ...extra };
}

async function req(path: string, init: RequestInit & { query?: Record<string,string> } = {}) {
  if (!AZURE.configured) throw new Error('Azure OpenAI not configured');
  const url = new URL(`${ENDPOINT}${path}`);
  url.searchParams.set('api-version', API_VER);
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
  const res = await req(`/openai/deployments/${dep}/chat/completions`, {
    method: 'POST',
    body: JSON.stringify({
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
  return req(`/openai/deployments/${dep}/chat/completions`, {
    method: 'POST',
    body: JSON.stringify({
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
  const r = await req(`/openai/threads`, { method: 'POST', body: '{}' });
  return r.json();
}

export async function addMessage(threadId: string, content: string): Promise<any> {
  const r = await req(`/openai/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role: 'user', content }),
  });
  return r.json();
}

export async function startRun(threadId: string, opts: { instructions?: string; tools?: any[]; assistantId?: string }): Promise<any> {
  const body: any = { assistant_id: opts.assistantId || AZURE.agentId };
  if (opts.instructions) body.instructions = opts.instructions;
  if (opts.tools) body.tools = opts.tools;
  const r = await req(`/openai/threads/${threadId}/runs`, { method: 'POST', body: JSON.stringify(body) });
  return r.json();
}

export async function getRun(threadId: string, runId: string): Promise<any> {
  const r = await req(`/openai/threads/${threadId}/runs/${runId}`, { method: 'GET' });
  return r.json();
}

export async function submitToolOutputs(threadId: string, runId: string, outputs: { tool_call_id: string; output: string }[]): Promise<any> {
  const r = await req(`/openai/threads/${threadId}/runs/${runId}/submit_tool_outputs`, {
    method: 'POST',
    body: JSON.stringify({ tool_outputs: outputs }),
  });
  return r.json();
}

export async function listMessages(threadId: string, limit = 10): Promise<any> {
  const r = await req(`/openai/threads/${threadId}/messages`, { method: 'GET', query: { limit: String(limit) } });
  return r.json();
}