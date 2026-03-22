/**
 * Centralized secrets management for Edge Functions
 * All secrets should be accessed through these utilities
 */

export interface TwilioCredentials {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  whatsAppNumber: string;
}

export interface MetaCredentials {
  appSecret: string;
  verifyToken: string;
  accessToken: string;
  phoneNumberId: string;
}

export interface MapCredentials {
  googleMapsApiKey: string | null;
  mapboxPublicToken: string | null;
}

/**
 * Get Twilio credentials
 * @throws Error if required credentials are missing
 */
export function getTwilioCredentials(requireAll: boolean = true): TwilioCredentials | null {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const phoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER') || '+15557285727';
  const whatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+15557285727';

  if (requireAll && (!accountSid || !authToken)) {
    console.error('Missing required Twilio credentials');
    return null;
  }

  return {
    accountSid: accountSid || '',
    authToken: authToken || '',
    phoneNumber,
    whatsAppNumber
  };
}

/**
 * Get Meta (Facebook/WhatsApp) credentials
 */
export function getMetaCredentials(): MetaCredentials | null {
  const appSecret = Deno.env.get('FACEBOOK_APP_SECRET');
  const verifyToken = Deno.env.get('WHATSAPP_VERIFY_TOKEN');
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

  if (!appSecret) {
    console.warn('FACEBOOK_APP_SECRET not configured');
    return null;
  }

  return {
    appSecret,
    verifyToken: verifyToken || '',
    accessToken: accessToken || '',
    phoneNumberId: phoneNumberId || ''
  };
}

/**
 * Get map API credentials
 * These return restricted/public tokens, not full API keys
 */
export function getMapCredentials(): MapCredentials {
  return {
    googleMapsApiKey: Deno.env.get('GOOGLE_MAPS_API_KEY') || Deno.env.get('GOOGLE_MAP_API_KEY') || null,
    mapboxPublicToken: Deno.env.get('MAPBOX_PUBLIC_TOKEN') || null
  };
}

/**
 * Get Resend API key
 */
export function getResendApiKey(): string | null {
  return Deno.env.get('RESEND_API_KEY') || null;
}

/**
 * Get Supabase credentials
 */
export function getSupabaseCredentials(): { url: string; serviceKey: string; anonKey: string } {
  return {
    url: Deno.env.get('SUPABASE_URL') || '',
    serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    anonKey: Deno.env.get('SUPABASE_ANON_KEY') || ''
  };
}

/**
 * Check if all required secrets for a feature are configured
 */
export function validateSecrets(required: string[]): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const secret of required) {
    if (!Deno.env.get(secret)) {
      missing.push(secret);
    }
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Mask sensitive value for logging (show first 4 and last 4 chars)
 */
export function maskSecret(value: string | null | undefined): string {
  if (!value || value.length < 12) {
    return '****';
  }
  return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
}
