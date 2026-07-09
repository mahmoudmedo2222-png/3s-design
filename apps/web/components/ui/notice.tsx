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
          ? 'border-berry/30 bg-berry/10 text-berry'
          : tone === 'success'
            ? 'border-success/25 bg-success/10 text-success'
            : 'border-line bg-paper text-muted dark:bg-surface',
        className,
      )}
      {...props}
    />
  );
}
