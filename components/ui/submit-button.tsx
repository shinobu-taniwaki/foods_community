'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from '@/components/ui/button';

interface SubmitButtonProps extends ButtonProps {
  pendingLabel?: string;
}

/** フォーム送信中は自動で disabled + ラベル切替するボタン。 */
export function SubmitButton({
  children,
  pendingLabel = '送信中…',
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}
