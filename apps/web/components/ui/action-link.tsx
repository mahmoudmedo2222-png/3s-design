import type { LucideIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cx } from './styles';

type LinkIntent = 'primary' | 'secondary' | 'ghost' | 'gold';

const intentClasses: Record<LinkIntent, string> = {
  primary: 'border-transparent bg-pine text-white hover:bg-pine-hover',
  secondary: 'border-line bg-surface text-ink hover:border-pine hover:text-pine',
  ghost: 'border-white/[0.12] bg-white/[0.06] text-white hover:border-gold/50 hover:text-gold',
  gold: 'border-gold/50 bg-gold/10 text-gold hover:bg-gold hover:text-cream-ink',
};

export function ActionLink({
  children,
  className,
  href,
  icon: Icon,
  intent = 'primary',
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  children: ReactNode;
  href: Route | string;
  icon?: LucideIcon;
  intent?: LinkIntent;
}) {
  return (
    <Link
      href={href as Route}
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded border px-4 text-sm font-bold transition hover:-translate-y-0.5 active:translate-y-0',
        intentClasses[intent],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon size={17} /> : null}
      {children}
    </Link>
  );
}
