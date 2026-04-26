/**
 * JWT signing/verification for the UberFix API Gateway.
 * 
 * Uses a SEPARATE secret (UBERFIX_GATEWAY_JWT_SECRET) so that gateway tokens
 * are isolated from Supabase auth tokens. If this secret leaks, Supabase
 * user sessions remain safe and vice versa.
 * 
 * Algorithm: HS256
 */

import { create, verify, getNumericDate, type Header, type Payload } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

const ALG = 'HS256' as const;
const ISSUER = 'uberfix-gateway';

let _key: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (_key) return _key;
  const secret = Deno.env.get('UBERFIX_GATEWAY_JWT_SECRET');
  if (!secret) {
    throw new Error('UBERFIX_GATEWAY_JWT_SECRET is not configured');
  }
  _key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  return _key;
}

export interface GatewayTokenPayload extends Payload {
  sub: string;            // consumer_id
  consumer_name: string;
  scopes: string[];
  channel: string;
  storage_target: string;
  company_id?: string | null;
  branch_id?: string | null;
  iss: string;
  iat: number;
  exp: number;
}

export async function signGatewayToken(
  consumerId: string,
  data: {
    consumer_name: string;
    scopes: string[];
    channel: string;
    storage_target: string;
    company_id?: string | null;
    branch_id?: string | null;
    ttlSeconds?: number;
  },
): Promise<{ token: string; expiresIn: number }> {
  const key = await getKey();
  const ttl = data.ttlSeconds ?? 3600; // default 1h
  const header: Header = { alg: ALG, typ: 'JWT' };
  const payload: GatewayTokenPayload = {
    sub: consumerId,
    consumer_name: data.consumer_name,
    scopes: data.scopes,
    channel: data.channel,
    storage_target: data.storage_target,
    company_id: data.company_id ?? null,
    branch_id: data.branch_id ?? null,
    iss: ISSUER,
    iat: getNumericDate(0),
    exp: getNumericDate(ttl),
  };
  const token = await create(header, payload, key);
  return { token, expiresIn: ttl };
}

export async function verifyGatewayToken(token: string): Promise<GatewayTokenPayload | null> {
  try {
    const key = await getKey();
    const payload = (await verify(token, key)) as GatewayTokenPayload;
    if (payload.iss !== ISSUER) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check that the token grants AT LEAST one of the required scopes.
 * Wildcard: "*" grants all.
 */
export function hasScope(payload: GatewayTokenPayload, required: string | string[]): boolean {
  const need = Array.isArray(required) ? required : [required];
  if (payload.scopes.includes('*')) return true;
  return need.some((s) => payload.scopes.includes(s));
}