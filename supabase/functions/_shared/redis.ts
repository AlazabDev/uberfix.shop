/**
 * Redis client for Edge Functions (UberFix API Gateway)
 * 
 * يوفر:
 * - Idempotency keys cache
 * - Rate limit counters
 * - GET response cache
 * - Token introspection cache
 * 
 * Fallback: in-memory Map إذا REDIS_URL غير محدد (للتطوير المحلي).
 * في الإنتاج (self-hosted على supabase.alazab.com) Redis متاح فعلياً.
 */

import { connect, type Redis } from 'https://deno.land/x/redis@v0.32.3/mod.ts';

let _client: Redis | null = null;
let _connecting: Promise<Redis | null> | null = null;

// Fallback in-memory store (used only when REDIS_URL is missing)
const _memStore = new Map<string, { value: string; expireAt: number | null }>();

function memGet(key: string): string | null {
  const entry = _memStore.get(key);
  if (!entry) return null;
  if (entry.expireAt && entry.expireAt < Date.now()) {
    _memStore.delete(key);
    return null;
  }
  return entry.value;
}

function memSet(key: string, value: string, ttlSec?: number) {
  _memStore.set(key, {
    value,
    expireAt: ttlSec ? Date.now() + ttlSec * 1000 : null,
  });
}

function memIncr(key: string, ttlSec?: number): number {
  const cur = parseInt(memGet(key) ?? '0', 10);
  const next = cur + 1;
  memSet(key, next.toString(), ttlSec);
  return next;
}

/**
 * Get a singleton Redis client, or null if Redis is not configured.
 */
export async function getRedis(): Promise<Redis | null> {
  if (_client) return _client;
  if (_connecting) return _connecting;

  const url = Deno.env.get('REDIS_URL');
  if (!url) return null;

  _connecting = (async () => {
    try {
      const u = new URL(url);
      const client = await connect({
        hostname: u.hostname,
        port: u.port ? parseInt(u.port, 10) : 6379,
        password: u.password || undefined,
        username: u.username || undefined,
        db: u.pathname && u.pathname.length > 1 ? parseInt(u.pathname.slice(1), 10) : 0,
        tls: u.protocol === 'rediss:',
      });
      _client = client;
      console.log('[redis] connected');
      return client;
    } catch (e) {
      console.warn('[redis] connection failed, falling back to memory:', (e as Error).message);
      return null;
    } finally {
      _connecting = null;
    }
  })();

  return _connecting;
}

// ============= Public helpers =============

export async function cacheGet(key: string): Promise<string | null> {
  const r = await getRedis();
  if (!r) return memGet(key);
  try {
    return (await r.get(key)) ?? null;
  } catch {
    return memGet(key);
  }
}

export async function cacheSet(key: string, value: string, ttlSec?: number): Promise<void> {
  const r = await getRedis();
  if (!r) return memSet(key, value, ttlSec);
  try {
    if (ttlSec) {
      await r.set(key, value, { ex: ttlSec });
    } else {
      await r.set(key, value);
    }
  } catch {
    memSet(key, value, ttlSec);
  }
}

export async function cacheDel(key: string): Promise<void> {
  const r = await getRedis();
  if (!r) {
    _memStore.delete(key);
    return;
  }
  try {
    await r.del(key);
  } catch {
    _memStore.delete(key);
  }
}

/**
 * Atomic increment with TTL — used for sliding-window rate limits.
 * Returns the new count.
 */
export async function cacheIncr(key: string, ttlSec: number): Promise<number> {
  const r = await getRedis();
  if (!r) return memIncr(key, ttlSec);
  try {
    const next = await r.incr(key);
    if (next === 1) {
      await r.expire(key, ttlSec);
    }
    return next;
  } catch {
    return memIncr(key, ttlSec);
  }
}

/**
 * SET if Not eXists with TTL — used for idempotency locks.
 * Returns true if key was created (caller is the first), false if it already existed.
 */
export async function cacheSetNx(key: string, value: string, ttlSec: number): Promise<boolean> {
  const r = await getRedis();
  if (!r) {
    if (memGet(key) !== null) return false;
    memSet(key, value, ttlSec);
    return true;
  }
  try {
    const res = await r.set(key, value, { ex: ttlSec, mode: 'NX' });
    return res === 'OK';
  } catch {
    if (memGet(key) !== null) return false;
    memSet(key, value, ttlSec);
    return true;
  }
}