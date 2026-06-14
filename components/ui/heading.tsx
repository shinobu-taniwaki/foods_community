import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type HeadingLevel = 1 | 2 | 3;

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
}

const LEVEL_CLASSES: Record<HeadingLevel, string> = {
  1: 'text-2xl sm:text-3xl',
  2: 'text-xl sm:text-2xl',
  3: 'text-lg sm:text-xl',
};

/**
 * 見出し。Noto Serif JP（700）が globals.css 経由で適用される。
 */
export function Heading({
  level = 2,
  className,
  children,
  ...props
}: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      className={cn('font-serif', LEVEL_CLASSES[level], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
