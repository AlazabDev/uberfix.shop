import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { BrandLogo } from "@/components/shared/BrandLogo";

export const LandingHeader = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  const navItems = [
    { to: "/", label: t('nav.home') },
    { to: "/about", label: t('nav.about') },
    { to: "/services", label: t('nav.services') },
    { to: "/projects", label: t('nav.projects') },
    { to: "/gallery", label: t('nav.gallery') },
    { to: "/blog", label: t('nav.blog') },
    { to: "/uf", label: t('nav.quickRequest') },
    { to: "/beta-test", label: t('nav.betaTest') },
  ];

  return (
    <header className="bg-card/80 backdrop-blur-lg border-b border-border/40 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-50 safe-area-inset standalone-header tap-highlight-none">
      {/* Logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <BrandLogo size="md" showSubtitle subtitle={t('footer.smartSystem')} animated glow />
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Auth & Language */}
      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher />
        <Link to="/role-selection" className="hidden xs:block">
          <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-8 sm:h-9 font-medium">
            {t('nav.login')}
          </Button>
        </Link>
        <Link to="/role-selection">
          <Button size="sm" className="text-xs sm:text-sm h-8 sm:h-9 font-semibold bg-primary hover:bg-primary-light">
            {t('nav.register')}
          </Button>
        </Link>
      </div>

      {/* Mobile Menu */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 touch-target tap-highlight-none">
            <Menu className="h-5 w-5" />
            <span className="sr-only">{t('nav.openMenu')}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] sm:w-[300px] p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div onClick={() => setIsOpen(false)}>
                <BrandLogo size="md" />
              </div>
              <SheetClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </div>

            <nav className="flex-1 overflow-y-auto py-3 scroll-mobile">
              <div className="flex flex-col gap-0.5 px-2">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-lg text-foreground hover:bg-accent transition-colors font-medium touch-target"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="p-4 border-t border-border space-y-2.5">
              <div className="flex justify-center mb-2">
                <LanguageSwitcher />
              </div>
              <Link to="/role-selection" className="block" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full">{t('nav.login')}</Button>
              </Link>
              <Link to="/role-selection" className="block" onClick={() => setIsOpen(false)}>
                <Button className="w-full">{t('nav.register')}</Button>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};
