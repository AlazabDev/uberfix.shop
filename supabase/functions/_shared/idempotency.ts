/**
 * Idempotency layer for the UberFix API Gateway.
 * 
 * Strategy:
 *  1. Compute a hash of (method + path + body).
 *  2. Try Redis SETNX with the Idempotency-Key for 24h.
 *  3. If the key already exists → return the cached response from Postgres.
 *  4. After the handler runs, persist the response to api_idempotency_keys.
 * 
 * Redis is used as a fast lock to prevent racing duplicate requests.
 * Postgres is the durable store so responses survive Redis restarts.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { cacheSetNx, cacheSet } from './redis.ts';

const IDEMPOTENCY_TTL_SEC = 24 * 60 * 60; // 24h

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

export async function hashRequest(method: string, path: string, body: string): Promise<string> {
  const data = new TextEncoder().encode(`${method}:${path}:${body}`);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface IdempotentHit {
  status: number;
  body: unknown;
}

/**
 * Check whether this idempotency key already has a stored response.
 * Returns null if it's a fresh request (caller should proceed).
 */
export async function checkIdempotency(opts: {
  consumerId: string;
  idempotencyKey: string;
  requestHash: string;
}): Promise<IdempotentHit | null> {
  const sb = admin();
  const { data, error } = await sb
    .from('api_idempotency_keys')
    .select('response_status, response_body, request_hash, expires_at')
    .eq('consumer_id', opts.consumerId)
    .eq('idempotency_key', opts.idempotencyKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error || !data) return null;

  // Same key + different body => conflict (caller should 409).
  if (data.request_hash !== opts.requestHash) {
    return { status: 409, body: { error: 'Idempotency-Key reused with a different request body' } };
  }

  if (data.response_status == null || data.response_body == null) {
    // Lock exists but response not yet stored → tell caller it's still in-flight.
    return { status: 425, body: { error: 'Request still being processed', retry_after: 2 } };
  }

  return { status: data.response_status, body: data.response_body };
}

/**
 * Reserve an idempotency lock. Returns true if we got the lock,
 * false if another worker already owns it.
 */
export async function reserveIdempotency(opts: {
  consumerId: string;
  idempotencyKey: string;
  requestHash: string;
}): Promise<boolean> {
  // Redis lock first (fast path, prevents duplicate concurrent writes).
  const redisKey = `idem:${opts.consumerId}:${opts.idempotencyKey}`;
  const got = await cacheSetNx(redisKey, opts.requestHash, IDEMPOTENCY_TTL_SEC);

  // Persist a placeholder row in Postgres regardless (survives Redis restart).
  const sb = admin();
  const expiresAt = new Date(Date.now() + IDEMPOTENCY_TTL_SEC * 1000).toISOString();
  await sb.from('api_idempotency_keys').upsert(
    {
      consumer_id: opts.consumerId,
      idempotency_key: opts.idempotencyKey,
      request_hash: opts.requestHash,
      expires_at: expiresAt,
    },
    { onConflict: 'consumer_id,idempotency_key', ignoreDuplicates: true },
  );

  return got;
}

/**
 * Persist the final response so future replays return it byte-for-byte.
 */
export async function storeIdempotentResponse(opts: {
  consumerId: string;
  idempotencyKey: string;
  requestHash: string;
  status: number;
  body: unknown;
}): Promise<void> {
  const sb = admin();
  await sb
    .from('api_idempotency_keys')
    .update({
      response_status: opts.status,
      response_body: opts.body,
    })
    .eq('consumer_id', opts.consumerId)
    .eq('idempotency_key', opts.idempotencyKey);

  // Also cache the response shape in Redis for fast hot-replay.
  await cacheSet(
    `idem:resp:${opts.consumerId}:${opts.idempotencyKey}`,
    JSON.stringify({ status: opts.status, body: opts.body }),
    IDEMPOTENCY_TTL_SEC,
  );
}