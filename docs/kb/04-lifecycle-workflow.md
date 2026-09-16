# 04 — دورة حياة الطلب والانتقالات

## المراحل (15 مرحلة، حروف صغيرة دائمًا)

`draft` · `submitted` · `triaged` · `assigned` · `scheduled` · `in_progress` · `inspection` · `waiting_parts` · `on_hold` · `completed` · `billed` · `paid` · `handover_to_admin` · `closed` · `cancelled` · `rejected`

المصدر الموحّد في الواجهة: `src/constants/workflowStages.ts`. في قاعدة البيانات: `workflow_stage_v2` (مصدر الحقيقة) و`workflow_stage` (مرآة توافقية).

## المسار الطبيعي المؤكَّد بالاختبار

```
submitted → triaged → assigned → scheduled → in_progress
   → inspection → waiting_parts → in_progress
   → completed → billed → paid → closed
```

مسارات جانبية: أي مرحلة نشطة → `on_hold` / `cancelled`، و`triaged` → `rejected`.

## قواعد الانتقال

- الانتقالات تُقرأ من جدول `workflow_transitions` (`from_stage`, `to_stage`, `required_role`, `is_active`).
- النداء الوحيد المسموح: `fn_transition_request_stage(p_request_id, p_to_stage, p_actor, p_metadata, ...)`.
- كتابة `workflow_stage` أو `workflow_stage_v2` مباشرة ممنوعة (يكسر التدقيق و`domain_events`).
- كل انتقال يُسجَّل في `domain_events` مع الفاعل، وإن كان الفاعل مفوَّضًا يُسجَّل `delegated_actor_id` القادم من `api_consumers.metadata`.
- `paid → closed` يتطلب دور `admin` وتقييمًا 1–5؛ الملاحظة تُخزَّن في `feedback_comment`.
- الإلغاء عبر مفتاح API: idempotent — إن كان الطلب `cancelled` يُعاد `success: true`؛ و`closed`/`rejected` يُرفض برسالة واضحة.

## الأخطاء المتوقعة

| الخطأ | السبب | الحل |
|---|---|---|
| `illegal_transition` | لا يوجد صف مُفعَّل في `workflow_transitions` | اقرأ الحالة واختر انتقالًا موجودًا |
| `forbidden_transition_role` | الفاعل لا يملك `required_role` | استخدم مفتاحًا له `delegated_actor_id` إداري |
| `missing_rating` | إغلاق بلا تقييم | مرّر `rating` من 1 إلى 5 |

## الآثار التلقائية

- عند `scheduled` أو تحديد موعد: تُحجز 6 منبّهات للوكيل (انظر 06).
- عند `in_progress` وما بعدها: تُلغى المنبّهات.
- عند `billed`: تُنشأ الفاتورة تلقائيًا (`fn_auto_create_invoice_on_billed`).
- عند `paid`: يُضبط `paid_at`، وردّ PayTabs ينقل `billed → paid`.
- SLA: `auto_calculate_sla` / `calculate_sla_deadlines` تضبط `sla_due_date` عند الإنشاء.
- الحذف: محجوب بـ`trg_block_mr_delete` — الأرشفة بدلًا من الحذف.
