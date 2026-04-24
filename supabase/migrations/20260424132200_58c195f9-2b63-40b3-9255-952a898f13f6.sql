
-- إضافة slug code للفئات لاستخدامه في كل القنوات
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS categories_code_uniq ON public.categories(code) WHERE code IS NOT NULL;

UPDATE public.categories SET code = CASE name
  WHEN 'خدمات النظافة' THEN 'cleaning_services'
  WHEN 'خدمات السباكة والكهرباء' THEN 'plumbing_electrical_combo'
  WHEN 'مكافحة الحشرات والقوارض' THEN 'pest_control'
  WHEN 'صيانة كهرباء' THEN 'electrical'
  WHEN 'صيانة سباكة' THEN 'plumbing'
  WHEN 'تكييف وتبريد' THEN 'hvac'
  WHEN 'نجارة' THEN 'carpentry'
  WHEN 'حدادة وألومنيوم' THEN 'metalwork'
  WHEN 'دهانات وتشطيب حوائط' THEN 'painting'
  WHEN 'جبس بورد وديكورات' THEN 'gypsum_board'
  WHEN 'أرضيات وسيراميك' THEN 'flooring'
  WHEN 'زجاج وواجهات' THEN 'glass_facades'
  WHEN 'كاميرات وأنظمة أمنية' THEN 'security_cameras'
  WHEN 'شبكات واتصالات' THEN 'networking'
  WHEN 'صيانة أجهزة منزلية' THEN 'appliances'
  WHEN 'مظلات وحدائق' THEN 'gardens_shades'
  WHEN 'عوازل حرارية ومائية' THEN 'insulation'
  WHEN 'تنظيف وصيانة دورية' THEN 'periodic_maintenance'
  WHEN 'مصاعد وسلالم كهربائية' THEN 'elevators'
  WHEN 'مولدات ولوحات تحكم' THEN 'generators'
  WHEN 'بناء وإنشاءات' THEN 'construction'
  WHEN 'تشطيب داخلي كامل' THEN 'interior_finishing'
  WHEN 'لوحات وإعلانات' THEN 'signage'
  WHEN 'تبريد تجاري وغرف تبريد' THEN 'commercial_refrigeration'
  WHEN 'أنظمة حريق' THEN 'fire_systems'
  WHEN 'خدمات فنية متخصصة' THEN 'specialized_technical'
  WHEN 'صيانة عامة' THEN 'general'
END WHERE code IS NULL;

-- مسح الجدول التجريبي الحالي وإعادة بنائه ككتالوج موحد
DELETE FROM public.services;
