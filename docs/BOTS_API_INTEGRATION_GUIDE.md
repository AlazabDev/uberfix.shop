# 🤖 دليل تكامل البوتات الموحّد — مؤسسة العزب

> **النطاق**: هذا الدليل يجمع كل نقاط النهاية (Endpoints) المتاحة للبوتات الخارجية الثلاثة الخاصة بمواقع مؤسسة العزب (UberFix.shop / Aza.team / Abuauf) للوصول إلى:
> - طلبات الصيانة (إنشاء/تعديل/إلغاء/استعلام)
> - قائمة الأسعار والخدمات
> - الفنيين المتاحين
> - الفروع وأقربها للعميل
> - عروض الأسعار والاستفسارات

آخر تحديث: 2026-05-02

---

## 🔐 1. المصادقة (Authentication)

جميع الطلبات تستخدم **مفتاح API موحّد** يُمرَّر في رأس HTTP:

```http
x-api-key: <YOUR_BOT_API_KEY>
Content-Type: application/json
```

- يتم إصدار مفتاح فريد لكل بوت من جدول `api_consumers` (channel: `azabot`, `abuauf_bot`, `uberfix_bot`).
- المفتاح يتم تتبعه (rate limit + total_requests + last_used_at).
- لا تشارك المفتاح في كود الواجهة الأمامية (Frontend) — يُستخدم من خادم البوت فقط.

### طلب مفتاح جديد
تواصل مع مدير النظام أو نفّذ:
```sql
INSERT INTO api_consumers (name, channel, api_key, is_active, rate_limit_per_minute)
VALUES ('AzaBot Production', 'azabot', encode(gen_random_bytes(32), 'hex'), true, 120)
RETURNING api_key;
```

---

## 🌐 2. عناوين الـ Base URLs

| البوابة | الغرض | URL |
|---------|-------|-----|
| **bot-gateway** | كل عمليات الشات بوت (إنشاء/استعلام/تعديل + كاتالوج) | `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/bot-gateway` |
| **maintenance-gateway** | إنشاء طلبات صيانة من قنوات خارجية (نماذج/Webhooks) | `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/maintenance-gateway` |
| **query-maintenance-requests** | استعلام مجمّع مع pagination | `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/query-maintenance-requests` |

> 💡 **القاعدة الذهبية**: استخدم **`bot-gateway`** لكل تفاعلات البوت — فهي تشمل كل العمليات وتوحّد التتبع.

---

## 📦 3. هيكل الطلب الموحّد لـ bot-gateway

```http
POST /functions/v1/bot-gateway
x-api-key: <BOT_API_KEY>
Content-Type: application/json

{
  "action": "<ACTION_NAME>",
  "payload": { ... },
  "session_id": "optional-conversation-uuid",
  "metadata": { "source": "azabot|abuauf_bot|uberfix_bot", "channel": "web|whatsapp|messenger" }
}
```

### استجابة موحّدة
```json
{ "success": true, "data": { ... }, "message": "..." }
// أو عند الخطأ
{ "success": false, "error": "وصف الخطأ" }
```

---

## 🎯 4. كل العمليات (Actions) المتاحة للبوت

### A. إدارة الطلبات

#### 1️⃣ `create_request` — إنشاء طلب صيانة جديد
```json
{
  "action": "create_request",
  "payload": {
    "client_name": "أحمد محمد",
    "client_phone": "+201001234567",
    "client_email": "ahmed@example.com",
    "location": "القاهرة، مصر الجديدة، شارع الميرغني 12",
    "service_type": "plumbing",
    "title": "تسريب في حنفية المطبخ",
    "description": "تسريب مستمر منذ يومين، الموقع تحت الحوض مباشرة",
    "priority": "high",
    "latitude": 30.0896,
    "longitude": 31.3424
  },
  "metadata": { "source": "azabot" }
}
```
**Returns**: `{ success, request_id, tracking_number, message }`

- يُرسل إشعار WhatsApp للعميل تلقائياً.
- `service_type`: `plumbing | electrical | ac | painting | carpentry | cleaning | general | appliance | pest_control | landscaping | finishing | renovation`
- `priority`: `low | medium | high | urgent`

#### 2️⃣ `check_status` — استعلام سريع
```json
{
  "action": "check_status",
  "payload": { "search_term": "UF/MR/260502/0042", "search_type": "request_number" }
}
```
`search_type`: `request_number | phone | text`

#### 3️⃣ `get_request_details` — تفاصيل كاملة لطلب
```json
{
  "action": "get_request_details",
  "payload": { "request_number": "UF/MR/260502/0042", "client_phone": "01001234567" }
}
```
يُرجع: تفاصيل الطلب + بيانات الفني المعيّن + التكلفة + SLA.

#### 4️⃣ `update_request` — تعديل بيانات الطلب
```json
{
  "action": "update_request",
  "payload": {
    "request_id": "uuid",
    "client_phone": "01001234567",
    "updates": {
      "description": "وصف محدّث",
      "location": "عنوان جديد",
      "priority": "urgent"
    }
  }
}
```
الحقول المسموحة فقط: `description, location, priority, service_type, customer_notes, latitude, longitude, title`.
المراحل المسموح للبوت تغييرها: `submitted, acknowledged, on_hold, cancelled, scheduled`.

