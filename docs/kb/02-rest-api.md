# 02 — باب REST

العنوان: `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/api`

## نقاط النهاية

| الطريقة | المسار | الوصف |
|---|---|---|
| GET | `/api` | وصف الباب والإصدار |
| GET | `/api/health` | فحص الحياة |
| POST | `/api` (أو `/api/rest`) | المحرك الموحّد |
| POST | `/api/agent/tick` | معالجة منبّهات الوكيل المستحقة (تُناديها pg_cron) |
| GET/POST | `/api/ai/{health,agent,chat,stream,classify,summarize}` | مسارات الذكاء الاصطناعي |

## التوجيه داخل `POST /api`

- الجسم يحتوي `channel` ⟶ محرّك الصيانة (`maintenance.ts`).
- الجسم يحتوي `action` بدون `channel` ⟶ محرّك البوت/الكتالوج (`bot.ts`).
- الجسم يحتوي `jsonrpc` ⟶ رفض 400 مع توجيه إلى `/functions/v1/mcp`.

## المصادقة

| الطريقة | الرأس | الاستخدام |
|---|---|---|
| مفتاح API | `x-api-key: uf_...` | البوتات والتكاملات والاختبارات |
| OAuth2 | `Authorization: Bearer <access_token>` | الشركاء (client_credentials عبر `api-oauth-token`) |
| جلسة مستخدم | `Authorization: Bearer <JWT>` | قناة `internal` فقط، ويُرفض anon/service key |

قناة `internal` تُثبِّت `company_id` من ملف المستخدم و`branch_id` من العقار، وتتجاهل ما يرسله العميل من فرع أو فني.

## الصلاحيات حسب الإجراء (مصدر واحد للحقيقة)

| الإجراء | الصلاحية المطلوبة |
|---|---|
| `create_request` | `requests:write` |
| `add_note` | `requests:write` |
| `get_status` | `requests:read` |
| `transition_stage` | `workflow:transition` |
| `cancel` | `workflow:cancel` |
| غير مُعرَّف | `requests:write` (الافتراضي) |

الفحص يجري **بعد** تحديد الإجراء، لذا توكن `requests:read` يستطيع `get_status` ولا يستطيع الإنشاء.

## Idempotency

- رأس `Idempotency-Key` (UUID) مطلوب لكل عملية إنشاء/تغيير، وصالح 24 ساعة (`api_idempotency_keys`).
- إن فشل حجز المفتاح: يُعاد الفحص، فإمّا يُرجَع الرد المخزون أو `425` مع `Retry-After` — ولا يُنشأ طلب مزدوج أبدًا.

## أمثلة

إنشاء طلب:
```bash
curl -X POST "$BASE/functions/v1/api" \
  -H "x-api-key: $UF_KEY" -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"channel":"api","client_phone":"+201001234567","service_type":"تكييف",
       "description":"التكييف لا يبرد","address":"القاهرة - المعادي"}'
```

الحالة والانتقال:
```bash
curl -X POST "$BASE/functions/v1/api" -H "x-api-key: $UF_KEY" \
  -d '{"channel":"api","action":"get_status","request_number":"AZ-UF-26-09-001091"}'

curl -X POST "$BASE/functions/v1/api" -H "x-api-key: $UF_KEY" \
  -d '{"channel":"api","action":"transition_stage","request_number":"AZ-UF-26-09-001091",
       "to_stage":"closed","rating":5,"feedback":"خدمة ممتازة"}'
```

## إجراءات محرّك البوت (بدون `channel`)

`create_request` · `check_status` · `get_request_details` · `update_request` · `cancel_request` · `add_note` · `assign_technician` · `list_technicians` · `list_categories` · `list_services` · `get_branches` · `find_nearest_branch` · `collect_customer_info` · `get_quote`

قيود: `update_request` لا يغيّر المرحلة، و`cancel_request` يمرّ عبر `fn_transition_request_stage` مع الفاعل والميتاداتا.

## تطبيع المدخلات

- نوع الخدمة: عربي أو إنجليزي ⟶ `plumbing, electrical, ac (hvac/تبريد), carpentry, metalwork, painting, cleaning, other`.
- الأولوية: `high` (عاجل/urgent) · `medium` · `low` (عادي).
- الهاتف: يُطبَّع إلى E.164 حسب المنطقة (`src/lib/phoneRegion.ts`)، والافتراضي مصر `+20`.

## رموز الأخطاء

| الرمز | المعنى | الإجراء |
|---|---|---|
| 400 | جسم أو حقول غير صالحة | راجع `message_ar` |
| 401 | مفتاح/توكن غير صالح | تحقّق من `x-api-key` أو الجلسة |
| 403 | صلاحية ناقصة أو ملكية غير مطابقة | راجع scopes المفتاح |
| 404 | الطلب/العقار غير موجود | تحقّق من رقم الطلب |
| 409 | `illegal_transition` أو `forbidden_transition_role` | راجع 04-lifecycle |
| 425 | Idempotency قيد المعالجة | أعد المحاولة بعد `Retry-After` |
| 429 | تجاوز الحد (120 طلب/دقيقة للمفتاح) | خفّض المعدل |
