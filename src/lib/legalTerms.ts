import { BRAND, brandedHeaderHtml, brandedFooterHtml } from "./documentBranding";

/**
 * Generates the full UberFix Terms & Conditions document as branded HTML.
 * Adapted from the original orange/teal template to the unified Navy/Gold identity.
 */
export function buildTermsHtml(opts?: { signerName?: string; signedAt?: string }) {
  const { signerName, signedAt } = opts || {};
  const today = new Date().toLocaleDateString("ar-EG");

  const li = (txt: string) =>
    `<li style="padding-right:22px;position:relative;margin-bottom:10px;line-height:1.7;">
      <span style="position:absolute;right:0;color:${BRAND.gold};font-weight:900;">▹</span>${txt}
    </li>`;

  const h2 = (t: string) =>
    `<h2 style="font-size:18px;font-weight:800;margin:28px 0 14px;color:${BRAND.navy};border-right:5px solid ${BRAND.gold};padding-right:10px;">${t}</h2>`;

  const h3 = (t: string) =>
    `<h3 style="font-size:14px;font-weight:700;margin:18px 0 8px;color:${BRAND.navyDark};">${t}</h3>`;

  const prelude = (title: string, body: string, soft = false) => `
    <div style="background:${soft ? "#eef0fb" : "#f7f9ff"};border-right:6px solid ${BRAND.gold};padding:18px 22px;border-radius:10px;margin:18px 0;">
      <p style="margin:0 0 8px;font-weight:800;color:${BRAND.navy};">${title}</p>
      <div style="font-size:12px;color:#1e293b;line-height:1.8;">${body}</div>
    </div>`;

  const tableHtml = (headers: string[], rows: string[][]) => `
    <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:12px;border-radius:6px;overflow:hidden;border:1px solid #e2e8f0;">
      <thead><tr>${headers
        .map(
          (h) =>
            `<th style="background:${BRAND.navy};color:${BRAND.gold};padding:10px 12px;text-align:right;font-weight:700;">${h}</th>`
        )
        .join("")}</tr></thead>
      <tbody>${rows
        .map(
          (r, i) =>
            `<tr style="background:${i % 2 ? "#f8fafc" : "#fff"};">${r
              .map((c) => `<td style="border-top:1px solid #e2e8f0;padding:10px 12px;color:#1e293b;">${c}</td>`)
              .join("")}</tr>`
        )
        .join("")}</tbody>
    </table>`;

  const sidebar = `
    <div style="background:linear-gradient(135deg,${BRAND.navy},${BRAND.navyDark});color:#fff;padding:20px 24px;border-radius:12px;margin:22px 0;">
      <div style="font-weight:800;color:${BRAND.gold};margin-bottom:6px;">📈 متابعة الفنيين الجدد وبرنامج التطوير (رؤية العزب)</div>
      <p style="margin:0;font-size:12px;line-height:1.8;opacity:.95;">
        تقوم UberFix بمتابعة أداء الفنيين الجدد خلال فترة التشغيل الأولى، بهدف التقييم والتوجيه وتحسين مستوى الخدمة.
        وتؤمن شركة العزب أن الفني الجاد لا يجب أن يبقى في نفس المرحلة؛ لذلك قد يتم دعمه لاستخراج أوراقه الرسمية على نفقة العزب.
      </p>
    </div>`;

  const highlight = `
    <div style="background:#fff8e1;border-right:4px solid ${BRAND.gold};padding:14px 18px;border-radius:8px;margin:14px 0;font-size:12px;color:#1e293b;">
      🏅 <strong>دعم العزب للمتميزين:</strong> قد يشمل الدعم المساعدة في استخراج سجل تجاري، بطاقة ضريبية، فتح ملف تأميني، وتأهيل الفني للتعامل كمورد خدمة رسمي.
    </div>`;

  const signatureBlock = signerName
    ? `<div style="margin-top:24px;display:flex;justify-content:space-between;gap:24px;font-size:12px;">
        <div style="flex:1;border:1px dashed ${BRAND.navy};padding:14px;border-radius:8px;">
          <div style="color:#64748b;margin-bottom:4px;">المُقرّ:</div>
          <div style="font-weight:800;color:${BRAND.navy};">${signerName}</div>
        </div>
        <div style="flex:1;border:1px dashed ${BRAND.gold};padding:14px;border-radius:8px;">
          <div style="color:#64748b;margin-bottom:4px;">تاريخ الإقرار:</div>
          <div style="font-weight:800;color:${BRAND.navy};">${signedAt || today}</div>
        </div>
      </div>`
    : "";

  return `
    <div style="font-family:'Cairo','Segoe UI',Tahoma,sans-serif;background:#fff;color:#1a1f2e;direction:rtl;">
      ${brandedHeaderHtml({
        documentType: "الشروط والأحكام",
        documentTypeLatin: "Terms & Conditions",
        documentId: "UF-TR-2026",
        documentDate: today,
      })}

      <div style="padding:26px 32px;">
        ${prelude(
          "تمهيد",
          `<p style="margin:0 0 8px;">تؤمن UberFix أن الصيانة ليست مجرد خدمة تُنفذ، بل مسؤولية مهنية وأخلاقية أمام العميل، وأمام فريق العمل، وأمام المجتمع.</p>
           <p style="margin:0 0 8px;">لذلك فإن هذه الشروط والأحكام لا تُكتب لمحاسبة الفني وحده، بل هي إطار عادل ومنظم يلتزم به الجميع: الإدارة، فريق التشغيل، خدمة العملاء، الموردون، الفنيون، ومقدمو الخدمات.</p>
           <p style="margin:0;"><strong>الهدف من هذه الشروط ليس التضييق على الفني، بل بناء بيئة عمل محترمة تساعده على التطور من منفذ خدمة إلى مقدم خدمة محترف، ثم إلى صاحب كيان مستقل.</strong></p>`
        )}

        ${h2("أولاً: الشروط والأحكام العامة")}
        ${h3("1. التعريفات ونطاق التطبيق")}
        <ul style="list-style:none;padding:0;font-size:12px;">
          ${li('يقصد بـ <strong>"المنصة"</strong> منصة UberFix وما يرتبط بها من مواقع إلكترونية أو تطبيقات أو أنظمة متابعة.')}
          ${li('يقصد بـ <strong>"مقدم الخدمة"</strong> أو <strong>"الفني"</strong> كل شخص أو جهة تسجل في المنصة لتقديم خدمات صيانة أو تركيب أو إصلاح أو معاينة أو توريد.')}
          ${li("تسري هذه الشروط على جميع مراحل التسجيل، والمراجعة، والتفعيل، واستقبال الطلبات، وتنفيذ الخدمات، والتقييم، وتسوية المستحقات.")}
        </ul>

        ${h3("2. مبدأ العدالة وتطبيق الشروط على الجميع")}
        <p style="font-size:12px;line-height:1.8;">تلتزم UberFix بتطبيق هذه الشروط على جميع الأطراف دون تمييز. أي تقصير من فريق التشغيل أو الإدارة يتم التعامل معه بنفس مبدأ المحاسبة المطبّق على مقدم الخدمة.</p>

        ${h3("3. طبيعة العلاقة القانونية")}
        <p style="font-size:12px;line-height:1.8;">قبول التسجيل لا ينشئ علاقة عمل أو توظيف دائم. مقدم الخدمة يعمل كمورد خدمة مستقل أو مقاول/فني مستقل.</p>

        ${h3("4. الأهلية والمستندات المطلوبة")}
        <ul style="list-style:none;padding:0;font-size:12px;">
          ${li("كامل الأهلية القانونية وألا يقل العمر عن 18 سنة.")}
          ${li("إدخال بيانات صحيحة: الاسم، الهاتف، البريد، العنوان، نوع الخدمة، الخبرة، ووسيلة السداد.")}
          ${li("للمنصة الحق في رفض أو تعليق أو إيقاف الحساب عند ثبوت عدم صحة البيانات.")}
        </ul>

        ${h3("5. الالتزامات المهنية والسلامة")}
        <ul style="list-style:none;padding:0;font-size:12px;">
          ${li("تنفيذ الأعمال بجودة مهنية ومطابقة لأصول الصناعة.")}
          ${li("الالتزام بالمواعيد، الإبلاغ المبكر عن أي مانع، استخدام مهمات الوقاية الشخصية.")}
          ${li("يحظر تحويل العميل خارج المنصة أو تنفيذ طلبات جانبية دون موافقة إلكترونية.")}
        </ul>

        ${sidebar}
        ${tableHtml(
          ["عناصر تقييم الفني الجديد", "آلية المتابعة"],
          [
            ["الالتزام بالمواعيد", "تسجيل وقت الوصول عبر المنصة"],
            ["جودة التنفيذ", "تقرير العميل وصور قبل وبعد"],
            ["التعامل مع العميل", "تقييم ما بعد الخدمة"],
            ["نظافة العمل والمحافظة على الموقع", "مراجعة فريق الجودة"],
            ["سرعة الاستجابة وغياب الشكاوى", "نظام تصنيف آلي"],
          ]
        )}
        ${highlight}

        ${h3("6. مواد وقطع الغيار والضمان")}
        <p style="font-size:12px;line-height:1.8;">يتحمل مقدم الخدمة مسؤولية العيوب الناتجة عن سوء التنفيذ أو الإهمال، ويلتزم بإصلاح العيب خلال مدة معقولة. كما يلتزم بالحفاظ على سرية بيانات العملاء.</p>

        ${h2("ثانيًا: شروط الدفع والعمولات")}
        ${h3("1. نظام العمولة واستحقاق المقابل")}
        <ul style="list-style:none;padding:0;font-size:12px;">
          ${li("تحصل المنصة على عمولة من كل طلب منجز وتختلف نسبتها حسب نوع الخدمة والمستوى.")}
          ${li("لا يصبح المقابل مستحقًا للسحب إلا بعد إتمام الطلب واعتماده.")}
          ${li("الحد الأدنى لطلب السحب <strong>300 جنيه مصري</strong>، وتتم المعالجة خلال 24-48 ساعة عمل.")}
        </ul>

        ${tableHtml(
          ["نوع الإجراء", "التفاصيل"],
          [
            ["الخصومات والتسويات", "خصم العمولة، رسوم التحويل، أو التعويضات المعتمدة بسبب خطأ مثبت"],
            ["الإلغاء وعدم الحضور", "الإلغاء المتكرر بعد قبول الطلب قد يؤدي إلى خصم تشغيلي أو خفض الأولوية"],
            ["النزاعات المالية", "أي اعتراض يجب تقديمه خلال مدة معقولة مع رقم الطلب وسبب الاعتراض"],
          ]
        )}

        ${h3("2. الضرائب والفواتير")}
        <p style="font-size:12px;line-height:1.8;">يتحمل مقدم الخدمة مسؤولية موقفه الضريبي والتأميني وفق قانون الإجراءات الضريبية الموحد رقم 206 لسنة 2020.</p>

        ${prelude(
          "الإقرار النهائي",
          `<p style="margin:0 0 8px;">أقر بأنني قرأت الشروط والأحكام العامة وشروط الدفع والعمولات وفهمت مضمونها، وأوافق على الالتزام بها عند التسجيل واستخدام منصة UberFix.</p>
           <p style="margin:0;">أفهم أن هذه الشروط وُضعت لتنظيم العلاقة بعدالة واحترام، وأن الالتزام بها هو الطريق للحصول على فرص أكبر داخل المنصة.</p>`,
          true
        )}

        ${signatureBlock}

        <div style="margin-top:30px;padding-top:14px;text-align:center;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;">
          ⚖️ تخضع هذه الشروط للقانون المصري، وتختص المحاكم المصرية المختصة بنظر النزاعات. آخر تحديث: ${today}
        </div>
      </div>

      ${brandedFooterHtml()}
    </div>`;
}