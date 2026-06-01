import * as z from "zod";

// Coerce numeric inputs: empty strings and NaN become undefined so optional
// number fields don't fail validation when the input is cleared.
const optionalNumber = z.preprocess(
  (v) => {
    if (v === "" || v === null || v === undefined) return undefined;
    if (typeof v === "number" && Number.isNaN(v)) return undefined;
    return v;
  },
  z.number().optional()
);

export const propertyFormSchema = z.object({
  // Basic fields
  code: z.string().optional(),
  name: z.string().min(2, "يجب أن يكون الاسم 2 أحرف على الأقل"),
  category: z.enum(["residential", "commercial", "industrial"]),
  type: z.string().min(1, "نوع العقار مطلوب"),
  status: z.string().min(1, "حالة العقار مطلوبة"),
  address: z.string().min(5, "العنوان مطلوب").or(z.literal("")).optional()
    .transform((v) => v ?? ""),
  city_id: z.number().optional(),
  district_id: z.number().optional(),
  latitude: optionalNumber,
  longitude: optionalNumber,
  description: z.string().optional(),
  manager_id: z.string().optional(),
  management_start_date: z.string().optional(),

  // Shared fields
  area: optionalNumber,
  floors: optionalNumber,
  parking_spaces: optionalNumber,
  units_count: optionalNumber,

  // Residential specific
  unit_type: z.string().optional(),
  rooms: optionalNumber,
  bathrooms: optionalNumber,

  // Commercial / branch specific
  business_activity: z.string().optional(),
  opening_time: z.string().optional(),
  closing_time: z.string().optional(),
  sla_level: z.string().optional(),
  operating_status: z.string().optional(),     // حالة تشغيل الفرع
  location_nature: z.string().optional(),      // طبيعة موقع الفرع
  subscription_status: z.string().optional(),  // حالة الاشتراك
  access_policy: z.string().optional(),        // آلية الدخول والتصاريح

  // Industrial specific
  industrial_activity: z.string().optional(),
  hazard_level: z.string().optional(),
  shift_pattern: z.string().optional(),
  production_lines: optionalNumber,
  workers_count: optionalNumber,

  // Contact info
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
});

export type PropertyFormData = z.infer<typeof propertyFormSchema>;

export const categoryToType: Record<string, string> = {
  residential: "residential",
  commercial: "commercial", 
  industrial: "industrial",
};
