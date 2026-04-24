
INSERT INTO public.services (category_id, code, name_ar, name_en, unit, pricing_type, base_price, is_active, sort_order)
SELECT c.id, v.code, v.name_ar, v.name_en, v.unit, 'fixed', 0, true, v.sort_order
FROM (VALUES
  ('cleaning_services','CLN_HOME','تنظيف منازل عميق','Deep Home Cleaning','job',10),
  ('cleaning_services','CLN_OFFICE','تنظيف مكاتب وشركات','Office Cleaning','job',20),
  ('cleaning_services','CLN_SOFA','تنظيف كنب وسجاد بالبخار','Steam Sofa & Carpet','piece',30),
  ('cleaning_services','CLN_TANK','تنظيف وتعقيم خزانات مياه','Water Tank Cleaning','piece',40),
  ('cleaning_services','CLN_FACADE','تنظيف واجهات زجاج عالية','High Facade Cleaning','meter',50),
  ('pest_control','PEST_GENERAL','مكافحة حشرات عامة','General Pest Control','job',10),
  ('pest_control','PEST_TERMITE','مكافحة النمل الأبيض','Termite Control','job',20),
  ('pest_control','PEST_RODENT','مكافحة قوارض','Rodent Control','job',30),
  ('periodic_maintenance','PER_CONTRACT','عقد صيانة دورية شامل','Full Maintenance Contract','month',10),
  ('elevators','ELEV_MAINT','صيانة مصاعد','Elevator Maintenance','job',10),
  ('generators','GEN_MAINT','صيانة مولدات كهرباء','Generator Maintenance','piece',10),
  ('construction','CON_BUILD','أعمال بناء وخرسانة','Construction Works','meter',10),
  ('interior_finishing','INT_FULL','تشطيب داخلي كامل','Full Interior Finishing','meter',10),
  ('signage','SGN_SIGN','تصنيع لوحات إعلانية','Custom Signage','piece',10),
  ('commercial_refrigeration','CRF_COLD','تركيب وصيانة غرف تبريد','Cold Rooms','job',10),
  ('fire_systems','FIRE_ALARM','أنظمة إنذار حريق','Fire Alarm Systems','job',10),
  ('fire_systems','FIRE_EXT','تركيب طفايات حريق','Fire Extinguishers','piece',20),
  ('specialized_technical','SPEC_OTHER','أعمال فنية متخصصة','Specialized Technical Work','job',10),
  ('general','GEN_OTHER','طلب صيانة عام','General Service Request','job',10),
  ('plumbing_electrical_combo','PE_INSPECT','معاينة سباكة وكهرباء','Plumbing & Electrical Inspection','job',10)
) AS v(cat_code, code, name_ar, name_en, unit, sort_order)
JOIN public.categories c ON c.code = v.cat_code;

-- تطبيع service_type في طلبات الصيانة القديمة إلى أسماء الفئات العربية
UPDATE public.maintenance_requests SET service_type = 'صيانة سباكة'
  WHERE service_type IN ('plumbing','سباكة');
UPDATE public.maintenance_requests SET service_type = 'صيانة كهرباء'
  WHERE service_type IN ('electrical','كهرباء','صيانة كهربائية');
UPDATE public.maintenance_requests SET service_type = 'تكييف وتبريد'
  WHERE service_type IN ('ac','hvac','تكييف');
UPDATE public.maintenance_requests SET service_type = 'نجارة'
  WHERE service_type = 'carpentry';
UPDATE public.maintenance_requests SET service_type = 'دهانات وتشطيب حوائط'
  WHERE service_type = 'painting';
UPDATE public.maintenance_requests SET service_type = 'حدادة وألومنيوم'
  WHERE service_type = 'metalwork';
UPDATE public.maintenance_requests SET service_type = 'خدمات النظافة'
  WHERE service_type = 'cleaning';
UPDATE public.maintenance_requests SET service_type = 'صيانة عامة'
  WHERE service_type IN ('other','general');

-- ربط category_id تلقائياً بناءً على service_type الجديد إن لم يكن مربوطاً
UPDATE public.maintenance_requests mr
SET category_id = c.id
FROM public.categories c
WHERE mr.category_id IS NULL
  AND mr.service_type IS NOT NULL
  AND c.name = mr.service_type;
