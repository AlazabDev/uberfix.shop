import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { RotatingText } from "./RotatingText";

// Subtle animated dots — reduced from 80 to 40 particles
const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const particles: Array<{
      x: number; y: number; radius: number; vx: number; vy: number; opacity: number;
    }> = [];

    for (let i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 0.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 185, 0, ${p.opacity})`;
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[1]" />;
};

// Animated Counter
const AnimatedCounter = ({ end, suffix = "" }: { end: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          const duration = 2000;
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeOut * end));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (countRef.current) observer.observe(countRef.current);
    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={countRef} className="text-2xl sm:text-3xl font-bold text-secondary">
      {suffix}{count.toLocaleString()}
    </div>
  );
};

// Scroll Indicator
const ScrollIndicator = ({ onClick, text }: { onClick: () => void; text: string }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 text-white/40 hover:text-white/70 transition-colors cursor-pointer animate-[fadeInUp_0.6s_ease-out_1.5s_both]"
  >
    <div className="w-5 h-9 rounded-full border border-current flex justify-center pt-2">
      <div className="w-0.5 h-2 bg-current rounded-full animate-[scrollWheel_2s_ease-in-out_infinite]" />
    </div>
    <span className="text-[11px] tracking-wider uppercase">{text}</span>
  </button>
);

export const HeroSection = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const rotatingTexts = useMemo(() => {
    return t('hero.rotatingTexts', { defaultValue: 'حلول ذكية,خدمة احترافية,راحة بال,جودة مضمونة' }).split(',');
  }, [t]);

  const scrollToContent = useCallback(() => {
    window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" });
  }, []);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[100dvh] bg-primary-dark overflow-hidden flex flex-col items-center justify-center">
      <ParticleCanvas />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary-dark/80 z-[2]" />

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 relative z-10 text-center">
        {/* Main Title */}
        <div className="max-w-4xl mx-auto mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight animate-[fadeInUp_0.5s_ease-out_both]">
            <span className="text-white block mb-3">{t('hero.titleLine1')}</span>
            <RotatingText
              texts={rotatingTexts}
              className="text-secondary font-extrabold"
              interval={3000}
            />
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-white/55 leading-relaxed max-w-2xl mx-auto mb-8 sm:mb-10 animate-[fadeInUp_0.5s_ease-out_0.3s_both]">
          {t('hero.subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 sm:mb-14 animate-[fadeInUp_0.5s_ease-out_0.5s_both] px-4 sm:px-0">
          <Button
            size="lg"
            className="bg-secondary hover:bg-secondary-light text-secondary-foreground font-bold px-8 py-5 text-base shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
            onClick={() => (window.location.href = "/role-selection")}
          >
            {t('hero.cta')}
            <ArrowIcon className="h-4 w-4 ltr:ml-2 rtl:mr-2" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="border-white/20 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-5 text-base transition-all duration-200 hover:-translate-y-0.5"
            onClick={() => (window.location.href = "/book-consultation")}
          >
            <Calendar className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {t('hero.consultation')}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-8 sm:gap-12 mb-10 sm:mb-14 animate-[fadeInUp_0.5s_ease-out_0.7s_both]">
          {[
            { end: 99, suffix: "%", label: t('hero.stats.satisfaction') },
            { end: 1500, suffix: "+", label: t('hero.stats.projects') },
            { end: 50, suffix: "+", label: t('hero.stats.experts') },
          ].map((stat, i) => (
            <div key={i} className="text-center min-w-[72px]">
              <AnimatedCounter end={stat.end} suffix={stat.suffix} />
              <div className="text-xs text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Scroll Indicator */}
        <div className="hidden sm:flex justify-center">
          <ScrollIndicator onClick={scrollToContent} text={t('hero.scrollDown')} />
        </div>
      </div>
    </section>
  );
};
