import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe, Check } from 'lucide-react';
import { useEffect } from 'react';
import { safeStorage } from '@/lib/safeStorage';

const languages = [
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'en', name: 'English', dir: 'ltr' },
];

export const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    const lang = languages.find(l => l.code === langCode);
    if (lang && typeof document !== 'undefined') {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = langCode;
    }

    safeStorage.setItem('i18nextLng', langCode);
  };

  // Set initial direction on mount
  useEffect(() => {
    const savedLang = safeStorage.getItem('i18nextLng') || i18n.resolvedLanguage || 'ar';
    const lang = languages.find(l => l.code === savedLang);
    if (lang && typeof document !== 'undefined') {
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = savedLang;
    }
  }, [i18n.resolvedLanguage]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-8 sm:h-9 px-2 sm:px-3">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline text-xs sm:text-sm">
            {languages.find(l => l.code === currentLang)?.name || t('common.language')}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span>{lang.name}</span>
            {currentLang === lang.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
