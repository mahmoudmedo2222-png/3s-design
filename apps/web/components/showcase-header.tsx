import Link from 'next/link';
import { type AppLocale, commonCopy, homeCopy } from '../lib/locale';
import { ShowcaseAccountActions } from './showcase-account-actions';
import { ShowcaseSearchForm } from './showcase-search-form';

export function ShowcaseHeader({ locale }: { locale: AppLocale }) {
  const common = commonCopy[locale];
  const copy = homeCopy[locale];

  return (
    <header className="showcase-header fixed inset-x-0 top-0 z-40 px-4 pt-3 sm:px-6 lg:px-8">
      <div className="showcase-header__bar mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 rounded-lg border border-white/[0.12] bg-black/[0.24] px-3 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={common.home}>
          <span className="brand-mark" aria-hidden="true">
            <span className="brand-mark__stroke brand-mark__stroke--one" />
            <span className="brand-mark__stroke brand-mark__stroke--two" />
            <span className="brand-mark__spark" />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block text-[0.64rem] font-black uppercase tracking-[0.18em] text-white/[0.48]">{copy.premiumMarketplace}</span>
            <span className="block text-xl font-black leading-none text-white">3S Design</span>
          </span>
        </Link>

        <ShowcaseSearchForm locale={locale} />
        <ShowcaseAccountActions locale={locale} />
      </div>
    </header>
  );
}
