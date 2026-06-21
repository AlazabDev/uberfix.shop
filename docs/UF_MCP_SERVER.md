# 🧠 UberFix MCP Server — دليل التنفيذ الموحّد لطلبات الصيانة

خادم **Model Context Protocol** يعرض كل بروتوكول بوابة الصيانة (`maintenance-gateway`)
وبوابة البوتات (`bot-gateway`) كـ **أدوات MCP** قابلة للاستخدام من أي عميل MCP:
Claude Desktop, Cursor, Rasa, ChatGPT Custom Connectors, n8n MCP, إلخ.

---

## 🔗 العنوان الموحّد

| نوع | URL | الحالة |
|---|---|---|
| **MCP Endpoint (مُعتمد)** | `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp` | ✅ يعمل مباشرة |
| Custom Domain | `https://uberfix.alazab.com/mcp` | ⚠️ غير متاح حالياً — انظر القسم أدناه |

> **تنبيه مهم:** الدومين `uberfix.alazab.com` مُتصل عبر **Lovable Hosting** (استضافة ثابتة)
> وليس عبر nginx ذاتي الاستضافة، لذلك لا يمكن توجيه `/mcp` إلى Supabase من Lovable.
> استخدم رابط Supabase المباشر أعلاه في جميع عملاء MCP وفي زر الشات بوت.

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
MCP_URL="https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp"

# Initialize
curl -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: uf_e4c85e466a4428909ea1baf8f7998ce98e1f1ba0bb69d69e" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# List tools
curl -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: uf_e4c85e466a4428909ea1baf8f7998ce98e1f1ba0bb69d69e" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# Call: create request
curl -X POST "$MCP_URL" \
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
      "url": "https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp",
      "headers": { "x-api-key": "uf_e4c85e466a4428909ea1baf8f7998ce98e1f1ba0bb69d69e" }
    }
  }
}
```

## 🌐 كيف أحصل على `https://uberfix.alazab.com/mcp` ؟

بما أن الدومين مُستضاف على Lovable، فأمامك ثلاث طرق فقط لتوفير عنوان موحّد عليه:

### الخيار 1 — Cloudflare Worker (موصى به، 5 دقائق، مجاناً)
1. ضع دومينك في Cloudflare DNS (لو ليس فيه بالفعل).
2. أنشئ Worker بهذا الكود:
   ```js
   export default {
     async fetch(req) {
       const u = new URL(req.url);
       const target = "https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp"
         + u.pathname.replace(/^\/mcp/, "") + u.search;
       return fetch(target, { method: req.method, headers: req.headers, body: req.body });
     }
   }
   ```
3. أضف **Route**: `uberfix.alazab.com/mcp*` → الـ Worker.
   (هذا يلتقط الطلب قبل أن يصل إلى Lovable.)

### الخيار 2 — subdomain مستقل
استخدم `mcp.alazab.com` كـ CNAME لمزود وسيط (Cloudflare Worker / Vercel Edge / VPS).

### الخيار 3 — الاستخدام المباشر (الأسهل، بدون أي إعداد)
استخدم `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp` مباشرة في:
- زر الشات بوت داخل الواجهة.
- ملف إعدادات Claude / Cursor / Rasa.

الـ Supabase Edge Function يحمل شهادة TLS صالحة ويدعم CORS، ولا يوجد فرق وظيفي.

## 🚀 النشر

```bash
supabase functions deploy mcp --project-ref zrrffsjbfkphridqyais
```

---

**ملاحظات:**
- Transport: **Streamable HTTP** (MCP spec, متوافق مع كل العملاء الحديثين).
- الـ MCP لا يخزّن مفاتيح — كل طلب يحمل `x-api-key` الخاص بالبوت.
- كل العمليات تُسجَّل في `api_gateway_logs` كأي استدعاء عادي.