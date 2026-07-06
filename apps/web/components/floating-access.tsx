'use client';

import { Compass, LogIn, Sparkles, Star, Wand2 } from 'lucide-react';
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { type AppLocale, commonCopy } from '../lib/locale';

export function FloatingAccess({ locale }: { locale: AppLocale }) {
  const pathname = usePathname();
  const copy = commonCopy[locale];
  const links = [
    { href: '/?intro=0#ai-finder' as Route, label: copy.aiFinder, icon: Wand2 },
    { href: '/?intro=0#latest-designs' as Route, label: copy.designs, icon: Sparkles },
    { href: '/?intro=0#shop-by-emotion' as Route, label: copy.moods, icon: Star },
    { href: '/login' as Route, label: copy.signIn, icon: LogIn },
  ];

  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <nav className="floating-access group" aria-label={copy.quickAccess}>
      <div className="floating-access__items">
        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="floating-access__item">
            <Icon size={15} />
            <span>{label}</span>
          </Link>
        ))}
      </div>
      <Link href={'/?intro=0#ai-finder' as Route} className="floating-access__trigger" aria-label={copy.quickAccess}>
        <Compass size={21} />
        <span>{copy.guide}</span>
      </Link>
    </nav>
  );
}
