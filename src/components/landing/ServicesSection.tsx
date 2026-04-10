import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Wrench, Zap, Droplets, Wind, Building2, 
  CheckCircle, MessageCircle, FileText, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { openWhatsApp } from "@/config/whatsapp";
import { Link } from "react-router-dom";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const ServicesSection = () => {
  const services = [
    {
      icon: Wind,
      title: "تركيب وصيانة المكيفات",
      description: "تركيب، صيانة دورية، وإصلاح جميع أنواع أجهزة التكييف مع ضمان الجودة",
      image: "https://zrrffsjbfkphridqyais.supabase.co/storage/v1/object/public/az_gallery/images/maintenance/00451-klima-montaj.jpg",
      features: ["تركيب احترافي", "صيانة دورية", "شحن فريون", "غسيل وتنظيف"],
      whatsappMessage: "مرحباً، أريد الاستفسار عن خدمة تركيب وصيانة المكيفات 🌬️"
    },
    {
      icon: Zap,
      title: "أعمال الكهرباء",
      description: "تأسيس وتمديد الكهرباء، صيانة اللوحات الكهربائية، وحل جميع المشاكل الكهربائية",
      image: "https://zrrffsjbfkphridqyais.supabase.co/storage/v1/object/public/az_gallery/images/maintenance/62294-establish-electricity.jpg",
      features: ["تأسيس كهرباء", "صيانة لوحات", "كشف أعطال", "تركيب إضاءة"],
      whatsappMessage: "مرحباً، أحتاج خدمة كهرباء ⚡"
    },
    {
      icon: Droplets,
      title: "السباكة وإصلاح التسريبات",
      description: "كشف وإصلاح تسريبات المياه، تركيب وصيانة الأدوات الصحية والمواسير",
      image: "https://zrrffsjbfkphridqyais.supabase.co/storage/v1/object/public/az_gallery/images/maintenance/05214-water-leak-repair.jpg",
      features: ["كشف تسريبات", "إصلاح مواسير", "تركيب صحي", "صيانة خزانات"],
      whatsappMessage: "مرحباً، لدي مشكلة في السباكة وأحتاج مساعدة 💧"
    },
    {
      icon: Building2,
      title: "تجهيز المحلات التجارية",
      description: "تجهيز شامل للمحلات التجارية من تصميم وتنفيذ بأحدث المعايير والتقنيات",
      image: "https://zrrffsjbfkphridqyais.supabase.co/storage/v1/object/public/az_gallery/images/construction/abuauf_11.jpg",
      features: ["تصميم داخلي", "تنفيذ ديكورات", "تركيب واجهات", "تجهيز كامل"],
      whatsappMessage: "مرحباً، أريد الاستفسار عن تجهيز محل تجاري 🏪"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold text-primary tracking-wide mb-3">خدماتنا المتخصصة</p>
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">
            خدمات صيانة وتجهيز متكاملة
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            نقدم مجموعة شاملة من خدمات الصيانة وتجهيز المحلات التجارية بأعلى معايير الجودة
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-14">
          {services.map((service, index) => (
            <Card key={index} className="group overflow-hidden border border-border hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/90 backdrop-blur-sm flex items-center justify-center">
                    <service.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                </div>
              </div>
              
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">{service.title}</CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {service.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="flex-1" size="sm">
                        اطلب الخدمة
                        <ChevronDown className="h-3.5 w-3.5 mr-1.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
                      <DropdownMenuItem asChild>
                        <Link to="/uf" className="flex items-center gap-2 cursor-pointer">
                          <Wrench className="h-4 w-4" />
                          طلب صيانة
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/quote" className="flex items-center gap-2 cursor-pointer">
                          <FileText className="h-4 w-4" />
                          طلب عرض أسعار
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => openWhatsApp(service.whatsappMessage)}
                    className="text-success border-success/30 hover:bg-success/10"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Why Choose Us */}
        <div className="bg-accent rounded-2xl p-8 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">لماذا تختار خدماتنا؟</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                نفخر بتقديم خدمات صيانة متميزة مع ضمان الجودة والالتزام بالمواعيد.
              </p>
              <div className="space-y-2.5">
                {[
                  "فنيون معتمدون وذوو خبرة عالية",
                  "استخدام أفضل المواد والأدوات",
                  "ضمان شامل على جميع الأعمال",
                  "أسعار تنافسية وعروض مميزة",
                  "خدمة عملاء متاحة على مدار الساعة"
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <img 
                src="https://zrrffsjbfkphridqyais.supabase.co/storage/v1/object/public/az_gallery/images/maintenance/00453-klima-bakim.jpg"
                alt="صيانة مكيفات"
                className="w-full h-44 object-cover rounded-xl"
              />
              <img 
                src="https://zrrffsjbfkphridqyais.supabase.co/storage/v1/object/public/az_gallery/images/construction/abuauf_13.jpg"
                alt="تجهيز محلات"
                className="w-full h-44 object-cover rounded-xl mt-6"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
