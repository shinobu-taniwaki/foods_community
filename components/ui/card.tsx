import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * 紙の質感を意識したカード。影は極淡、角丸 14px。
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-card border border-foreground/10 bg-white/70 p-5 shadow-soft',
        className,
      )}
      {...props}
    />
  );
}
