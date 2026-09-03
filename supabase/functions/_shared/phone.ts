/**
 * normalizePhone — توحيد رقم الهاتف إلى E.164 على الخادم.
 * الواجهة ترسل E.164 جاهزاً (+2010...). كإجراء دفاعي نقبل أيضاً الصيغ المحلية
 * ونحوّلها وفق الدولة الافتراضية (مصر) إن لم يُرسل مفتاح دولة.
 */
const DEFAULT_DIAL = "20";
const DEFAULT_TRUNK = "0";

export function normalizePhone(raw: unknown, defaultDial = DEFAULT_DIAL, trunk = DEFAULT_TRUNK): string | null {
  let t = String(raw ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[^\d+]/g, "");
  if (!t) return null;
  if (t.startsWith("00")) t = "+" + t.slice(2);
  if (!t.startsWith("+")) {
    if (trunk && t.startsWith(trunk)) t = t.slice(trunk.length);
    t = t.startsWith(defaultDial) && t.length > 10 ? "+" + t : "+" + defaultDial + t;
  }
  return /^\+[1-9]\d{7,14}$/.test(t) ? t : null;
}
