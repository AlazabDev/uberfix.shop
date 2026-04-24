
-- تحديث بيانات الفروع: استبدال السعودية بمصر
UPDATE public.branches
SET 
  name = 'الفرع الرئيسي - القاهرة',
  city = 'القاهرة',
  address = 'مصر - القاهرة - المعادي - شارع 500'
WHERE name = 'الفرع الرئيسي - الرياض' OR city = 'الرياض';

UPDATE public.branches
SET 
  name = 'فرع الإسكندرية',
  city = 'الإسكندرية',
  address = 'مصر - الإسكندرية - سموحة'
WHERE name = 'فرع جدة' OR city = 'جدة';

UPDATE public.branches
SET 
  name = 'فرع المعادي',
  city = 'القاهرة',
  address = 'مصر - القاهرة - المعادي - شارع 500'
WHERE name = 'فرع الدمام' OR city = 'الدمام';

-- تحديث الفروع التي اسمها فقط "الفرع الرئيسي" بدون مدينة
UPDATE public.branches
SET city = 'القاهرة',
    address = COALESCE(address, 'مصر - القاهرة - المعادي - شارع 500')
WHERE name = 'الفرع الرئيسي' AND (city IS NULL OR city = '');

-- تحديث طلبات الصيانة التي تحوي مواقع سعودية
UPDATE public.maintenance_requests
SET location = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
  location,
  'الرياض', 'القاهرة'),
  'جدة', 'الإسكندرية'),
  'الدمام', 'المعادي'),
  'المملكة العربية السعودية', 'جمهورية مصر العربية'),
  'السعودية', 'مصر'),
  'Riyadh', 'Cairo'),
  'Saudi Arabia', 'Egypt')
WHERE location ILIKE '%الرياض%' 
   OR location ILIKE '%جدة%' 
   OR location ILIKE '%الدمام%'
   OR location ILIKE '%السعودية%'
   OR location ILIKE '%riyadh%'
   OR location ILIKE '%saudi%';

-- تعيين القيمة الافتراضية لعمود location في طلبات الصيانة الجديدة
ALTER TABLE public.maintenance_requests
  ALTER COLUMN location SET DEFAULT 'مصر - القاهرة';
