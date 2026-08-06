# مراجعة الباك اند وتوحيد الشيما — 2026-08-06

## 1) اختبارات التكامل (فعلية، غير هدمية)
`src/__tests__/serviceMapLifecycle.integration.test.ts` — 10 اختبارات ضد Supabase الحقيقي:

| الاختبار | المتوقع | النتيجة |
|---|---|---|
| `GET /gateway/health` | 200 + `ok:true` | ✅ |
| فرع غير موجود/غامض في `submit-public-request` | 409 | ✅ |
| نوع خدمة غير صحيح | 400 | ✅ |
| رقم هاتف ناقص | 400 | ✅ |
| `GET` على نقطة الإدخال العامة | 405 | ✅ |
| قناة `internal` بدون جلسة مستخدم | 401 | ✅ |
| `x-api-key` غير صالح | 403 | ✅ |
| `get_public_technicians_for_map` كزائر | مرفوض | ✅ |
| `get_active_requests_for_map` كزائر | مرفوض | ✅ |
| `get_public_default_branch_company` | 200 | ✅ |

الاختبارات تتخطى نفسها تلقائيًا إذا لم تتوفر `VITE_SUPABASE_URL` والمفتاح العام، ولا تنشئ أي بيانات.

## 2) عيوب حقيقية كشفتها الاختبارات وتم إصلاحها
1. **تسريب إحداثيات الفنيين**: `get_public_technicians_for_map` كانت ممنوحة لـ `anon` وترجع 200 لأي زائر → تم `REVOKE` والإبقاء على `authenticated` فقط.
2. **تعطّل مسار الإدخال من الخريطة**: `get_public_default_branch_company` لم تكن ممنوحة لأي دور فرجعت 401 → تم منحها لـ `anon, authenticated`.

## 3) توحيد الشيما
- كل جداول `public` (122) لديها RLS مُفعّل + سياسات + منح صريحة لـ `authenticated` و`service_role` (تم التحقق عبر `aclexplode`).
- تمت إضافة `created_at`/`updated_at` (timestamptz, default now()) للجداول التشغيلية التي كانت تفتقدهما.
- تم توحيد مُشغّل التحديث: دالة واحدة `public.fn_touch_updated_at()` + مُشغّل `trg_touch_updated_at_<table>` على **كل** جدول يملك `updated_at`.
- الجداول السجلّية (logs/events/ledger) تُركت `created_at` فقط عن قصد لأنها append-only.

## 4) تحذيرات مقبولة (لا إجراء)
- `SECURITY DEFINER` قابلة للاستدعاء عامًا: دوال التتبّع العام والفرع الافتراضي — مقصودة.
- ترقية Postgres وحماية كلمات المرور المسرّبة: تتطلب إجراءً يدويًا من لوحة Supabase.
