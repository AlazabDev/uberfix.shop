import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { TechnicianRegistrationData, ServicePrice, TechnicianTrade, CoverageArea, TechnicianDocument } from '@/types/technician-registration';
import { brandedHeaderHtml, brandedFooterHtml, BRAND } from '@/lib/documentBranding';

interface RegistrationPDFData {
  formData: Partial<TechnicianRegistrationData>;
  services?: ServicePrice[];
  trades?: TechnicianTrade[];
  coverageAreas?: CoverageArea[];
  documents?: TechnicianDocument[];
  cityName?: string;
  districtName?: string;
}

const companyTypeLabels: Record<string, string> = {
  individual: 'فرد / Individual',
  small_team: 'فريق صغير / Small Team',
  company: 'شركة / Company',
};

const documentTypeLabels: Record<string, string> = {
  tax_card: 'البطاقة الضريبية',
  commercial_registration: 'السجل التجاري',
  national_id: 'الرقم القومي',
  insurance_certificate: 'شهادة التأمين',
  professional_license: 'الرخصة المهنية',
};

function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildFieldRow(label: string, value: string | undefined | null): string {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:8px 12px; text-align:right; font-weight:600; color:#555; border-bottom:1px solid #eee; width:35%; font-size:12px;">${escapeHtml(label)}</td>
      <td style="padding:8px 12px; text-align:right; color:#222; border-bottom:1px solid #eee; font-size:12px;">${escapeHtml(value)}</td>
    </tr>
  `;
}

function buildSectionHeader(title: string): string {
  return `
    <tr>
      <td colspan="2" style="padding:10px 12px; background:${BRAND.gold}; color:${BRAND.navy}; font-weight:800; font-size:13px; text-align:center;">
        ${escapeHtml(title)}
      </td>
    </tr>
  `;
}

export async function generateRegistrationPDF(data: RegistrationPDFData): Promise<void> {
  const { formData, services, trades, coverageAreas, documents, cityName, districtName } = data;

  const dateStr = new Date().toLocaleDateString('ar-EG', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // Build full HTML
  let rows = '';

  // Basic Information
  rows += buildSectionHeader('المعلومات الأساسية');
  rows += buildFieldRow('اسم الشركة', formData.company_name);
  rows += buildFieldRow('نوع الشركة', companyTypeLabels[formData.company_type || ''] || formData.company_type);
  rows += buildFieldRow('الاسم الكامل', formData.full_name);
  rows += buildFieldRow('البريد الإلكتروني', formData.email);
  rows += buildFieldRow('الهاتف', formData.phone);
  rows += buildFieldRow('اللغة المفضلة', formData.preferred_language === 'ar' ? 'العربية' : 'English');

  // Address
  rows += buildSectionHeader('العنوان');
  rows += buildFieldRow('الدولة', formData.country);
  rows += buildFieldRow('المدينة', cityName || (formData.city_id ? `${formData.city_id}` : undefined));
  rows += buildFieldRow('المنطقة', districtName || (formData.district_id ? `${formData.district_id}` : undefined));
  rows += buildFieldRow('عنوان الشارع', formData.street_address);
  rows += buildFieldRow('رقم المبنى', formData.building_no);
  rows += buildFieldRow('الطابق', formData.floor);
  rows += buildFieldRow('الوحدة', formData.unit);
  rows += buildFieldRow('علامة مميزة', formData.landmark);

  // Contact Information
  if (formData.service_email || formData.contact_name || formData.accounting_name) {
    rows += buildSectionHeader('معلومات الاتصال');
    rows += buildFieldRow('بريد الخدمة', formData.service_email);
    rows += buildFieldRow('اسم جهة الاتصال', formData.contact_name);
    rows += buildFieldRow('اسم المحاسب', formData.accounting_name);
    rows += buildFieldRow('بريد المحاسب', formData.accounting_email);
    rows += buildFieldRow('هاتف المحاسب', formData.accounting_phone);
  }

  // Insurance
  rows += buildSectionHeader('التأمين');
  rows += buildFieldRow('لديه تأمين', formData.has_insurance ? 'نعم' : 'لا');
  if (formData.has_insurance) {
    rows += buildFieldRow('شركة التأمين', formData.insurance_company_name);
    rows += buildFieldRow('رقم الوثيقة', formData.policy_number);
    rows += buildFieldRow('تاريخ الانتهاء', formData.policy_expiry_date);
    rows += buildFieldRow('ملاحظات', formData.insurance_notes);
  }

  // Services
  if (services && services.length > 0) {
    rows += buildSectionHeader('الخدمات والتسعير');
    services.forEach((service, i) => {
      rows += `<tr><td colspan="2" style="padding:6px 12px; font-weight:600; color:#2563eb; font-size:12px; border-bottom:1px solid #eee;">خدمة ${i + 1}: ${escapeHtml(service.service_name || `ID: ${service.service_id}`)}</td></tr>`;
      rows += buildFieldRow('السعر العادي', `${service.standard_price} ج.م`);
      if (service.emergency_price) rows += buildFieldRow('سعر الطوارئ', `${service.emergency_price} ج.م`);
      if (service.night_weekend_price) rows += buildFieldRow('سعر ليلي/عطلة', `${service.night_weekend_price} ج.م`);
      if (service.min_job_value) rows += buildFieldRow('أقل قيمة', `${service.min_job_value} ج.م`);
      if (service.material_markup_percent) rows += buildFieldRow('هامش المواد', `${service.material_markup_percent}%`);
    });
    if (formData.pricing_notes) {
      rows += buildFieldRow('ملاحظات التسعير', formData.pricing_notes);
    }
  }

  // Trades
  if (trades && trades.length > 0) {
    rows += buildSectionHeader('الحرف والخبرات');
    trades.forEach((trade, i) => {
      rows += `<tr><td colspan="2" style="padding:6px 12px; font-weight:600; color:#2563eb; font-size:12px; border-bottom:1px solid #eee;">حرفة ${i + 1}: ${escapeHtml(trade.category_name || `ID: ${trade.category_id}`)}</td></tr>`;
      if (trade.years_of_experience) rows += buildFieldRow('سنوات الخبرة', `${trade.years_of_experience} سنة`);
      if (trade.licenses_or_certifications) rows += buildFieldRow('التراخيص/الشهادات', trade.licenses_or_certifications);
      rows += buildFieldRow('مشاريع ثقيلة', trade.can_handle_heavy_projects ? 'نعم' : 'لا');
    });
  }

  // Coverage Areas
  if (coverageAreas && coverageAreas.length > 0) {
    rows += buildSectionHeader('مناطق التغطية');
    coverageAreas.forEach((area, i) => {
      const areaName = area.city_name || `City ID: ${area.city_id}`;
      const districtInfo = area.district_name ? ` - ${area.district_name}` : '';
      const radiusInfo = area.radius_km ? ` (${area.radius_km} كم)` : '';
      rows += buildFieldRow(`منطقة ${i + 1}`, `${areaName}${districtInfo}${radiusInfo}`);
    });
  }

  // Company Details
  rows += buildSectionHeader('تفاصيل الشركة');
  rows += buildFieldRow('نموذج العمل', formData.company_model === 'local_provider' ? 'مزود محلي' : formData.company_model === 'third_party' ? 'طرف ثالث' : formData.company_model);
  if (formData.number_of_inhouse_technicians) rows += buildFieldRow('الفنيين الداخليين', `${formData.number_of_inhouse_technicians}`);
  if (formData.number_of_office_staff) rows += buildFieldRow('موظفي المكتب', `${formData.number_of_office_staff}`);
  rows += buildFieldRow('طلبات طوارئ', formData.accepts_emergency_jobs ? 'نعم' : 'لا');
  rows += buildFieldRow('عقود وطنية', formData.accepts_national_contracts ? 'نعم' : 'لا');
  if (formData.additional_notes) rows += buildFieldRow('ملاحظات إضافية', formData.additional_notes);

  // Documents
  if (documents && documents.length > 0) {
    rows += buildSectionHeader('المستندات المرفوعة');
    documents.forEach((doc_item, i) => {
      const typeName = documentTypeLabels[doc_item.document_type] || doc_item.document_type;
      rows += buildFieldRow(`مستند ${i + 1}`, `${typeName}: ${doc_item.file_name}`);
    });
  }

  // Terms
  rows += buildSectionHeader('الشروط والأحكام');
  rows += buildFieldRow('قبول الشروط', formData.agree_terms ? 'نعم' : 'لا');
  rows += buildFieldRow('قبول شروط الدفع', formData.agree_payment_terms ? 'نعم' : 'لا');

  // Create hidden container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: 800px; padding: 30px;
    background: white; font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
    direction: rtl; color: #222;
  `;

  container.innerHTML = `
    ${brandedHeaderHtml({
      documentType: 'نموذج تسجيل فني',
      documentTypeLatin: 'Technician Registration',
      documentId: formData.company_name || '',
      documentDate: dateStr,
    })}
    <div style="padding:20px 26px;">
      <table style="width:100%; border-collapse:collapse;">
        <tbody>${rows}</tbody>
      </table>
    </div>
    ${brandedFooterHtml()}
  `;

  document.body.appendChild(container);

  try {
    await document.fonts.ready;

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const usableWidth = pdfWidth - margin * 2;
    const ratio = usableWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;
    const usableHeight = pdfHeight - margin * 2;

    let remainingHeight = scaledHeight;
    let sourceY = 0;
    let page = 0;

    while (remainingHeight > 0) {
      if (page > 0) pdf.addPage();

      const sliceHeight = Math.min(remainingHeight, usableHeight);
      const sourceSliceHeight = sliceHeight / ratio;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidth;
      pageCanvas.height = Math.ceil(sourceSliceHeight);
      const ctx = pageCanvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, sourceY, imgWidth, sourceSliceHeight, 0, 0, imgWidth, sourceSliceHeight);

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(pageImgData, 'JPEG', margin, margin, usableWidth, sliceHeight);

      pdf.setFontSize(8);
      pdf.setTextColor(180);
      pdf.text(`${page + 1}`, pdfWidth / 2, pdfHeight - 4, { align: 'center' });

      sourceY += sourceSliceHeight;
      remainingHeight -= usableHeight;
      page++;
    }

    const safeCompanyName = (formData.company_name || 'form').replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_').substring(0, 30);
    const fileName = `technician_registration_${safeCompanyName}_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}
