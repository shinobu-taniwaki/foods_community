import Link from 'next/link';
import type { ComponentProps } from 'react';
import {
  buttonClassName,
  type ButtonVariant,
  type ButtonSize,
} from '@/components/ui/button';

interface LinkButtonProps extends ComponentProps<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** ボタン見た目のリンク（`<a>` を `<button>` に入れ子にしないための部品）。 */
export function LinkButton({
  variant,
  size,
  className,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={buttonClassName({ variant, size, className })}
      {...props}
    />
  );
}
