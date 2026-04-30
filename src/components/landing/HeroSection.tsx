import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { RotatingText } from "./RotatingText";

// Interactive starfield — twinkling stars that react to mouse movement
const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });

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

    type Star = {
      x: number; y: number; radius: number;
      baseOpacity: number; opacity: number;
      twinkleSpeed: number; twinklePhase: number;
      vx: number; vy: number;
      color: string;
    };

    const STAR_COUNT = Math.min(160, Math.floor((canvas.width * canvas.height) / 12000));
    const stars: Star[] = [];
    const colors = ["255, 255, 255", "255, 220, 180", "255, 185, 0", "180, 210, 255"];

    for (let i = 0; i < STAR_COUNT; i++) {
      const baseOpacity = Math.random() * 0.6 + 0.2;
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 1.4 + 0.3,
        baseOpacity,
        opacity: baseOpacity,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        twinklePhase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.05,
        vy: (Math.random() - 0.5) * 0.05,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 };
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const { x: mx, y: my } = mouseRef.current;
      const influenceRadius = 140;

      stars.forEach((s) => {
        // twinkle
        s.twinklePhase += s.twinkleSpeed;
        s.opacity = s.baseOpacity + Math.sin(s.twinklePhase) * 0.3;

        // drift
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;

        // mouse interaction — stars push away gently and brighten
        const dx = s.x - mx;
        const dy = s.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let radius = s.radius;
        let opacity = s.opacity;
        if (dist < influenceRadius) {
          const force = (1 - dist / influenceRadius);
          const angle = Math.atan2(dy, dx);
          const pushX = Math.cos(angle) * force * 8;
          const pushY = Math.sin(angle) * force * 8;
          radius = s.radius + force * 1.5;
          opacity = Math.min(1, s.opacity + force * 0.6);

          // glow halo
          const grad = ctx.createRadialGradient(s.x + pushX, s.y + pushY, 0, s.x + pushX, s.y + pushY, radius * 6);
          grad.addColorStop(0, `rgba(${s.color}, ${force * 0.4})`);
          grad.addColorStop(1, `rgba(${s.color}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(s.x + pushX, s.y + pushY, radius * 6, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(s.x + pushX, s.y + pushY, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.color}, ${opacity})`;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${s.color}, ${Math.max(0, opacity)})`;
          ctx.fill();
        }
      });

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
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
    <section className="relative min-h-[100dvh] bg-primary-dark overflow-hidden flex flex-col items-center justify-center pt-24 sm:pt-28 md:pt-32">
      <ParticleCanvas />

      {/* Night sky gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(30,30,80,0.5),_transparent_60%)] z-[2] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary-dark/80 z-[2] pointer-events-none" />

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 pt-8 pb-12 sm:pt-12 sm:pb-20 relative z-10 text-center">
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
            className="!bg-transparent border-2 border-white/40 !text-white hover:!bg-white/10 hover:border-white/70 backdrop-blur-sm px-8 py-5 text-base font-semibold transition-all duration-200 hover:-translate-y-0.5"
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