#### 5️⃣ `cancel_request` — إلغاء طلب
```json
{
  "action": "cancel_request",
  "payload": { "request_id": "uuid", "client_phone": "01001234567", "reason": "تم حل المشكلة ذاتياً" }
}
```
❌ غير مسموح بالإلغاء بعد بدء التنفيذ (`in_progress | inspection | completed | billed | paid | closed`).

#### 6️⃣ `add_note` — إضافة ملاحظة
```json
{
  "action": "add_note",
  "payload": { "request_id": "uuid", "note": "العميل يفضل الزيارة بعد الساعة 4 عصراً" }
}
```

---

### B. الفنيون

#### 7️⃣ `list_technicians` — قائمة الفنيين المتاحين
```json
{
  "action": "list_technicians",
  "payload": { "specialization": "plumbing", "city_id": "uuid-optional", "limit": 10 }
}
```
يُرجع: id, name, specialization, rating, total_reviews, level, status (مرتّب حسب التقييم).

#### 8️⃣ `assign_technician` — تعيين فني
```json
// تعيين تلقائي ذكي (موصى به)
{ "action": "assign_technician", "payload": { "request_id": "uuid", "auto": true } }

// أو تعيين يدوي
{ "action": "assign_technician", "payload": { "request_id": "uuid", "technician_id": "uuid" } }
```

---

### C. الكاتالوج (الخدمات/الفئات/الفروع)

#### 9️⃣ `list_services` — قائمة أنواع الخدمات
```json
{ "action": "list_services", "payload": {} }
```
يُرجع: `[{ key: "plumbing", label: "سباكة" }, ...]`

#### 🔟 `list_categories` — تصنيفات الصيانة
```json
{ "action": "list_categories", "payload": {} }
```

#### 1️⃣1️⃣ `get_branches` — كل الفروع
```json
{ "action": "get_branches", "payload": {} }
```
يُرجع: id, name, address, city, opening_hours.

#### 1️⃣2️⃣ `find_nearest_branch` — أقرب فرع
```json
{
  "action": "find_nearest_branch",
  "payload": { "latitude": 30.0444, "longitude": 31.2357, "city": "القاهرة" }
}
```
يُرجع أقرب 5 فروع مع `distance_km`.

---

### D. عروض الأسعار وجلسات العملاء

#### 1️⃣3️⃣ `get_quote` — طلب عرض سعر
```json
{
  "action": "get_quote",
  "payload": {
    "service_type": "renovation",
    "description": "ترميم شقة 120 م²",
    "location": "الإسكندرية، سموحة",
    "area_sqm": 120,
    "client_name": "محمد علي",
    "client_phone": "+201112223344"
  }
}
```

#### 1️⃣4️⃣ `collect_customer_info` — حفظ سياق العميل في الجلسة
```json
{
  "action": "collect_customer_info",
  "session_id": "conversation-uuid",
  "payload": {
    "client_phone": "+201001234567",
    "client_name": "أحمد",
    "location": "القاهرة"
  }
}
```
يُرجع: `is_returning_customer` و `previous_data` لتخصيص الردود.

---

## 🔍 5. استعلامات متقدمة عبر `query-maintenance-requests`

للتقارير والاستعلامات المجمّعة مع `pagination`:

```http
POST /functions/v1/query-maintenance-requests
x-api-key: <BOT_API_KEY>
Content-Type: application/json

{
  "status": "Pending",
  "priority": "high",
  "client_phone": "01001234567",
  "page": 1,
  "limit": 20
}
```

الفلاتر: `status, priority, workflow_stage, request_number, client_phone, client_name, id, page, limit (max 100)`.

---

## 💻 6. مثال كامل بـ Node.js (للبوتات الثلاثة)

```js
// bot-client.js — مكتبة موحّدة قابلة للاستخدام في AzaBot/AbuaufBot/UberFixBot
const BOT_API_KEY = process.env.BOT_API_KEY;
const GATEWAY_URL = 'https://zrrffsjbfkphridqyais.supabase.co/functions/v1/bot-gateway';

async function callBotGateway(action, payload, options = {}) {
  const res = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'x-api-key': BOT_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      payload,
      session_id: options.sessionId,
      metadata: { source: options.botName || 'azabot', ...options.metadata },
    }),
  });
  return res.json();
}

// أمثلة استخدام

// 1) إنشاء طلب صيانة
await callBotGateway('create_request', {
  client_name: 'أحمد محمد', client_phone: '+201001234567',
  location: 'القاهرة', service_type: 'plumbing',
  title: 'تسريب', description: 'تسريب في المطبخ', priority: 'high',
}, { botName: 'azabot' });

// 2) قائمة الفنيين
const techs = await callBotGateway('list_technicians', { specialization: 'electrical', limit: 5 });

// 3) قائمة الخدمات
const services = await callBotGateway('list_services', {});

// 4) أقرب فرع
const branches = await callBotGateway('find_nearest_branch', {
  latitude: 30.0444, longitude: 31.2357,
});

// 5) متابعة طلب
const status = await callBotGateway('check_status', {
  search_term: 'UF/MR/260502/0042', search_type: 'request_number',
});

// 6) تفاصيل كاملة
const details = await callBotGateway('get_request_details', {
  request_number: 'UF/MR/260502/0042', client_phone: '01001234567',
});

module.exports = { callBotGateway };
```

