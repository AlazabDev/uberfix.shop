# 🧪 دليل الاختبار الشامل - UberFix

## 📋 المحتويات
1. [إعداد المتغيرات](#1-إعداد-المتغيرات)
2. [اختبار دورة حياة الطلب الكاملة](#2-اختبار-دورة-حياة-الطلب)
3. [اختبار الفاتورة العامة](#3-اختبار-الفاتورة)
4. [اختبار الإشعارات المحسّنة](#4-اختبار-الإشعارات)
5. [الاستعلام والإلغاء](#5-الاستعلام-والإلغاء)

---

## 1. إعداد المتغيرات

```bash
export GATEWAY="https://zrrffsjbfkphridqyais.supabase.co/functions/v1/maintenance-gateway"
export API_KEY="0639988287e667c4c7801e34065105f3b80303c6d8d3c2f6dfee45cc7314aebe"
export SUPABASE_URL="https://zrrffsjbfkphridqyais.supabase.co"
export ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpycmZmc2piZmtwaHJpZHF5YWlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MzE1NzMsImV4cCI6MjA3MjAwNzU3M30.AwzY48mSUGeopBv5P6gzAPlipTbQasmXK8DR-L_Tm9A"
```

---

## 2. اختبار دورة حياة الطلب

### الخطوة 1️⃣: إنشاء طلب جديد
```bash
RESPONSE=$(curl -sS -X POST "$GATEWAY" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "api",
    "client_name": "أحمد عزب - اختبار شامل",
    "client_phone": "01004006620",
    "client_email": "test@alazab.com",
    "service_type": "plumbing",
    "title": "تسريب مياه في المطبخ",
    "description": "يوجد تسريب أسفل الحوض",
    "location": "القاهرة - المعادي - شارع 50",
    "priority": "high"
  }')
echo "$RESPONSE"
export REQ_ID=$(echo "$RESPONSE" | grep -o '"request_id":"[^"]*"' | cut -d'"' -f4)
echo "Request ID: $REQ_ID"
```

### الخطوة 2️⃣: نقل المراحل واحدة تلو الأخرى

```bash
# 2.1 → triaged (مراجعة الطلب)
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"transition_stage\",\"request_id\":\"$REQ_ID\",\"to_stage\":\"triaged\",\"reason\":\"تمت المراجعة\"}"

# 2.2 → assigned (تعيين الفني)
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"transition_stage\",\"request_id\":\"$REQ_ID\",\"to_stage\":\"assigned\",\"reason\":\"تم تعيين فني\"}"

# 2.3 → scheduled (تحديد موعد)
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"transition_stage\",\"request_id\":\"$REQ_ID\",\"to_stage\":\"scheduled\",\"reason\":\"موعد غداً 10ص\"}"

# 2.4 → in_progress (بدء التنفيذ)
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"transition_stage\",\"request_id\":\"$REQ_ID\",\"to_stage\":\"in_progress\",\"reason\":\"الفني بدأ العمل\"}"

# 2.5 → inspection (الفحص)
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"transition_stage\",\"request_id\":\"$REQ_ID\",\"to_stage\":\"inspection\",\"reason\":\"جاري الفحص\"}"

# 2.6 → completed (تم الإنجاز)
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"transition_stage\",\"request_id\":\"$REQ_ID\",\"to_stage\":\"completed\",\"reason\":\"تم إصلاح التسريب\"}"

# 2.7 → billed (إصدار الفاتورة)
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"transition_stage\",\"request_id\":\"$REQ_ID\",\"to_stage\":\"billed\",\"reason\":\"الفاتورة جاهزة\"}"

# 2.8 → paid (تم الدفع)
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"transition_stage\",\"request_id\":\"$REQ_ID\",\"to_stage\":\"paid\",\"reason\":\"تم استلام المبلغ\"}"

# 2.9 → closed (إغلاق الطلب)
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"transition_stage\",\"request_id\":\"$REQ_ID\",\"to_stage\":\"closed\",\"reason\":\"الطلب مغلق\"}"
```

---

## 3. اختبار الفاتورة

### 3.1 جلب بيانات الفاتورة عبر RPC العام
```bash
curl -sS -X POST "$SUPABASE_URL/rest/v1/rpc/public_get_invoice_by_request" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"p_request_id\":\"$REQ_ID\"}"
```

### 3.2 فتح صفحة الفاتورة في المتصفح
```
https://uberfix.shop/track/$REQ_ID/invoice
```

اختبر فيها:
- ✅ زر **PDF** (تحميل بصيغة PDF)
- ✅ زر **JPG** (تحميل بصيغة صورة)
- ✅ زر **CSV** (تحميل بصيغة Excel-friendly)
- ✅ زر **طباعة** (Print)
- ✅ زر **واتساب** (مشاركة الرابط)
- ✅ **QR code** (مسحه يجب أن يفتح نفس الصفحة)

---

## 4. اختبار الإشعارات

بعد كل `transition_stage`، تحقق من:
- 📱 **WhatsApp**: تأكد من وصول رسالة بالتفاصيل المحسّنة (اسم الفني، الموعد، التكلفة، روابط CTAs)
- 📧 **Email**: تأكد من وصول رسالة HTML احترافية
- 🔔 **In-app**: افتح `/notifications` وتحقق من الإشعار

للاختبار اليدوي للإشعار:
```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/send-maintenance-notification" \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"request_id\":\"$REQ_ID\",\"new_stage\":\"completed\"}"
```

---

## 5. الاستعلام والإلغاء

### 5.1 الاستعلام عن حالة الطلب
```bash
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"get_status\",\"request_id\":\"$REQ_ID\"}"
```

### 5.2 إضافة ملاحظة
```bash
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"add_note\",\"request_id\":\"$REQ_ID\",\"note\":\"العميل طلب موعد آخر\"}"
```

### 5.3 إلغاء الطلب (في أي مرحلة قبل الإغلاق)
```bash
curl -sS -X POST "$GATEWAY" -H "x-api-key: $API_KEY" -H "Content-Type: application/json" \
  -d "{\"action\":\"cancel\",\"request_id\":\"$REQ_ID\",\"reason\":\"العميل غيّر رأيه\"}"
```

---

## ✅ Checklist النهائي

- [ ] إنشاء طلب جديد ينجح ويُرجع `request_id`
- [ ] جميع المراحل التسعة تنتقل بنجاح
- [ ] WhatsApp يصل بالقالب الجديد المحسّن في كل مرحلة
- [ ] Email يصل بتصميم HTML
- [ ] صفحة `/track/{id}` تعرض المسار بصرياً
- [ ] صفحة `/track/{id}/invoice` تعرض الفاتورة
- [ ] PDF/JPG/CSV تُحمّل بشكل صحيح
- [ ] QR code يفتح الفاتورة عند المسح
- [ ] زر WhatsApp يفتح المحادثة برسالة جاهزة
- [ ] الإلغاء يعمل في المراحل المسموحة

---

## 🔧 ملاحظات

- جميع الأوامر تستخدم `x-api-key` (وليس `SERVICE_ROLE_KEY`).
- الـ API key مقيّد بالطلبات التي أنشأها نفس الـ consumer.
- الفاتورة يجب أن تُربط بالطلب عبر `invoices.request_id` (يتم يدوياً أو عبر النموذج الإداري).
- لإنشاء فاتورة لطلب موجود، استخدم لوحة الإدارة `/invoices` ثم اربطها بـ `request_id`.

---

**تاريخ التحديث:** 2026-04-29