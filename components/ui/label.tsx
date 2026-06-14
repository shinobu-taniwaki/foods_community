import { type LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ className, children, required, ...props }: LabelProps) {
  return (
    <label
      className={cn('mb-1.5 block text-base font-medium', className)}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-terracotta">*</span>}
    </label>
  );
}
