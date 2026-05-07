import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { brandedHeaderHtml, brandedFooterHtml, BRAND } from "./documentBranding";
import type { TechnicianRegistrationData } from "@/types/technician-registration";

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString("ar-EG") : "—");
const v = (s?: string | number | null) =>
  s === undefined || s === null || s === "" ? '<span style="color:#999;">—</span>' : String(s);

const checkbox = (checked: boolean) =>
  `<span style="display:inline-block;width:14px;height:14px;border:1.5px solid ${BRAND.navy};border-radius:2px;text-align:center;line-height:11px;font-weight:900;color:${BRAND.navy};vertical-align:middle;margin-left:4px;">${checked ? "✓" : ""}</span>`;

const sectionTitle = (n: string, t: string) => `
  <div style="margin:18px 0 8px;display:flex;align-items:center;gap:8px;">
    <span style="background:${BRAND.gold};color:${BRAND.navy};font-weight:900;font-size:11px;padding:3px 9px;border-radius:3px;">${n}</span>
    <h3 style="margin:0;font-size:14px;color:${BRAND.navy};font-weight:800;">${t}</h3>
  </div>
  <div style="height:1px;background:linear-gradient(90deg,${BRAND.navy},transparent);margin-bottom:10px;"></div>
`;

const row = (label: string, value: string) => `
  <div style="display:flex;border-bottom:1px dotted #ccc;padding:6px 0;font-size:11px;">
    <span style="min-width:160px;color:#555;font-weight:600;">${label}:</span>
    <span style="color:#111;font-weight:500;">${value}</span>
  </div>
`;

const COVERAGE_LABELS: Record<string, string> = {
  civil_liability: "مسؤولية مدنية تجاه الغير",
  professional_liability: "مسؤولية مهنية عن أخطاء التنفيذ",
  property_damage: "أضرار ممتلكات العملاء",
  bodily_injury: "إصابات أو حوادث أثناء التنفيذ",
  employer_liability: "مسؤولية صاحب العمل تجاه العاملين",
  vehicles: "مسؤولية السيارات أو الانتقال",
  electrical: "أعمال كهرباء",
  plumbing: "أعمال سباكة",
  hvac: "أعمال تكييف",
  heights: "أعمال ارتفاعات",
  welding: "أعمال لحام أو قطع",
};

function signatureBlock(d: TechnicianRegistrationData, kind: "w9" | "acord") {
  const sigData = kind === "w9" ? d.w9_signature_data : d.acord_signature_data;
  const sigDate = kind === "w9" ? d.w9_signed_at : d.acord_signed_at;
  return `
    <div style="margin-top:24px;display:grid;grid-template-columns:1fr 1fr;gap:18px;">
      <div>
        <div style="font-size:11px;color:#555;margin-bottom:4px;">اسم مقدم الخدمة</div>
        <div style="border-bottom:1px solid #333;padding:4px 2px;font-weight:600;">${v(d.legal_name || d.full_name)}</div>
        <div style="font-size:11px;color:#555;margin-top:10px;margin-bottom:4px;">التاريخ</div>
        <div style="border-bottom:1px solid #333;padding:4px 2px;">${fmtDate(sigDate)}</div>
      </div>
      <div>
        <div style="font-size:11px;color:#555;margin-bottom:4px;">التوقيع</div>
        <div style="border:1px solid #ddd;border-radius:4px;height:90px;display:flex;align-items:center;justify-content:center;background:#fafafa;">
          ${sigData ? `<img src="${sigData}" style="max-height:80px;max-width:100%;" />` : `<span style="color:#bbb;font-size:11px;">— غير موقّع —</span>`}
        </div>
      </div>
    </div>
  `;
}

