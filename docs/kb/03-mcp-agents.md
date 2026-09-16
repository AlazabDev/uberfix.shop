# 03 — خادم MCP وقواعد الوكلاء

العنوان: `https://zrrffsjbfkphridqyais.supabase.co/functions/v1/mcp` (JSON-RPC)

## الحالة الحالية

الخادم العام **للقراءة فقط** — الإصدار `0.2.0`، الاسم `uberfix-mcp`، العنوان `UberFix (read-only)`.

| الأداة | الوصف | المعاملات |
|---|---|---|
| `list_services` | كتالوج الخدمات والتصنيفات | `category?`, `limit?` |
| `list_branches` | الفروع وبياناتها العامة | `city?`, `limit?` |
| `find_nearest_branch` | أقرب فرع جغرافيًا | `latitude`, `longitude` |
| `track_maintenance_request` | تتبّع طلب برقمه العام | `request_number` |

أُزيلت أداة إنشاء الطلب من الخادم العام لأنها تغيير بلا مصادقة موثوقة. الإنشاء يجري عبر **Operational MCP موثّق** (مهمة مفتوحة) أو عبر باب REST بمفتاح يملك `requests:write`.

## قواعد سلوك إلزامية للوكيل

1. لا تمرّر أي مفتاح أو سر كمعامل أداة، ولا تطبع مفتاحًا في الرد.
2. لا تُمرّر أو تُعدّل `channel` كمعامل — القناة تُحدَّد من طبقة النقل.
3. الإحداثيات: استخدم `latitude`/`longitude` وليس `lat`/`lng`.
4. لكل عملية تغيير: مفتاح API صالح + `Idempotency-Key` جديد.
5. عند `illegal_transition` لا تكرّر النداء — اقرأ الحالة الحالية أولًا ثم اختر المرحلة التالية المسموحة.
6. الإغلاق يتطلب تقييمًا من 1 إلى 5، والملاحظة تُخزَّن في `feedback_comment`.
7. أي غموض في بيانات العميل (هاتف/عنوان/نوع الخدمة) ⟶ اسأل قبل الإنشاء، لا تخترع قيمة.
8. لا تسند فنيًا أو تُحدّد موعدًا من تلقاء نفسك — التوجيه يمرّ على مسؤول الصيانات (انظر 06).

## ملفات ذات صلة

- `src/lib/mcp/index.ts` + `src/lib/mcp/tools/*` — تعريف الخادم العام.
- `.lovable/mcp/manifest.json` — بيان الأدوات المعلنة.
- `supabase/functions/mcp/index.ts` — نسخة Edge (تُنشر عبر Supabase CLI).
- `docs/mcp/uberfix-identifiers.json` — كل المعرّفات التي يحتاجها الوكيل.
