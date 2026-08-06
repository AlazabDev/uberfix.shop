// @vitest-environment node
/**
 * اختبارات تكامل فعلية لدورة حياة خريطة الخدمات
 * Real integration tests for the Service Map lifecycle.
 *
 * تتحقق من: أكواد الحالة 200 / 400 / 401 / 403 / 409 ومن إحكام RLS على
 * دوال الخريطة. الاختبارات غير هدمية: لا تُنشئ أي بيانات وهمية في الإنتاج.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const enabled = Boolean(SUPABASE_URL && ANON_KEY);
const d = enabled ? describe : describe.skip;

const FN = `${SUPABASE_URL}/functions/v1`;
const REST = `${SUPABASE_URL}/rest/v1`;

const anonHeaders = () => ({
  'Content-Type': 'application/json',
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
});

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${FN}${path}`, {
    method: 'POST',
    headers: { ...anonHeaders(), ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* non-json */ }
  return { status: res.status, json, text };
}

async function rpc(name: string, args: Record<string, unknown> = {}) {
  const res = await fetch(`${REST}/rpc/${name}`, {
    method: 'POST',
    headers: anonHeaders(),
    body: JSON.stringify(args),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* ignore */ }
  return { status: res.status, json, text };
}

d('Service Map lifecycle — gateway health (200)', () => {
  beforeAll(() => {
    if (!enabled) console.warn('skipping: missing VITE_SUPABASE_URL / anon key');
  });

  it('GET /gateway/health returns 200 with ok:true', async () => {
    const res = await fetch(`${FN}/gateway/health`, { headers: anonHeaders() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  }, 30_000);
});

d('Service Map lifecycle — public intake validation', () => {
  it('rejects an unknown/ambiguous branch with 409', async () => {
    const { status, json } = await post('/submit-public-request', {
      client_name: 'Integration Test',
      client_phone: '01000000000',
      branch_name: `__no_such_branch_${Date.now()}__`,
      service_type: 'plumbing',
      priority: 'medium',
      description: 'integration test — must not be created',
    });
    expect(status).toBe(409);
    expect(String(json?.error || '')).toMatch(/Branch/i);
  }, 30_000);

  it('rejects an invalid service type with 400', async () => {
    const { status } = await post('/submit-public-request', {
      client_name: 'Integration Test',
      client_phone: '01000000000',
      branch_name: 'anything',
      service_type: 'not_a_real_service',
    });
    expect(status).toBe(400);
  }, 30_000);

  it('rejects a missing phone number with 400', async () => {
    const { status } = await post('/submit-public-request', {
      client_name: 'Integration Test',
      client_phone: '12',
      branch_name: 'anything',
      service_type: 'plumbing',
    });
    expect(status).toBe(400);
  }, 30_000);

  it('rejects GET on the public intake endpoint with 405', async () => {
    const res = await fetch(`${FN}/submit-public-request`, { headers: anonHeaders() });
    await res.text();
    expect(res.status).toBe(405);
  }, 30_000);
});

d('Service Map lifecycle — gateway authorization', () => {
  it('blocks the internal channel without a real user session (401)', async () => {
    const { status } = await post('/gateway', {
      channel: 'internal',
      client_name: 'Integration Test',
      client_phone: '01000000000',
      service_type: 'plumbing',
    });
    expect(status).toBe(401);
  }, 30_000);

  it('rejects an invalid x-api-key with 403', async () => {
    const { status } = await post(
      '/gateway',
      {
        channel: 'api',
        client_name: 'Integration Test',
        client_phone: '01000000000',
        service_type: 'plumbing',
      },
      { 'x-api-key': 'uf_invalid_key_for_integration_test' },
    );
    expect(status).toBe(403);
  }, 30_000);
});

d('Service Map lifecycle — map data RLS', () => {
  it('denies anonymous access to technician live coordinates', async () => {
    const { status } = await rpc('get_public_technicians_for_map');
    expect(status).toBeGreaterThanOrEqual(400);
  }, 30_000);

  it('denies anonymous access to active requests for the map', async () => {
    const { status } = await rpc('get_active_requests_for_map');
    expect(status).toBeGreaterThanOrEqual(400);
  }, 30_000);

  it('exposes a default company/branch for map intake fallback (200)', async () => {
    const { status, json } = await rpc('get_public_default_branch_company');
    expect(status).toBe(200);
    expect(Array.isArray(json) || typeof json === 'object').toBe(true);
  }, 30_000);
});
