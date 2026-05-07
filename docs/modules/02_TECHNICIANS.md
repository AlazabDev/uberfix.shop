# 🔒 الموديول #2 — الفنيين (Technicians)

**حالة الإغلاق:** ✅ مغلق — 2026-05-07
**القلب:** `technician_profiles` ← `technicians` (operational mirror)

## الجداول
- `technician_profiles` — السجل الرسمي (التسجيل + الموافقات)
- `technicians` — السجل التشغيلي (التعيين على الطلبات)
- `technician_documents`, `technician_trades`, `technician_coverage_areas`
- `technician_wallet`, `technician_tasks`, `technician_levels`

## ما تم في الإغلاق
1. **الأعمدة الجديدة:** `technician_code` (UF-TEC-{SEQ}), `approved_at/by`, `rejected_at/by`, `rejection_reason`, `w9_pdf_url`, `acord_pdf_url`, `terms_pdf_url`, `technician_id`.
2. **Trigger الموافقة `fn_handle_technician_approval`:** يولد كود UF-TEC- ويُنشئ سجل تشغيلي في `technicians` تلقائياً، ويختم تواريخ الموافقة/الرفض.
3. **حذف Triggers مكررة** على `updated_at` (3 ← 1).
4. **Indexes:** status, code, user_id.
5. **View موحدة `v_technicians_dashboard`** تربط الملف بالسجل التشغيلي وتحسب total/closed jobs.

## الدورة المغلقة
تسجيل ← W-9 + ACORD + Terms (PDF) ← submit ← admin approval (موافقة/رفض) ← code تلقائي ← سجل تشغيلي ← متاح للتعيين على الطلبات.
