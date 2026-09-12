# 🌐 UberFix Unified API Gateway

> نقطة الدخول **الوحيدة** لكل النظام — تطبق المعمارية الموحّدة:
> `Clients → Unified Gateway → MCP Core → Business Engine → Database`.

## 🔗 العنوان

```
https://zrrffsjbfkphridqyais.supabase.co/functions/v1/gateway
```

| المسار | الغرض |
|---|---|
| `GET  /gateway/`        | ميتاداتا الخادم |
| `GET  /gateway/health`  | فحص الحياة |
| `POST /gateway/`        | REST — يقبل `{action,payload,...}` أو `{channel,action,...}` |
| `POST /gateway/mcp`     | MCP Streamable HTTP (initialize / tools/list / tools/call) |

## 🔑 المصادقة

- `x-api-key: <BOT_API_KEY>` — للبوتات والتكاملات الخارجية (مفاتيح `api_consumers`).
- `Authorization: Bearer <JWT>` — للموبايل والواجهة (Supabase Auth).

## 🧠 MCP Core (أدوات البروتوكول)

| الفئة | الأدوات |
|---|---|
| Maintenance Lifecycle | `create_maintenance_request`, `transition_request_stage`, `get_request_status`, `cancel_request`, `add_request_note` |
| Resource Registry     | `list_services`, `list_categories`, `list_technicians`, `get_branches`, `find_nearest_branch` |
| Context / Quote       | `get_quote`, `check_status_quick`, `server_info` |

## 🧪 اختبار سريع

```bash
G="https://zrrffsjbfkphridqyais.supabase.co/functions/v1/gateway"
K="uf_e4c85e466a4428909ea1baf8f7998ce98e1f1ba0bb69d69e"

# 1) Health
curl "$G/health"

# 2) REST: catalog
curl -X POST "$G" -H "Content-Type: application/json" -H "x-api-key: $K" \
  -d '{"action":"list_services","payload":{}}'

# 3) REST: create maintenance request
curl -X POST "$G" -H "Content-Type: application/json" -H "x-api-key: $K" \
  -d '{"channel":"api","client_name":"أحمد","client_phone":"01004006620",
       "service_type":"electrical","description":"قطع كهرباء","priority":"high"}'

# 4) MCP: list tools
curl -X POST "$G/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: $K" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 🖥️ Claude Desktop / Cursor / Rasa

```json
{
  "mcpServers": {
    "uberfix": {
      "url": "https://zrrffsjbfkphridqyais.supabase.co/functions/v1/gateway/mcp",
      "headers": { "x-api-key": "uf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
    }
  }
}
```

## 📜 ملاحظات الهجرة

| القديم (مهجور) | البديل | الحالة |
|---|---|---|
| `/functions/v1/maintenance-gateway` | `/functions/v1/gateway` | يعمل كـ shim يحوّل الطلب تلقائياً |
| `/functions/v1/bot-gateway`         | `/functions/v1/gateway` | يعمل كـ shim يحوّل الطلب تلقائياً |
| `/functions/v1/mcp`                 | `/functions/v1/gateway/mcp` | JSON-RPC على الجذر يُحوَّل تلقائياً |

المسارات القديمة ترجع هيدر `x-uberfix-deprecated`؛ يُفضَّل تحديث البوتات إلى `/gateway`.

### مصادقة المفاتيح
مفاتيح `api_consumers` تُخزَّن كبصمة **SHA-256** في `api_key_hash`، والمقارنة تتم على البصمة
في كل المحركات (`maintenance` / `bot` / `ai`) عبر `_shared/api-consumer.ts`.
مفتاح غير صالح ⇒ `403 Invalid or inactive API key`، وغياب أي مصادقة ⇒ `401 Unauthorized`.


## 🏛️ المعمارية

```
┌────────────────────────────────────────────────┐
│ Clients: Mobile / Web / AzSTT / Bots / Webhook │
└────────────────────┬───────────────────────────┘
                     │ REST + MCP
                     ▼
        ┌────────────────────────────┐
        │   UNIFIED API GATEWAY      │  ← functions/gateway
        │  Auth · Rate-limit · Logs  │
        └────────────┬───────────────┘
                     ▼
        ┌────────────────────────────┐
        │   MCP SERVER CORE          │
        │  Tools · Context · Schemas │
        └────────────┬───────────────┘
                     ▼
        ┌────────────────────────────┐
        │   BUSINESS LOGIC ENGINE    │
        │  Tickets · Dispatch · SLA  │
        └────────────┬───────────────┘
                     ▼
         PostgreSQL (Supabase + RLS)
```