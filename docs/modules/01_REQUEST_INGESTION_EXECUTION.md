# Module 01 — Request Ingestion Execution

هذا الدليل ينشر ويختبر موديول إنشاء واستقبال طلب الصيانة فقط.

## النطاق

الدوال التي يتم نشرها:

- `gateway`
- `submit-public-request`

المسارات التي يتم اختبارها:

- طلب عام عادي.
- طلب عاجل بقيمة Alias مثل `power_outage`.
- طلب دوري بقيمة Alias مثل `electrical_periodic`.
- رفض `channel: internal` بدون JWT.
- قبول `channel: internal` بجلسة مستخدم صحيحة وعقار تابع لنفس الشركة.

## 1. سحب فرع العمل

```bash
git fetch origin
git switch agent/module-01-request-ingestion
git pull --ff-only
npm ci
```

## 2. تسجيل دخول Supabase CLI

```bash
npx supabase login
```

لا تضع Access Token أو Service Role Key داخل المستودع.

## 3. نشر الدوال

### PowerShell

```powershell
$env:SUPABASE_PROJECT_REF = "zrrffsjbfkphridqyais"
$env:SUPABASE_URL = "https://zrrffsjbfkphridqyais.supabase.co"
$env:SUPABASE_ANON_KEY = "ضع المفتاح العام هنا مؤقتاً داخل الجلسة فقط"

npm run deploy:module01
```

### Bash

```bash
export SUPABASE_PROJECT_REF="zrrffsjbfkphridqyais"
export SUPABASE_URL="https://zrrffsjbfkphridqyais.supabase.co"
export SUPABASE_ANON_KEY="ضع المفتاح العام هنا مؤقتاً داخل الجلسة فقط"

npm run deploy:module01
```

سكريبت النشر:

1. يقرأ Project Ref من البيئة أو `supabase/config.toml`.
2. يتحقق من Supabase CLI.
3. ينشر `gateway`.
4. ينشر `submit-public-request`.
5. يستدعي `/gateway/health` للتأكد من نجاح النشر.

## 4. إعداد اختبار E2E

الاختبار ينشئ طلبات حقيقية؛ لذلك لن يعمل إلا عند ضبط:

```text
MODULE01_ALLOW_WRITES=YES
```

### PowerShell

```powershell
$env:SUPABASE_URL = "https://zrrffsjbfkphridqyais.supabase.co"
$env:SUPABASE_ANON_KEY = "المفتاح العام"
$env:MODULE01_ALLOW_WRITES = "YES"
$env:MODULE01_TEST_SCOPE = "all"

$env:TEST_CLIENT_PHONE = "+201000000000"
$env:TEST_COMPANY_NAME = "اسم الشركة كما هو مسجل"
$env:TEST_BRANCH_NAME = "اسم الفرع كما هو مسجل"

$env:TEST_USER_EMAIL = "بريد مستخدم اختبار داخلي"
$env:TEST_USER_PASSWORD = "كلمة مرور مستخدم الاختبار"
$env:TEST_PROPERTY_ID = "UUID لعقار تابع لنفس شركة المستخدم"

npm run test:e2e:module01
```

### Bash

```bash
export SUPABASE_URL="https://zrrffsjbfkphridqyais.supabase.co"
export SUPABASE_ANON_KEY="المفتاح العام"
export MODULE01_ALLOW_WRITES="YES"
export MODULE01_TEST_SCOPE="all"

export TEST_CLIENT_PHONE="+201000000000"
export TEST_COMPANY_NAME="اسم الشركة كما هو مسجل"
export TEST_BRANCH_NAME="اسم الفرع كما هو مسجل"

export TEST_USER_EMAIL="بريد مستخدم اختبار داخلي"
export TEST_USER_PASSWORD="كلمة مرور مستخدم الاختبار"
export TEST_PROPERTY_ID="UUID لعقار تابع لنفس شركة المستخدم"

npm run test:e2e:module01
```

## 5. تشغيل جزء واحد فقط

### النموذج العام فقط

```powershell
$env:MODULE01_TEST_SCOPE = "public"
npm run test:e2e:module01
```

### الطلب الداخلي فقط

```powershell
$env:MODULE01_TEST_SCOPE = "internal"
npm run test:e2e:module01
```

## 6. النتيجة المتوقعة

يجب أن يظهر:

```text
✓ Public general: MR-...
✓ Public urgent alias: MR-...
✓ Public periodic alias: MR-...
✓ تم رفض internal بدون JWT كما هو مطلوب
✓ تم تسجيل الدخول للاختبار الداخلي
✓ Authenticated internal: MR-...
✓ اكتمل اختبار Module 01 بنجاح
```

## 7. التحقق من قاعدة البيانات

بعد الاختبار، راجع الطلبات التي طبعها السكربت وتأكد من:

- `workflow_stage = submitted`
- `status = Open`
- القناة `public_form` أو `internal`
- تطابق `company_id` و`branch_id` مع الفرع أو العقار.
- وجود `GATEWAY_REQUEST_CREATED` في `audit_logs`.
- عدم وجود `assigned_technician_id` عند الاستقبال.
- وجود رقم طلب موحد وغير فارغ.

## 8. قرار الدمج

لا يتم دمج PR #59 إلى `develop` إلا بعد:

```bash
npm ci
npm run check
npm run test:unit
npm run build
npm run deploy:module01
npm run test:e2e:module01
```

ثم تتم مراجعة الطلبات التجريبية داخل Supabase قبل اعتماد الموديول.