---

## 🐍 7. مثال بـ Python (لدمج Rasa / AzaBot)

```python
import os, requests

BOT_API_KEY = os.environ['BOT_API_KEY']
GATEWAY = 'https://zrrffsjbfkphridqyais.supabase.co/functions/v1/bot-gateway'

def call_bot_gateway(action: str, payload: dict, session_id: str | None = None, source: str = 'azabot') -> dict:
    r = requests.post(GATEWAY, json={
        'action': action,
        'payload': payload,
        'session_id': session_id,
        'metadata': {'source': source},
    }, headers={
        'x-api-key': BOT_API_KEY,
        'Content-Type': 'application/json',
    }, timeout=30)
    return r.json()

# مثال: إنشاء طلب
resp = call_bot_gateway('create_request', {
    'client_name': 'أحمد', 'client_phone': '+201001234567',
    'location': 'القاهرة', 'service_type': 'ac',
    'title': 'صيانة تكييف', 'description': 'لا يبرّد', 'priority': 'medium',
})
print(resp)
```

---

## 🛡️ 8. قواعد الأمان والاستخدام

| القاعدة | التفاصيل |
|---------|----------|
| 🔐 سرية المفتاح | لا تضع `x-api-key` في كود الواجهة أو الـ repo. استخدم متغير بيئة. |
| 📞 تحقق الهاتف | `update_request / cancel_request / add_note` يجب تمرير `client_phone` للعميل (يقارن بآخر 9 أرقام). |
| 🚫 المراحل النهائية | `closed, paid, cancelled` لا يمكن تعديلها مطلقاً. |
| ⚙️ مراحل البوت | البوت يستطيع فقط: `submitted, acknowledged, on_hold, cancelled, scheduled`. |
| 📊 Rate Limit | افتراضي 120 طلب/دقيقة لكل مفتاح (قابل للتعديل). |
| 📝 Audit Trail | كل عمليات `update/cancel/add_note` تُسجَّل في `audit_logs`. |
| 📡 Logs | كل طلب يُسجَّل في `api_gateway_logs` (مع إخفاء `client_phone`). |

---

## 🧪 9. اختبار سريع بـ curl

```bash
# اختبار قائمة الخدمات (بدون بيانات حساسة)
curl -X POST https://zrrffsjbfkphridqyais.supabase.co/functions/v1/bot-gateway \
  -H "x-api-key: $BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"list_services","payload":{}}'

# اختبار الفنيين
curl -X POST https://zrrffsjbfkphridqyais.supabase.co/functions/v1/bot-gateway \
  -H "x-api-key: $BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"list_technicians","payload":{"limit":5}}'

# اختبار الفروع
curl -X POST https://zrrffsjbfkphridqyais.supabase.co/functions/v1/bot-gateway \
  -H "x-api-key: $BOT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"get_branches","payload":{}}'
```

---

## 🤖 10. تخطيط البوتات الثلاثة لمؤسسة العزب

| البوت | الموقع | channel في DB | الاستخدام الأساسي |
|------|-------|---------------|-------------------|
| **AzaBot** | aza.team | `azabot` | الواجهة الرئيسية للذكاء الاصطناعي + خدمة العملاء العامة |
| **UberFixBot** | uberfix.shop | `uberfix_bot` | حجز خدمات صيانة + متابعة طلبات + عروض أسعار |
| **AbuaufBot** | abuauf.com | `abuauf_bot` | الاستفسارات التجارية + استقبال طلبات الفروع |

كل بوت يستلم مفتاحه الخاص لكن يستخدم نفس الـ `bot-gateway`.

---

## 📚 11. مراجع إضافية

- [`docs/BOT_GATEWAY_INTEGRATION.md`](./BOT_GATEWAY_INTEGRATION.md) — تفاصيل تقنية للـ gateway
- [`docs/PAYTABS_TESTING_GUIDE.md`](./PAYTABS_TESTING_GUIDE.md) — تكامل المدفوعات
- [`docs/E2E_FULL_LIFECYCLE_TEST.md`](./E2E_FULL_LIFECYCLE_TEST.md) — اختبار دورة حياة كاملة
- [`supabase/functions/bot-gateway/index.ts`](../supabase/functions/bot-gateway/index.ts) — الكود المصدري

---

**جاهز للاستخدام الآن.** أي بوت جديد يحتاج فقط: `BOT_API_KEY` + استدعاء `bot-gateway` بأي من الـ 14 action أعلاه.