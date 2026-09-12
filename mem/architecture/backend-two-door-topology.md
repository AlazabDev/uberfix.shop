---
name: Backend two-door topology
description: الباك اند بابان فقط — REST على /functions/v1/api وMCP على /functions/v1/mcp، والمنطق في _shared/core
type: feature
---

منذ 2026-09-12 الباك اند منظَّم كبابين رقيقين فوق نواة مشتركة:

- **REST API**: `/functions/v1/api` (`supabase/functions/api/index.ts`, Hono, basePath `/api`).
  يقبل `{channel,...}` للصيانة و`{action,payload}` للكتالوج/الاستعلامات، و`/api/ai/*` للذكاء،
  و`/api/health`. المصادقة: `x-api-key` (SHA-256 على `api_consumers.api_key_hash`) أو `Bearer JWT`؛
  قناة `internal` تتطلب جلسة مستخدم حقيقية وتثبّت الشركة/الفرع من الهوية.
- **MCP Server**: `/functions/v1/mcp` فقط. الأدوات تُكتب في `src/lib/mcp/tools/` وتُبنى تلقائيًا.
  عام بلا مصادقة ⇒ يُسمح فقط بأدوات القراءة العامة و`create_maintenance_request`؛ العمليات
  الحساسة تبقى على REST بمفتاح صالح.
- **نواة الأعمال**: `supabase/functions/_shared/core/` (`maintenance.ts`, `bot.ts`, `ai.ts`, `ai/`).
  لا تُكرَّر في أي دالة أخرى.
- **مهجور لكن يعمل**: `gateway`, `bot-gateway`, `maintenance-gateway` أصبحت سطرًا واحدًا يستدعي
  `_shared/legacy-shim.ts`، يحوّل REST إلى `/api` وJSON-RPC إلى `/mcp` مع رأس `x-uberfix-deprecated`.
  لا مسار MCP داخل `/gateway` بعد الآن.

أي كود جديد يستدعي `functions.invoke('api', ...)` وليس `'gateway'`.
