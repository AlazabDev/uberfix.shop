import { z } from "zod";
import { PROPERTY_STATUS, PROPERTY_TYPES } from "@/constants/propertyConstants";

export type ParsedPropertyRow = Record<string, unknown>;
export const PROPERTY_IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export const PROPERTY_IMPORT_MAX_ROWS = 10000;
export const PROPERTY_IMPORT_COLUMNS = ["name", "address", "type", "status", "city", "district", "latitude", "longitude", "area", "floors", "rooms", "bathrooms", "parking_spaces", "code", "description"];
export const normalizePropertyHeader = (value: string) => value.trim().toLowerCase().replace(/\s+/g, "_");
const text = (row: ParsedPropertyRow, keys: string[]) => {
  for (const key of keys) {
    const v = row[key];
    if ((typeof v === "string" || typeof v === "number") && String(v).trim()) return String(v).trim();
  }
  return null;
};
const numberValue = (value: string | null) => value === null ? null : Number(value.replace(/,/g, ""));
const optionalNumber = z.number().finite().nonnegative().nullable();
const schema = z.object({
  name: z.string().min(1, "الاسم مطلوب").max(200, "الاسم أطول من المسموح"),
  address: z.string().min(5, "العنوان قصير جدًا").max(1000),
  type: z.string().refine(v => v in PROPERTY_TYPES, "نوع العقار غير معروف"),
  status: z.string().refine(v => v in PROPERTY_STATUS, "الحالة غير معروفة"),
  latitude: z.number().finite().min(-90).max(90).nullable(),
  longitude: z.number().finite().min(-180).max(180).nullable(),
  area: optionalNumber,
  floors: optionalNumber.refine(v => v === null || Number.isInteger(v), "عدد الطوابق يجب أن يكون صحيحًا"),
  rooms: optionalNumber.refine(v => v === null || Number.isInteger(v), "عدد الغرف يجب أن يكون صحيحًا"),
  bathrooms: optionalNumber.refine(v => v === null || Number.isInteger(v), "عدد الحمامات يجب أن يكون صحيحًا"),
  parking_spaces: optionalNumber.refine(v => v === null || Number.isInteger(v), "عدد المواقف يجب أن يكون صحيحًا"),
  description: z.string().max(5000).nullable(), code: z.string().max(100).nullable(),
});
export function normalizePropertyRows(rows: ParsedPropertyRow[]) {
  const names = new Set<string>();
  return rows.map((raw, index) => {
    const record = {
      name: text(raw, ["name", "property_name", "الاسم", "اسم_العقار"]) || "",
      address: text(raw, ["address", "location", "العنوان"]) || "",
      type: (text(raw, ["type", "category", "النوع"]) || "commercial").toLowerCase(),
      status: (text(raw, ["status", "الحالة"]) || "active").toLowerCase(),
      city: text(raw, ["city", "governorate", "المدينة", "المحافظة"]),
      district: text(raw, ["district", "الحي", "المنطقة"]),
      latitude: numberValue(text(raw, ["latitude", "lat", "خط_العرض"])),
      longitude: numberValue(text(raw, ["longitude", "lng", "long", "خط_الطول"])),
      area: numberValue(text(raw, ["area", "area_sqm", "space", "المساحة"])),
      floors: numberValue(text(raw, ["floors", "الادوار", "الطوابق"])),
      rooms: numberValue(text(raw, ["rooms", "الغرف"])),
      bathrooms: numberValue(text(raw, ["bathrooms", "الحمامات"])),
      parking_spaces: numberValue(text(raw, ["parking_spaces", "parking", "مواقف"])),
      code: text(raw, ["code", "property_code", "الكود"]),
      description: text(raw, ["description", "notes", "الوصف", "ملاحظات"]),
    };
    const result = schema.safeParse(record);
    const errors = result.success ? [] : result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
    const key = record.name.toLocaleLowerCase();
    if (key && names.has(key)) errors.push("اسم مكرر داخل الملف");
    names.add(key);
    if ((record.latitude === null) !== (record.longitude === null)) errors.push("يجب إدخال خط العرض وخط الطول معًا");
    return { ...record, rowNumber: index + 2, errors };
  });
}