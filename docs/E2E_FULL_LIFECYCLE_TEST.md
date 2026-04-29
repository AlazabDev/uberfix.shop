# 🧪 الاختبار الشامل لدورة حياة UberFix الكاملة (E2E)

> **النسخة:** 1.0 — `2026-04-29`
> **النطاق:** إنشاء طلب → كل مراحل الـ workflow → إصدار فاتورة → دفع PayTabs → إغلاق + التحقق من الإشعارات والصفحات العامة
> **الهدف:** سيناريو واحد متكامل بدون أخطاء، مع نقطة تحقق (✅ Verify) بعد كل خطوة.

---

## 📋 المحتويات

1. [التحضير (مرة واحدة)](#1-التحضير)
2. [المرحلة A — إنشاء الطلب](#a-إنشاء-الطلب)
3. [المرحلة B — دورة الـ Workflow الكاملة](#b-دورة-الـ-workflow)
4. [المرحلة C — صفحة التتبع العامة](#c-صفحة-التتبع-العامة)
5. [المرحلة D — إصدار الفاتورة](#d-إصدار-الفاتورة)
6. [المرحلة E — الدفع عبر PayTabs](#e-الدفع-عبر-paytabs)
7. [المرحلة F — التحقق النهائي + الإغلاق](#f-التحقق-النهائي)
8. [Checklist نهائي](#checklist)
9. [ملحق — استكشاف الأخطاء](#troubleshooting)

---

## 1. التحضير

### 1.1 المتطلبات
- `curl`, `jq` مثبتين
- هاتف يستقبل WhatsApp على الرقم الذي ستستخدمه
- متصفح لفتح صفحات التتبع/الفاتورة/PayTabs

### 1.2 متغيرات البيئة (انسخها كما هي)

```bash
export GATEWAY="https://zrrffsjbfkphridqyais.supabase.co/functions/v1/maintenance-gateway"
export SUPABASE_URL="https://zrrffsjbfkphridqyais.supabase.co"
export ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycmZmc2piZmtwaHJpZHF5YWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MzE1NzMsImV4cCI6MjA3MjAwNzU3M30.AwzY48mSUGeopBv5P6gzAPlipTbQasmXK8DR-L_Tm9A"
export API_KEY="0639988287e667c4c7801e34065105f3b80303c6d8d3c2f6dfee45cc7314aebe"

# بيانات العميل التجريبي (غيّر الهاتف لرقمك للتحقق من WhatsApp)
export TEST_NAME="عميل اختبار E2E"
export TEST_PHONE="+201004006620"
export TEST_EMAIL="test@alazab.com"
```

✅ **Verify:** `echo $GATEWAY` يطبع الرابط بدون خطأ.

---

## A. إنشاء الطلب

### A.1 إنشاء طلب صيانة جديد

```bash
RESPONSE=$(curl -sS -X POST "$GATEWAY" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"channel\": \"api\",
    \"action\": \"create_request\",
    \"client_name\": \"$TEST_NAME\",
    \"client_phone\": \"$TEST_PHONE\",
    \"client_email\": \"$TEST_EMAIL\",
    \"service_type\": \"plumbing\",
    \"title\": \"اختبار E2E — تسريب مياه\",
    \"description\": \"هذا طلب اختبار شامل لدورة الحياة الكاملة\",
    \"location\": \"القاهرة - المعادي - شارع 50\",
    \"priority\": \"high\"
  }")

echo "$RESPONSE" | jq

export REQ_ID=$(echo "$RESPONSE" | jq -r '.request_id')
export REQ_NUM=$(echo "$RESPONSE" | jq -r '.request_number')
export TRACK_URL=$(echo "$RESPONSE" | jq -r '.track_url')

echo "Request ID: $REQ_ID"
echo "Request #:  $REQ_NUM"
echo "Track URL:  $TRACK_URL"
```

✅ **Verify:**
- `success: true` في الرد
- `REQ_ID` ليس فارغاً ويبدأ بـ UUID
- `REQ_NUM` بصيغة `AZ-UF-YY-MM-NNNNNN`
- 📱 **WhatsApp:** يجب وصول رسالة "تم استلام طلبك" خلال 30 ثانية

---

## B. دورة الـ Workflow

> سننقل الطلب عبر **6 مراحل** بالترتيب القانوني. بعد كل مرحلة تحقق من وصول إشعار WhatsApp.

### B.1 دالة مساعدة (انسخها مرة واحدة)

```bash
transition() {
  local STAGE=$1
  local REASON=$2
  echo ""
  echo "▶ Transitioning to: $STAGE"
  curl -sS -X POST "$GATEWAY" \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"channel\": \"api\",
      \"action\": \"transition_stage\",
      \"client_name\": \"$TEST_NAME\",
      \"request_id\": \"$REQ_ID\",
      \"to_stage\": \"$STAGE\",
      \"reason\": \"$REASON\"
    }" | jq
  sleep 3
}
```

### B.2 تنفيذ كل المراحل

```bash
transition "triaged"      "تمت مراجعة الطلب وتصنيفه"
transition "assigned"     "تم تعيين الفني أحمد محمد"
transition "scheduled"    "موعد الزيارة: غداً 10:00 ص"
transition "in_progress"  "الفني وصل للموقع وبدأ العمل"
transition "inspection"   "جاري الفحص الفني"
transition "completed"    "تم إصلاح التسريب بنجاح"
```

✅ **Verify بعد كل خطوة:**
- الرد يحوي `"success": true` و `from_stage` و `to_stage` متطابقتين
- 📱 وصول رسالة WhatsApp بنبرة مختلفة (ترحيب/متابعة/إنجاز)
- اترك 3 ثوانٍ بين كل انتقال

### B.3 الاستعلام عن الحالة الحالية

```bash
curl -sS -X POST "$GATEWAY" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"channel\":\"api\",\"action\":\"get_status\",\"client_name\":\"$TEST_NAME\",\"request_id\":\"$REQ_ID\"}" | jq
```

✅ **Verify:** `current_stage` = `completed`

---

## C. صفحة التتبع العامة

```bash
echo "افتح في المتصفح: $TRACK_URL"
```

✅ **Verify:**
- الصفحة تفتح **بدون تسجيل دخول**
- شريط المراحل البصري يُظهر `completed` ✓
- كل المراحل السابقة بعلامة ✓ خضراء
- التواريخ ظاهرة بالعربية
- زر "اتصل بنا على واتساب" يعمل

### C.2 (اختياري) عبر RPC مباشرة

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/public_track_request" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_request_id\":\"$REQ_ID\"}" | jq
```

---

## D. إصدار الفاتورة

### D.1 الانتقال لمرحلة `billed`

```bash
transition "billed" "الفاتورة جاهزة بقيمة 500 جنيه"
```

### D.2 إنشاء فاتورة مرتبطة بالطلب

> ⚠️ تُنشأ من لوحة الإدارة `/invoices` أو يدوياً عبر SQL Editor.

```sql
-- استبدل <REQ_ID> بقيمة REQ_ID الفعلية
INSERT INTO invoices (
  request_id, client_name, client_phone, client_email,
  subtotal, tax_amount, total_amount, currency,
  status, due_date, items
)
SELECT
  id, client_name, client_phone, client_email,
  450.00, 50.00, 500.00, 'EGP',
  'pending', now() + interval '7 days',
  jsonb_build_array(
    jsonb_build_object('description','إصلاح تسريب مياه','quantity',1,'unit_price',300,'total',300),
    jsonb_build_object('description','استبدال وصلة','quantity',1,'unit_price',150,'total',150)
  )
FROM maintenance_requests WHERE id = '<REQ_ID>'
RETURNING id, invoice_number, total_amount;
```

### D.3 جلب الفاتورة عبر RPC العام

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/public_get_invoice_by_request" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_request_id\":\"$REQ_ID\"}" | jq
```

✅ **Verify:** الرد يحوي `invoice_number`, `total_amount: 500`, `status: "pending"`

### D.4 افتح صفحة الفاتورة العامة

```bash
echo "افتح: https://uberfix.shop/track/$REQ_ID/invoice"
```

✅ **Verify على الصفحة:**
- [ ] بيانات الشركة (UberFix) ظاهرة في الترويسة
- [ ] بيانات العميل صحيحة
- [ ] بنود الخدمة + المجموع + الضريبة + الإجمالي
- [ ] **QR Code** مرئي وسليم
- [ ] الحالة "غير مدفوع" / `pending`
- [ ] أزرار **PDF / JPG / CSV / Print / WhatsApp Share** كلها تعمل
- [ ] زر **ادفع الآن** ظاهر بالتدرج الذهبي

---

## E. الدفع عبر PayTabs

### E.1 إنشاء جلسة دفع

```bash
PAY=$(curl -sS -X POST "$SUPABASE_URL/functions/v1/paytabs-create-payment" \
  -H "Authorization: Bearer $ANON_KEY" -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\": \"$REQ_ID\"}")

echo "$PAY" | jq
export PAY_URL=$(echo "$PAY" | jq -r '.redirect_url')
echo "🔗 افتح: $PAY_URL"
```

✅ **Verify:** `redirect_url` يبدأ بـ `https://secure-egypt.paytabs.com`

### E.2 إكمال الدفع

| النوع | الرقم | CVV | تاريخ |
|-------|-------|-----|-------|
| Visa (نجاح) | `4000 0000 0000 0002` | `123` | `12/30` |
| Mastercard (نجاح) | `5200 0000 0000 0007` | `123` | `12/30` |
| Visa (رفض) | `4000 0000 0000 0119` | `123` | `12/30` |

OTP الاختبار: `123456` أو `1234`. بعد الدفع تُحوَّل تلقائياً إلى `https://uberfix.shop/track/$REQ_ID/invoice?payment=success`.

✅ **Verify على الصفحة بعد الرجوع:**
- [ ] ختم **PAID** أخضر مدوّر يظهر فوق الفاتورة
- [ ] الحالة تحدّثت إلى `paid` خلال 5 ثوانٍ (auto-polling)
- [ ] رقم المعاملة (`tran_ref`) ظاهر

### E.3 التحقق من حالة الدفع

```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/public_get_payment_status" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_request_id\":\"$REQ_ID\"}" | jq
```

✅ **Verify:** `status: "paid"`, `tran_ref` غير فارغ, `paid_at` حديث.

### E.4 التحقق من انتقال الـ stage تلقائياً

```bash
curl -sS -X POST "$GATEWAY" \
  -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"channel\":\"api\",\"action\":\"get_status\",\"client_name\":\"$TEST_NAME\",\"request_id\":\"$REQ_ID\"}" | jq '.current_stage'
```

✅ **Verify:** الناتج `"paid"` (الـ callback نقل المرحلة تلقائياً).
✅ **WhatsApp:** وصول إيصال دفع مع رقم المعاملة.

---

## F. التحقق النهائي

### F.1 الإغلاق

```bash
transition "closed" "اكتمل الطلب وتم إغلاقه بنجاح"
```

✅ **Verify:**
- `success: true`, `to_stage: "closed"`
- 📱 رسالة شكر + طلب تقييم 1-5 نجوم تصل عبر WhatsApp

### F.2 إعادة فتح صفحة التتبع

افتح `$TRACK_URL` مرة أخرى → كل المراحل ✓ خضراء بما فيها `paid` و `closed`.

### F.3 سجل التدقيق (اختياري)

```sql
SELECT to_stage, reason, created_at
FROM workflow_transitions
WHERE request_id = '<REQ_ID>'
ORDER BY created_at;
```

✅ **Verify:** 9 صفوف على الأقل (submitted → triaged → ... → closed)

---

## Checklist

### إنشاء وانتقال
- [ ] إنشاء الطلب رجّع `request_id` و `request_number`
- [ ] رسالة WhatsApp استلام الطلب وصلت
- [ ] الانتقالات الستة (triaged → completed) نجحت كلها
- [ ] رسالة WhatsApp مختلفة في كل مرحلة

### التتبع العام
- [ ] صفحة `/track/{id}` تفتح بدون تسجيل دخول
- [ ] شريط المراحل صحيح بصرياً

### الفاتورة
- [ ] `transition → billed` نجح
- [ ] إنشاء الفاتورة عبر SQL نجح
- [ ] صفحة `/track/{id}/invoice` تعرض كل البيانات
- [ ] PDF / JPG / CSV / Print / WhatsApp Share تعمل
- [ ] QR code مرئي ويفتح نفس الصفحة عند المسح

### PayTabs
- [ ] `paytabs-create-payment` رجّع `redirect_url` صالح
- [ ] الدفع بالبطاقة التجريبية نجح
- [ ] الـ redirect إلى `?payment=success` تم
- [ ] ختم PAID ظهر تلقائياً
- [ ] `public_get_payment_status` يرجع `paid`
- [ ] `current_stage` انتقل تلقائياً إلى `paid`
- [ ] إيصال WhatsApp وصل برقم المعاملة

### الإغلاق
- [ ] `transition → closed` نجح
- [ ] رسالة الشكر + تقييم وصلت

---

## Troubleshooting

| المشكلة | السبب المحتمل | الحل |
|---------|----------------|------|
| `401 Unauthorized` على gateway | `API_KEY` خاطئ أو منتهي | تأكد من المفتاح في الـ env |
| `403 Channel not allowed` | الـ consumer غير مفعّل لقناة `api` | تحقق من `api_consumers` |
| `transition_stage` يفشل | الانتقال غير قانوني (مثلاً `submitted → paid`) | اتبع الترتيب القانوني |
| WhatsApp لا يصل | الرقم غير مفعّل في WABA أو template في انتظار الموافقة | راجع `message_logs` |
| `paytabs-create-payment` يرجع 500 | secrets غير مضبوطة أو فاتورة غير موجودة | تحقق من `PAYTABS_*` secrets + invoice موجودة |
| ختم PAID لا يظهر | الـ callback لم يصل من PayTabs | تحقق من `Callback URL` في PayTabs Dashboard = `.../paytabs-callback` |
| `?payment=success` لا يحدّث الصفحة | الـ polling متوقف | افتح Console — يجب رؤية poll كل 2 ثانية |

### روابط فحص اللوغات

- maintenance-gateway: https://supabase.com/dashboard/project/zrrffsjbfkphridqyais/functions/maintenance-gateway/logs
- paytabs-create-payment: https://supabase.com/dashboard/project/zrrffsjbfkphridqyais/functions/paytabs-create-payment/logs
- paytabs-callback: https://supabase.com/dashboard/project/zrrffsjbfkphridqyais/functions/paytabs-callback/logs
- send-maintenance-notification: https://supabase.com/dashboard/project/zrrffsjbfkphridqyais/functions/send-maintenance-notification/logs

---

## 📌 ملاحظات هامة

1. **جميع الأوامر تستخدم `x-api-key`** — لا تستخدم `service_role_key` في الـ shell
2. **بين الانتقالات اترك 3 ثوانٍ** — لإعطاء الوقت للـ triggers والإشعارات
3. **PayTabs في وضع `test`** — لا تُحوَّل أموال فعلية
4. **احفظ `REQ_ID`** لإعادة الاختبار أو الاستعلام لاحقاً
5. **إذا فشل أي step** — توقف، تحقق من اللوغات، ولا تكمل قبل حل المشكلة

---

**آخر تحديث:** 2026-04-29
**المسؤول:** فريق UberFix Engineering
