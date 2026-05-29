import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type AlertVariant = 'info' | 'error' | 'success';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

const VARIANT_CLASSES: Record<AlertVariant, string> = {
  info: 'border-navy/30 bg-navy/5 text-navy',
  error: 'border-terracotta/40 bg-terracotta/10 text-terracotta',
  success: 'border-olive/40 bg-olive/10 text-olive',
};

const ICON: Record<AlertVariant, string> = {
  info: 'ℹ️',
  error: '⚠️',
  success: '✅',
};

export function Alert({
  variant = 'info',
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded border px-4 py-3 text-base',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      <span aria-hidden>{ICON[variant]}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
