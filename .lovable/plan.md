
# خطة إعادة بناء نظام المصادقة من الصفر

## 1) لماذا الحذف الكامل؟

النظام الحالي متشعّب ومتضارب:
- `AuthContext` + `AuthWrapper` + `ProtectedRoute` + `secureOAuth` + `facebook-auth-sync` + `PhoneOTPLogin` + `send-otp` + `verify-otp` + `auth-callback` + مسارات متعددة (`/auth/callback`, `/auth`, `/login`).
- تدفقات متداخلة: Google OAuth + Facebook مخصّص + Email/Password + Phone OTP + منطق "placeholder users".
- Session Race Conditions بين `getSession()` و `onAuthStateChange` و `getUser()` (استدعاء 4 مرات في callback واحد كما يظهر في auth-logs).
- Facebook يمر عبر Edge Function مخصص بدلاً من Supabase OAuth القياسي → مصدر رئيسي للأخطاء.
- منطق `is_placeholder` + `auto-register-customer` مضاف حديثاً زاد التعقيد.

**القرار:** حذف كل شيء متعلق بالمصادقة والبدء من قالب Supabase Auth القياسي البسيط.

---

## 2) الملفات التي ستُحذف

### Frontend
- `src/contexts/AuthContext.tsx` (سيُعاد كتابته)
- `src/components/auth/AuthWrapper.tsx`
- `src/components/auth/PhoneOTPLogin.tsx`
- `src/components/auth/*` (كل ملفات المصادقة القديمة)
- `src/lib/secureOAuth.ts`
- `src/lib/facebook-login-debug.ts`
- `src/pages/auth/*` القديمة (Login, Register, Callback, ForgotPassword...)
- `src/routes/ProtectedRoute.tsx` (يُعاد بشكل مبسّط)

### Edge Functions
- `supabase/functions/auth-callback/`
- `supabase/functions/facebook-auth-sync/`
- `supabase/functions/send-otp/`
- `supabase/functions/verify-otp/`
- `supabase/functions/auto-register-customer/` (إن وُجد)

### DB (Migration)
- إفراغ جدول `otp_verifications` (يبقى الجدول للاستخدام المستقبلي إن لزم)
- إزالة أي triggers/functions مرتبطة بإنشاء حسابات تلقائية من `maintenance_requests`
- الإبقاء على `profiles` و `user_roles` كما هي (مطلوبة للـ RBAC)

---

## 3) البنية الجديدة (بسيطة، موحّدة، قوية)

### التدفقات المدعومة (3 فقط)
1. **Email + Password** — `signUp` / `signInWithPassword` / `resetPasswordForEmail`
2. **Google OAuth** — عبر Supabase القياسي `signInWithOAuth({ provider: 'google' })`
3. **Phone OTP** — عبر Supabase المدمج `signInWithOtp({ phone })` + `verifyOtp` — بدون Edge Functions مخصصة، Supabase يتولى WhatsApp/SMS عبر Twilio/MessageBird المكوّن في لوحة Supabase Auth.

**ملغى:** Facebook Login (كان مصدر أعطال متكررة — يمكن إعادته لاحقاً كخطوة منفصلة).
**ملغى:** OTP المخصص عبر WhatsApp API الخاص بنا (نستخدم Supabase الرسمي).
**ملغى:** placeholder users من `maintenance_requests` (طلبات الضيوف تبقى `client_phone` نصياً فقط، وعند تسجيل الدخول بنفس الرقم لأول مرة نربطها).

### الملفات الجديدة

```
src/
├── contexts/
│   └── AuthContext.tsx           # مصدر واحد — onAuthStateChange + getSession فقط
├── hooks/
│   └── useAuth.ts                # useAuth + useAuthReady + useRole
├── pages/auth/
│   ├── Login.tsx                 # Tabs: Email | Google | Phone
│   ├── Register.tsx              # Email + Password فقط
│   ├── ResetPassword.tsx         # طلب رابط إعادة تعيين
│   ├── UpdatePassword.tsx        # /reset-password بعد الضغط على الرابط
│   └── Callback.tsx              # /auth/callback — يستقبل OAuth ثم يعيد التوجيه
├── routes/
│   └── ProtectedRoute.tsx        # يعتمد على useAuthReady فقط
└── lib/
    └── roleRedirect.ts           # يبقى كما هو
```

### AuthContext (تصميم مبسّط)

```typescript
- state: { user, session, isReady }
- listener: onAuthStateChange أولاً، ثم getSession
- لا نستدعي getUser داخل الـ listener (سبب race condition)
- signOut موحّد
```

### RLS & Profiles
- Trigger `handle_new_user` على `auth.users` INSERT يُنشئ صف في `profiles` تلقائياً (موجود — نتحقق فقط).
- `user_roles` يبقى كما هو مع `has_role()` security definer.

---

## 4) خطة التنفيذ (مرحلتان)

### المرحلة أ — الحذف والتنظيف (Migration واحد + حذف ملفات)
1. Migration:
   - `DELETE FROM otp_verifications;`
   - إزالة trigger `trg_auto_register_client` إن وُجد
   - إزالة function `auto_register_customer` إن وُجدت
2. حذف Edge Functions القديمة (5 دوال).
3. حذف ملفات Frontend القديمة (~12 ملف).

### المرحلة ب — البناء الجديد
1. `AuthContext.tsx` جديد (~80 سطر).
2. `useAuth.ts` hook (~40 سطر).
3. صفحات `Login/Register/ResetPassword/UpdatePassword/Callback`.
4. `ProtectedRoute.tsx` مبسّط.
5. تحديث `App.tsx` لتسجيل المسارات الجديدة (`/login`, `/register`, `/reset-password`, `/auth/callback`).
6. اختبار كل تدفق يدوياً.

---

## 5) ما سيبقى دون تغيير
- `profiles`, `user_roles`, `has_role()` — RBAC كامل.
- `roleRedirect.ts` — منطق التوجيه بعد الدخول.
- كل شيء خارج نطاق المصادقة (Maintenance, Invoices, Vendors, ...).

---

## 6) المخاطر والتخفيفات
| المخاطرة | التخفيف |
|---|---|
| المستخدمون الحاليون يفقدون جلساتهم | مقبول — سيسجّلون دخول مرة أخرى بنفس الإيميل/Google. الحسابات في `auth.users` تبقى. |
| Phone OTP يحتاج تكوين Twilio في لوحة Supabase | يُفعّل من `Auth > Providers > Phone` بمفاتيح Twilio (متوفرة كـ secrets). |
| Facebook Login مفقود مؤقتاً | ملاحظة صريحة للمستخدم — يُضاف كخطوة لاحقة إن لزم. |
| مسارات قديمة (`/auth`, إلخ) قد تُشير إليها روابط | إعادة توجيه من المسارات القديمة إلى `/login`. |

---

## 7) الموافقة المطلوبة قبل البدء

يرجى تأكيد النقاط التالية:

1. ✅ **حذف Facebook Login مؤقتاً** — موافق؟
2. ✅ **استخدام Supabase Phone OTP الرسمي** بدلاً من WhatsApp API الخاص بنا — موافق؟ (يتطلب تفعيل Twilio في لوحة Supabase)
3. ✅ **إلغاء نظام placeholder users** — طلبات الضيوف تبقى بـ `client_phone` نصياً حتى يسجّل العميل بنفسه — موافق؟
4. ✅ **الاحتفاظ بجدول `profiles` و `user_roles`** كما هي — موافق؟

بعد تأكيدك على النقاط الأربع، أبدأ التنفيذ فوراً (المرحلة أ ثم ب في نفس الرد).
