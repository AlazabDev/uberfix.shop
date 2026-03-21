import { Button } from "@/components/ui/button";
import { Cog, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

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
  ];

  return (
    <header className="bg-card/95 backdrop-blur-md border-b border-border/50 px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between sticky top-0 z-50 shadow-sm safe-area-inset standalone-header tap-highlight-none">
      {/* Logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="relative w-9 h-9 sm:w-12 sm:h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
            <div className="relative">
              <span className="text-primary-foreground font-bold text-base sm:text-lg">Az</span>
              <Cog
                className="absolute -top-1 -right-1 h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary-foreground/80 animate-spin"
                style={{ animationDuration: "8s" }}
              />
            </div>
          </div>
          <div className="hidden xs:block">
            <h1 className="text-lg sm:text-xl font-bold text-primary tracking-tight">UberFix.shop</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium line-clamp-1">{t('footer.smartSystem')}</p>
          </div>
        </Link>
      </div>

      {/* Desktop Navigation Menu */}
      <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="text-sm font-medium text-foreground hover:text-primary transition-colors whitespace-nowrap"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Auth Buttons & Language Switcher */}
      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher />
        <Link to="/role-selection" className="hidden xs:block">
          <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">
            {t('nav.login')}
          </Button>
        </Link>
        <Link to="/role-selection">
          <Button size="sm" className="text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">{t('nav.register')}</Button>
        </Link>
      </div>

      {/* Mobile Menu Button */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 touch-target tap-highlight-none">
            <Menu className="h-5 w-5 sm:h-5 sm:w-5" />
            <span className="sr-only">{t('nav.openMenu')}</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
          <div className="flex flex-col h-full">
            {/* Mobile Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Link to="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
                <div className="relative w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-primary-foreground font-bold text-base">Az</span>
                </div>
                <span className="text-lg font-bold text-primary">UberFix.shop</span>
              </Link>
              <SheetClose asChild>
                <Button variant="ghost" size="icon">
                  <X className="h-5 w-5" />
                </Button>
              </SheetClose>
            </div>

            {/* Mobile Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 scroll-mobile">
              <div className="flex flex-col gap-1 px-2">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-4 rounded-lg text-foreground hover:bg-muted transition-colors font-medium touch-target"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            {/* Mobile Auth Buttons */}
            <div className="p-4 border-t border-border space-y-3">
              <div className="flex justify-center mb-3">
                <LanguageSwitcher />
              </div>
              <Link to="/role-selection" className="block" onClick={() => setIsOpen(false)}>
                <Button variant="outline" className="w-full">
                  {t('nav.login')}
                </Button>
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
