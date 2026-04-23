import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                Az
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold leading-none">UberFix.shop</span>
                <span className="text-sm text-muted-foreground">سياسة الخصوصية</span>
              </div>
            </div>

            <Button variant="ghost" onClick={() => navigate(-1)}>
              العودة
              <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-5xl px-4 py-12">
        <div className="mb-10">
          <h1 className="mb-4 text-4xl font-bold">سياسة الخصوصية – UberFix.shop</h1>
          <p className="mb-3 text-sm text-muted-foreground">آخر تحديث: 23/04/2026</p>
          <p className="leading-8 text-muted-foreground">
            مرحبًا بك في <strong>UberFix.shop</strong>.
            <br />
            نحن نقدّر خصوصية المستخدمين ونلتزم بحماية البيانات الشخصية والتشغيلية المرتبطة
            باستخدام المنصة. توضح هذه السياسة كيفية جمع البيانات واستخدامها وتخزينها
            وحمايتها عند استخدام خدمات UberFix، وهي منصة متخصصة في{" "}
            <strong>إدارة طلبات الصيانة المعمارية</strong> ومتابعة الأعمال التشغيلية،
            مع تركيز خاص على <strong>إدارة وصيانة المحلات التجارية</strong>. تخدم
            المنصة حاليًا نطاقًا تشغيليًا واسعًا يشمل ما يقرب من{" "}
            <strong>700 محل تجاري</strong>، لذلك فإن حماية البيانات ودقة إدارتها جزء
            أساسي من جودة الخدمة نفسها.
          </p>
          <p className="mt-4 leading-8 text-muted-foreground">
            تُدار هذه المنصة من <strong>جمهورية مصر العربية</strong> بواسطة الجهة
            المشغلة للخدمة، ويُقصد بـ “نحن” أو “المنصة” أو “UberFix” في هذه السياسة
            الجهة المالكة والمشغلة للنظام والخدمات المرتبطة به.
          </p>
        </div>

        <div className="space-y-10 text-muted-foreground">
          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">1) نطاق التطبيق</h2>
            <p className="leading-8">
              تنطبق هذه السياسة على جميع المستخدمين الذين يتعاملون مع UberFix، بما
              في ذلك على سبيل المثال لا الحصر:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>العملاء الأفراد أو ممثلي الشركات</li>
              <li>مسؤولي الفروع والمحلات</li>
              <li>مديري التشغيل والصيانة</li>
              <li>الفنيين والمشرفين ومقدمي الخدمة</li>
              <li>المستخدمين الذين يرسلون طلبات صيانة أو يتابعون الطلبات أو يتلقون الإشعارات</li>
              <li>المستخدمين الذين يسجلون الدخول من خلال القنوات أو التكاملات الرقمية المعتمدة</li>
            </ul>
            <p className="mt-4 leading-8">
              كما تنطبق هذه السياسة على البيانات التي يتم جمعها عبر:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>موقع UberFix.shop</li>
              <li>النماذج الإلكترونية</li>
              <li>صفحات تسجيل الدخول</li>
              <li>واجهات الإدارة والتشغيل</li>
              <li>وسائل الإشعار والمتابعة الرقمية</li>
              <li>التكاملات المعتمدة مع الخدمات الخارجية عند تفعيلها</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">2) طبيعة الخدمة</h2>
            <p className="leading-8">
              UberFix ليست منصة عامة لنشر المحتوى أو التواصل المفتوح، بل هي منصة
              تشغيلية متخصصة تهدف إلى:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>استقبال طلبات الصيانة المعمارية</li>
              <li>تصنيف البلاغات ومتابعة مراحلها</li>
              <li>إدارة دورة حياة الطلب من الإنشاء حتى الإغلاق</li>
              <li>ربط الطلبات بالموقع أو الفرع أو الأصل أو النشاط</li>
              <li>تنسيق العمل بين العميل وفريق التشغيل والفنيين</li>
              <li>توثيق الأعمال المنجزة والملاحظات والزيارات والمرفقات</li>
              <li>دعم التشغيل الاحترافي للمحلات التجارية والمواقع المرتبطة بها</li>
            </ul>
            <p className="mt-4 leading-8">
              بالتالي، فإن نوعية البيانات التي تتم معالجتها داخل المنصة ترتبط بشكل
              مباشر بطبيعة الخدمة التشغيلية والفنية.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">3) البيانات التي نجمعها</h2>

            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-xl font-medium text-foreground">
                  أ) بيانات الهوية والتواصل
                </h3>
                <ul className="mr-5 list-disc space-y-2">
                  <li>الاسم</li>
                  <li>رقم الهاتف</li>
                  <li>البريد الإلكتروني</li>
                  <li>اسم الشركة أو الجهة</li>
                  <li>اسم الفرع أو الموقع</li>
                  <li>الصفة الوظيفية أو الدور المرتبط بالحساب</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium text-foreground">
                  ب) بيانات الطلبات التشغيلية
                </h3>
                <ul className="mr-5 list-disc space-y-2">
                  <li>وصف البلاغ أو طلب الصيانة</li>
                  <li>نوع المشكلة أو نطاق الأعمال المطلوبة</li>
                  <li>الأولوية وحالة الطلب</li>
                  <li>اسم الموقع أو الفرع أو الوحدة محل الخدمة</li>
                  <li>تواريخ الإنشاء والتحديث والزيارة والتنفيذ والإغلاق</li>
                  <li>اسم الفني أو المشرف أو الجهة المنفذة</li>
                  <li>ملاحظات المتابعة والتقييمات التشغيلية</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium text-foreground">
                  ج) بيانات المرفقات والمحتوى الفني
                </h3>
                <ul className="mr-5 list-disc space-y-2">
                  <li>الصور</li>
                  <li>الفيديوهات إن وجدت</li>
                  <li>الملفات أو المستندات المرفقة</li>
                  <li>الملاحظات الفنية</li>
                  <li>تقارير المعاينات</li>
                  <li>بيانات القياسات أو التوصيفات الفنية عند الحاجة</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium text-foreground">
                  د) بيانات الحساب وتسجيل الدخول
                </h3>
                <ul className="mr-5 list-disc space-y-2">
                  <li>بيانات تسجيل الدخول الأساسية</li>
                  <li>بيانات الجلسات</li>
                  <li>معرّفات المستخدمين الداخلية</li>
                  <li>معرّفات مزودي الهوية أو الخدمات المرتبطة عند استخدام تسجيل دخول خارجي</li>
                  <li>رموز التحقق أو بيانات التوثيق اللازمة لتشغيل الحساب بشكل آمن</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium text-foreground">
                  هـ) البيانات الفنية والتشغيلية
                </h3>
                <ul className="mr-5 list-disc space-y-2">
                  <li>عنوان IP</li>
                  <li>نوع الجهاز والمتصفح ونظام التشغيل</li>
                  <li>أوقات الوصول</li>
                  <li>سجلات الأحداث والأخطاء</li>
                  <li>بيانات الاستخدام اللازمة لتحسين الأداء ومراقبة الاستقرار والأمان</li>
                </ul>
              </div>

              <div>
                <h3 className="mb-2 text-xl font-medium text-foreground">و) بيانات الموقع</h3>
                <p className="leading-8">
                  قد تتم معالجة بيانات الموقع أو موقع الفرع أو الأصل محل الصيانة إذا
                  كان ذلك ضروريًا لتنفيذ الخدمة أو توجيه الفرق الفنية أو ربط الطلب
                  بالموقع الصحيح.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">4) مصادر البيانات</h2>
            <p className="leading-8">
              نحصل على البيانات من أكثر من مصدر بحسب سيناريو الاستخدام، ومنها:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>البيانات التي يقدمها المستخدم مباشرة</li>
              <li>البيانات التي تُسجّل أثناء استخدام المنصة</li>
              <li>البيانات التي يضيفها فريق التشغيل أو الإدارة أو الدعم</li>
              <li>البيانات الناتجة عن تحديثات حالة الطلبات</li>
              <li>البيانات الواردة من التكاملات المعتمدة التي يختار المستخدم أو الجهة المالكة تفعيلها</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">5) كيفية استخدام البيانات</h2>
            <p className="leading-8">نستخدم البيانات للأغراض التالية:</p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>إنشاء الحسابات وإدارتها والتحقق من صلاحيات الوصول</li>
              <li>استقبال طلبات الصيانة وتحليلها وتوجيهها</li>
              <li>ربط الطلبات بالمواقع والفروع والمحلات التجارية</li>
              <li>متابعة الأعمال وإدارة مراحل التنفيذ</li>
              <li>تعيين الفنيين أو الجهات المنفذة</li>
              <li>التواصل مع العملاء أو مسؤولي الفروع أو فرق التشغيل</li>
              <li>إرسال الإشعارات والتحديثات والتنبيهات المتعلقة بالطلبات</li>
              <li>توثيق الأعمال المنفذة وأرشفتها</li>
              <li>تحسين الأداء وجودة الخدمة وتجربة الاستخدام</li>
              <li>رصد الأعطال الفنية ومحاولات الاستخدام غير المشروع</li>
              <li>الامتثال للمتطلبات القانونية والتنظيمية والتعاقدية</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">
              6) الأساس الذي نعتمد عليه في المعالجة
            </h2>
            <p className="leading-8">
              نعالج البيانات متى كانت المعالجة ضرورية لأحد الأغراض التالية:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>تنفيذ الخدمة المطلوبة من المستخدم أو الجهة المتعاقدة</li>
              <li>إدارة العلاقة التعاقدية أو التشغيلية</li>
              <li>حماية المصلحة المشروعة للمنصة في إدارة وتشغيل الخدمة وأمنها</li>
              <li>الوفاء بالالتزامات القانونية والتنظيمية</li>
              <li>تنفيذ أي موافقة صريحة يقدّمها المستخدم عند الحاجة</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">7) مشاركة البيانات</h2>
            <p className="leading-8">نحن لا نبيع البيانات الشخصية لأي طرف ثالث.</p>
            <p className="mt-3 leading-8">
              وقد تتم مشاركة البيانات فقط بالقدر اللازم مع الأطراف التالية:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>فرق التشغيل والإدارة داخل النظام</li>
              <li>الفنيين أو المشرفين أو الجهات المنفذة المرتبطة بالطلب</li>
              <li>مزودي البنية التحتية والاستضافة والخدمات التقنية</li>
              <li>مزودي الإشعارات أو الرسائل أو خدمات التوثيق عند تفعيلها</li>
              <li>الجهات القانونية أو القضائية أو التنظيمية إذا طُلب ذلك بشكل نظامي</li>
            </ul>
            <p className="mt-4 leading-8">
              وتتم المشاركة على أساس الحاجة الفعلية للعمل، وليس على أساس الإتاحة
              العامة.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">
              8) سرية البيانات التشغيلية
            </h2>
            <p className="leading-8">
              نظرًا لأن UberFix تُستخدم لإدارة أعمال صيانة معمارية وتشغيلية تخص
              مواقع حقيقية ومحلات تجارية قائمة، فإن بعض البيانات داخل النظام قد
              تُعتبر <strong>بيانات تشغيلية حساسة</strong>، مثل:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>بيانات الفروع والمواقع</li>
              <li>الصور الداخلية أو الميدانية</li>
              <li>تقارير الأعطال</li>
              <li>ملاحظات التنفيذ</li>
              <li>بيانات الجداول التشغيلية</li>
              <li>تفاصيل الأصول المرتبطة بالصيانة</li>
            </ul>
            <p className="mt-4 leading-8">
              ولهذا نتعامل معها باعتبارها جزءًا من سرية التشغيل، ولا يجوز
              استخدامها خارج الغرض المهني المخصص لها.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">9) الاحتفاظ بالبيانات</h2>
            <p className="leading-8">
              نحتفظ بالبيانات للمدة اللازمة لتحقيق الأغراض التي جُمعت من أجلها، أو
              للمدة التي تقتضيها المتطلبات التشغيلية أو القانونية أو التعاقدية،
              بما في ذلك:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>توثيق الأعمال السابقة</li>
              <li>الرجوع لسجل الطلبات</li>
              <li>معالجة النزاعات أو المطالبات</li>
              <li>الامتثال للالتزامات المحاسبية أو التنظيمية</li>
              <li>حماية الحقوق القانونية للمنصة أو العملاء أو الجهة المشغلة</li>
            </ul>
            <p className="mt-4 leading-8">
              وعند انتهاء الحاجة، قد يتم حذف البيانات أو أرشفتها أو تقليل إمكانية
              ربطها بالمستخدم بحسب طبيعة كل حالة.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">10) حماية البيانات</h2>
            <p className="leading-8">
              نتخذ إجراءات معقولة ومناسبة لحماية البيانات من الفقد أو الوصول غير
              المصرح به أو التعديل أو التسريب، وتشمل هذه الإجراءات على سبيل المثال:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>استخدام اتصالات مشفرة وآمنة</li>
              <li>تقييد الوصول بحسب الدور الوظيفي والصلاحيات</li>
              <li>تسجيل الأحداث والعمليات الحساسة</li>
              <li>حماية بيئة التشغيل والخوادم وقواعد البيانات</li>
              <li>مراجعة الإعدادات الأمنية بصفة دورية</li>
              <li>عزل المكونات الحرجة بقدر الإمكان</li>
              <li>الحد من الوصول المباشر للبيانات الحساسة</li>
            </ul>
            <p className="mt-4 leading-8">
              ورغم ذلك، لا يمكن ضمان الأمان المطلق لأي نظام تقني بنسبة 100%،
              لكننا نعمل على تقليل المخاطر إلى أدنى حد عملي ممكن.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">
              11) ملفات تعريف الارتباط والجلسات
            </h2>
            <p className="leading-8">
              قد تستخدم المنصة ملفات تعريف ارتباط وتقنيات جلسات مماثلة لأغراض
              تشغيلية وأمنية وتحليلية، مثل:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>الحفاظ على حالة تسجيل الدخول</li>
              <li>تحسين الأداء</li>
              <li>تذكر تفضيلات أساسية</li>
              <li>منع إساءة الاستخدام</li>
              <li>دعم إجراءات الحماية والمصادقة</li>
            </ul>
            <p className="mt-4 leading-8">
              ولا تُستخدم هذه الوسائل خارج نطاق الغرض المرتبط بتشغيل المنصة وتحسين
              موثوقيتها وأمانها.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">12) حقوق المستخدم</h2>
            <p className="leading-8">
              بحسب القوانين المطبقة وطبيعة العلاقة التعاقدية أو التشغيلية، قد يكون
              للمستخدم الحق في:
            </p>
            <ul className="mr-5 mt-4 list-disc space-y-2">
              <li>طلب معرفة البيانات المتعلقة به</li>
              <li>طلب تصحيح البيانات غير الدقيقة</li>
              <li>طلب تحديث أو استكمال البيانات</li>
              <li>طلب حذف البيانات في الحالات التي يسمح بها النظام أو لا يعود الاحتفاظ بها لازمًا</li>
              <li>الاعتراض على بعض المعالجات غير الإلزامية</li>
              <li>طلب تقييد بعض أوجه المعالجة عند الاقتضاء</li>
            </ul>
            <p className="mt-4 leading-8">
              وقد تتأثر إمكانية تنفيذ بعض الطلبات إذا كانت البيانات لازمة للتشغيل
              أو التوثيق أو الالتزام القانوني.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">13) خصوصية الأطفال</h2>
            <p className="leading-8">
              خدمات UberFix غير موجهة للأطفال، ولا تستهدف جمع بياناتهم بشكل مقصود.
              إذا تبين لنا أن بيانات قد جُمعت على نحو غير متوافق مع ذلك، فسيتم
              التعامل معها بالإجراء المناسب وفقًا لطبيعة الحالة.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">
              14) الروابط والخدمات الخارجية
            </h2>
            <p className="leading-8">
              قد تحتوي المنصة أو التكاملات المرتبطة بها على روابط أو بوابات أو
              خدمات خارجية.
              <br />
              ولا نتحمل مسؤولية سياسات الخصوصية الخاصة بالأطراف الخارجية، ويجب
              مراجعة سياساتهم بشكل مستقل عند استخدام خدماتهم.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">
              15) التعديلات على هذه السياسة
            </h2>
            <p className="leading-8">
              قد نقوم بتحديث هذه السياسة من وقت إلى آخر لأسباب تشغيلية أو قانونية
              أو تقنية أو تنظيمية. وتصبح النسخة المحدثة نافذة من تاريخ نشرها على
              المنصة ما لم يُذكر خلاف ذلك.
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold text-foreground">
              16) الجهة المشغلة ومقر العمل
            </h2>
            <p className="leading-8">
              تُدار خدمة UberFix من <strong>جمهورية مصر العربية</strong>، وهي جزء
              من منظومة تشغيل وخدمات متخصصة في{" "}
              <strong>إدارة الصيانة المعمارية</strong>، مع تركيز تطبيقي واضح على{" "}
              <strong>المحلات التجارية</strong> وإدارة الصيانة لعدد كبير من المواقع
              والفروع.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">9. خصوصية الأطفال والبيانات الحساسة</h2>
            <p className="leading-relaxed">
              خدماتنا موجهة لأصحاب المحلات التجارية (فوق 18 عامًا). لا نتعمد جمع بيانات من هم دون 18 عامًا. كما لا نقوم بجمع بيانات حساسة (صحية، بيومترية، دينية) إلا بموافقتك الصريحة وضرورة مطلقة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">10. مسؤول حماية البيانات (DPO) وآلية حل النزاعات</h2>
            <p className="leading-relaxed">
              تم تعيين مسؤول لحماية البيانات (DPO) للإشراف على الامتثال لهذه السياسة وقانون حماية البيانات المصري. يمكنك التواصل معه عبر:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4 mt-2">
              <li><strong>البريد الإلكتروني:</strong> privacy@alazab.com</li>
              <li><strong>هاتف:</strong> +2 01092750351 (خلال ساعات العمل)</li>
              <li><strong>واتساب:</strong> +1 555-728-5727</li>
            </ul>
            <p className="leading-relaxed mt-3">
              إذا لم تكن راضيًا عن ردنا، يحق لك تقديم شكوى إلى <strong>مركز حماية البيانات الشخصية (PDPC)</strong> التابع لمجلس الوزراء المصري.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">11. التعديلات على السياسة</h2>
            <p className="leading-relaxed">
              قد نقوم بتعديل هذه السياسة. سيتم إخطارك بأي تغييرات جوهرية عبر إشعار بارز على المنصة أو عبر البريد الإلكتروني قبل 30 يومًا من تاريخ السريان. استمرار استخدامك للمنصة بعد التعديل يعتبر موافقة.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-foreground mb-4">12. الاتصال بنا</h2>
            <p className="leading-relaxed mb-3">
              للاستفسارات العامة أو ممارسة حقوقك، يمكنك الاتصال بنا على:
            </p>
            <ul className="space-y-2">
              <li><strong>مسؤول حماية البيانات (DPO):</strong> <a href="mailto:privacy@alazab.com" className="text-primary">privacy@alazab.com</a></li>
              <li><strong>الدعم الفني والاستفسارات العامة:</strong> <a href="mailto:support@alazab.com" className="text-primary">support@alazab.com</a></li>
              <li><strong>العنوان البريدي:</strong> UberFix (شركة العزب للصيانة والتشطيبات) – 8 ش 500 المعادي، القاهرة، جمهورية مصر العربية. الرقم البريدي: 4234570</li>
              <li><strong>أرقام التواصل:</strong>
                <ul className="list-circle list-inside mr-6 mt-1">
                  <li>واتساب (دولي): <a href="https://wa.me/15557285727" className="text-primary">+1 555-728-5727</a></li>
                  <li>هاتف (مصر): <a href="tel:+201092750351" className="text-primary">+2 01092750351</a></li>
                  <li>واتساب الشكاوي: <a href="https://wa.me/15557245001" className="text-primary">+1 555-724-5001</a></li>
                  <li>هاتف الشكاوي: <a href="tel:+201004006620" className="text-primary">+2 01004006620</a></li>
                </ul>
              </li>
              <li><strong>ساعات العمل الرسمية:</strong> من الأحد إلى الخميس، 10 صباحًا – 6 مساءً (توقيت القاهرة).</li>
            </ul>
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
