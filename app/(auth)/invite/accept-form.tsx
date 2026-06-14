'use client';

import { useFormState } from 'react-dom';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  acceptInvitationWithPassword,
  acceptInvitationWithGoogle,
} from './actions';

interface AcceptFormProps {
  token: string;
}

export function AcceptForm({ token }: AcceptFormProps) {
  const [state, action] = useFormState(acceptInvitationWithPassword, null);
  const fieldError = (name: string) =>
    state && !state.ok ? state.error.details?.fields?.[name] : undefined;

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        {state && !state.ok && !state.error.details?.fields && (
          <Alert variant="error">{state.error.message}</Alert>
        )}
        <div>
          <Label htmlFor="password" required>
            パスワード（8文字以上・英数字を含む）
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
          />
          {fieldError('password') && (
            <p className="mt-1 text-sm text-terracotta">
              {fieldError('password')}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="passwordConfirm" required>
            パスワード（確認）
          </Label>
          <Input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            required
          />
          {fieldError('passwordConfirm') && (
            <p className="mt-1 text-sm text-terracotta">
              {fieldError('passwordConfirm')}
            </p>
          )}
        </div>
        <label className="flex items-start gap-2 text-base">
          <input
            type="checkbox"
            name="agreeToTerms"
            className="mt-1.5 h-5 w-5 accent-terracotta"
            required
          />
          <span>
            <Link
              href="/legal/terms"
              target="_blank"
              className="text-navy underline"
            >
              利用規約
            </Link>
            と
            <Link
              href="/legal/privacy"
              target="_blank"
              className="text-navy underline"
            >
              プライバシーポリシー
            </Link>
            に同意します
          </span>
        </label>
        <SubmitButton size="lg" className="w-full">
          登録する
        </SubmitButton>
      </form>

      <div className="flex items-center gap-3 text-sm text-foreground/40">
        <span className="h-px flex-1 bg-foreground/15" />
        または
        <span className="h-px flex-1 bg-foreground/15" />
      </div>

      <form action={acceptInvitationWithGoogle}>
        <input type="hidden" name="token" value={token} />
        <Button variant="secondary" size="lg" type="submit" className="w-full">
          Google で登録
        </Button>
        <p className="mt-2 text-center text-xs text-foreground/50">
          ※ 招待されたメールアドレスと同じ Google アカウントが必要です
        </p>
      </form>
    </div>
  );
}
