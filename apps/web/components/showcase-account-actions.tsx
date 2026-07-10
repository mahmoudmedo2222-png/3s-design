'use client';

import { LogIn, UserPlus, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useAuthSession } from '../lib/auth-session';
import { type AppLocale, commonCopy } from '../lib/locale';
import { CartButton } from './cart-button';
import { ThemeToggle } from './theme-toggle';

export function ShowcaseAccountActions({ locale }: { locale: AppLocale }) {
  const { isSignedIn, user } = useAuthSession();
  const common = commonCopy[locale];

  return (
    <div className="flex items-center gap-2">
      {isSignedIn ? (
        <Link
          href="/account"
          className="hidden h-10 items-center justify-center gap-2 rounded-full border border-gold/40 bg-gold/12 px-3 text-sm font-bold text-gold transition hover:bg-gold hover:text-cream-ink sm:inline-flex"
        >
          <UserRound size={16} />
          {user?.fullName?.split(' ')[0] || common.myStudio}
        </Link>
      ) : (
        <>
          <Link
            href="/login"
            className="hidden h-10 items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.08] px-3 text-sm font-bold text-white transition hover:border-gold hover:text-gold sm:inline-flex"
          >
            <LogIn size={16} />
            {common.signIn}
          </Link>
          <Link
            href="/register"
            className="hidden h-10 min-w-24 items-center justify-center gap-2 rounded-full bg-surface px-4 text-sm font-black text-cream-ink shadow-sm transition hover:bg-gold-strong lg:inline-flex"
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
  );
}
