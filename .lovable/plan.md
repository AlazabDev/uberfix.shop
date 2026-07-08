# خطة التطوير

## 1) تسعير مبدئي للخدمات (300-500 ج) — فقط الفارغة

**Migration**: تحديث `services` حيث `unit_price IS NULL OR unit_price = 0` بقيمة عشوائية بين 300-500:
```sql
UPDATE public.services 
SET unit_price = floor(300 + random() * 201)::numeric
WHERE unit_price IS NULL OR unit_price = 0;
```
لا نلمس الخدمات المسعّرة فعلاً. نطبق نفس المنطق على `service_items` و `rate_items` إن كانت فارغة.

## 2) زر الدفع في شاشة الفاتورة

- **الشاشة العامة `PublicInvoice.tsx`**: زر PayTabs موجود بالفعل — سنتأكد من ظهوره + تحسين UX (شارة "ادفع الآن"، مبلغ واضح، حالة تحميل).
- **الشاشة الداخلية `Invoices.tsx` / `InvoiceDetail`**: نضيف زر "إرسال رابط الدفع للعميل" يستدعي `paytabs-create-payment` ويشارك الرابط عبر واتساب.
- **تدفق الفاتورة**: عند تحويل الطلب إلى مرحلة `billed`، يتم إنشاء الفاتورة تلقائياً (موجود) — نضيف إشعار WhatsApp تلقائي بالرابط.

## 3) إنشاء تلقائي لحساب Auth عند وصول رقم غير مسجّل

**Edge Function جديدة `auto-register-customer`** (تُستدعى من `maintenance-gateway` و trigger DB):
1. تستقبل `phone` + `name?` + `email?`.
2. تبحث في `auth.users` عن الرقم (raw_phone_number).
3. إن لم يوجد → `supabase.auth.admin.createUser({ phone, phone_confirm: false, password: random })`.
4. تنشئ صف في `profiles` ببيانات افتراضية:
   - `full_name = 'client-{seq}'` (مثال: `client-012`)
   - `role = 'customer'`
   - `phone = <phone>`
   - `is_placeholder = true` ← عمود جديد للتمييز
5. تربط `maintenance_requests.customer_id / created_by` بالمستخدم الجديد.

**Migration**:
- عمود `profiles.is_placeholder boolean default false`.
- تسلسل `client_serial_seq` لتوليد `client-001, client-002, ...`.
- Trigger `trg_auto_register_client` على `maintenance_requests` AFTER INSERT: إذا `client_phone IS NOT NULL AND created_by IS NULL` → استدعِ `auto-register-customer` عبر `pg_net` أو خزّن في طابور واستهلكه من الـ gateway.

**إشعار تأكيد**: بعد الإنشاء، ترسل `send-whatsapp-message` قالب "تم استلام طلبك #UF-... — سجّل دخولك برقم هاتفك لمتابعة الطلب".

## 4) تسجيل دخول قوي بـ OTP (بدون تغيير التصميم)

المكون `PhoneOTPLogin.tsx` قائم بالفعل ومطابق للصورة. سنقوّيه دون تغيير UI:

- **قفل بعد المحاولات**: 5 محاولات OTP خاطئة → قفل 15 دقيقة (يُدار في `verify-otp` عبر `otp_verifications.attempts`).
- **Rate limit إرسال**: حد أقصى 3 إرسالات لنفس الرقم / 10 دقائق.
- **صلاحية OTP**: 5 دقائق فقط.
- **صيغة قوية**: 6 أرقام عشوائية crypto-secure.
- **ربط الحساب Placeholder**: عند نجاح OTP لأول مرة على رقم `is_placeholder=true`، يُرجع session كامل ويُطلب من المستخدم استكمال بيانات (الاسم، البريد) عبر modal اختياري.
- **حماية الاستنساخ**: بصمة الجهاز (`user_agent + ip hash`) تُخزّن مع OTP وتُتحقق عند التأكيد.

## الملفات المتأثرة

**Migrations (SQL)**:
- تسعير الخدمات
- `profiles.is_placeholder` + `client_serial_seq`
- تعديل `otp_verifications` (attempts, locked_until, device_fingerprint)

**Edge Functions**:
- `auto-register-customer` (جديدة)
- `send-otp` (تقوية rate limit)
- `verify-otp` (قفل بعد المحاولات + device check)
- `maintenance-gateway` (استدعاء auto-register)
- `paytabs-create-payment` (تحسين رسالة الواتساب)

**Frontend**:
- `src/pages/invoices/Invoices.tsx` — زر "إرسال رابط الدفع"
- `src/pages/track/PublicInvoice.tsx` — تحسين زر الدفع
- `src/pages/auth/CompleteProfile.tsx` (جديد) — modal لاستكمال بيانات client-XXX
- لا تغيير على `PhoneOTPLogin.tsx` (UI)

## ملاحظات فنية

- `is_placeholder=true` يعني المستخدم لم يكمل بياناته؛ نعرض شارة تنبيه في الداشبورد فقط.
- الطلبات المسجلة قبل هذا التغيير تظل مربوطة بـ `client_phone` نصياً — نشغّل backfill يمرّ عليها ويربطها بحسابات جديدة.
- كل الأرقام تُطبّع لصيغة E.164 (`+20...`) قبل البحث/الإنشاء لتفادي التكرار.
