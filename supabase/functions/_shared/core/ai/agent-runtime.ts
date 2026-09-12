/**
 * Azure Assistants runtime: thread create → run → handle tool calls → poll → final reply.
 */
import * as az from './azure-client.ts';
import { TOOLS, executeTool } from './tool-bridge.ts';

const POLL_MS = 700;
const MAX_WAIT_MS = 60_000;
const MAX_TOOL_ROUNDS = 8;

export interface AgentResult {
  thread_id: string;
  run_id: string;
  status: string;
  reply: string;
  tool_calls: Array<{ name: string; args: any; output: any }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: string;
}

export async function runAgent(opts: {
  prompt: string;
  threadId?: string;
  instructions?: string;
  apiKey?: string;
  authHeader?: string;
}): Promise<AgentResult> {
  const thread = opts.threadId
    ? { id: opts.threadId }
    : await az.createThread();
  await az.addMessage(thread.id, opts.prompt);

  let run = await az.startRun(thread.id, {
    instructions: opts.instructions,
    tools: TOOLS,
  });

  const collectedCalls: AgentResult['tool_calls'] = [];
  const started = Date.now();
  let rounds = 0;

  while (true) {
    if (Date.now() - started > MAX_WAIT_MS) {
      return { thread_id: thread.id, run_id: run.id, status: 'timeout', reply: '', tool_calls: collectedCalls, error: 'agent run timeout' };
    }

    if (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      run = await az.getRun(thread.id, run.id);
      continue;
    }

    if (run.status === 'requires_action' && run.required_action?.type === 'submit_tool_outputs') {
      if (++rounds > MAX_TOOL_ROUNDS) {
        return { thread_id: thread.id, run_id: run.id, status: 'tool_loop_limit', reply: '', tool_calls: collectedCalls, error: 'tool round limit' };
      }
      const calls = run.required_action.submit_tool_outputs.tool_calls ?? [];
      const outputs: { tool_call_id: string; output: string }[] = [];

      for (const c of calls) {
        let args: any = {};
        try { args = JSON.parse(c.function?.arguments || '{}'); } catch {}
        let out: any;
        try { out = await executeTool(c.function.name, args, { apiKey: opts.apiKey, authHeader: opts.authHeader }); }
        catch (e) { out = { error: e instanceof Error ? e.message : String(e) }; }
        collectedCalls.push({ name: c.function.name, args, output: out });
        outputs.push({ tool_call_id: c.id, output: JSON.stringify(out) });
      }
      run = await az.submitToolOutputs(thread.id, run.id, outputs);
      continue;
    }

    break; // completed | failed | cancelled | expired
  }

  let reply = '';
  if (run.status === 'completed') {
    const msgs = await az.listMessages(thread.id, 5);
    const last = (msgs.data ?? []).find((m: any) => m.role === 'assistant');
    const parts = last?.content ?? [];
    reply = parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text?.value ?? '')
      .join('\n')
      .trim();
  }

  return {
    thread_id: thread.id,
    run_id: run.id,
    status: run.status,
    reply,
    tool_calls: collectedCalls,
    usage: run.usage,
    error: run.last_error?.message,
  };
}