import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo, BrandText } from "@/components/shared/BrandLogo";

export const Footer = () => {
  const { t } = useTranslation();

  const footerLinks = {
    services: [
      { label: t('services.maintenance'), href: "/services" },
      { label: t('services.quickMaintenance'), href: "/uf" },
      { label: t('footer.gallery'), href: "/gallery" },
      { label: t('footer.serviceRequest'), href: "/service-request" }
    ],
    support: [
      { label: t('footer.faq'), href: "/faq" },
      { label: t('footer.userGuide'), href: "/user-guide" },
      { label: t('footer.contactUs'), href: "/book-consultation" },
      { label: t('footer.betaTest'), href: "/beta-test" }
    ],
    company: [
      { label: t('footer.aboutCompany'), href: "/about" },
      { label: t('footer.blog'), href: "/blog" },
      { label: t('footer.technicianSupport'), href: "/technicians/register" }
    ],
    legal: [
      { label: t('footer.terms'), href: "/terms-of-service" },
      { label: t('footer.privacy'), href: "/privacy-policy" },
      { label: t('footer.dataDeletion'), href: "/data-deletion" },
      { label: t('footer.acceptableUse'), href: "/acceptable-use-policy" },
      { label: t('footer.compliance'), href: "/compliance" }
    ],
  };

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook" },
    { icon: Twitter, href: "#", label: "Twitter" },
    { icon: Instagram, href: "#", label: "Instagram" },
    { icon: Linkedin, href: "#", label: "LinkedIn" },
  ];

  return (
    <footer className="bg-primary text-primary-foreground">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="mb-4">
                <BrandLogo size="lg" showSubtitle subtitle={t('footer.smartSystem')} linkTo="" darkBg animated glow />
              </div>

              <p className="text-primary-foreground/80 leading-relaxed">
                {t('footer.description')}
              </p>
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4" />
                <span className="text-sm">+966 12 345 6789</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4" />
                <span className="text-sm">info@uberfix.shop</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">الرياض، المملكة العربية السعودية</span>
              </div>
            </div>

            {/* App Download */}
            <div className="space-y-3">
              <h4 className="font-semibold">{t('footer.appTitle')}</h4>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-primary bg-primary-foreground hover:bg-primary-foreground/90"
                >
                  <Download className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t('footer.appStore')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-primary bg-primary-foreground hover:bg-primary-foreground/90"
                >
                  <Download className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t('footer.googlePlay')}
                </Button>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.services')}</h4>
            <ul className="space-y-2">
              {footerLinks.services.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.support')}</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company & Legal */}
          <div>
            <h4 className="font-semibold mb-4">{t('footer.company')}</h4>
            <ul className="space-y-2 mb-6">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="font-semibold mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="border-t border-primary-foreground/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-primary-foreground/70">
              {t('footer.rights')}
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
