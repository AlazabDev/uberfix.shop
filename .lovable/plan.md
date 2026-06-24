# 🧠 دمج Azure OpenAI داخل UberFix Unified Gateway

الهدف: ربط مورِدَي Azure OpenAI التاليين بالبوابة الموحّدة كطبقة ذكاء واحدة:
- **`az-agent-maint`** (Agent · GPT-4.1) — وكيل صيانة يستدعي أدوات MCP الموجودة (إنشاء طلب، نقل مرحلة، استعلام حالة، كتالوج، فروع…).
- **`az-model-maint`** (Model · GPT-5.1) — موديل خام للتلخيص/التصنيف/الردود السريعة (chat completions + structured output).

النموذج المعماري يبقى كما هو:
`Clients → Unified Gateway → MCP Core → Business Engine → DB`
طبقة الذكاء تُضاف كـ **AI Layer داخل البوابة فقط** — لا واجهات مباشرة من العميل لـ Azure.

---

## 1) الأسرار المطلوبة (Edge Function Secrets)

سأطلبها عبر `add_secret` بعد موافقتك:

| Secret | الوصف |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | مثل `https://<resource>.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | مفتاح المورد |
| `AZURE_OPENAI_API_VERSION` | مثل `2024-10-21` (أو الأحدث) |
| `AZURE_OPENAI_AGENT_ID` | معرف الـ Assistant/Agent `az-agent-maint` |
| `AZURE_OPENAI_AGENT_DEPLOYMENT` | اسم نشر GPT-4.1 المرتبط بالوكيل |
| `AZURE_OPENAI_MODEL_DEPLOYMENT` | اسم نشر `az-model-maint` (GPT-5.1) |

ملاحظة: لن أستبدل `LOVABLE_API_KEY` — يبقى للـ AI Gateway. Azure مسار مستقل للصيانة فقط.

---

## 2) البنية الجديدة داخل `supabase/functions/gateway/`

```text
gateway/
├── index.ts                  ← (موجود) Hono router
├── engine/
│   ├── maintenance.ts        ← (موجود)
│   ├── bot.ts                ← (موجود)
│   └── ai.ts                 ← 🆕 محرك Azure (agent + model)
└── ai/
    ├── azure-client.ts       ← 🆕 عميل REST لـ Azure OpenAI
    ├── agent-runtime.ts      ← 🆕 Threads/Runs + tool-calling bridge → MCP
    └── tool-bridge.ts        ← 🆕 يحوّل أدوات MCP الـ 13 إلى Azure tool schema
```

### المسارات الجديدة في البوابة

| Endpoint | الغرض |
|---|---|
| `POST /gateway/ai/agent` | محادثة مع `az-agent-maint` (مع تشغيل تلقائي لأدوات MCP) |
| `POST /gateway/ai/chat` | استدعاء مباشر لـ `az-model-maint` (chat completions) |
| `POST /gateway/ai/stream` | نفس `/chat` لكن SSE streaming |
| `POST /gateway/ai/classify` | structured output (تصنيف الطلب/الأولوية تلقائياً) |
| `POST /gateway/ai/summarize` | تلخيص محادثة/طلب |
| `GET  /gateway/ai/health` | فحص الاتصال بـ Azure |

كلها تمرّ بنفس مصادقة البوابة (`x-api-key` أو JWT) وتُسجَّل في `api_gateway_logs`.

---

## 3) Agent ↔ MCP Tool Bridge

`az-agent-maint` سيُعرَّف عليه — تلقائياً عند أول استدعاء — نفس أدوات MCP الـ 13 الموجودة:
`create_maintenance_request`, `transition_request_stage`, `get_request_status`,
`cancel_request`, `add_request_note`, `list_services`, `list_categories`,
`list_technicians`, `get_branches`, `find_nearest_branch`, `get_quote`,
`check_status_quick`, `server_info`.

التدفق:
```text
Client → /gateway/ai/agent (prompt)
       → Azure Assistant.run
       → tool_calls (e.g. create_maintenance_request)
       → tool-bridge → invokeEngine('maintenance'|'bot') → DB
       → tool_outputs back to Azure
       → final response → Client
```

يعني: **مكان واحد للحقيقة** — نفس الأدوات تخدم MCP الخارجي وAzure Agent.

---

## 4) قاعدة البيانات — جدول جلسات/تتبّع AI

```sql
CREATE TABLE public.ai_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       text,                 -- Azure thread id (للوكيل)
  channel         text NOT NULL,        -- 'agent' | 'chat' | 'classify' | ...
  consumer_id     uuid REFERENCES api_consumers(id),
  user_id         uuid,
  request_id      uuid REFERENCES maintenance_requests(id),
  model           text NOT NULL,        -- deployment name used
  prompt_tokens   int DEFAULT 0,
  completion_tokens int DEFAULT 0,
  total_tokens    int DEFAULT 0,
  tool_calls      jsonb DEFAULT '[]'::jsonb,
  status          text DEFAULT 'ok',
  error           text,
  created_at      timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ai_sessions TO authenticated;
