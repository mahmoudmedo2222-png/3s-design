'use client';

import { Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type AppLocale, commonCopy, getLocaleDirection, localeCookieName } from '../lib/locale';

export function LanguageToggle({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const nextLocale: AppLocale = locale === 'ar' ? 'en' : 'ar';
  const copy = commonCopy[locale];

  function switchLanguage() {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = nextLocale;
    document.documentElement.dir = getLocaleDirection(nextLocale);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={switchLanguage}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded border border-line bg-white px-2.5 text-xs font-black text-ink transition hover:-translate-y-0.5 hover:scale-105 hover:border-pine hover:text-pine active:translate-y-0 active:scale-95"
      title={copy.languageTitle}
      aria-label={copy.languageTitle}
    >
      <Languages size={16} />
      <span>{copy.languageName}</span>
    </button>
  );
}
