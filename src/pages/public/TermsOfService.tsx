import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold">Az</span>
              </div>
              <span className="text-xl font-bold">UberFix.shop</span>
            </div>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowRight className="h-4 w-4 ml-2" />
              العودة
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8">الشروط والأحكام</h1>
        
        <div className="space-y-8 text-muted-foreground">
          <section>
            <p className="text-sm text-muted-foreground mb-4">آخر تحديث: {new Date().toLocaleDateString('ar-SA')}</p>
            <p className="leading-relaxed">
              مرحباً بك في UberFix.shop. باستخدامك لمنصتنا، فإنك توافق على الالتزام بالشروط والأحكام التالية. يرجى قراءتها بعناية قبل استخدام خدماتنا.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">1. قبول الشروط</h2>
            <p className="leading-relaxed">
              باستخدامك لمنصة UberFix.shop، فإنك توافق على الالتزام بهذه الشروط والأحكام وجميع القوانين واللوائح المعمول بها. إذا كنت لا توافق على أي من هذه الشروط، يُرجى عدم استخدام خدماتنا.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">2. تعريف الخدمة</h2>
            <p className="leading-relaxed mb-3">
              UberFix.shop هي منصة إلكترونية متخصصة في إدارة عمليات الصيانة والعقارات، توفر:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>إدارة طلبات الصيانة</li>
              <li>تعيين الفنيين والمتابعة</li>
              <li>إدارة العقارات والمرافق</li>
              <li>نظام التقارير والتحليلات</li>
              <li>إدارة الموردين والمخزون</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">3. التسجيل والحساب</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-medium text-foreground">3.1 متطلبات التسجيل:</h3>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>يجب أن يكون عمرك 18 عاماً على الأقل</li>
                <li>تقديم معلومات دقيقة وكاملة</li>
                <li>الحفاظ على سرية بيانات الدخول</li>
                <li>إخطارنا فوراً بأي استخدام غير مصرح به</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mt-4">3.2 مسؤولية الحساب:</h3>
              <p className="leading-relaxed">
                أنت مسؤول عن جميع الأنشطة التي تتم تحت حسابك. نحن غير مسؤولين عن أي خسارة ناتجة عن الاستخدام غير المصرح به لحسابك.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">4. استخدام الخدمة</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-medium text-foreground">4.1 الاستخدام المقبول:</h3>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>استخدام المنصة للأغراض القانونية فقط</li>
                <li>احترام حقوق الآخرين</li>
                <li>عدم التدخل في عمل المنصة</li>
                <li>الامتثال لجميع القوانين المحلية</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mt-4">4.2 الاستخدام المحظور:</h3>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>نشر محتوى غير قانوني أو مسيء</li>
                <li>انتحال شخصية الآخرين</li>
                <li>محاولة اختراق أو تعطيل النظام</li>
                <li>استخدام البيانات لأغراض تجارية غير مصرح بها</li>
                <li>نسخ أو تعديل برمجيات المنصة</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">5. الأسعار والدفع</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-medium text-foreground">5.1 الرسوم:</h3>
              <p className="leading-relaxed">
                تختلف رسوم الخدمة حسب نوع الاشتراك والخدمات المطلوبة. جميع الأسعار المعروضة بالجنيه المصري وشاملة ضريبة القيمة المضافة.
              </p>

              <h3 className="text-xl font-medium text-foreground mt-4">5.2 الدفع:</h3>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>الدفع مقدماً للاشتراكات الشهرية/السنوية</li>
                <li>قبول وسائل الدفع الإلكترونية المعتمدة</li>
                <li>عدم استرداد الرسوم إلا وفقاً لسياسة الإلغاء</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mt-4">5.3 التجديد التلقائي:</h3>
              <p className="leading-relaxed">
                تتجدد الاشتراكات تلقائياً ما لم يتم إلغاؤها قبل تاريخ التجديد بـ 7 أيام على الأقل.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">6. الإلغاء والاسترداد</h2>
            <div className="space-y-3">
              <h3 className="text-xl font-medium text-foreground">6.1 حق الإلغاء:</h3>
              <ul className="list-disc list-inside space-y-2 mr-4">
                <li>يمكنك إلغاء اشتراكك في أي وقت</li>
                <li>ستظل لديك صلاحية الوصول حتى نهاية فترة الاشتراك</li>
                <li>لا يتم استرداد الأموال عن الفترات غير المستخدمة</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mt-4">6.2 استرداد الأموال:</h3>
              <p className="leading-relaxed">
                يمكن طلب استرداد كامل خلال 14 يوماً من التسجيل إذا لم يتم استخدام الخدمة بشكل جوهري.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">7. الملكية الفكرية</h2>
            <p className="leading-relaxed mb-3">
              جميع المحتويات والبرمجيات والتصاميم الموجودة على المنصة محمية بحقوق الطبع والنشر وقوانين الملكية الفكرية:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>العلامة التجارية UberFix.shop مسجلة ومحمية</li>
              <li>لا يجوز نسخ أو توزيع المحتوى دون إذن</li>
              <li>تحتفظ أنت بملكية البيانات التي تدخلها</li>
              <li>نمنحك ترخيصاً محدوداً لاستخدام المنصة</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">8. حدود المسؤولية</h2>
            <p className="leading-relaxed mb-3">
              نبذل قصارى جهدنا لتوفير خدمة موثوقة، ولكن:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>الخدمة متاحة "كما هي" دون ضمانات</li>
              <li>لا نتحمل مسؤولية الأضرار غير المباشرة</li>
              <li>لا نضمن عدم انقطاع الخدمة</li>
              <li>مسؤوليتنا محدودة بقيمة الاشتراك المدفوع</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. التعويض</h2>
            <p className="leading-relaxed">
              توافق على تعويضنا عن أي مطالبات أو خسائر ناتجة عن استخدامك للخدمة أو انتهاكك لهذه الشروط.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. إنهاء الخدمة</h2>
            <p className="leading-relaxed mb-3">
              نحتفظ بالحق في:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>تعليق أو إنهاء حسابك عند انتهاك الشروط</li>
              <li>تعديل أو إيقاف الخدمة مع إشعار مسبق</li>
              <li>حذف البيانات بعد إنهاء الحساب</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. التعديلات على الشروط</h2>
            <p className="leading-relaxed">
              قد نقوم بتحديث هذه الشروط من وقت لآخر. سنخطرك بالتغييرات الجوهرية عبر البريد الإلكتروني أو إشعار على المنصة. استمرارك في استخدام الخدمة بعد التعديلات يعني موافقتك عليها.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. القانون الواجب التطبيق</h2>
            <p className="leading-relaxed">
              تخضع هذه الشروط لقوانين جمهورية مصر العربية. أي نزاع ينشأ عن هذه الشروط يتم حله عبر المحاكم المختصة في القاهرة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">13. الاتصال</h2>
            <p className="leading-relaxed mb-3">
              لأي استفسارات حول هذه الشروط، يرجى الاتصال بنا:
            </p>
            <ul className="space-y-2">
              <li><strong>البريد الإلكتروني:</strong> legal@uberfix.shop</li>
              <li><strong>الهاتف:</strong> +20 100 400 6620</li>
              <li><strong>العنوان:</strong> القاهرة، جمهورية مصر العربية - المعادي ش 500</li>
            </ul>
          </section>

          <section className="bg-muted p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-foreground mb-2">إقرار</h3>
            <p className="leading-relaxed">
              باستخدامك لمنصة UberFix.shop، فإنك تقر بأنك قد قرأت وفهمت ووافقت على الالتزام بهذه الشروط والأحكام.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Button onClick={() => navigate(-1)} size="lg">
            <ArrowRight className="h-4 w-4 ml-2" />
            العودة إلى الموقع
          </Button>
        </div>
      </main>
    </div>
  );
}