/** Builds the W-9 (Egyptian) HTML body. */
export function buildW9Html(d: TechnicianRegistrationData): string {
  const dateStr = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  return `
    ${brandedHeaderHtml({
      documentType: "نموذج W-9",
      documentTypeLatin: "Tax Identification Form",
      documentId: `W9-${(d.national_id || "NEW").slice(-6)}`,
      documentDate: dateStr,
    })}
    <div style="padding:22px 28px;">
      <p style="font-size:11px;color:#444;line-height:1.7;margin:0 0 14px;background:#f7f7fb;padding:10px;border-right:3px solid ${BRAND.gold};">
        نموذج بيانات ضريبية وتعريف مقدم خدمة / مورد لدى <strong>UberFix — شركة العزب</strong>.
        يُحفظ هذا النموذج لدى المنصة ضمن ملف مقدم الخدمة طبقًا لقانون الإجراءات الضريبية الموحد رقم 206 لسنة 2020
        وقانون حماية البيانات الشخصية رقم 151 لسنة 2020.
      </p>

      ${sectionTitle("1", "بيانات مقدم الخدمة")}
      ${row("الاسم القانوني", v(d.legal_name || d.full_name))}
      ${row("الاسم التجاري", v(d.trade_name || d.company_name))}
      ${row("نوع مقدم الخدمة", v(d.company_type === "individual" ? "فني مستقل / منشأة فردية" : d.company_type === "small_team" ? "فريق صغير" : "شركة"))}
      ${row("الرقم القومي", v(d.national_id))}
      ${row("جواز السفر (للأجانب)", v(d.passport_no))}
      ${row("تاريخ الميلاد", fmtDate(d.date_of_birth))}
      ${row("رقم الهاتف", v(d.phone))}
      ${row("البريد الإلكتروني", v(d.email))}
      ${row("العنوان", v([d.street_address, d.building_no && `عقار ${d.building_no}`].filter(Boolean).join("، ")))}

      ${sectionTitle("2", "البيانات الضريبية")}
      <div style="font-size:11px;margin-bottom:6px;">
        ${checkbox(d.has_tax_card === "yes")} لديّ بطاقة ضريبية
        ${checkbox(d.has_tax_card === "no")} لا
        ${checkbox(d.has_tax_card === "in_progress")} جاري الاستخراج
      </div>
      ${row("رقم التسجيل الضريبي", v(d.tax_registration_number))}
      ${row("رقم الملف الضريبي", v(d.tax_file_number))}
      ${row("المأمورية", v(d.tax_office))}
      ${row("تاريخ إصدار البطاقة", fmtDate(d.tax_card_issue_date))}
      ${row("تاريخ انتهاء البطاقة", fmtDate(d.tax_card_expiry_date))}
      <div style="font-size:11px;margin-top:6px;">
        <strong>ضريبة القيمة المضافة:</strong>
        ${checkbox(d.vat_status === "yes")} نعم
        ${checkbox(d.vat_status === "no")} لا
        ${checkbox(d.vat_status === "not_required")} غير ملزم
        ${checkbox(d.vat_status === "in_progress")} جاري الفحص
      </div>
      <div style="font-size:11px;margin-top:6px;">
        <strong>الفاتورة / الإيصال الإلكتروني:</strong>
        ${checkbox(d.e_invoice_status === "yes")} مسجّل
        ${checkbox(d.e_invoice_status === "no")} غير مسجّل
        ${checkbox(d.e_invoice_status === "in_progress")} جاري التجهيز
      </div>

      ${sectionTitle("3", "السجل التجاري والكيان القانوني")}
      <div style="font-size:11px;margin-bottom:6px;">
        ${checkbox(d.has_commercial_register === "yes")} لديّ سجل تجاري
        ${checkbox(d.has_commercial_register === "no")} لا
        ${checkbox(d.has_commercial_register === "in_progress")} جاري الاستخراج
      </div>
      ${row("رقم السجل التجاري", v(d.commercial_register_number))}
      ${row("مكتب السجل التجاري", v(d.commercial_register_office))}
      ${row("تاريخ الإصدار", fmtDate(d.commercial_register_issue_date))}
      ${row("الشكل القانوني", v({
        natural_person: "شخص طبيعي",
        sole_proprietorship: "منشأة فردية",
        llc: "شركة ذات مسؤولية محدودة",
        partnership: "شركة تضامن",
        limited_partnership: "شركة توصية بسيطة",
        other: "أخرى",
      }[d.legal_form || ""] || "—"))}

      ${sectionTitle("4", "بيانات السداد")}
      ${row("طريقة استلام المستحقات", v({ bank: "حساب بنكي", wallet: "محفظة إلكترونية", company_account: "حساب شركة", other: "أخرى" }[d.payment_method || ""] || "—"))}
      ${row("اسم صاحب الحساب", v(d.bank_account_holder))}
      ${row("اسم البنك", v(d.bank_name))}
      ${row("رقم الحساب", v(d.bank_account_number))}
      ${row("IBAN", v(d.bank_iban))}
      ${row("رقم المحفظة", v(d.wallet_number))}
      ${row("مزود المحفظة", v(d.wallet_provider))}

      ${sectionTitle("5", "الإقرارات والتعهدات")}
      <p style="font-size:10.5px;color:#333;line-height:1.8;text-align:justify;">
        أُقر بأن جميع البيانات الواردة صحيحة وكاملة، وأتحمل المسؤولية عن أي خطأ أو نقص.
        أُقر بأنني مقدم خدمة مستقل، وأن تسجيل بياناتي لا يُنشئ علاقة عمل دائمة.
        أتعهد بتحديث بياناتي الضريبية والتجارية والمهنية عند أي تغيير، وبإصدار الفواتير والإيصالات
        متى كنت ملزمًا قانونًا. أوافق على معالجة بياناتي بواسطة UberFix لأغراض التحقق والتشغيل
        وتسوية المستحقات وفق قانون 151 لسنة 2020.
      </p>

      ${signatureBlock(d, "w9")}
    </div>
    ${brandedFooterHtml()}
  `;
}

