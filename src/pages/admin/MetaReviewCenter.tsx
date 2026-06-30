export default function MetaReviewCenter() {
  const rows = [
    ["Callback URL", "https://zrrffsjbfkphridqyais.supabase.co/functions/v1/instagram-webhook"],
    ["Login Redirect", "https://zrrffsjbfkphridqyais.supabase.co/auth/v1/callback"],
    ["Ads Lead URL", "https://uf.alazab.com/uf?utm_source=instagram&utm_medium=paid_social&utm_campaign=uberfix_registration"],
  ];

  const items = [
    "الدعم البشري للمحادثات",
    "تعريف أصول الأعمال",
    "بيانات حساب إنستجرام الأساسية",
    "رسائل إنستجرام",
    "تعليقات إنستجرام",
    "نشر المحتوى",
    "تحليلات إنستجرام",
    "كتالوج الخدمات",
    "رسائل صفحة فيسبوك",
    "رسائل واتساب للأعمال",
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-slate-950">مركز مراجعة تكاملات Meta</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            شاشة تشغيل مخصصة لتجهيز فيديو المراجعة وإظهار مسارات الرسائل والتعليقات والنشر والتحليلات والكتالوج وواتساب.
          </p>
        </section>

        <section className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-6 shadow-sm">
          <div className="mb-3 inline-block rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white">
            Human Agent — الدعم البشري
          </div>
          <h2 className="text-2xl font-bold text-slate-950">سبب طلب صلاحية Human Agent</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-800">
            <p>
              يعمل في UberFix فريق دعم بشري مرخّص يستخدم صندوق الرسائل الموحّد للرد على
              عملاء الصيانة عبر إنستجرام وفيسبوك وواتساب. كثير من طلبات الصيانة تمتد
              لأكثر من 24 ساعة بين أول استفسار وموعد الزيارة الفعلي (حجز الموعد، إرسال
              الفني، تأكيد الحضور، الفاتورة، التقييم).
            </p>
            <p>
              نطلب صلاحية <strong>Human Agent</strong> لتمكين موظف الدعم من الرد يدوياً
              خلال نافذة الـ 7 أيام لخدمة العميل فقط — لا توجد رسائل تسويقية أو ترويجية
              خارج نافذة الـ 24 ساعة القياسية.
            </p>
            <p dir="ltr" className="rounded-xl bg-white p-3 text-xs text-slate-700">
              <strong>EN:</strong> UberFix human support agents use Meta Inbox tools to reply
              to maintenance customers within the 7-day human-agent window for customer
              service only — dispatching technicians, sharing visit ETA, and resolving
              service issues. No promotional content is sent outside the 24-hour window.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <div className="mb-1 text-xs font-bold text-amber-700">صندوق الرسائل الموحّد</div>
              <code dir="ltr" className="block break-all text-xs text-slate-800">https://uf.alazab.com/wa-hub</code>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <div className="mb-1 text-xs font-bold text-amber-700">دور الموظف البشري</div>
              <div className="text-xs text-slate-800">support / manager — يظهر اسمه وصورته بجانب كل رد صادر.</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <div className="mb-1 text-xs font-bold text-amber-700">نطاق الاستخدام</div>
              <div className="text-xs text-slate-800">الرد على استفسارات الصيانة، تأكيد المواعيد، متابعة الفنيين، حل المشكلات التشغيلية.</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-white p-4">
              <div className="mb-1 text-xs font-bold text-amber-700">نافذة الرد</div>
              <div className="text-xs text-slate-800">حتى 7 أيام من آخر رسالة عميل — لخدمة العملاء فقط، بلا محتوى تسويقي.</div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 text-sm font-bold text-slate-900">{label}</div>
              <code className="block break-all rounded-xl bg-slate-100 p-3 text-left text-xs" dir="ltr">{value}</code>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {items.map((name) => (
            <div key={name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-950">{name}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                يستخدم UberFix هذا المسار في سياق خدمة العملاء وطلبات الصيانة ومتابعة المحادثات التشغيلية داخل لوحة التحكم.
              </p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
