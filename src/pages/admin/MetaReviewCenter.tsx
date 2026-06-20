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
