import { Clock, TrendingUp, Users, CheckCircle } from "lucide-react";

export const StatsSection = () => {
  const stats = [
    { icon: Clock, value: "24/7", label: "خدمة مستمرة" },
    { icon: TrendingUp, value: "95%", label: "معدل الرضا" },
    { icon: Users, value: "+1000", label: "عميل نشط" },
    { icon: CheckCircle, value: "+5000", label: "طلب مكتمل" },
  ];

  return (
    <section className="py-16 bg-primary">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary-foreground/10 flex items-center justify-center mb-4 group-hover:bg-primary-foreground/15 transition-colors">
                <stat.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-primary-foreground/60">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
