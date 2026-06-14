import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** 50代向けに高さ・文字を大きめに確保した入力欄。 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'min-h-[48px] w-full rounded border border-foreground/20 bg-white px-4 text-base',
          'placeholder:text-foreground/40',
          'focus-visible:border-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta/40',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
