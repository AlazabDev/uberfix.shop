# 🔒 الموديول #3 — العقارات والفروع (Properties & Branches)

**حالة الإغلاق:** ✅ مغلق — 2026-05-07
**القلب:** `properties` + `branches` (مرتبطين بـ `maintenance_requests`)

## ما تم
1. **Branches:** أُضيفت `updated_at, is_active, phone, manager_id, city_id, district_id, latitude, longitude`.
2. **توليد كود تلقائي:**
   - `UF-BR-{SEQ}` للفروع
   - `UF-PRP-{SEQ}` للعقارات
3. **Trigger updated_at** على branches.
4. **Indexes:** company_id, is_active, code, status, city.
5. **Views موحدة:**
   - `v_properties_dashboard` (total/active requests, last_request_at)
   - `v_branches_dashboard` (total/active requests + اسم الشركة)

## الدورة المغلقة
إنشاء عقار/فرع ← كود تلقائي UF-PRP/UF-BR ← QR (للعقارات) ← ربط بطلبات الصيانة ← داش بورد فوري بالحجم.
