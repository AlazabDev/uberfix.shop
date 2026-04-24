import { Button } from "@/components/ui/button";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/components/shared/BrandLogo";

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
      { label: t('footer.technicianSupport'), href: "/technicians/register" },
      { label: "خريطة التطبيق", href: "/sitemap" }
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
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2 space-y-5">
            <BrandLogo size="lg" showSubtitle subtitle={t('footer.smartSystem')} linkTo="" darkBg animated glow />
            <p className="text-sm text-background/60 leading-relaxed max-w-sm">
              {t('footer.description')}
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2.5 text-background/50">
                <Phone className="h-3.5 w-3.5" />
                <span className="text-xs">+20 100 400 6620</span>
              </div>
              <div className="flex items-center gap-2.5 text-background/50">
                <Mail className="h-3.5 w-3.5" />
                <span className="text-xs">info@uberfix.shop</span>
              </div>
              <div className="flex items-center gap-2.5 text-background/50">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-xs">القاهرة، جمهورية مصر العربية - المعادي ش 500</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-background/70">{t('footer.appTitle')}</h4>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs h-8 border-background/20 text-background/70 hover:bg-background/10">
                  <Download className="h-3 w-3 ltr:mr-1.5 rtl:ml-1.5" />
                  {t('footer.appStore')}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8 border-background/20 text-background/70 hover:bg-background/10">
                  <Download className="h-3 w-3 ltr:mr-1.5 rtl:ml-1.5" />
                  {t('footer.googlePlay')}
                </Button>
              </div>
            </div>
          </div>

          {/* Links columns */}
          {[
            { title: t('footer.services'), links: footerLinks.services },
            { title: t('footer.support'), links: footerLinks.support },
          ].map((col, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-background/80 uppercase tracking-wider mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link, index) => (
                  <li key={index}>
                    <Link to={link.href} className="text-xs text-background/50 hover:text-background/80 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Company & Legal */}
          <div>
            <h4 className="text-xs font-semibold text-background/80 uppercase tracking-wider mb-4">{t('footer.company')}</h4>
            <ul className="space-y-2 mb-5">
              {footerLinks.company.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="text-xs text-background/50 hover:text-background/80 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h4 className="text-xs font-semibold text-background/80 uppercase tracking-wider mb-4">{t('footer.legal')}</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <Link to={link.href} className="text-xs text-background/50 hover:text-background/80 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-xs text-background/40">{t('footer.rights')}</div>
            <div className="flex items-center gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className="w-7 h-7 rounded-md bg-background/5 flex items-center justify-center hover:bg-background/10 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-3.5 w-3.5 text-background/50" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
