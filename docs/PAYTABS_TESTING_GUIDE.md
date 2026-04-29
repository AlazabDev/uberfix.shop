# 💳 PayTabs Egypt — دليل اختبار الدفع

> **بيئة:** Test Mode | **العملة:** EGP | **المزود:** PayTabs Egypt

---

## 🔑 إعداد متغيرات الاختبار

```bash
export SUPABASE_URL="https://zrrffsjbfkphridqyais.supabase.co"
export ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycmZmc2piZmtwaHJpZHF5YWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MzE1NzMsImV4cCI6MjA3MjAwNzU3M30.AwzY48mSUGeopBv5P6gzAPlipTbQasmXK8DR-L_Tm9A"

# ضع هنا request_id لطلب لديه فاتورة status != 'paid'
export REQ_ID="b7dde668-7102-4f1c-b4df-481bf0a4e4c9"
```

---

## 1️⃣ إنشاء جلسة دفع PayTabs

يستدعي `paytabs-create-payment` ويرجع `redirect_url` لصفحة PayTabs المستضافة.

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/paytabs-create-payment" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\": \"$REQ_ID\"}" | jq
```

**رد متوقع:**
```json
{
  "success": true,
  "redirect_url": "https://secure-egypt.paytabs.com/payment/page/...",
  "tran_ref": "TST...",
  "cart_id": "UF-INV-2026-0001-1730324...."
}
```

➡️ **افتح `redirect_url` في المتصفح** وأكمل الدفع ببطاقة تجريبية:

| النوع | الرقم | CVV | تاريخ |
|-------|-------|-----|-------|
| Visa (نجاح) | `4000 0000 0000 0002` | `123` | `12/30` |
| Mastercard (نجاح) | `5200 0000 0000 0007` | `123` | `12/30` |
| Visa (رفض) | `4000 0000 0000 0119` | `123` | `12/30` |

OTP الاختبار: `123456` أو `1234`

---

## 2️⃣ التحقق من حالة الدفع

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/public_get_payment_status" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_request_id\": \"$REQ_ID\"}" | jq
```

**رد بعد الدفع الناجح:**
```json
{
  "status": "paid",
  "tran_ref": "TST2014900012345",
  "amount": "500.00",
  "paid_at": "2026-04-29T22:15:30Z",
  "cart_id": "UF-INV-2026-0001-..."
}
```

---

## 3️⃣ التحقق من تحديث الفاتورة

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/public_get_invoice_by_request" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_request_id\": \"$REQ_ID\"}" | jq '.invoice | {status, payment_method, payment_reference}'
```

**النتيجة:**
```json
{
  "status": "paid",
  "payment_method": "paytabs",
  "payment_reference": "TST2014900012345"
}
```

---

## 4️⃣ التحقق من نقل المرحلة (billed → paid)

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/public_track_request" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_request_id\": \"$REQ_ID\"}" | jq '.workflow_stage'
```

**متوقع:** `"paid"` (أو `"closed"` لاحقاً).

---

## 5️⃣ محاكاة الـ callback يدوياً (للتطوير)

استخدم هذا فقط للاختبار في بيئة local. في الإنتاج PayTabs ترسل تلقائياً.

```bash
# استبدل CART_ID بقيمة من الخطوة 1
export CART_ID="UF-INV-2026-0001-1730324..."

curl -sS -X POST "$SUPABASE_URL/functions/v1/paytabs-callback" \
  -H "Content-Type: application/json" \
  -d "{
    \"tran_ref\": \"TST2014900012345\",
    \"cart_id\": \"$CART_ID\",
    \"cart_amount\": \"500.00\",
    \"cart_currency\": \"EGP\",
    \"payment_result\": {
      \"response_status\": \"A\",
      \"response_code\": \"100\",
      \"response_message\": \"Authorised\"
    }
  }" | jq
```

---

## 6️⃣ اختبار سيناريوهات الفشل

### أ. فاتورة مدفوعة بالفعل
```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/paytabs-create-payment" \
  -H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\": \"$REQ_ID\"}" | jq
# متوقع: {"error": "Invoice already paid", "already_paid": true}
```

### ب. طلب بدون فاتورة
```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/paytabs-create-payment" \
  -H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\": \"00000000-0000-0000-0000-000000000000\"}" | jq
# متوقع: 404 — Invoice not found for this request
```

### ج. callback بـ cart_id خاطئ
```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/paytabs-callback" \
  -H "Content-Type: application/json" \
  -d '{"cart_id": "FAKE-CART", "payment_result": {"response_status": "A"}}' | jq
# متوقع: 404 — transaction not found
```

---

## 7️⃣ الاختبار من الواجهة

1. افتح: `https://uberfix.shop/track/$REQ_ID/invoice`
2. اضغط زر **«ادفع الآن»** (الذهبي)
3. سيوجهك لـ PayTabs المستضافة
4. أكمل الدفع بالبطاقة التجريبية أعلاه
5. ستعود لصفحة الفاتورة مع `?payment=success`
6. خلال 2-10 ثوان، ختم **«مدفوعة ✓ PAID»** سيظهر تلقائياً
7. ستصل رسالة WhatsApp + Email تأكيد للعميل

---

## 📊 مراقبة السجلات

- **Edge Function logs:**
  - [paytabs-create-payment](https://supabase.com/dashboard/project/zrrffsjbfkphridqyais/functions/paytabs-create-payment/logs)
  - [paytabs-callback](https://supabase.com/dashboard/project/zrrffsjbfkphridqyais/functions/paytabs-callback/logs)

- **استعلام مباشر للمعاملات (SQL):**
```sql
SELECT cart_id, status, amount, tran_ref, paid_at, created_at
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 20;
```

---

## ⚠️ ملاحظات مهمة للإنتاج

1. **التحقق من التوقيع (HMAC):** الـ callback يتحقق من `signature` header باستخدام `PAYTABS_SERVER_KEY`. تأكد من تفعيل **Notification (IPN) Signature** في لوحة PayTabs.
2. **callback URL في PayTabs Dashboard:** تأكد من ضبطه على:
   `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/paytabs-callback`
3. **التبديل لـ Live:** عند الانتقال للإنتاج، حدّث `PAYTABS_SERVER_KEY` بمفتاح Live من PayTabs (نفس endpoint `secure-egypt.paytabs.com`).
4. **Apple Pay:** الشهادة `applepay-processing.csr` التي رفعتها — حمّلها في PayTabs Dashboard وفعّل Apple Pay من إعدادات الـ Profile.