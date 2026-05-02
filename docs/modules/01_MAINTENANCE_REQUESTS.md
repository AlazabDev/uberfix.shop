# 🔧 الموديول #1 — طلبات الصيانة (Maintenance Requests)

> **الحالة**: ✅ **مغلق ومحكم** — Module Closure Protocol completed
> **تاريخ الإغلاق**: 2026-05-02
> **القلب**: `public.maintenance_requests` — نقطة التمركز لكل النظام

---

## 1️⃣ الجرد (Inventory)

### الجداول
| الجدول | الدور |
|--------|-------|
| `maintenance_requests` | **القلب** — 54 عمود (بعد الإضافات) |
| `request_lifecycle` | سجل دورة الحياة لكل طلب |
| `audit_logs` | سجل التدقيق العام |
| `notifications` | إشعارات داخل النظام |
| `message_logs` | سجل رسائل واتساب/إيميل |

### Edge Functions المرتبطة
- `maintenance-gateway` — البوابة الموحدة لاستقبال الطلبات (40+ مدخل ينتهي هنا)
- `bot-gateway` — يستدعي maintenance-gateway داخلياً
- `send-maintenance-notification` — يطلق تلقائياً عبر trigger

### الصفحات (Frontend)
- `/maintenance/requests` — عرض كل الطلبات النشطة
- `/maintenance/requests/:id` — تفاصيل طلب
- `/maintenance/create` — إنشاء طلب يدوي
- `/uf` — نموذج عام للعملاء
- `/track` — تتبع عام بدون تسجيل دخول
- `/dashboard` — لوحة الإحصاءات
- **جديد**: `/completed` — لوحة الطلبات المنتهية (عبر `v_completed_requests_dashboard`)

---

## 2️⃣ الفجوات التي اكتُشفت وأُغلقت

| # | الفجوة | الحل |
|---|--------|------|
| 1 | لا يوجد عمود `handover_to_admin_at/by` | ✅ أُضيفت 3 أعمدة للتسليم |
| 2 | لا يوجد عمود `closed_at` و `rated_at` | ✅ أُضيفت |
| 3 | لا يوجد `feedback_comment` للتقييم | ✅ أُضيف |
| 4 | لا يوجد `closure_reason` | ✅ أُضيف |
| 5 | enum `workflow_stage_t` ينقصه `handover_to_admin` | ✅ أُضيفت بين `paid` و `closed` |
| 6 | الـ triggers الجديدة (audit, lifecycle, notify) لم تكن مربوطة بشكل صريح | ✅ أُعيد ربطها (idempotent) |
| 7 | لا توجد أتمتة للأرشفة عند الإغلاق | ✅ `fn_handle_request_closure` تختم closed_at + archived_at تلقائياً |
| 8 | لا توجد لوحة للطلبات المنتهية | ✅ `v_completed_requests_dashboard` view |

---

## 3️⃣ دورة الحياة المُغلقة (16 مرحلة)

```
draft → submitted → triaged → assigned → scheduled → in_progress
  → inspection → waiting_parts → on_hold → completed → billed → paid
  → handover_to_admin → closed
  
(فروع جانبية: cancelled / rejected)
```

### نقاط الإغلاق التلقائي
- **عند الدخول لـ `closed`**: يُختم `closed_at` و `archived_at` تلقائياً → ينتقل الطلب من لوحة الطلبات النشطة إلى `v_completed_requests_dashboard`
- **عند الدخول لـ `handover_to_admin`**: يُختم `handover_to_admin_at` و `handover_to_admin_by` تلقائياً
- **عند تسجيل `rating`**: يُختم `rated_at` تلقائياً

---

## 4️⃣ Triggers الفعّالة على القلب (20 trigger)

| Trigger | التوقيت | الوظيفة |
|---------|---------|---------|
| `trg_mr_request_number` | BEFORE INSERT | توليد UF/MR/YYMMDD/SEQ |
| `trg_mr_sla_due` | BEFORE INSERT | حساب SLA تلقائياً |
| `trg_mr_updated_at` | BEFORE UPDATE | ختم updated_at |
| `trg_mr_sync_stage` | BEFORE I/U | مزامنة workflow_stage مع v2 |
| `trg_mr_closure` | BEFORE UPDATE | أتمتة handover/close/rate |
| `trg_mr_audit` | AFTER I/U/D | سجل التدقيق |
| `trg_mr_lifecycle` | AFTER UPDATE | سجل دورة الحياة |
| `trg_mr_notify` | AFTER UPDATE | إشعار تلقائي |
| `trg_on_stage_transition_enqueue_wa` | AFTER UPDATE | طابور واتساب |
| `trg_enforce_mr_phone` | BEFORE I/U | فرض صحة الهاتف |
| `trg_check_suspicious_requests` | BEFORE INSERT | حماية من الإغراق |
| (و9 آخرين قديمين فعّالين) | — | — |

---

## 5️⃣ RLS Policies (6 سياسات)

| Policy | العملية | المنطق |
|--------|---------|--------|
| `mr_deny_anon` | SELECT | منع anon تماماً (RESTRICTIVE) |
| `mr_read_scoped` | SELECT | المنشئ + الفني المعيَّن + admin/manager/staff/owner |
| `mr_insert_authenticated` | INSERT | المنشئ نفسه أو staff |
| `mr_service_role_insert` | INSERT | للـ edge functions (gateway) |
| `mr_update` | UPDATE | المنشئ + الفني المعيَّن + staff |
| `mr_delete` | DELETE | staff فقط |

---

## 6️⃣ مبدأ التمركز (Centralization Principle)

> **مهما زادت المداخل، يبقى الجدول واحداً.**

مهما أضفت من قنوات (Meta/تليجرام/مواقع/تطبيقات) — كلها تنتهي عند `maintenance_requests` عبر `maintenance-gateway`. هذا يضمن:
- ترقيم موحد (UF/MR/YYMMDD/SEQ)
- SLA موحد
- إشعارات موحدة
- تقارير موحدة
- لوحة طلبات منتهية موحدة

---

## 7️⃣ نقطة النهاية الرسمية

الطلب يُعتبر **مغلقاً نهائياً** عند:
1. ✅ المرور بـ `handover_to_admin` (تسليم للإدارة)
2. ✅ تسجيل التقييم (`rating` 1-5)
3. ✅ الانتقال إلى `closed`
4. ✅ ظهوره في `v_completed_requests_dashboard`

**ملاحظة العميل**: تم استبعاد بند الدفع من شرط الإغلاق لأن الشركات الكبرى تدفع كل ربع سنوي. الإغلاق يتم بمجرد تسليم الإدارة، والفريق المالي يتولى المتابعة المالية.

---

## 8️⃣ الموديول التالي

→ **#2: Technicians** (الفنيين) — اربط طلب صيانة بفني معيَّن، إدارة الجاهزية، الأرباح، التقييمات

---

**ختم الإغلاق**: ✅ موديول رقم 1 من 10 — مكتمل ومحكم.