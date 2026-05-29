'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { changePassword, changeEmail } from './actions';

export function AccountForms({ currentEmail }: { currentEmail: string }) {
  const [pwState, pwAction] = useFormState(changePassword, null);
  const [emailState, emailAction] = useFormState(changeEmail, null);

  return (
    <div className="space-y-6">
      {/* パスワード変更 */}
      <Card>
        <form action={pwAction} className="space-y-4">
          <Heading level={3}>パスワード変更</Heading>
          {pwState?.ok && (
            <Alert variant="success">パスワードを変更しました。</Alert>
          )}
          {pwState && !pwState.ok && (
            <Alert variant="error">{pwState.error.message}</Alert>
          )}
          <div>
            <Label htmlFor="currentPassword" required>
              現在のパスワード
            </Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <Label htmlFor="newPassword" required>
              新しいパスワード（8文字以上・英数字を含む）
            </Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <div>
            <Label htmlFor="newPasswordConfirm" required>
              新しいパスワード（確認）
            </Label>
            <Input
              id="newPasswordConfirm"
              name="newPasswordConfirm"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          <SubmitButton>パスワードを変更</SubmitButton>
        </form>
      </Card>

      {/* メールアドレス変更 */}
      <Card>
        <form action={emailAction} className="space-y-4">
          <Heading level={3}>メールアドレス変更</Heading>
          {emailState?.ok && (
            <Alert variant="success">
              確認メールを新旧両方のアドレスに送信しました。両方のリンクをクリックすると変更が確定します。
            </Alert>
          )}
          {emailState && !emailState.ok && (
            <Alert variant="error">{emailState.error.message}</Alert>
          )}
          <p className="text-sm text-foreground/60">現在: {currentEmail}</p>
          <div>
            <Label htmlFor="newEmail" required>
              新しいメールアドレス
            </Label>
            <Input
              id="newEmail"
              name="newEmail"
              type="email"
              inputMode="email"
              required
            />
          </div>
          <div>
            <Label htmlFor="emailCurrentPassword" required>
              現在のパスワード（確認のため）
            </Label>
            <Input
              id="emailCurrentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton>確認メールを送る</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
