import { Button } from "@/components/ui/button";
import { Menu, X, LogIn, UserPlus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { cn } from "@/lib/utils";

export const LandingHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();

  // Track scroll position to switch header background
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navItems = [
    { to: "/", label: t('nav.home') },
    { to: "/about", label: t('nav.about') },
    { to: "/services", label: t('nav.services') },
    { to: "/projects", label: t('nav.projects') },
    { to: "/gallery", label: t('nav.gallery') },
    { to: "/blog", label: t('nav.blog') },
    { to: "/uf", label: t('nav.quickRequest') },
  ];

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300 safe-area-inset standalone-header tap-highlight-none",
        scrolled
          ? "bg-primary-dark/85 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)]"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="container mx-auto h-16 lg:h-[72px] px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Logo */}
        <div className="flex items-center min-w-0 shrink-0">
          <BrandLogo
            size="md"
            showSubtitle
            subtitle={t('footer.smartSystem')}
            darkBg
            animated
            glow
          />
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1 mx-4 flex-1 justify-center">
          {navItems.map((item) => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative px-3 py-2 text-[13px] font-medium rounded-md transition-colors whitespace-nowrap",
                  active
                    ? "text-secondary"
                    : "text-white/75 hover:text-white"
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 bg-secondary rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Auth & Language */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageSwitcher />

          <div className="hidden sm:block h-6 w-px bg-white/15 mx-1" aria-hidden />

          <Link to="/role-selection" className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-3 text-[13px] font-medium text-white/85 hover:text-white hover:bg-white/10"
            >
              <LogIn className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
              {t('nav.login')}
            </Button>
          </Link>

          <Link to="/role-selection">
            <Button
              size="sm"
              className="h-9 px-3.5 text-[13px] font-bold bg-secondary text-secondary-foreground hover:bg-secondary-light shadow-md hover:shadow-lg transition-all"
            >
              <UserPlus className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
              {t('nav.register')}
            </Button>
          </Link>

          {/* Mobile Menu Trigger */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9 ltr:ml-1 rtl:mr-1 text-white hover:bg-white/10 touch-target"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">{t('nav.openMenu')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[290px] sm:w-[320px] p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <div onClick={() => setIsOpen(false)}>
                    <BrandLogo size="md" />
                  </div>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>

                <nav className="flex-1 overflow-y-auto py-3 scroll-mobile">
                  <div className="flex flex-col gap-0.5 px-2">
                    {navItems.map((item) => {
                      const active = isActive(item.to);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-lg font-medium touch-target transition-colors",
                            active
                              ? "bg-secondary/15 text-secondary"
                              : "text-foreground hover:bg-accent"
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </nav>

                <div className="p-4 border-t border-border space-y-2.5">
                  <div className="flex justify-center mb-1">
                    <LanguageSwitcher />
                  </div>
                  <Link to="/role-selection" className="block" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <LogIn className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link to="/role-selection" className="block" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary-light">
                      <UserPlus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                      {t('nav.register')}
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
