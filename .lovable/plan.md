# خطة إعادة بناء نظام المصادقة من الصفر

## 1) طرق الدخول المعتمدة (6 طرق)

| # | الطريقة | الاستخدام | التنفيذ |
|---|---------|-----------|---------|
| 1 | Phone OTP عبر Twilio Verify | العملاء | Supabase `signInWithOtp({ phone })` مع Twilio Verify Provider في لوحة Supabase |
| 2 | Email + Password + SMTP | المصدر الأساسي | `signInWithPassword` + `signUp` + Reset Password عبر SMTP المخصص |
| 3 | Azure AD OAuth | الموظفون | `signInWithOAuth({ provider: 'azure' })` |
| 4 | Google OAuth | عام | `signInWithOAuth({ provider: 'google' })` |
| 5 | WhatsApp OTP | بديل SMS | Edge Function مخصص يرسل OTP عبر WhatsApp Cloud API → يتحقق عبر `verifyOtp` مخصص أو magic link مولّد بـ admin API |
| 6 | Facebook OAuth | عام | `signInWithOAuth({ provider: 'facebook' })` |

**ملاحظة WhatsApp OTP**: لا يوجد Provider رسمي في Supabase لـ WhatsApp. الحل: Edge Function `send-whatsapp-otp` + `verify-whatsapp-otp` يستخدم `supabaseAdmin.auth.admin.generateLink({ type: 'magiclink' })` لإنشاء جلسة بعد التحقق من الكود. جدول `whatsapp_otp` بسيط (phone, code_hash, expires_at, attempts).

## 2) الملفات المحذوفة (Root Cleanup)

**Frontend:**
- `src/contexts/AuthContext.tsx` (الحالي المعقد)
- `src/components/auth/AuthWrapper.tsx`
- `src/components/auth/PhoneOTPLogin.tsx` وكل مكونات auth القديمة
- `src/lib/secureOAuth.ts`
- `src/lib/facebook-login-debug.ts`
- `src/routes/ProtectedRoute.tsx` (سيُعاد بناؤه مبسّط)
- كل صفحات auth الحالية في `src/pages/auth/*`

**Edge Functions:**
- `supabase/functions/facebook-auth-sync/`
- `supabase/functions/auth-callback/`
- `supabase/functions/send-otp/`
- `supabase/functions/verify-otp/`
- `supabase/functions/auto-register-customer/`

**Database (Migration):**
- `DROP TABLE public.otp_verifications`
- `DROP TABLE public.facebook_users`
- `DROP FUNCTION` أي trigger/function لـ auto-register أو placeholder users
- الإبقاء على: `profiles`, `user_roles`, `has_role()`

## 3) البنية الجديدة (بسيطة ونظيفة)

```text
src/
├── contexts/
│   └── AuthContext.tsx          (~80 سطر، Session + User فقط)
├── hooks/
│   └── useAuth.ts               (يستدعي useContext)
├── routes/
│   └── ProtectedRoute.tsx       (~30 سطر، redirect للـ /auth إن لا يوجد session)
├── pages/auth/
│   ├── Login.tsx                (تبويبات: Email | Phone | WhatsApp | OAuth)
│   ├── Register.tsx             (Email + Password فقط، الباقي auto)
│   ├── ResetPassword.tsx        (طلب رابط)
│   ├── UpdatePassword.tsx       (بعد النقر على الرابط، /reset-password)
│   └── Callback.tsx             (/auth/callback لكل OAuth)
└── lib/
    └── roleRedirect.ts          (يبقى كما هو)

supabase/functions/
├── send-whatsapp-otp/           (جديد)
└── verify-whatsapp-otp/         (جديد، ينشئ magic link ويرد بالجلسة)
```

## 4) قواعد ذهبية

- **مصدر واحد للحقيقة**: `AuthContext` يستخدم `onAuthStateChange` **فقط** + `getSession()` مرة واحدة عند التحميل. لا مكالمات `getUser()` متعددة.
- **لا race conditions**: setState داخل listener فقط.
- **RLS**: كل شيء عبر `auth.uid()` من الجلسة الرسمية.
- **profiles**: trigger واحد `handle_new_user()` ينشئ profile عند `INSERT` في `auth.users`.
- **user_roles**: دور `customer` افتراضي للجميع، الموظفون يُرفعون يدويًا من الإدارة.

## 5) الإعدادات المطلوبة في لوحة Supabase (يقوم بها المستخدم)

قبل التنفيذ:
1. **Twilio Verify**: تفعيل Phone Provider في Authentication → Providers (Twilio Verify + Account SID + Auth Token + Service SID)
2. **SMTP**: Authentication → Emails → SMTP Settings (host, port, user, pass, from)
3. **Azure**: تسجيل App في Azure Portal → Client ID + Secret → تفعيل Azure Provider
4. **Google**: Client ID + Secret من Google Cloud Console → تفعيل Google Provider
5. **Facebook**: App ID + Secret من Meta for Developers → تفعيل Facebook Provider
6. **WhatsApp**: WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID كـ Edge Function Secrets

Redirect URL موحد لكل OAuth: `https://<domain>/auth/callback`

## 6) خطة التنفيذ بالخطوات

1. **Migration**: DROP جداول/functions القديمة + إعادة إنشاء trigger `handle_new_user` نظيف
2. **حذف الملفات** المذكورة أعلاه (`rm -rf`)
3. **بناء `AuthContext` الجديد** (~80 سطر)
4. **بناء صفحات auth** الخمسة الجديدة بتصميم موحد يحافظ على الهوية البصرية الحالية
5. **بناء `ProtectedRoute`** المبسّط
6. **بناء Edge Functions** لـ WhatsApp OTP (اثنتان فقط)
7. **تحديث `App.tsx`** بالمسارات الجديدة
8. **اختبار كل طريقة دخول** بشكل منفصل

## 7) تفاصيل تقنية (للمرجعية)

- Session storage: `localStorage` (default Supabase)
- Callback route عام (بدون AuthWrapper) لأنه يعالج tokens في URL hash
- `/reset-password` عام أيضًا
- كل طرق OAuth تستخدم نفس `redirectTo: window.location.origin + '/auth/callback'`
- WhatsApp OTP: كود 6 أرقام، صلاحية 10 دقائق، rate limit 5 محاولات/10 دقائق، تخزين hash فقط (SHA-256)

---

**هل توافق على هذه الخطة للبدء بالتنفيذ الفوري؟** بعد الموافقة سأبدأ بـ Migration ثم الحذف ثم البناء في نفس الجلسة.
