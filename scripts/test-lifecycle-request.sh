#!/usr/bin/env bash
set -euo pipefail

REQUEST_ID="${1:-}"
SUPABASE_URL="${SUPABASE_URL:-https://zrrffsjbfkphridqyais.supabase.co}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

if [ -z "$REQUEST_ID" ]; then
  echo "Usage: SUPABASE_SERVICE_ROLE_KEY=... $0 <request-id>"
  exit 1
fi

if [ -z "$SERVICE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY is required"
  exit 1
fi

STAGES=(
  triaged
  assigned
  scheduled
  in_progress
  inspection
  waiting_parts
  in_progress
  completed
  billed
  paid
  closed
)

echo "🔄 بدء اختبار رحلة الطلب: $REQUEST_ID"
echo "════════════════════════════════════════"

for STAGE in "${STAGES[@]}"; do
  echo
  echo "▶ المرحلة: $STAGE"

  RESPONSE=$(curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/fn_transition_request_stage" \
    -H "apikey: $SERVICE_KEY" \
    -H "Authorization: Bearer $SERVICE_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation" \
    -d "{\"p_request_id\":\"$REQUEST_ID\",\"p_to_stage\":\"$STAGE\",\"p_reason\":\"manual_lifecycle_test:$STAGE\",\"p_metadata\":{\"source\":\"scripts/test-lifecycle-request.sh\",\"stage\":\"$STAGE\"}}")

  if echo "$RESPONSE" | rg -q '"message"|"code"|"hint"'; then
    echo "  ✗ فشل: $RESPONSE"
  else
    echo "  ✓ تم الانتقال إلى: $RESPONSE"
  fi

  sleep 2
done

echo
echo "════════════════════════════════════════"
echo "✅ اكتملت رحلة الطلب — تحقّق من WhatsApp على +201004006620"
echo "🔗 https://uberfix.shop/track/$REQUEST_ID"