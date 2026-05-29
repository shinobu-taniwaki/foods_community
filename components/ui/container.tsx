import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * モバイルファースト。デスクトップは中央 640px カラム（設計書 §1.1）。
 */
export function Container({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mx-auto w-full max-w-column px-4 sm:px-6', className)}
      {...props}
    />
  );
}
