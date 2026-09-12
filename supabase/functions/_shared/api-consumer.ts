/**
 * مصادقة موحّدة لمستهلكي API (البوتات والتكاملات الخارجية).
 * المفاتيح تُخزَّن كبصمة SHA-256 في api_consumers.api_key_hash،
 * مع دعم رجعي للمفاتيح القديمة المخزّنة كنص خام في api_key.
 */

export interface ApiConsumerRow {
  id: string;
  name: string;
  channel: string | null;
  is_active: boolean;
  rate_limit_per_minute: number | null;
  allowed_origins: string[] | null;
  company_id: string | null;
  branch_id: string | null;
  scopes: string[] | null;
  storage_target: string | null;
  total_requests: number | null;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const SELECT_COLS =
  'id, name, channel, is_active, rate_limit_per_minute, allowed_origins, company_id, branch_id, scopes, storage_target, total_requests';

/** يعيد المستهلك المطابق للمفتاح أو null. لا يرمي استثناءات. */
export async function findApiConsumer(
  supabaseAdmin: any,
  rawApiKey: string | null | undefined,
): Promise<ApiConsumerRow | null> {
  const apiKey = (rawApiKey ?? '').trim();
  if (!apiKey) return null;

  const hash = await sha256Hex(apiKey);

  const byHash = await supabaseAdmin
    .from('api_consumers')
    .select(SELECT_COLS)
    .eq('api_key_hash', hash)
    .eq('is_active', true)
    .maybeSingle();
  if (byHash.data) return byHash.data as ApiConsumerRow;

  // توافق رجعي: مفاتيح قديمة مخزّنة كنص خام أو كبصمة داخل عمود api_key.
  const byLegacy = await supabaseAdmin
    .from('api_consumers')
    .select(SELECT_COLS)
    .or(`api_key.eq.${apiKey},api_key.eq.${hash}`)
    .eq('is_active', true)
    .maybeSingle();
  return (byLegacy.data as ApiConsumerRow) ?? null;
}

/** تحديث عدادات الاستخدام دون تعطيل الطلب. */
export function touchApiConsumer(supabaseAdmin: any, consumer: ApiConsumerRow): void {
  supabaseAdmin
    .from('api_consumers')
    .update({
      last_used_at: new Date().toISOString(),
      total_requests: (consumer.total_requests ?? 0) + 1,
    })
    .eq('id', consumer.id)
    .then(() => {});
}

export function hasScope(consumer: ApiConsumerRow | null, required: string): boolean {
  if (!consumer) return false;
  const scopes = consumer.scopes ?? [];
  return scopes.includes('*') || scopes.includes(required);
}
