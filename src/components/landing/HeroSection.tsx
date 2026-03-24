import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, Wrench } from "lucide-react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";
import { RotatingText } from "./RotatingText";

// Animated particles with mouse interaction
const ParticleCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

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

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      color: string;
      vx: number;
      vy: number;
      opacity: number;
      baseX: number;
      baseY: number;
    }> = [];

    const colors = [
      "#3b82f6", // Blue
      "#0d9488", // Teal
      "#f5bf23", // Orange
      "#10b981", // Green
      "#6366f1", // Indigo
    ];

    for (let i = 0; i < 80; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        radius: Math.random() * 3 + 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.7 + 0.3,
      });
    }

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        // Mouse interaction
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 150;

        if (distance < maxDistance) {
          const force = (maxDistance - distance) / maxDistance;
          particle.x -= (dx / distance) * force * 2;
          particle.y -= (dy / distance) * force * 2;
        } else {
          particle.x += (particle.baseX - particle.x) * 0.02;
          particle.y += (particle.baseY - particle.y) * 0.02;
        }

        particle.baseX += particle.vx;
        particle.baseY += particle.vy;

        if (particle.baseX < 0 || particle.baseX > canvas.width) particle.vx *= -1;
        if (particle.baseY < 0 || particle.baseY > canvas.height) particle.vy *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.opacity;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-[1]"
    />
  );
};

// Animated Orbs
const AnimatedOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-[2]">
    <div className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full bg-primary/20 blur-[100px] animate-[float_20s_ease-in-out_infinite]" />
    <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-success/15 blur-[120px] animate-[float_20s_ease-in-out_infinite_7s]" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#0d9488]/10 blur-[80px] animate-[float_20s_ease-in-out_infinite_14s]" />
  </div>
);

// Hero Badge with shimmer
const HeroBadge = ({ text }: { text: string }) => (
  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 animate-[fadeInDown_0.6s_ease-out_0.2s_both] relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
    <Wrench className="h-4 w-4 text-secondary animate-pulse" />
    <span className="text-sm font-medium text-white/90">{text}</span>
  </div>
);

// Smooth text reveal hook - no typing, just fade in
const useSmoothReveal = (delay: number = 800) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay]);

  return isVisible;
};

// Animated Counter
const AnimatedCounter = ({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeOut * end));
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <div ref={countRef} className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#f5bf23]">
      {suffix}{count.toLocaleString()}
    </div>
  );
};

// Scroll Indicator
const ScrollIndicator = ({ onClick, text }: { onClick: () => void; text: string }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer animate-[fadeInUp_0.6s_ease-out_1.5s_both]"
  >
    <div className="w-6 h-10 rounded-full border-2 border-current flex justify-center pt-2">
      <div className="w-1 h-2 bg-current rounded-full animate-[scrollWheel_2s_ease-in-out_infinite]" />
    </div>
    <span className="text-xs">{text}</span>
  </button>
);

// Animated Border Button
const AnimatedBorderButton = ({ children, onClick, isRTL }: { children: React.ReactNode; onClick: () => void; isRTL: boolean }) => (
  <button
    onClick={onClick}
    className="relative group px-8 py-4 rounded-lg overflow-hidden bg-primary hover:bg-primary/90 transition-all duration-300 hover:-translate-y-1"
  >
    <div className="absolute inset-0 rounded-lg p-[2px] bg-gradient-to-r from-primary via-secondary to-success animate-[borderRotate_3s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="absolute inset-[2px] rounded-lg bg-primary group-hover:bg-primary/95" />
    <span className="relative z-10 flex items-center gap-2 text-white font-semibold">
      {children}
    </span>
  </button>
);

export const HeroSection = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const isTextVisible = useSmoothReveal(600);

  const rotatingTexts = useMemo(() => {
    return t('hero.rotatingTexts', { defaultValue: 'حلول ذكية,خدمة احترافية,راحة بال,جودة مضمونة' }).split(',');
  }, [t]);

  const scrollToContent = useCallback(() => {
    window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" });
  }, []);

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <section className="relative min-h-[100dvh] bg-[#0a1929] overflow-hidden flex flex-col items-center justify-center">
      {/* Background Layers */}
      <ParticleCanvas />
      <AnimatedOrbs />

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a1929]/50 to-[#0a1929] z-[3]" />

      {/* Main Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-16 relative z-10 text-center">
        {/* Badge */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <HeroBadge text={t('hero.badge')} />
        </div>

        {/* Main Title */}
        <div className="max-w-5xl mx-auto mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight animate-[fadeInUp_0.6s_ease-out_both]">
255:             <span className="text-white block mb-2">{t('hero.titleLine1')}</span>
            <RotatingText
              texts={rotatingTexts}
              className="text-[#f5bf23] font-bold"
              interval={3000}
            />
          </h1>
        </div>

        {/* Subtitle */}
        <p className="text-sm sm:text-base md:text-lg text-white/70 leading-relaxed max-w-3xl mx-auto mb-8 sm:mb-10 animate-[fadeInUp_0.6s_ease-out_0.6s_both] px-2">
          {t('hero.subtitle')}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 animate-[fadeInUp_0.6s_ease-out_0.9s_both] px-4 sm:px-0">
          <AnimatedBorderButton onClick={() => (window.location.href = "/role-selection")} isRTL={isRTL}>
            {t('hero.cta')}
            <ArrowIcon className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 rtl:group-hover:translate-x-1 transition-transform" />
          </AnimatedBorderButton>

          <Button
            variant="outline-light"
            size="lg"
            className="px-6 sm:px-8 py-4 sm:py-6 text-sm sm:text-base backdrop-blur-sm transition-all duration-300 hover:-translate-y-1"
            onClick={() => (window.location.href = "/book-consultation")}
          >
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 ltr:mr-2 rtl:ml-2" />
            {t('hero.consultation')}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8 md:gap-16 mb-8 sm:mb-12 animate-[fadeInUp_0.6s_ease-out_1.2s_both]">
          <div className="text-center min-w-[80px]">
            <AnimatedCounter end={99} suffix="" />
            <div className="text-xs sm:text-sm text-white/60 mt-1 sm:mt-2">{t('hero.stats.satisfaction')}</div>
          </div>
          
          <div className="hidden sm:block w-px h-12 sm:h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          
          <div className="text-center min-w-[80px]">
            <AnimatedCounter end={1500} suffix="+" />
            <div className="text-xs sm:text-sm text-white/60 mt-1 sm:mt-2">{t('hero.stats.projects')}</div>
          </div>
          
          <div className="hidden sm:block w-px h-12 sm:h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          
          <div className="text-center min-w-[80px]">
            <AnimatedCounter end={50} suffix="+" />
            <div className="text-xs sm:text-sm text-white/60 mt-1 sm:mt-2">{t('hero.stats.experts')}</div>
          </div>
        </div>

        {/* Scroll Indicator - Hidden on small screens */}
        <div className="hidden sm:block">
          <ScrollIndicator onClick={scrollToContent} text={t('hero.scrollDown')} />
        </div>
      </div>
    </section>
  );
};
