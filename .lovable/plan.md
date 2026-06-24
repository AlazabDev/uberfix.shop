# خطة التوحيد المعماري — UberFix Unified Gateway + MCP Core

## الهدف
تطبيق المعمارية الموضحة في الصورة بالكامل:
- **بوابة واحدة فقط** (`unified-gateway`) كنقطة دخول وحيدة لكل العملاء (الموبايل، الويب، AzSTT).
- **MCP Server Core** يدير البروتوكول والسياق (User/Asset Context + Resource Registry).
- **Business Logic Engine** موحّد لدورة حياة الصيانة.
- **حذف كل البوابات والمسارات المكررة** الموجودة حالياً.

---

## 1) الوضع الحالي (الفوضى المطلوب إزالتها)

يوجد حالياً **3 بوابات منفصلة** تقوم بأعمال متداخلة:

| البوابة الحالية | الوظيفة | المصير |
|---|---|---|
| `maintenance-gateway` | طلبات الصيانة + transitions | **تُدمج** |
| `bot-gateway` | البوتات + الكتالوج + الفروع | **تُدمج** |
| `mcp` | MCP wrapper يستدعي البوابتين أعلاه | **يُعاد بناؤه** كـ Core |
| Edge functions متفرقة (whatsapp-webhook, jotform, paytabs, ...) | تكاملات | تبقى كـ **adapters** خلفية فقط |

---

## 2) المعمارية الجديدة

```text
┌─────────────────────────────────────────────────────────┐
│  CLIENTS: Mobile App │ Web Dashboard │ AzSTT │ Bots     │
└──────────────────────┬──────────────────────────────────┘
                       │  REST + WebSocket
                       ▼
        ┌──────────────────────────────────┐
        │   UNIFIED API GATEWAY (single)   │  ← supabase/functions/gateway
        │   • Auth (x-api-key / JWT)       │
        │   • Rate limit + Logging         │
        │   • Routing → MCP Core           │
        └──────────────┬───────────────────┘
                       ▼
        ┌──────────────────────────────────┐
        │   MCP SERVER CORE                │  ← supabase/functions/gateway/mcp/
        │   ├─ Tool Handler                │
        │   ├─ Context Manager (User/Asset)│
        │   └─ Resource Registry (Schemas) │
        └──────────────┬───────────────────┘
                       ▼
        ┌──────────────────────────────────┐
        │   BUSINESS LOGIC ENGINE          │  ← supabase/functions/gateway/engine/
        │   create │ dispatch │ status │ … │
        └──────────────┬───────────────────┘
                       ▼
        ┌──────────────────────────────────┐
        │   DATABASE ACCESS LAYER (RLS)    │
        │   PostgreSQL (Supabase)          │
        └──────────────────────────────────┘
```

---

## 3) خطوات التنفيذ

### المرحلة A — بناء البوابة الموحّدة
1. إنشاء `supabase/functions/gateway/index.ts` كنقطة الدخول الوحيدة.
   - تستقبل: `POST /gateway` (REST) + `GET /gateway/mcp` (MCP Streamable HTTP) + `GET /gateway/ws` (WebSocket للأحداث الحية).
   - تتحقق من `x-api-key` أو JWT.
   - تُسجّل كل طلب في `api_gateway_logs`.
2. إنشاء `gateway/mcp/server.ts` — MCP Core كامل (Tool Handler + Context + Registry).
3. إنشاء `gateway/engine/` — كل عمليات الأعمال (create_request, transition, list_services, branches, quote, ...).
4. إنشاء `gateway/_shared/` — auth, logging, rate-limit, schemas.

### المرحلة B — هجرة الواجهة الأمامية
1. تعديل `src/lib/bot-gateway/client.ts` → `src/lib/gateway/client.ts` ليستدعي `/gateway` فقط.
2. تحديث كل استدعاءات `supabase.functions.invoke('maintenance-gateway' | 'bot-gateway')` → `gateway`.
3. تحديث `ApiGatewayPortal` ليعرض البوابة الموحّدة فقط.
4. تحديث `docs/UF_MCP_SERVER.md` و `docs/UF_API_ENDPOINTS.md`.

