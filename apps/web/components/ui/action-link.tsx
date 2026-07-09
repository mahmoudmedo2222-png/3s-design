import type { LucideIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { cx } from './styles';

type LinkIntent = 'primary' | 'secondary' | 'ghost' | 'gold';

const intentClasses: Record<LinkIntent, string> = {
  primary: 'border-transparent bg-pine text-white hover:bg-[#1b4a3f] dark:bg-[#1f6b59] dark:hover:bg-[#247c68]',
  secondary: 'border-line bg-white text-ink hover:border-pine hover:text-pine dark:bg-[#121816]',
  ghost: 'border-white/[0.12] bg-white/[0.06] text-white hover:border-[#f7d17e]/50 hover:text-[#f7d17e]',
  gold: 'border-[#f7d17e]/50 bg-[#f7d17e]/10 text-[#f7d17e] hover:bg-[#f7d17e] hover:text-[#101513]',
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
