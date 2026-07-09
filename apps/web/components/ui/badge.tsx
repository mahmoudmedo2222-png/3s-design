import type { HTMLAttributes } from 'react';
import { cx } from './styles';

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: 'neutral' | 'gold' | 'success' | 'danger';
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded border px-2 py-1 text-[0.68rem] font-black uppercase tracking-[0.1em]',
        tone === 'gold'
          ? 'border-gold/35 bg-gold/12 text-gold'
          : tone === 'success'
            ? 'border-success/35 bg-success/12 text-success'
            : tone === 'danger'
              ? 'border-berry/30 bg-berry/10 text-berry'
              : 'border-line bg-paper text-muted dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-white/62',
        className,
      )}
      {...props}
    />
  );
}
