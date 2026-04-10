import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Settings, MapPin, Bell, Calendar, FileText, BarChart3,
  Users, Shield, Smartphone, Clock, CheckCircle, Zap
} from "lucide-react";

export const FeaturesSection = () => {
  const features = [
    { icon: Settings, title: "إدارة الصيانة", description: "نظام شامل لإدارة جميع أنواع طلبات الصيانة مع تتبع حالة كل طلب" },
    { icon: MapPin, title: "تحديد المواقع", description: "خدمة تحديد المواقع الذكية للعثور على أقرب فني متاح" },
    { icon: Bell, title: "الإشعارات الفورية", description: "تنبيهات لحظية عن حالة الطلبات والمواعيد المهمة" },
    { icon: Calendar, title: "إدارة المواعيد", description: "جدولة وتنظيم المواعيد مع الفنيين والعملاء بكفاءة" },
    { icon: FileText, title: "التقارير والفواتير", description: "تقارير تفصيلية وفواتير إلكترونية لجميع الخدمات" },
    { icon: BarChart3, title: "تحليل الأداء", description: "لوحة تحكم تحليلية لمراقبة الأداء واتخاذ القرارات" },
  ];

  const additionalFeatures = [
    { icon: Users, text: "إدارة متعددة المستخدمين" },
    { icon: Shield, text: "أمان وحماية البيانات" },
    { icon: Smartphone, text: "تطبيق موبايل سهل الاستخدام" },
    { icon: Clock, text: "عمل على مدار الساعة" },
    { icon: CheckCircle, text: "ضمان جودة الخدمة" },
    { icon: Zap, text: "سرعة في الاستجابة" },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary tracking-wide mb-3">الميزات الأساسية</p>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
            إدارة الصيانة لأعمال متعددة الفروع
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            نظام متكامل يوفر جميع الأدوات اللازمة لإدارة عمليات الصيانة بطريقة احترافية
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {features.map((feature, index) => (
            <Card key={index} className="group border border-border hover:border-primary/20 transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Features */}
        <div className="bg-accent rounded-2xl p-8">
          <h3 className="text-xl font-bold text-center mb-8 text-foreground">
            إدارة صيانة <span className="text-primary">العقارات التجارية</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {additionalFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-card rounded-lg">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