GRANT ALL ON public.ai_sessions TO service_role;
ALTER TABLE public.ai_sessions ENABLE ROW LEVEL SECURITY;
-- سياسات: admin/finance قراءة كاملة، المستخدم يقرأ جلساته فقط.
```

+ `v_ai_usage_dashboard` لعرض التكلفة/الاستخدام في لوحة الإدارة.

---

## 5) واجهة الإدارة (تغييرات أمامية بسيطة)

- إضافة تبويب **"AI Layer"** داخل `ApiGatewayPortal`:
  - حالة الاتصال بـ Azure (`/gateway/ai/health`).
  - جدول `v_ai_usage_dashboard` (طلبات/توكينز/تكلفة تقديرية).
  - زر اختبار سريع (prompt → response).
- ربط شات AzaBot الحالي بـ `/gateway/ai/agent` بدل المسار القديم (`ai-chat` edge function سيتم تجميده ثم حذفه في PR منفصل).

---

## 6) الأمان والامتثال

- Azure keys تبقى **server-side** فقط (Edge Function Secrets).
- كل استدعاء يُسجَّل في `api_gateway_logs` + `ai_sessions`.
- Rate limit لكل `consumer_id` (افتراضي 60/min، 1000/day) — قابل للتعديل.
- لا تُمرَّر بيانات PII خام للموديل: tool-bridge يطبّق `mask_phone/mask_name` قبل الإرسال (متوافق مع memory `contract-pii-masking-policy`).
- توافق مع قانون 151/2020: لا تخزين لمحتوى المحادثة الخام افتراضياً (يخزَّن فقط `tool_calls` و metadata) — يمكن تفعيله بعلم صريح من المسؤول.

---

## 7) خطوات التنفيذ (بالترتيب)

1. **Migration**: إنشاء `ai_sessions` + view + policies.
2. **Secrets**: طلب الأسرار الستة عبر `add_secret`.
3. **Azure client** (`ai/azure-client.ts`): wrapper REST بسيط (chat + assistant runs + SSE).
4. **Tool bridge** (`ai/tool-bridge.ts`): تحويل manifest الـ MCP إلى Azure tools + executor يستدعي `invokeEngine`.
5. **Agent runtime** (`ai/agent-runtime.ts`): إدارة Threads/Runs + polling/streaming + tool submission.
6. **AI engine** (`engine/ai.ts`): handlers للـ 6 routes أعلاه + logging في `ai_sessions`.
7. **Router**: إضافة الـ 6 مسارات في `gateway/index.ts`.
8. **Frontend**:
   - تبويب AI Layer في `ApiGatewayPortal`.
   - تحويل `chat-service.ts` لاستخدام `/gateway/ai/stream`.
9. **Docs**: تحديث `docs/UF_UNIFIED_GATEWAY.md` بفصل AI Layer كامل + أمثلة curl.
10. **Test**: سكربت اختبار end-to-end (prompt → agent → tool call → DB row → response).
11. **Cleanup**: تجميد `ai-chat` edge function (لا حذف فوري — هجرة آمنة).

---

## 8) المخاطر

- إذا كان `az-agent-maint` معرَّفاً بالفعل بأدوات أخرى في Azure Portal، قد يحدث تضارب. الخطة تفترض أن البوابة هي **المصدر الوحيد** لتعريف الأدوات (override عند الإنشاء).
- GPT-5.1 deployment name يختلف باختلاف الـ region — يجب تأكيد الاسم الفعلي.
- استدعاءات الـ Assistant API أبطأ من chat completions (polling) — لذلك `/ai/chat` يبقى المسار السريع، والوكيل للمهام المركّبة فقط.

---

## 9) أسئلة قبل البدء

1. **اسم نشر GPT-5.1**: هل هو حرفياً `az-model-maint` أم اسم آخر داخل Azure؟ (نفس السؤال لـ Agent deployment).
2. **API Version**: هل تستخدم `2024-10-21` (الأحدث الثابت) أم preview؟
3. **AzaBot الحالي**: هل أربطه فوراً بالوكيل الجديد أم أبقيه على مساره لحين تجربتك؟

**موافقتك على الخطة + إجابة السؤالين الأولين تكفي لبدء التنفيذ فوراً.**