/** Builds the ACORD-equivalent (Egyptian) insurance certificate HTML. */
export function buildAcordHtml(d: TechnicianRegistrationData): string {
  const dateStr = new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
  const cov = d.insurance_coverage_types || [];
  return `
    ${brandedHeaderHtml({
      documentType: "شهادة تأمين",
      documentTypeLatin: "Liability Insurance Certificate",
      documentId: d.insurance_certificate_number || `INS-${(d.policy_number || "NEW").slice(-6)}`,
      documentDate: dateStr,
    })}
    <div style="padding:22px 28px;">
      <p style="font-size:11px;color:#444;line-height:1.7;margin:0 0 14px;background:#f7f7fb;padding:10px;border-right:3px solid ${BRAND.gold};">
        شهادة تأمين مسؤولية مدنية ومهنية لمقدم الخدمة، تُصدر للمعلومية والتحقق فقط ولا تعدّل
        شروط وثيقة التأمين الأصلية. الجهة الرقابية: <strong>الهيئة العامة للرقابة المالية</strong>.
      </p>

      ${sectionTitle("1", "بيانات الشهادة")}
      ${row("رقم الشهادة", v(d.insurance_certificate_number))}
      ${row("تاريخ الإصدار", fmtDate(d.insurance_issue_date))}
      ${row("بداية التغطية", fmtDate(d.insurance_start_date))}
      ${row("نهاية التغطية", fmtDate(d.policy_expiry_date))}
      <div style="font-size:11px;margin-top:6px;">
        <strong>الحالة:</strong>
        ${checkbox(d.insurance_status === "active")} سارية
        ${checkbox(d.insurance_status === "expired")} منتهية
        ${checkbox(d.insurance_status === "renewing")} تحت التجديد
        ${checkbox(d.insurance_status === "suspended")} موقوفة
      </div>

      ${sectionTitle("2", "بيانات مقدم الخدمة المؤمَّن عليه")}
      ${row("الاسم", v(d.legal_name || d.full_name))}
      ${row("الاسم التجاري", v(d.trade_name || d.company_name))}
      ${row("الرقم القومي", v(d.national_id))}
      ${row("رقم التسجيل الضريبي", v(d.tax_registration_number))}
      ${row("رقم الهاتف", v(d.phone))}
      ${row("البريد الإلكتروني", v(d.email))}

      ${sectionTitle("3", "بيانات شركة التأمين / الوسيط")}
      ${row("اسم شركة التأمين", v(d.insurance_company_name))}
      ${row("ترخيص شركة التأمين", v(d.insurance_company_license_no))}
      ${row("رقم الوثيقة", v(d.policy_number))}
      ${row("اسم الوسيط", v(d.insurance_broker_name))}
      ${row("قيد الوسيط", v(d.insurance_broker_license_no))}
      ${row("العنوان", v(d.insurance_contact_address))}
      ${row("الهاتف", v(d.insurance_contact_phone))}
      ${row("البريد الإلكتروني", v(d.insurance_contact_email))}

      ${sectionTitle("4", "أنواع التغطية التأمينية")}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:11px;">
        ${Object.entries(COVERAGE_LABELS).map(([k, l]) =>
          `<div>${checkbox(cov.includes(k))} ${l}</div>`
        ).join("")}
      </div>

      ${sectionTitle("5", "حدود التغطية (جنيه مصري)")}
      ${row("لكل حادث", v(d.insurance_limit_per_incident?.toLocaleString("ar-EG")))}
      ${row("الإجمالي السنوي", v(d.insurance_limit_aggregate?.toLocaleString("ar-EG")))}
      ${row("أضرار الممتلكات", v(d.insurance_limit_property?.toLocaleString("ar-EG")))}
      ${row("الإصابات الجسدية", v(d.insurance_limit_bodily?.toLocaleString("ar-EG")))}
      ${row("المسؤولية المهنية", v(d.insurance_limit_professional?.toLocaleString("ar-EG")))}
      ${row("مسؤولية العاملين", v(d.insurance_limit_workers?.toLocaleString("ar-EG")))}

      ${sectionTitle("6", "حامل الشهادة وملاحظات")}
      <p style="font-size:11px;color:#333;line-height:1.7;">
        حامل الشهادة: <strong>UberFix / شركة العزب</strong> — لاعتماد مقدم الخدمة داخل المنصة والتحقق
        من وجود تغطية تأمينية مناسبة. لا تغطي الشهادة الأضرار الناتجة عن التعمد، الغش، تنفيذ
        أعمال غير مرخصة، أو مخالفة تعليمات السلامة الجسيمة. يلتزم مقدم الخدمة بإخطار UberFix
        فور إلغاء الوثيقة أو انتهائها.
      </p>

      ${signatureBlock(d, "acord")}
    </div>
    ${brandedFooterHtml()}
  `;
}

/** Render an HTML string into a downloadable PDF Blob using html2canvas + jsPDF. */
export async function renderHtmlToPdfBlob(html: string): Promise<Blob> {
  const container = document.createElement("div");
  container.style.cssText = `
    position: fixed; top: -10000px; left: -10000px;
    width: 800px; background: white;
    font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    direction: rtl; color: #222;
  `;
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    await document.fonts.ready;
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#fff", logging: false });
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const usableW = pdfW - margin * 2;
    const ratio = usableW / canvas.width;
    const scaledH = canvas.height * ratio;
    const usableH = pdfH - margin * 2;
    let remaining = scaledH;
    let sourceY = 0;
    let page = 0;
    while (remaining > 0) {
      if (page > 0) pdf.addPage();
      const slice = Math.min(remaining, usableH);
      const sourceSlice = slice / ratio;
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = Math.ceil(sourceSlice);
      const ctx = pageCanvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceSlice, 0, 0, canvas.width, sourceSlice);
      pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, usableW, slice);
      sourceY += sourceSlice;
      remaining -= usableH;
      page++;
    }
    return pdf.output("blob");
  } finally {
    document.body.removeChild(container);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}