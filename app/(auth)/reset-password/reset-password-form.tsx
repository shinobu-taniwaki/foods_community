'use client';

import { useFormState } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { updatePasswordFromRecovery } from './actions';

export function ResetPasswordForm() {
  const [state, action] = useFormState(updatePasswordFromRecovery, null);

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && (
        <Alert variant="error">{state.error.message}</Alert>
      )}
      <div>
        <Label htmlFor="newPassword" required>
          新しいパスワード（8文字以上・英字と数字を含む）
        </Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div>
        <Label htmlFor="newPasswordConfirm" required>
          新しいパスワード（確認のためもう一度）
        </Label>
        <Input
          id="newPasswordConfirm"
          name="newPasswordConfirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <SubmitButton size="lg" className="w-full">
        このパスワードに設定する
      </SubmitButton>
    </form>
  );
}
