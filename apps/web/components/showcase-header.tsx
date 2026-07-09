'use client';

import { LogIn, Search, UserPlus, UserRound } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { queueAiSearch } from '../lib/ai-search';
import { useAuthSession } from '../lib/auth-session';
import { type AppLocale, commonCopy, homeCopy } from '../lib/locale';
import { CartButton } from './cart-button';
import { ThemeToggle } from './theme-toggle';
import { Button } from './ui';

export function ShowcaseHeader({ locale }: { locale: AppLocale }) {
  const router = useRouter();
  const { isSignedIn, user } = useAuthSession();
  const [query, setQuery] = useState('');
  const common = commonCopy[locale];
  const copy = homeCopy[locale];

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (!text) {
      return;
    }

    queueAiSearch(text);
    setQuery('');
    router.push(`/search?q=${encodeURIComponent(text)}` as Route);
  }

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

        <form
          onSubmit={submitSearch}
          className="hidden h-10 min-w-[220px] max-w-md flex-1 items-center gap-2 rounded-full border border-white/10 bg-[var(--showcase-cream)] px-4 text-sm text-[#101513] md:flex"
        >
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#101513] outline-none placeholder:text-[#101513]/[0.58]"
            placeholder={locale === 'ar' ? 'ابحث بالإحساس أو المجال أو الستايل...' : 'Search by feeling, industry, style...'}
          />
          <Button
            type="submit"
            size="sm"
            className="h-7 rounded-full border-transparent bg-[#101513] px-3 py-1 text-xs font-black text-[#fff8e8] hover:bg-[#22594b]"
          >
            {locale === 'ar' ? 'ابحث' : 'Find'}
          </Button>
        </form>

        <div className="flex items-center gap-2">
          {isSignedIn ? (
            <Link
              href="/account"
              className="hidden h-10 items-center justify-center gap-2 rounded-full border border-[#f7d17e]/40 bg-[#f7d17e]/12 px-3 text-sm font-bold text-[#f7d17e] transition hover:bg-[#f7d17e] hover:text-[#101513] sm:inline-flex"
            >
              <UserRound size={16} />
              {user?.fullName?.split(' ')[0] || common.myStudio}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden h-10 items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-3 text-sm font-bold text-white transition hover:border-[#f7d17e] hover:text-[#f7d17e] sm:inline-flex"
              >
                <LogIn size={16} />
                {common.signIn}
              </Link>
              <Link
                href="/register"
                className="hidden h-10 min-w-24 items-center justify-center gap-2 rounded-full bg-[#fff8e8] px-4 text-sm font-black text-[#101513] transition hover:bg-[#f7d17e] lg:inline-flex"
              >
                <UserPlus className="shrink-0" size={16} />
                {locale === 'ar' ? 'انضم' : common.create}
              </Link>
            </>
          )}

          <ThemeToggle />
          <CartButton />
          <Link
            href={isSignedIn ? '/account' : '/login'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.08] text-white md:hidden"
            aria-label={isSignedIn ? common.account : common.signIn}
            title={isSignedIn ? common.account : common.signIn}
          >
            {isSignedIn ? <UserRound size={18} /> : <LogIn size={18} />}
          </Link>
        </div>
      </div>
    </header>
  );
}
