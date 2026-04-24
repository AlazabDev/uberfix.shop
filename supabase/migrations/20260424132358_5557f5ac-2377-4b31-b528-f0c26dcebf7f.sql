
INSERT INTO public.services (category_id, code, name_ar, name_en, unit, pricing_type, base_price, is_active, sort_order)
SELECT c.id, v.code, v.name_ar, v.name_en, v.unit, 'fixed', 0, true, v.sort_order
FROM (VALUES
  ('gypsum_board','GYP_CEILING','أسقف جبس بورد ساقطة','Drop Ceiling','meter',10),
  ('gypsum_board','GYP_WALL','حوائط وقواطيع جبس','Gypsum Walls','meter',20),
  ('gypsum_board','GYP_DECOR','كرانيش وديكورات جبس','Gypsum Cornices','meter',30),
  ('flooring','FLR_TILE','تركيب سيراميك وبورسلين','Ceramic & Porcelain','meter',10),
  ('flooring','FLR_MARBLE','تركيب وصيانة رخام','Marble Installation','meter',20),
  ('flooring','FLR_PARQUET','تركيب أرضيات باركيه','Parquet Flooring','meter',30),
  ('flooring','FLR_EPOXY','أرضيات إيبوكسي','Epoxy Floors','meter',40),
  ('glass_facades','GLASS_WIN','شبابيك زجاج سكوريت','Tempered Glass Windows','meter',10),
  ('glass_facades','GLASS_FACADE','واجهات زجاجية كلاسيك','Glass Facades','meter',20),
  ('glass_facades','GLASS_SHOWER','كبائن استحمام زجاج','Shower Cabins','piece',30),
  ('security_cameras','SEC_CAM','تركيب كاميرات مراقبة','CCTV Installation','piece',10),
  ('security_cameras','SEC_INTERCOM','أنظمة إنتركوم','Intercom Systems','piece',20),
  ('security_cameras','SEC_ACCESS','أنظمة دخول وحضور','Access Control','piece',30),
  ('networking','NET_LAN','تمديد شبكات داخلية','LAN Wiring','meter',10),
  ('networking','NET_WIFI','تركيب وضبط راوترات وأكسس بوينت','WiFi Setup','piece',20),
  ('networking','NET_FIBER','وصلات ألياف بصرية','Fiber Optics','meter',30),
  ('appliances','APP_FRIDGE','صيانة ثلاجات وفريزر','Fridge Repair','piece',10),
  ('appliances','APP_WASH','صيانة غسالات','Washer Repair','piece',20),
  ('appliances','APP_OVEN','صيانة بوتاجاز وفرن','Oven & Stove Repair','piece',30),
  ('appliances','APP_DISHWASH','صيانة غسالات أطباق','Dishwasher Repair','piece',40),
  ('gardens_shades','GRD_SHADE','تركيب مظلات سيارات','Car Shades','meter',10),
  ('gardens_shades','GRD_LANDSCAPE','تنسيق حدائق','Landscaping','meter',20),
  ('gardens_shades','GRD_IRRIGATION','شبكات ري أوتوماتيك','Auto Irrigation','meter',30),
  ('insulation','INS_THERMAL','عزل حراري للأسقف','Thermal Roof Insulation','meter',10),
  ('insulation','INS_WATER','عزل مائي للحمامات والأسطح','Waterproofing','meter',20)
) AS v(cat_code, code, name_ar, name_en, unit, sort_order)
JOIN public.categories c ON c.code = v.cat_code;
