import { LandingHeader } from "@/components/landing/LandingHeader";
import { Footer } from "@/components/landing/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Wrench, Building2, Droplet, Zap, PaintBucket, 
  ShieldCheck, Clock, Award, ArrowLeft, Hammer,
  Home, Lightbulb, ChevronDown, FileText
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Services() {
  const services = [
    {
      icon: Building2,
      title: "المقاولات العامة",
      description: "نقدم خدمات مقاولات شاملة للمشاريع السكنية والتجارية بأعلى معايير الجودة",
      features: ["بناء المنشآت", "التشطيبات الداخلية", "الترميمات"],
      image: "construction.jpg",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Zap,
      title: "الأعمال الكهربائية",
      description: "تركيب وصيانة الأنظمة الكهربائية بكفاءة عالية وأمان تام",
      features: ["التمديدات الكهربائية", "صيانة اللوحات", "أنظمة الإنارة"],
      image: "electrical.jpg",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: Droplet,
      title: "أعمال السباكة",
      description: "حلول متكاملة للسباكة والصرف الصحي لجميع أنواع المباني",
      features: ["تمديدات المياه", "كشف التسربات", "صيانة الأنظمة"],
      image: "plumbing.jpg",
      color: "from-cyan-500 to-blue-500"
    },
    {
      icon: PaintBucket,
      title: "أعمال الدهانات",
      description: "خدمات دهانات احترافية بأحدث التقنيات وأجود المواد",
      features: ["الدهانات الداخلية", "الدهانات الخارجية", "الديكورات"],
      image: "painting.jpg",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Home,
      title: "صيانة المباني",
      description: "صيانة دورية وطارئة لجميع أنواع المباني والمنشآت",
      features: ["صيانة وقائية", "إصلاحات طارئة", "تحديثات دورية"],
      image: "maintenance.jpg",
      color: "from-green-500 to-emerald-600"
    },
    {
      icon: Lightbulb,
      title: "الاستشارات الهندسية",
      description: "استشارات فنية متخصصة لمشاريعك من الألف إلى الياء",
      features: ["دراسات الجدوى", "التصميم الهندسي", "إدارة المشاريع"],
      image: "consulting.jpg",
      color: "from-indigo-500 to-purple-600"
    }
  ];

  const benefits = [
    { icon: ShieldCheck, title: "ضمان الجودة", description: "ضمان شامل على جميع الأعمال" },
    { icon: Clock, title: "الالتزام بالمواعيد", description: "تسليم في الوقت المحدد" },
    { icon: Award, title: "خبرة واسعة", description: "أكثر من 15 عاماً من الخبرة" },
    { icon: Hammer, title: "فريق محترف", description: "فنيون معتمدون ومدربون" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <Badge variant="secondary" className="w-fit mx-auto">
              <Wrench className="h-3 w-3 ml-1" />
              خدماتنا المتميزة
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-bold">
              خدمات <span className="bg-gradient-to-l from-primary to-secondary bg-clip-text text-transparent">متكاملة</span> لجميع احتياجاتك
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              نقدم مجموعة شاملة من الخدمات المتخصصة في المقاولات والصيانة بأعلى معايير الجودة والاحترافية
            </p>
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card 
                key={index} 
                className="overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group"
              >
                <div className={`h-48 bg-gradient-to-br ${service.color} relative overflow-hidden`}>
                  <img 
                    src={`https://al-azab.co/images/${service.image}`}
                    alt={service.title}
                    className="w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <service.icon className="h-20 w-20 text-white" />
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <h3 className="text-xl font-bold">{service.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="w-full group">
                        اطلب الخدمة الآن
                        <ChevronDown className="h-4 w-4 mr-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-56">
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
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">لماذا تختارنا؟</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              نحن نقدم أكثر من مجرد خدمة، نقدم تجربة متميزة تضمن رضاك التام
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-all hover:-translate-y-1">
                <div className="w-14 h-14 mx-auto mb-4 bg-gradient-primary rounded-xl flex items-center justify-center">
                  <benefit.icon className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="font-bold mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="p-12 text-center bg-gradient-to-br from-primary to-primary-dark text-primary-foreground">
            <h2 className="text-3xl font-bold mb-4">جاهز لبدء مشروعك؟</h2>
            <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
              تواصل معنا اليوم واحصل على استشارة مجانية لمشروعك
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/book-consultation">
                <Button size="lg" variant="secondary" className="group">
                  احجز استشارة مجانية
                  <ArrowLeft className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/about">
                <Button size="lg" variant="outline-light">
                  تعرف علينا أكثر
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
