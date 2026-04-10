import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Wallet, Star, Bell, TrendingUp, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TechnicianSection = () => {
  const navigate = useNavigate();

  const benefits = [
    { icon: Bell, title: "استلام طلبات لحظية", description: "إشعارات فورية بطلبات الصيانة القريبة منك" },
    { icon: Wallet, title: "محفظة مالية ذكية", description: "تتبع أرباحك وسحب أموالك بنظام مالي آمن" },
    { icon: Star, title: "تقييمات وبدلات", description: "تقييمات من العملاء وبدلات تشجيعية شهرية" },
    { icon: TrendingUp, title: "فرص نمو مستمرة", description: "وصول لشبكة واسعة من العملاء" },
    { icon: Clock, title: "مرونة في العمل", description: "اختر مواعيدك ومناطق عملك حسب جدولك" },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-secondary tracking-wide mb-3">للفنيين المحترفين</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            احصل على شغل أكثر مع <span className="text-primary">UberFix</span>
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            انضم لشبكة الفنيين المحترفين واحصل على طلبات صيانة مستمرة مع نظام دفع آمن
          </p>
        </div>

        {/* Benefits */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
          {benefits.map((benefit, index) => (
            <Card key={index} className="border border-border hover:border-primary/20 transition-all duration-200">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <benefit.icon className="h-4.5 w-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-1">{benefit.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Checklist */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="bg-accent rounded-xl p-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                "استلام طلبات بشكل لحظي",
                "محفظة مالية لحساب أرباحك",
                "تقييمات عملاء وبدلات تشجيعية",
                "دعم فني متواصل",
                "تدريبات مجانية لتطوير مهاراتك",
                "حوافز شهرية للمتميزين",
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-success flex-shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={() => navigate("/technicians/register")}
            className="bg-primary hover:bg-primary-light text-primary-foreground font-semibold px-8 py-5 text-base shadow-md hover:shadow-lg transition-all duration-200"
          >
            الدخول إلى نظام الفنيين
            <Check className="mr-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            سجل الآن وانضم لشبكة UberFix من الفنيين المحترفين
          </p>
        </div>
      </div>
    </section>
  );
};
