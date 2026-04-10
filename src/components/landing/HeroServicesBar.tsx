import { Wind, Zap, Droplets, Wrench, Building2, PaintBucket, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const services = [
  { icon: Wind, title: "تكييف", serviceType: "hvac" },
  { icon: Zap, title: "كهرباء", serviceType: "electrical" },
  { icon: Droplets, title: "سباكة", serviceType: "plumbing" },
  { icon: Wrench, title: "صيانة عامة", serviceType: "general" },
  { icon: Building2, title: "تجهيز محلات", serviceType: "fitout" },
  { icon: PaintBucket, title: "دهانات", serviceType: "painting" },
];

export const HeroServicesBar = () => {
  const navigate = useNavigate();

  return (
    <section className="py-6 bg-card border-b border-border" dir="rtl">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
          {services.map((service, index) => (
            <button
              key={index}
              onClick={() => navigate(`/service-request?service=${service.serviceType}`)}
              className="group flex items-center gap-2.5 px-5 py-3 rounded-full bg-accent hover:bg-primary hover:text-primary-foreground border border-border hover:border-primary transition-all duration-200"
            >
              <service.icon className="h-4.5 w-4.5 text-primary group-hover:text-primary-foreground transition-colors" />
              <span className="text-sm font-semibold text-foreground group-hover:text-primary-foreground transition-colors">{service.title}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
