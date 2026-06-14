import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-terracotta text-cream hover:bg-terracotta/90',
  secondary: 'bg-mustard text-foreground hover:bg-mustard/90',
  ghost: 'bg-transparent text-terracotta hover:bg-terracotta/10',
};

// 50代向けに最小タップ領域 48px を確保
const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'min-h-[48px] px-5 text-base',
  lg: 'min-h-[56px] px-6 text-lg',
};

/** Button / LinkButton 共通のクラスを生成する。 */
export function buttonClassName(opts?: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}): string {
  const { variant = 'primary', size = 'md', className } = opts ?? {};
  return cn(
    'inline-flex items-center justify-center rounded font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={buttonClassName({ variant, size, className })}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';
