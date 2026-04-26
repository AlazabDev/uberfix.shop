/**
 * 🔐 UberFix Gateway — OAuth2 Client Credentials endpoint
 * 
 * POST /functions/v1/api-oauth-token
 * 
 * Body (form-urlencoded OR JSON):
 *   grant_type=client_credentials
 *   client_id=<api_consumers.id>
 *   client_secret=<plaintext secret>
 *   scope=requests:write catalog:read   (optional, space-separated)
 * 
 * Returns:
 *   { access_token, token_type: "Bearer", expires_in, scope }
 * 
 * Token is HS256-signed with UBERFIX_GATEWAY_JWT_SECRET (separate from Supabase JWT).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import * as bcrypt from 'https://deno.land/x/bcrypt@v0.4.1/mod.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { signGatewayToken } from '../_shared/jwt-gateway.ts';
import { cacheIncr } from '../_shared/redis.ts';

const TOKEN_TTL_SEC = 3600; // 1h
const RATE_LIMIT_PER_MIN = 30; // token requests per IP/client per minute

function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function oauthError(error: string, description: string, status = 400) {
  return jsonResponse({ error, error_description: description }, status);
}

async function parseCredentials(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (ct.includes('application/json')) {
    return (await req.json().catch(() => ({}))) as Record<string, string>;
  }
  // form-urlencoded
  const text = await req.text();
  const params = new URLSearchParams(text);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (req.method !== 'POST') {
    return oauthError('invalid_request', 'Only POST is supported', 405);
  }

  try {
    const body = await parseCredentials(req);

    const grantType = body.grant_type;
    let clientId = body.client_id;
    let clientSecret = body.client_secret;
    const requestedScope = body.scope ?? '';

    // Also accept HTTP Basic Auth (RFC 6749 §2.3.1)
    const auth = req.headers.get('authorization');
    if (auth?.startsWith('Basic ')) {
      try {
        const decoded = atob(auth.slice(6));
        const [u, p] = decoded.split(':');
        clientId = clientId || u;
        clientSecret = clientSecret || p;
      } catch { /* ignore */ }
    }

    if (grantType !== 'client_credentials') {
      return oauthError('unsupported_grant_type', 'Only client_credentials is supported');
    }
    if (!clientId || !clientSecret) {
      return oauthError('invalid_request', 'client_id and client_secret are required');
    }

    // Rate-limit token issuance per client
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rlKey = `oauth:rl:${clientId}:${ip}`;
    const count = await cacheIncr(rlKey, 60);
    if (count > RATE_LIMIT_PER_MIN) {
      return oauthError('temporarily_unavailable', 'Too many token requests', 429);
    }

    const sb = admin();
    const { data: consumer, error } = await sb
      .from('api_consumers')
      .select('id, name, channel, is_active, scopes, client_secret_hash, auth_type, storage_target, company_id, branch_id')
      .eq('id', clientId)
      .maybeSingle();

    if (error || !consumer) {
      return oauthError('invalid_client', 'Unknown client_id', 401);
    }
    if (!consumer.is_active) {
      return oauthError('invalid_client', 'Client is disabled', 401);
    }
    if (consumer.auth_type !== 'oauth2' && consumer.auth_type !== 'hybrid') {
      return oauthError('unauthorized_client', 'Client is not allowed to use OAuth2', 403);
    }
    if (!consumer.client_secret_hash) {
      return oauthError('invalid_client', 'Client has no secret configured', 401);
    }

    const ok = await bcrypt.compare(clientSecret, consumer.client_secret_hash);
    if (!ok) {
      return oauthError('invalid_client', 'Invalid client_secret', 401);
    }

    // Scope intersection: requested ∩ allowed
    const allowed: string[] = consumer.scopes ?? [];
    const requested = requestedScope.split(/\s+/).filter(Boolean);
    const granted = requested.length === 0
      ? allowed
      : requested.filter((s) => allowed.includes(s) || allowed.includes('*'));

    if (requested.length > 0 && granted.length === 0) {
      return oauthError('invalid_scope', 'None of the requested scopes are allowed');
    }

    const { token, expiresIn } = await signGatewayToken(consumer.id, {
      consumer_name: consumer.name,
      scopes: granted,
      channel: consumer.channel,
      storage_target: consumer.storage_target ?? 'local',
      company_id: consumer.company_id,
      branch_id: consumer.branch_id,
      ttlSeconds: TOKEN_TTL_SEC,
    });

    // Bookkeeping
    await sb
      .from('api_consumers')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', consumer.id);

    return jsonResponse({
      access_token: token,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: granted.join(' '),
    });
  } catch (e) {
    console.error('[api-oauth-token] error:', e);
    return oauthError('server_error', (e as Error).message, 500);
  }
});