import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

export const TestimonialsSection = () => {
  const testimonials = [
    {
      name: "أحمد محمد",
      position: "مدير العقارات",
      company: "مجموعة الفيصل العقارية",
      rating: 5,
      comment: "النظام سهل الاستخدام جداً وأحدث نقلة نوعية في إدارة طلبات الصيانة. فريق الدعم ممتاز والاستجابة سريعة.",
      avatar: "A"
    },
    {
      name: "سارة أحمد",
      position: "مديرة المشاريع",
      company: "شركة البناء المتطور",
      rating: 5,
      comment: "منصة رائعة تساعدنا في تنظيم جميع عمليات الصيانة والمتابعة. التقارير مفيدة جداً لاتخاذ القرارات.",
      avatar: "س"
    },
    {
      name: "محمد العلي",
      position: "رئيس قسم الصيانة",
      company: "مؤسسة الإعمار الحديث",
      rating: 5,
      comment: "وفر علينا الكثير من الوقت والجهد. إمكانية تتبع الطلبات والتواصل مع الفنيين ممتازة. أنصح به بشدة.",
      avatar: "م"
    }
  ];

  return (
    <section className="py-20 bg-accent/50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary tracking-wide mb-3">شهادات العملاء</p>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
            جرّب النظام مجاناً لمدة شهر
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            آراء عملائنا تتحدث عن تجربتهم الإيجابية مع نظامنا
          </p>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border border-border hover:border-primary/15 transition-all duration-200">
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/15 mb-4" />
                
                <div className="flex items-center gap-0.5 mb-3">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-secondary text-secondary" />
                  ))}
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  "{testimonial.comment}"
                </p>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{testimonial.name}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.position} · {testimonial.company}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="bg-card border border-border rounded-xl p-8 max-w-xl mx-auto">
            <h3 className="text-xl font-bold mb-2 text-foreground">ابدأ تجربتك المجانية</h3>
            <p className="text-sm text-muted-foreground">
              اكتشف كيف يمكن لنظامنا تحسين كفاءة إدارة الصيانة لديك
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
