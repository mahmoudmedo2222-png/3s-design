import type { HTMLAttributes } from 'react';
import { cx } from './styles';

export function Notice({
  className,
  tone = 'info',
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: 'info' | 'success' | 'error';
}) {
  return (
    <div
      className={cx(
        'rounded border px-4 py-3 text-sm font-semibold leading-6',
        tone === 'error'
          ? 'border-berry/30 bg-berry/10 text-berry dark:text-[#f08bb0]'
          : tone === 'success'
            ? 'border-pine/25 bg-pine/10 text-pine dark:text-[#7bd8bd]'
            : 'border-line bg-paper text-muted dark:bg-[#0f1513]',
        className,
      )}
      {...props}
    />
  );
}
