/**
 * phoneRegion — تحويل رقم الهاتف المحلي إلى E.164 تلقائياً حسب منطقة المستخدم.
 *
 * المستخدم يكتب رقمه كما اعتاد في بلده (مصر: 01004006620) والنظام يضيف
 * مفتاح الدولة في الخلفية. الكشف عن الدولة يتم من:
 *   1) ISO code محفوظ يدوياً (localStorage: uf_phone_region)
 *   2) المنطقة الزمنية للمتصفح (Intl timeZone)
 *   3) لغة/إقليم المتصفح (navigator.language مثل ar-EG)
 *   4) الافتراضي: مصر (السوق الأساسي)
 */

export interface PhoneRegion {
  iso: string;          // ISO 3166-1 alpha-2
  dial: string;         // مفتاح الدولة بدون +
  trunk: string;        // بادئة الاتصال المحلي التي تُحذف (مثل 0)
  nsnLength: number[];  // أطوال الرقم الوطني المقبولة (بدون trunk)
  flag: string;
  example: string;      // كما يكتبه أهل البلد
  nameAr: string;
}

export const PHONE_REGIONS: Record<string, PhoneRegion> = {
  EG: { iso: "EG", dial: "20",  trunk: "0", nsnLength: [10],      flag: "🇪🇬", example: "01004006620", nameAr: "مصر" },
  SA: { iso: "SA", dial: "966", trunk: "0", nsnLength: [9],       flag: "🇸🇦", example: "0501234567", nameAr: "السعودية" },
  AE: { iso: "AE", dial: "971", trunk: "0", nsnLength: [9],       flag: "🇦🇪", example: "0501234567", nameAr: "الإمارات" },
  KW: { iso: "KW", dial: "965", trunk: "",  nsnLength: [8],       flag: "🇰🇼", example: "51234567",   nameAr: "الكويت" },
  QA: { iso: "QA", dial: "974", trunk: "",  nsnLength: [8],       flag: "🇶🇦", example: "33123456",   nameAr: "قطر" },
  BH: { iso: "BH", dial: "973", trunk: "",  nsnLength: [8],       flag: "🇧🇭", example: "36001234",   nameAr: "البحرين" },
  OM: { iso: "OM", dial: "968", trunk: "",  nsnLength: [8],       flag: "🇴🇲", example: "92123456",   nameAr: "عُمان" },
  JO: { iso: "JO", dial: "962", trunk: "0", nsnLength: [9],       flag: "🇯🇴", example: "0791234567", nameAr: "الأردن" },
  LB: { iso: "LB", dial: "961", trunk: "0", nsnLength: [7, 8],    flag: "🇱🇧", example: "03123456",   nameAr: "لبنان" },
  IQ: { iso: "IQ", dial: "964", trunk: "0", nsnLength: [10],      flag: "🇮🇶", example: "07901234567", nameAr: "العراق" },
  LY: { iso: "LY", dial: "218", trunk: "0", nsnLength: [9],       flag: "🇱🇾", example: "0912345678", nameAr: "ليبيا" },
  SD: { iso: "SD", dial: "249", trunk: "0", nsnLength: [9],       flag: "🇸🇩", example: "0912345678", nameAr: "السودان" },
  MA: { iso: "MA", dial: "212", trunk: "0", nsnLength: [9],       flag: "🇲🇦", example: "0612345678", nameAr: "المغرب" },
  DZ: { iso: "DZ", dial: "213", trunk: "0", nsnLength: [9],       flag: "🇩🇿", example: "0551234567", nameAr: "الجزائر" },
  TN: { iso: "TN", dial: "216", trunk: "",  nsnLength: [8],       flag: "🇹🇳", example: "20123456",   nameAr: "تونس" },
  PS: { iso: "PS", dial: "970", trunk: "0", nsnLength: [9],       flag: "🇵🇸", example: "0599123456", nameAr: "فلسطين" },
  SY: { iso: "SY", dial: "963", trunk: "0", nsnLength: [9],       flag: "🇸🇾", example: "0931234567", nameAr: "سوريا" },
  YE: { iso: "YE", dial: "967", trunk: "0", nsnLength: [9],       flag: "🇾🇪", example: "0711234567", nameAr: "اليمن" },
  TR: { iso: "TR", dial: "90",  trunk: "0", nsnLength: [10],      flag: "🇹🇷", example: "05321234567", nameAr: "تركيا" },
  GB: { iso: "GB", dial: "44",  trunk: "0", nsnLength: [10],      flag: "🇬🇧", example: "07400123456", nameAr: "بريطانيا" },
  DE: { iso: "DE", dial: "49",  trunk: "0", nsnLength: [10, 11],  flag: "🇩🇪", example: "015123456789", nameAr: "ألمانيا" },
  FR: { iso: "FR", dial: "33",  trunk: "0", nsnLength: [9],       flag: "🇫🇷", example: "0612345678", nameAr: "فرنسا" },
  IT: { iso: "IT", dial: "39",  trunk: "",  nsnLength: [9, 10],   flag: "🇮🇹", example: "3123456789", nameAr: "إيطاليا" },
  US: { iso: "US", dial: "1",   trunk: "1", nsnLength: [10],      flag: "🇺🇸", example: "2025550123", nameAr: "أمريكا" },
  CA: { iso: "CA", dial: "1",   trunk: "1", nsnLength: [10],      flag: "🇨🇦", example: "4165550123", nameAr: "كندا" },
  IN: { iso: "IN", dial: "91",  trunk: "0", nsnLength: [10],      flag: "🇮🇳", example: "09812345678", nameAr: "الهند" },
  PK: { iso: "PK", dial: "92",  trunk: "0", nsnLength: [10],      flag: "🇵🇰", example: "03001234567", nameAr: "باكستان" },
};

