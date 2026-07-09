import type { HTMLAttributes } from 'react';
import { cx } from './styles';

export function Panel({
  className,
  tone = 'light',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: 'light' | 'dark' | 'glass';
}) {
  return (
    <div
      className={cx(
        'rounded-lg border shadow-sm',
        tone === 'dark'
          ? 'border-white/[0.12] bg-white/[0.06] text-white backdrop-blur-xl'
          : tone === 'glass'
            ? 'border-white/[0.12] bg-black/[0.24] text-white backdrop-blur-xl'
            : 'border-line bg-white text-ink dark:bg-[#121816]',
        className,
      )}
      {...props}
    />
  );
}
