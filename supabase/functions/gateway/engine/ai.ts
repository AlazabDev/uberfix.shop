/**
 * AI engine: thin handlers for /gateway/ai/* routes.
 * Logs every session into public.ai_sessions.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../../_shared/cors.ts';
import { AZURE, chatCompletion, chatCompletionStream } from '../ai/azure-client.ts';
import { runAgent } from '../ai/agent-runtime.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function resolveCaller(req: Request): Promise<{ user_id: string | null; consumer_id: string | null }> {
  const auth = req.headers.get('Authorization') || '';
  const apiKey = req.headers.get('x-api-key') || '';
  let user_id: string | null = null;
  let consumer_id: string | null = null;

  if (auth.startsWith('Bearer ')) {
    const { data } = await admin.auth.getUser(auth.slice(7));
    user_id = data?.user?.id ?? null;
  }
  if (apiKey) {
    const { data } = await admin.from('api_consumers').select('id').eq('api_key', apiKey).maybeSingle();
    consumer_id = data?.id ?? null;
  }
  return { user_id, consumer_id };
}

async function logSession(row: Record<string, any>) {
  try { await admin.from('ai_sessions').insert(row); } catch { /* swallow */ }
}

// ─── Handlers ────────────────────────────────────────────────────────
export async function handleAiHealth(_req: Request): Promise<Response> {
  return json({
    configured: AZURE.configured,
    endpoint: AZURE.endpoint ? AZURE.endpoint.replace(/^(https?:\/\/)([^.]+)/, '$1***') : null,
    apiVersion: AZURE.apiVersion,
    agent: !!AZURE.agentId,
    model_deployment: AZURE.modelDeployment || null,
    agent_deployment: AZURE.agentDeployment || null,
    ts: new Date().toISOString(),
  });
}

export async function handleAiAgent(req: Request): Promise<Response> {
  if (!AZURE.configured) return json({ error: 'Azure OpenAI not configured' }, 503);
  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt ?? body.message ?? '').trim();
  if (!prompt) return json({ error: 'prompt is required' }, 400);

  const caller = await resolveCaller(req);
  const started = Date.now();
  try {
    const result = await runAgent({
      prompt,
      threadId: body.thread_id,
      instructions: body.instructions,
      apiKey: req.headers.get('x-api-key') ?? undefined,
      authHeader: req.headers.get('Authorization') ?? undefined,
    });
    await logSession({
      thread_id: result.thread_id,
      channel: 'agent',
      ...caller,
      model: AZURE.agentDeployment || 'azure-agent',
      prompt_tokens: result.usage?.prompt_tokens ?? 0,
      completion_tokens: result.usage?.completion_tokens ?? 0,
      total_tokens: result.usage?.total_tokens ?? 0,
      tool_calls: result.tool_calls,
      status: result.error ? 'error' : 'ok',
      error: result.error ?? null,
      metadata: { duration_ms: Date.now() - started, run_id: result.run_id, run_status: result.status },
    });
    return json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logSession({ channel: 'agent', ...caller, model: AZURE.agentDeployment || 'azure-agent', status: 'error', error: msg });
    return json({ error: msg }, 500);
  }
}

export async function handleAiChat(req: Request): Promise<Response> {
  if (!AZURE.configured) return json({ error: 'Azure OpenAI not configured' }, 503);
  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages : [{ role: 'user', content: String(body.prompt ?? '') }];
  const caller = await resolveCaller(req);
  try {
    const r = await chatCompletion({
      messages,
      deployment: body.deployment,
      temperature: body.temperature,
      max_tokens: body.max_tokens,
      response_format: body.response_format,
    });
    await logSession({
      channel: 'chat', ...caller,
      model: body.deployment || AZURE.modelDeployment,
      prompt_tokens: r.usage?.prompt_tokens ?? 0,
      completion_tokens: r.usage?.completion_tokens ?? 0,
      total_tokens: r.usage?.total_tokens ?? 0,
      status: 'ok',
    });
    return json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logSession({ channel: 'chat', ...caller, model: body.deployment || AZURE.modelDeployment, status: 'error', error: msg });
    return json({ error: msg }, 500);
  }
}

export async function handleAiStream(req: Request): Promise<Response> {
  if (!AZURE.configured) return json({ error: 'Azure OpenAI not configured' }, 503);
  const body = await req.json().catch(() => ({}));
  const messages = Array.isArray(body.messages) ? body.messages : [{ role: 'user', content: String(body.prompt ?? '') }];
  const caller = await resolveCaller(req);
  try {
    const upstream = await chatCompletionStream({
      messages, deployment: body.deployment, temperature: body.temperature, max_tokens: body.max_tokens, stream: true,
    });
    // Log a lightweight session entry (token counts unknown for streams without parsing).
    logSession({ channel: 'stream', ...caller, model: body.deployment || AZURE.modelDeployment, status: 'ok' });
    return new Response(upstream.body, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}

export async function handleAiClassify(req: Request): Promise<Response> {
  if (!AZURE.configured) return json({ error: 'Azure OpenAI not configured' }, 503);
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? '').trim();
  if (!text) return json({ error: 'text is required' }, 400);

  const sys = `أنت مصنّف لطلبات الصيانة بالعربية. أعد JSON فقط بهذا الشكل:
{"category":"plumbing|electrical|ac|appliance|general","priority":"low|medium|high|urgent","summary":"<=120 char"}`;
  const caller = await resolveCaller(req);
  try {
    const r = await chatCompletion({
      messages: [{ role: 'system', content: sys }, { role: 'user', content: text }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    const content = r.choices?.[0]?.message?.content ?? '{}';
    let parsed: any; try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }
    await logSession({
      channel: 'classify', ...caller, model: AZURE.modelDeployment,
      prompt_tokens: r.usage?.prompt_tokens ?? 0,
      completion_tokens: r.usage?.completion_tokens ?? 0,
      total_tokens: r.usage?.total_tokens ?? 0,
      status: 'ok',
    });
    return json({ classification: parsed, usage: r.usage });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}

export async function handleAiSummarize(req: Request): Promise<Response> {
  if (!AZURE.configured) return json({ error: 'Azure OpenAI not configured' }, 503);
  const body = await req.json().catch(() => ({}));
  const text = String(body.text ?? '').trim();
  if (!text) return json({ error: 'text is required' }, 400);
  const max = Number(body.max_chars ?? 400);

  const caller = await resolveCaller(req);
  try {
    const r = await chatCompletion({
      messages: [
        { role: 'system', content: `لخّص النص التالي بالعربية في حدود ${max} حرف، اذكر النقاط الأساسية فقط.` },
        { role: 'user', content: text },
      ],
      temperature: 0.2,
    });
    const summary = r.choices?.[0]?.message?.content ?? '';
    await logSession({
      channel: 'summarize', ...caller, model: AZURE.modelDeployment,
      prompt_tokens: r.usage?.prompt_tokens ?? 0,
      completion_tokens: r.usage?.completion_tokens ?? 0,
      total_tokens: r.usage?.total_tokens ?? 0,
      status: 'ok',
    });
    return json({ summary, usage: r.usage });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}