const DEFAULT_ISO = "EG";
const STORAGE_KEY = "uf_phone_region";

const TZ_TO_ISO: Record<string, string> = {
  "Africa/Cairo": "EG", "Asia/Riyadh": "SA", "Asia/Dubai": "AE", "Asia/Kuwait": "KW",
  "Asia/Qatar": "QA", "Asia/Bahrain": "BH", "Asia/Muscat": "OM", "Asia/Amman": "JO",
  "Asia/Beirut": "LB", "Asia/Baghdad": "IQ", "Africa/Tripoli": "LY", "Africa/Khartoum": "SD",
  "Africa/Casablanca": "MA", "Africa/Algiers": "DZ", "Africa/Tunis": "TN", "Asia/Gaza": "PS",
  "Asia/Hebron": "PS", "Asia/Damascus": "SY", "Asia/Aden": "YE", "Europe/Istanbul": "TR",
  "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Paris": "FR", "Europe/Rome": "IT",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
  "America/Toronto": "CA", "Asia/Kolkata": "IN", "Asia/Karachi": "PK",
};

function safeGet(key: string): string | null {
  try { return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null; } catch { return null; }
}

/** حفظ اختيار يدوي للدولة (اختياري — للمستخدمين خارج المنطقة المكتشفة). */
export function setPreferredRegion(iso: string) {
  try { if (PHONE_REGIONS[iso]) localStorage.setItem(STORAGE_KEY, iso); } catch { /* ignore */ }
}

/** يكتشف دولة المستخدم تلقائياً بدون أي طلب شبكة. */
export function detectRegion(): PhoneRegion {
  const saved = safeGet(STORAGE_KEY);
  if (saved && PHONE_REGIONS[saved]) return PHONE_REGIONS[saved];

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const iso = tz ? TZ_TO_ISO[tz] : undefined;
    if (iso && PHONE_REGIONS[iso]) return PHONE_REGIONS[iso];
  } catch { /* ignore */ }

  try {
    const langs = typeof navigator !== "undefined" ? [navigator.language, ...(navigator.languages || [])] : [];
    for (const l of langs) {
      const m = /[-_]([A-Za-z]{2})\b/.exec(l || "");
      const iso = m?.[1]?.toUpperCase();
      if (iso && PHONE_REGIONS[iso]) return PHONE_REGIONS[iso];
    }
  } catch { /* ignore */ }

  return PHONE_REGIONS[DEFAULT_ISO];
}

/** يحوّل الأرقام العربية/الفارسية إلى لاتينية ويزيل الفواصل. */
export function cleanDigits(raw: string): string {
  return String(raw || "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\d+]/g, "");
}

export interface NormalizedPhone {
  e164: string | null;   // +201004006620
  region: PhoneRegion;
  valid: boolean;
  reason?: string;
}

/**
 * يحوّل ما كتبه المستخدم إلى E.164 وفق عرف بلده:
 *   مصر: 01004006620 → +201004006620 | 1004006620 → +201004006620
 *   دولي: +9665xxxxxxx أو 009665xxxxxxx يُحترم كما هو.
 */
export function normalizePhoneForRegion(raw: string, region: PhoneRegion = detectRegion()): NormalizedPhone {
  let t = cleanDigits(raw);
  if (!t) return { e164: null, region, valid: false, reason: "أدخل رقم الهاتف" };

  // صيغ دولية صريحة
  if (t.startsWith("00")) t = "+" + t.slice(2);
  if (t.startsWith("+")) {
    const digits = t.slice(1);
    const ok = /^[1-9]\d{7,14}$/.test(digits);
    return { e164: ok ? "+" + digits : null, region, valid: ok, reason: ok ? undefined : "رقم دولي غير صحيح" };
  }

  // كتب المفتاح بدون + (مثل 201004006620)
  if (t.startsWith(region.dial) && region.nsnLength.includes(t.length - region.dial.length)) {
    return { e164: "+" + t, region, valid: true };
  }

  // العرف المحلي: حذف بادئة الاتصال (0) ثم إضافة مفتاح الدولة
  let nsn = t;
  if (region.trunk && nsn.startsWith(region.trunk) && nsn.length > region.trunk.length) {
    nsn = nsn.slice(region.trunk.length);
  }
  if (!region.nsnLength.includes(nsn.length)) {
    return {
      e164: null, region, valid: false,
      reason: `الرقم غير مكتمل — اكتبه كما هو معتاد في ${region.nameAr} (مثال: ${region.example})`,
    };
  }
  return { e164: "+" + region.dial + nsn, region, valid: true };
}

/** عرض ودّي للرقم في الرسائل: يخفي منتصف الرقم ويُبقي المفتاح. */
export function maskPhone(e164: string): string {
  if (!e164 || e164.length < 8) return e164;
  return e164.slice(0, 5) + "•••" + e164.slice(-3);
}
