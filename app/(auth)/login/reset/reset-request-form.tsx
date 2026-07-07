'use client';

import { useFormState } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { requestPasswordReset } from './actions';

export function ResetRequestForm() {
  const [state, action] = useFormState(requestPasswordReset, null);

  if (state?.ok) {
    return (
      <Alert variant="success">
        メールを送信しました。届いたメールの「パスワードを再設定する」を押して、
        新しいパスワードを設定してください。
        <span className="mt-1 block text-sm">
          届かない場合は、迷惑メールフォルダもご確認ください。
        </span>
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state && !state.ok && (
        <Alert variant="error">{state.error.message}</Alert>
      )}
      <div>
        <Label htmlFor="email" required>
          登録したメールアドレス
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
        />
      </div>
      <SubmitButton size="lg" className="w-full">
        再設定用のメールを送る
      </SubmitButton>
    </form>
  );
}
