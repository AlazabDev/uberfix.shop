# 🌐 UberFix Backend — بابان فقط

```text
                    ┌── REST API   /functions/v1/api    للتطبيقات والتكاملات والاختبارات
UberFix Backend ────┤
                    └── MCP Server /functions/v1/mcp    لوكلاء الذكاء الاصطناعي
                                 │
                                 ▼
                   نواة الأعمال المشتركة (_shared/core)
                                 ▼
                     PostgreSQL (Supabase + RLS)
```

## 1) REST API — `/functions/v1/api`

| المسار | الغرض |
|---|---|
| `GET  /api/` | وصف الباب |
| `GET  /api/health` | فحص الحياة |
| `POST /api/` | `{channel,...}` للصيانة أو `{action,payload}` للكتالوج والاستعلامات |
| `POST /api/ai/{agent,chat,stream,classify,summarize}` | مسارات الذكاء |

### المصادقة
- `x-api-key: <BOT_API_KEY>` — للبوتات والتكاملات (مفاتيح `api_consumers`، مخزَّنة كبصمة SHA-256 في `api_key_hash`).
- `Authorization: Bearer <JWT>` — للواجهة والموبايل. قناة `internal` تتطلب جلسة مستخدم حقيقية.
- مفتاح غير صالح ⇒ `403`، وغياب المصادقة ⇒ `401`.

### القنوات المتاحة
`whatsapp_flow`, `jotform`, `public_form`, `qr_guest`, `facebook_lead`, `phone`,
`internal`, `whatsapp_chat`, `email`, `api`, `bot_gateway`.

### اختبار سريع
```bash
A="https://zrrffsjbfkphridqyais.supabase.co/functions/v1/api"
curl "$A/health"
curl -X POST "$A" -H "Content-Type: application/json" -H "x-api-key: $UF_KEY" \
  -d '{"action":"list_services","payload":{}}'
curl -X POST "$A" -H "Content-Type: application/json" -H "x-api-key: $UF_KEY" \
  -d '{"channel":"api","client_name":"أحمد","client_phone":"01004006620",
       "service_type":"electrical","description":"قطع كهرباء","priority":"high"}'
```

## 2) MCP Server — `/functions/v1/mcp`

خادم MCP مستقل للوكلاء، أدواته تُكتب في `src/lib/mcp/tools/` وتُبنى تلقائيًا إلى
`supabase/functions/mcp/`. الأدوات الحالية: `list_services`, `list_branches`,
`find_nearest_branch`, `track_maintenance_request`, `create_maintenance_request`
(تنفّذ عبر REST بنفس قواعد الأمان).

```json
{
  "mcpServers": {
    "uberfix": {
      "url": "https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp"
    }
  }
}
```

عمليات التشغيل الحساسة (نقل المرحلة، الإلغاء، الملاحظات، إسناد الفنيين) تبقى على
REST بمفتاح صالح، ولا تُعرَض كأدوات عامة بدون مصادقة.

## 3) المسارات المهجورة

| القديم | البديل | الحالة |
|---|---|---|
| `/functions/v1/gateway` | `/functions/v1/api` | shim يحوّل تلقائيًا |
| `/functions/v1/gateway/mcp` | `/functions/v1/mcp` | JSON-RPC يُحوَّل تلقائيًا |
| `/functions/v1/bot-gateway` | `/functions/v1/api` | shim يحوّل تلقائيًا |
| `/functions/v1/maintenance-gateway` | `/functions/v1/api` | shim يحوّل تلقائيًا |

كل استجابة من المسارات القديمة تحمل الرأس `x-uberfix-deprecated`.

## 4) تنظيم الكود

```
supabase/functions/
  api/index.ts                باب REST (Hono) — رقيق
  mcp/index.ts                خادم MCP (مولّد من src/lib/mcp)
  _shared/core/maintenance.ts دورة حياة طلبات الصيانة
  _shared/core/bot.ts         الكتالوج والاستعلامات وأدوات البوت
  _shared/core/ai.ts + ai/    الذكاء الاصطناعي والوكيل الداخلي
  _shared/api-consumer.ts     مصادقة مفاتيح api_consumers (SHA-256)
  _shared/legacy-shim.ts      وسيط المسارات القديمة
  gateway|bot-gateway|maintenance-gateway/index.ts   سطر واحد يستدعي الوسيط
```
