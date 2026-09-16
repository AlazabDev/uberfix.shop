# 01 — المعمارية

## المكوّنات

- **الواجهة**: React 18 + Vite 5 + TypeScript + Tailwind (RTL أولًا، خطوط Jozoor/Cairo، اللونان `#030957` و`#FFB900`).
- **الخلفية**: Supabase (PostgreSQL + Auth + Storage + Edge Functions) على مشروع `zrrffsjbfkphridqyais`.
- **الموبايل**: PWA فقط. لا Capacitor ولا مجلد `android/`.

## البابان الرسميان

```
التطبيقات والتكاملات والاختبارات ──▶ POST /functions/v1/api      (REST)
وكلاء الذكاء الاصطناعي           ──▶      /functions/v1/mcp      (MCP)
                                            │
                                            ▼
                            supabase/functions/_shared/core/
                     maintenance.ts · bot.ts · ai.ts · agent-timers.ts · agent-dialog.ts
                                            │
                                            ▼
                                PostgreSQL + RLS + دوال SECURITY DEFINER
```

`gateway`، `bot-gateway`، `maintenance-gateway` باقية كطبقات توافق (shims) تنادي نفس النواة. لا تُبنى ميزات جديدة عليها.

## النواة المشتركة `_shared/core/`

| الملف | المسؤولية |
|---|---|
| `maintenance.ts` | إنشاء الطلب، حالته، الانتقالات، الإلغاء، الملاحظات، idempotency، الصلاحيات حسب الإجراء |
| `bot.ts` | إجراءات البوتات والكتالوج (فنيون، خدمات، فروع، تسعير) + سياق المتصل `CallerCtx` |
| `ai.ts` + `ai/tool-bridge.ts` | مسارات الذكاء الاصطناعي وترجمة أدوات الوكيل إلى إجراءات النواة |
| `agent-timers.ts` | المنبّه الذاتي للوكيل والتصعيد الزمني (`POST /api/agent/tick`) |
| `agent-dialog.ts` | حوار الوكيل مع المسؤولين وتأكيد العميل عبر واتساب |
| `../api-consumer.ts` | مصادقة مفاتيح API، الصلاحيات، `metadata.delegated_actor_id` |

## القنوات المعتمدة (`channel`)

`internal` (جلسة مستخدم إلزامية) · `api` (مفتاح API) · `bot_gateway` (نداء داخلي) · `public` · `whatsapp` · `jotform` · `facebook`.

قنوات غير صالحة يجب ألا تُستخدم: `ai-agent`، `mcp-public`.

## قواعد تعديل الكود

- لا تكرار للمنطق في دوال جديدة — أضف الإجراء إلى النواة.
- كل إجراء جديد يُسجَّل في `ACTION_SCOPES` مع صلاحيته.
- الردود دائمًا `{ error, message_ar, ... }` عند الفشل، ولا تُغيَّر أسماء الحقول العامة الحالية.
