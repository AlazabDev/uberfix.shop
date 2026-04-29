# 🔄 اختبار دورة حياة UberFix الكاملة

سكربت `scripts/test-system-lifecycle.mjs` يختبر دورة حياة الطلب من البداية للنهاية.

## ما يفعله

1. ينشئ (أو يستخدم) شركة **أبو عوف للصيانة** وفرع **المعادي 50**
2. يحمّل كل الخدمات النشطة من جدول `categories` ويربطها بأسعار `public/data/rate_items_rows.csv`
3. ينشئ طلب صيانة باسم `test@alazab.com` ورقم `+201004006620`
4. يمرّر الطلب عبر كل مراحل `workflow_stage` القانونية عبر `fn_transition_request_stage`: `submitted → triaged → assigned → scheduled → in_progress → inspection → waiting_parts → completed → billed → paid → closed`
5. يتحقق من سجل `request_lifecycle` و`audit_logs` ويذكّرك بفحص WhatsApp/Email يدوياً

## التشغيل

```bash
SUPABASE_SERVICE_ROLE_KEY="<service-role-key-من-Supabase-dashboard>" \
  node scripts/test-system-lifecycle.mjs
```

أو لاختبار **طلب موجود بالفعل** من الـ terminal:

```bash
chmod +x scripts/test-lifecycle-request.sh
SUPABASE_SERVICE_ROLE_KEY="<service-role-key-من-Supabase-dashboard>" \
  scripts/test-lifecycle-request.sh <REQUEST_ID>
```

> ⚠️ **مطلوب Service Role Key** لأن السكربت ينشئ شركة وفرع وطلب يتجاوز RLS.
> احصل عليه من: Supabase Dashboard → Settings → API → `service_role` (secret).

## مخرجات متوقعة

```
▶ 1. تجهيز شركة "أبو عوف" وفرع المعادي
  ✓ تم إنشاء الشركة: <uuid>
  ✓ تم إنشاء الفرع: <uuid>

▶ 2. تحميل قائمة الخدمات والأسعار
  ✓ عدد الخدمات النشطة: 25+
  ✓ عدد بنود التسعير المُحمَّلة: 20

▶ 3. إنشاء طلب صيانة عبر maintenance-gateway
  ✓ تم إنشاء الطلب: <uuid>

▶ 4. تشغيل دورة الحياة الكاملة
  ✓ المرحلة → submitted
  ✓ المرحلة → assigned
  ... إلخ

▶ 5. التحقق من سجل الإشعارات والأحداث
  ✓ عدد أحداث دورة الحياة: 9

✅ اكتمل اختبار دورة الحياة بنجاح
```
