
INSERT INTO public.services (category_id, code, name_ar, name_en, unit, pricing_type, base_price, is_active, sort_order)
SELECT c.id, v.code, v.name_ar, v.name_en, v.unit, 'fixed', 0, true, v.sort_order
FROM (VALUES
  ('electrical','ELEC_OUTLET','تركيب/استبدال أفياش وقواطع','Outlets & Switches','piece',10),
  ('electrical','ELEC_LIGHT','تركيب وحدات إضاءة','Light Fixtures','piece',20),
  ('electrical','ELEC_PANEL','صيانة لوحات الكهرباء','Panel Maintenance','job',30),
  ('electrical','ELEC_WIRING','تمديد أو تجديد أسلاك','Wiring Installation','meter',40),
  ('electrical','ELEC_SHORT','كشف وإصلاح ماس كهربائي','Short Circuit Repair','job',50),
  ('electrical','ELEC_FAN','تركيب مراوح سقف','Ceiling Fan Install','piece',60),
  ('plumbing','PLM_LEAK','كشف وإصلاح تسريبات','Leak Detection & Repair','job',10),
  ('plumbing','PLM_DRAIN','تسليك مجاري وبلاعات','Drain Unclogging','job',20),
  ('plumbing','PLM_HEATER','تركيب وصيانة سخانات','Water Heater','piece',30),
  ('plumbing','PLM_FAUCET','استبدال صنابير وخلاطات','Faucet Replacement','piece',40),
  ('plumbing','PLM_TOILET','تركيب وإصلاح كراسي حمام','Toilet Install/Repair','piece',50),
  ('plumbing','PLM_PUMP','صيانة مضخات وطلمبات مياه','Water Pump Maintenance','piece',60),
  ('hvac','HVAC_INSTALL','تركيب تكييف سبليت','Split AC Install','piece',10),
  ('hvac','HVAC_CLEAN','تنظيف وصيانة دورية للتكييف','AC Cleaning','piece',20),
  ('hvac','HVAC_FREON','شحن فريون وكشف تسريب','Freon Recharge','piece',30),
  ('hvac','HVAC_REPAIR','إصلاح أعطال تكييف','AC Repair','job',40),
  ('hvac','HVAC_DUCT','تركيب دكتات تكييف مركزي','Central AC Ducting','meter',50),
  ('carpentry','CARP_DOOR','تركيب وإصلاح أبواب خشبية','Wooden Door Install/Repair','piece',10),
  ('carpentry','CARP_KITCHEN','تفصيل وتركيب مطابخ','Kitchen Cabinets','meter',20),
  ('carpentry','CARP_FURN','إصلاح أثاث خشبي','Furniture Repair','piece',30),
  ('carpentry','CARP_CLOSET','تفصيل دواليب وخزائن','Custom Closets','meter',40),
  ('metalwork','METAL_DOOR','تركيب أبواب حديد/ألومنيوم','Metal/Aluminum Doors','piece',10),
  ('metalwork','METAL_WINDOW','شبابيك ألومنيوم وسكوريت','Aluminum & Tempered Windows','piece',20),
  ('metalwork','METAL_RAIL','دربزينات ودرابزين سلالم','Railings','meter',30),
  ('painting','PAINT_INT','دهان داخلي كامل','Interior Painting','meter',10),
  ('painting','PAINT_EXT','دهان خارجي وواجهات','Exterior Painting','meter',20),
  ('painting','PAINT_DECOR','دهانات ديكور وزخرفية','Decorative Paint','meter',30)
) AS v(cat_code, code, name_ar, name_en, unit, sort_order)
JOIN public.categories c ON c.code = v.cat_code;
