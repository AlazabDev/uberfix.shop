// src/components/landing/LandingPage.tsx
// Error-safe landing page with lazy-loaded components

import { lazy, Suspense } from "react";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { HeroServicesBar } from "./HeroServicesBar";
import { ServicesSection } from "./ServicesSection";
import { StatsSection } from "./StatsSection";
import { ExperienceSection } from "./ExperienceSection";

import { StorySection } from "./StorySection";
import { FeaturesSection } from "./FeaturesSection";
import { TechnicianSection } from "./TechnicianSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { Footer } from "./Footer";
import { FloatingButtons } from "@/components/ui/FloatingButtons";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/hooks/useDirection";

// Lazy load the Mapbox globe map for promotional display.
// Retry once on transient chunk-load failures (stale HMR hash, flaky network).
const lazyWithRetry = <T,>(factory: () => Promise<T>) =>
  lazy(() =>
    (factory() as Promise<any>).catch(async (err) => {
      console.warn("[LandingPage] Dynamic import failed, retrying once...", err);
      await new Promise((r) => setTimeout(r, 600));
      try {
        return await factory();
      } catch (err2) {
        console.error("[LandingPage] Retry failed, hiding GlobalMap.", err2);
        // Return a stub component so the rest of the page still renders.
        return { default: () => null } as any;
      }
    })
  );

const GlobalMap = lazyWithRetry(() => import("@/components/GlobalMap"));

// Loading fallback for map
const MapLoadingFallback = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full h-[700px] rounded-2xl bg-muted/50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-primary" />
        <p className="text-sm text-muted-foreground">{t('map.loading')}</p>
      </div>
    </div>
  );
};

export const LandingPage = () => {
  const { t } = useTranslation();
  const { direction } = useDirection();

  return (
    <div className="min-h-screen bg-background text-foreground" dir={direction}>
      <LandingHeader />

      {/* قسم الهيرو */}
      <HeroSection />

      {/* شريط الخدمات السريع أسفل الهيرو مباشرة */}
      <HeroServicesBar />

      {/* قسم الخريطة الترويجية - Globe */}
      <Suspense fallback={<MapLoadingFallback />}>
        <GlobalMap />
      </Suspense>

      {/* باقي أقسام صفحة الهبوط */}
      <ServicesSection />
      <StatsSection />
      <ExperienceSection />
      <StorySection />
      <FeaturesSection />
      <TechnicianSection />
      <TestimonialsSection />
      <Footer />
      
      {/* Floating Communication Buttons */}
      <FloatingButtons />
    </div>
  );
};
