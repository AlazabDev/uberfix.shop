/**
 * 📡 UberFix Gateway — Webhook Dispatcher
 * 
 * يُستدعى داخلياً (من triggers أو edge functions أخرى) لإرسال أحداث
 * إلى مشتركي api_webhook_subscriptions.
 * 
 * Modes:
 *  1. POST { event_type, event_id, payload, consumer_id? }
 *     → fan-out the event to every active subscription matching event_type.
 *  2. POST { mode: "retry" }
 *     → re-attempt all `pending` deliveries whose next_retry_at <= now().
 * 
 * Each delivery is signed:
 *   x-uberfix-signature: sha256=<hex(HMAC(secret, body))>
 *   x-uberfix-event:     <event_type>
 *   x-uberfix-delivery:  <delivery_id>
 *   x-uberfix-timestamp: <unix-seconds>
 * 
 * Retry policy: exponential backoff 1m, 5m, 30m, 2h, 12h (max 5 attempts).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const MAX_ATTEMPTS = 5;
const BACKOFF_MIN = [1, 5, 30, 120, 720]; // minutes per attempt
const TIMEOUT_MS = 10_000;

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface DeliveryRow {
  id: string;
  subscription_id: string;
  event_id: string;
  event_type: string;
  payload: unknown;
  attempt_number: number;
  status: string;
}

async function attemptDelivery(delivery: DeliveryRow, endpoint: string, secret: string) {
  const sb = admin();
  const body = JSON.stringify({
    event_id: delivery.event_id,
    event_type: delivery.event_type,
    delivered_at: new Date().toISOString(),
    attempt: delivery.attempt_number,
    data: delivery.payload,
  });
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = await hmacSha256(secret, `${ts}.${body}`);

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let status: number | null = null;
  let respBody = '';
  let errMsg: string | null = null;

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-uberfix-signature': `sha256=${sig}`,
        'x-uberfix-timestamp': ts,
        'x-uberfix-event': delivery.event_type,
        'x-uberfix-delivery': delivery.id,
        'User-Agent': 'UberFix-Webhooks/1.0',
      },
      body,
    });
    status = resp.status;
    respBody = (await resp.text()).slice(0, 4000);
  } catch (e) {
    errMsg = (e as Error).message;
  } finally {
    clearTimeout(t);
  }

  const success = status !== null && status >= 200 && status < 300;

  if (success) {
    await sb
      .from('api_webhook_deliveries')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString(),
        response_status: status,
        response_body: respBody,
        error_message: null,
        next_retry_at: null,
      })
      .eq('id', delivery.id);

    await sb
      .from('api_webhook_subscriptions')
      .update({
        last_delivery_at: new Date().toISOString(),
        last_delivery_status: 'delivered',
        failure_count: 0,
      })
      .eq('id', delivery.subscription_id);
    return { success: true, status };
  }

  // Failure → schedule retry or mark dead
  const nextAttempt = delivery.attempt_number + 1;
  if (nextAttempt > MAX_ATTEMPTS) {
    await sb
      .from('api_webhook_deliveries')
      .update({
        status: 'failed',
        response_status: status,
        response_body: respBody,
        error_message: errMsg,
        next_retry_at: null,
      })
      .eq('id', delivery.id);

    await sb
      .from('api_webhook_subscriptions')
      .update({
        last_delivery_status: 'failed',
      })
      .eq('id', delivery.subscription_id);
  } else {
    const delayMin = BACKOFF_MIN[nextAttempt - 1] ?? 720;
    const next = new Date(Date.now() + delayMin * 60_000).toISOString();
    await sb
      .from('api_webhook_deliveries')
      .update({
        status: 'pending',
        attempt_number: nextAttempt,
        response_status: status,
        response_body: respBody,
        error_message: errMsg,
        next_retry_at: next,
      })
      .eq('id', delivery.id);
  }

  // Increment subscription failure counter
  const { data: sub } = await admin()
    .from('api_webhook_subscriptions')
    .select('failure_count')
    .eq('id', delivery.subscription_id)
    .maybeSingle();
  if (sub) {
    await admin()
      .from('api_webhook_subscriptions')
      .update({ failure_count: (sub.failure_count ?? 0) + 1 })
      .eq('id', delivery.subscription_id);
  }

  return { success: false, status, error: errMsg };
}

async function fanout(eventType: string, eventId: string, payload: unknown, consumerId?: string) {
  const sb = admin();
  let q = sb
    .from('api_webhook_subscriptions')
    .select('id, consumer_id, endpoint_url, secret, event_types, is_active')
    .eq('is_active', true)
    .contains('event_types', [eventType]);

  if (consumerId) q = q.eq('consumer_id', consumerId);

  const { data: subs, error } = await q;
  if (error) throw new Error(`Subscription lookup failed: ${error.message}`);
  if (!subs || subs.length === 0) return { delivered: 0 };

  const results: Array<{ subscription_id: string; success: boolean; status: number | null }> = [];

  for (const s of subs) {
    // Insert delivery row first
    const { data: delRow, error: delErr } = await sb
      .from('api_webhook_deliveries')
      .insert({
        subscription_id: s.id,
        event_id: eventId,
        event_type: eventType,
        payload,
        status: 'pending',
        attempt_number: 1,
      })
      .select('id, subscription_id, event_id, event_type, payload, attempt_number, status')
      .single();

    if (delErr || !delRow) {
      console.error('[webhook-dispatcher] insert delivery failed:', delErr);
      continue;
    }

    const r = await attemptDelivery(delRow as DeliveryRow, s.endpoint_url, s.secret);
    results.push({ subscription_id: s.id, success: r.success, status: r.status });
  }

  return { delivered: results.filter((r) => r.success).length, total: results.length, results };
}

async function retryPending() {
  const sb = admin();
  const { data: pending, error } = await sb
    .from('api_webhook_deliveries')
    .select('id, subscription_id, event_id, event_type, payload, attempt_number, status, api_webhook_subscriptions(endpoint_url, secret, is_active)')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .limit(50);

  if (error) throw new Error(error.message);
  if (!pending || pending.length === 0) return { retried: 0 };

  let ok = 0;
  for (const row of pending as unknown as Array<DeliveryRow & { api_webhook_subscriptions: { endpoint_url: string; secret: string; is_active: boolean } }>) {
    const sub = row.api_webhook_subscriptions;
    if (!sub?.is_active) continue;
    const r = await attemptDelivery(row, sub.endpoint_url, sub.secret);
    if (r.success) ok++;
  }
  return { retried: pending.length, succeeded: ok };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  // Internal-only: require service role key in Authorization header
  const auth = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`;
  if (auth !== expected) {
    return json({ error: 'unauthorized', message: 'Internal endpoint only' }, 401);
  }

  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    if (body.mode === 'retry') {
      const r = await retryPending();
      return json({ success: true, ...r });
    }

    const eventType = String(body.event_type ?? '');
    const eventId = String(body.event_id ?? crypto.randomUUID());
    const payload = body.payload ?? {};
    const consumerId = body.consumer_id ? String(body.consumer_id) : undefined;

    if (!eventType) {
      return json({ error: 'invalid_request', message: 'event_type required' }, 400);
    }

    const r = await fanout(eventType, eventId, payload, consumerId);
    return json({ success: true, event_type: eventType, ...r });
  } catch (e) {
    console.error('[api-webhook-dispatcher] error:', e);
    return json({ error: 'server_error', message: (e as Error).message }, 500);
  }
});