### المرحلة C — الحذف
1. حذف `supabase/functions/maintenance-gateway/`.
2. حذف `supabase/functions/bot-gateway/`.
3. حذف `supabase/functions/mcp/` (القديم).
4. إزالة المراجع من `supabase/config.toml`.
5. تنظيف الـ memory references.

### المرحلة D — التحقق
1. Deploy للـ `gateway`.
2. اختبار:
   - `curl POST /gateway` بـ action قديم → يعمل.
   - `curl POST /gateway/mcp` initialize + tools/list → يعمل.
   - WebSocket subscription للأحداث → يعمل.
3. اختبار من الواجهة (إنشاء طلب، عرض الكتالوج).
4. مراجعة logs.

---

## 4) ملفات ستُنشأ / تُعدّل / تُحذف

**إنشاء:**
- `supabase/functions/gateway/index.ts`
- `supabase/functions/gateway/mcp/server.ts`
- `supabase/functions/gateway/mcp/context.ts`
- `supabase/functions/gateway/mcp/registry.ts`
- `supabase/functions/gateway/engine/maintenance.ts`
- `supabase/functions/gateway/engine/catalog.ts`
- `supabase/functions/gateway/engine/branches.ts`
- `supabase/functions/gateway/_shared/auth.ts`
- `supabase/functions/gateway/_shared/logger.ts`
- `src/lib/gateway/client.ts`
- `docs/UF_UNIFIED_GATEWAY.md` (يستبدل القديم)

**تعديل:**
- `supabase/config.toml` — إضافة `gateway`، إزالة المهجور.
- كل ملفات الـ frontend التي تستدعي `maintenance-gateway` أو `bot-gateway`.
- `src/pages/admin/ApiGatewayPortal.tsx`.

**حذف:**
- `supabase/functions/maintenance-gateway/` (كامل)
- `supabase/functions/bot-gateway/` (كامل)
- `supabase/functions/mcp/` (كامل — يُعاد بناؤه داخل gateway)
- `docs/UF_MCP_SERVER.md` (يُدمج)
- `src/lib/bot-gateway/` (كامل)

---

## 5) أسئلة قبل التنفيذ

أحتاج تأكيدك على نقطتين حسّاستين قبل الحذف:

### أ) المصادقة الموحّدة
البوابة الجديدة ستقبل **نوعين فقط** من المصادقة:
- `x-api-key` للبوتات والتكاملات الخارجية (نفس الـ 5 مفاتيح الحالية).
- `Authorization: Bearer <JWT>` للموبايل والويب (Supabase Auth).

هل توافق؟ أم تريد إضافة OAuth2 client_credentials كذلك؟

### ب) تكاملات الـ Webhooks الخارجية
يوجد حالياً Edge Functions تستقبل webhooks من جهات خارجية (WhatsApp, Meta, Jotform, PayTabs).
- **الخيار 1 (موصى به):** تبقى كـ adapters مستقلة، لكنها داخلياً تستدعي `gateway` فقط — لا تكتب في DB مباشرة.
- **الخيار 2:** تُدمج كلها داخل `/gateway/webhooks/{provider}` route واحد.

أيهما تريد؟

---

## 6) المخاطر
- **Breaking change** لكل العملاء الحاليين (موبايل، بوتات WhatsApp، JotForm). يجب تحديث كل المفاتيح والمسارات في خطوة واحدة.
- يجب إعادة deploy للـ Android APK لأن endpoints ستتغير.
- ستحتاج فترة freeze قصيرة أثناء النشر.

**هل أبدأ التنفيذ بعد إجابتك على السؤالين أعلاه؟**
