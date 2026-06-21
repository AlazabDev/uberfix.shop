# 🧠 UberFix MCP Server — دليل التنفيذ الموحّد لطلبات الصيانة

خادم **Model Context Protocol** يعرض كل بروتوكول بوابة الصيانة (`maintenance-gateway`)
وبوابة البوتات (`bot-gateway`) كـ **أدوات MCP** قابلة للاستخدام من أي عميل MCP:
Claude Desktop, Cursor, Rasa, ChatGPT Custom Connectors, n8n MCP, إلخ.

---

## 🔗 العنوان الموحّد

| نوع | URL |
|---|---|
| **Public (Custom Domain)** | `https://uberfix.alazab.com/mcp` |
| **Direct (Supabase)** | `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp` |

> الـ Custom Domain يعمل بعد إضافة كتلة `location /mcp` في nginx (انظر أدناه).

## 🔑 المصادقة

- Header: `x-api-key: <BOT_API_KEY>` — نفس مفاتيح bot-gateway الخمسة الموثّقة في `docs/UF_API_ENDPOINTS.md`.
- Rate-limit: 120 req/min لكل مفتاح (مُطبَّقة على البوابات الخلفية).

## 🛠️ الأدوات المتاحة (12 أداة)

| الأداة | الوظيفة |
|---|---|
| `create_maintenance_request` | إنشاء طلب صيانة جديد |
| `transition_request_stage` | نقل الطلب بين 16 مرحلة |
| `get_request_status` | حالة طلب |
| `cancel_request` | إلغاء |
| `add_request_note` | إضافة ملاحظة |
| `list_services` | كتالوج الخدمات |
| `list_technicians` | الفنيون المتاحون |
| `list_categories` | تصنيفات الصيانة |
| `get_branches` | كل الفروع |
| `find_nearest_branch` | أقرب فرع جغرافياً |
| `get_quote` | طلب عرض سعر |
| `check_status_quick` | استعلام سريع |
| `server_info` | معلومات الخادم |

## 🧪 اختبار سريع

```bash
# Initialize
curl -X POST https://uberfix.alazab.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: uf_e4c85e466a4428909ea1baf8f7998ce98e1f1ba0bb69d69e" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# List tools
curl -X POST https://uberfix.alazab.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: uf_e4c85e466a4428909ea1baf8f7998ce98e1f1ba0bb69d69e" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call: create request
curl -X POST https://uberfix.alazab.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: uf_e4c85e466a4428909ea1baf8f7998ce98e1f1ba0bb69d69e" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"create_maintenance_request","arguments":{"client_name":"أحمد","client_phone":"01004006620","service_type":"electrical","description":"قطع كهرباء","priority":"high"}}}'
```

## 🖥️ Claude Desktop config

```json
{
  "mcpServers": {
    "uberfix": {
      "url": "https://uberfix.alazab.com/mcp",
      "headers": { "x-api-key": "uf_e4c85e466a4428909ea1baf8f7998ce98e1f1ba0bb69d69e" }
    }
  }
}
```

## 🌐 nginx — توجيه `/mcp` إلى Supabase

أضف داخل `server { server_name uberfix.alazab.com; ... }`:

```nginx
location = /mcp {
    proxy_pass https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp;
    proxy_http_version 1.1;
    proxy_set_header Host zrrffsjbfkphridqyais.supabase.co;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header x-api-key         $http_x_api_key;
    proxy_set_header Accept            $http_accept;
    proxy_pass_request_headers on;

    # Streamable HTTP / SSE
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 3600s;
    chunked_transfer_encoding on;
}

location /mcp/ {
    proxy_pass https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp/;
    proxy_http_version 1.1;
    proxy_set_header Host zrrffsjbfkphridqyais.supabase.co;
    proxy_pass_request_headers on;
    proxy_buffering off;
    proxy_read_timeout 3600s;
}
```

ثم: `sudo nginx -t && sudo systemctl reload nginx`.

## 🚀 النشر

```bash
supabase functions deploy mcp --project-ref zrrffsjbfkphridqyais
```

---

**ملاحظات:**
- Transport: **Streamable HTTP** (MCP spec, متوافق مع كل العملاء الحديثين).
- الـ MCP لا يخزّن مفاتيح — كل طلب يحمل `x-api-key` الخاص بالبوت.
- كل العمليات تُسجَّل في `api_gateway_logs` كأي استدعاء عادي.