import type { InputHTMLAttributes } from 'react';
import { cx } from './styles';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'h-11 w-full rounded border border-line bg-paper px-4 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-pine focus:bg-surface dark:bg-paper',
        className,
      )}
      {...props}
    />
  );
}
