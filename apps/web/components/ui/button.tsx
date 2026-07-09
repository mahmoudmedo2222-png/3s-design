import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from './styles';

type ButtonIntent = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
type ButtonSize = 'sm' | 'md' | 'icon';

const intentClasses: Record<ButtonIntent, string> = {
  primary: 'border-transparent bg-pine text-white hover:bg-[#1b4a3f] dark:bg-[#1f6b59] dark:hover:bg-[#247c68]',
  secondary: 'border-line bg-white text-ink hover:border-pine hover:text-pine dark:bg-[#121816]',
  ghost: 'border-white/[0.12] bg-white/[0.06] text-white hover:border-[#f7d17e]/50 hover:text-[#f7d17e]',
  danger: 'border-berry/30 bg-berry/10 text-berry hover:border-berry hover:bg-berry/15',
  gold: 'border-[#f7d17e]/50 bg-[#f7d17e]/10 text-[#f7d17e] hover:bg-[#f7d17e] hover:text-[#101513]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  icon: 'h-9 w-9 px-0 text-sm',
};

export function Button({
  children,
  className,
  icon: Icon,
  intent = 'primary',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  icon?: LucideIcon;
  intent?: ButtonIntent;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cx(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded border font-bold transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60',
        intentClasses[intent],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon size={size === 'icon' ? 16 : 17} /> : null}
      {children}
    </button>
  );
}
