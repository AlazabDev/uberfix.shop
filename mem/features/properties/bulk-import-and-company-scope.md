---
name: Property Bulk Import & Company Scope
description: استيراد العقارات بالجملة من CSV بمالك واحد، وربط العقارات بالشركة ليراها كل مستخدمي الشركة
type: feature
---

# استيراد العقارات بالجملة (2026-09-23)

- المسار: `/properties/bulk-import` — `src/pages/properties/PropertyBulkImport.tsx` (زر «استيراد بالجملة» في `/properties`).
- ملف المثال: `public/data/properties_sample.csv`.
- الأعمدة: name, address إلزامية؛ type, status, city, district, latitude, longitude, area, floors, rooms, bathrooms, parking_spaces, code, description اختيارية.
- مطابقة `city`/`district` بالاسم العربي (`cities.name_ar`, `districts.name_ar`) إلى معرفات.
- كل الصفوف تُربط بمالك واحد (`manager_id`) + `company_id` من ملف المالك، و`created_by` = المستخدم الحالي (شرط RLS).
- إدخال على دفعات 200 مع تخطي المكرر بالاسم لنفس المالك.

# نطاق الشركة على العقارات

- `properties.company_id` + trigger `fn_properties_set_company` (يعبّئها من ملف المنشئ إن كانت فارغة).
- سياسات `properties_select_same_company` و`properties_update_same_company`: كل مستخدمي نفس الشركة يرون ويعدّلون عقاراتها.

# عناوين البريد الإضافية

- جدول `user_emails` (email, label, is_primary, is_verified) — بريد رئيسي واحد لكل مستخدم، RLS: المستخدم لنفسه + admin/owner للقراءة.
- الواجهة: `src/components/settings/UserEmailsSettings.tsx` داخل تبويب الحساب في الإعدادات.
- `is_verified` يبقى false حتى نبني تدفق تحقق فعلي — لا تُمنح صلاحيات بناءً على بريد غير مُوثّق.
