'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { signInWithPassword, sendMagicLink, signInWithGoogle } from './actions';

export function LoginForm() {
  const [pwState, pwAction] = useFormState(signInWithPassword, null);
  const [magicState, magicAction] = useFormState(sendMagicLink, null);
  const [mode, setMode] = useState<'password' | 'magic'>('password');

  const magicSent = magicState?.ok === true;

  return (
    <div className="space-y-6">
      {/* メール + パスワード */}
      {mode === 'password' && (
        <form action={pwAction} className="space-y-4">
          {pwState && !pwState.ok && (
            <Alert variant="error">{pwState.error.message}</Alert>
          )}
          <div>
            <Label htmlFor="email" required>
              メールアドレス
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
          <div>
            <Label htmlFor="password" required>
              パスワード
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <SubmitButton size="lg" className="w-full">
            ログイン
          </SubmitButton>
          <button
            type="button"
            onClick={() => setMode('magic')}
            className="block w-full text-center text-sm text-navy underline"
          >
            パスワードなしでログイン（メールでリンクを受け取る）
          </button>
        </form>
      )}

      {/* Magic Link */}
      {mode === 'magic' && (
        <form action={magicAction} className="space-y-4">
          {magicSent ? (
            <Alert variant="success">
              ログイン用のリンクをメールで送信しました。メールをご確認ください。
            </Alert>
          ) : (
            <>
              {magicState && !magicState.ok && (
                <Alert variant="error">{magicState.error.message}</Alert>
              )}
              <div>
                <Label htmlFor="magic-email" required>
                  メールアドレス
                </Label>
                <Input
                  id="magic-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </div>
              <SubmitButton size="lg" className="w-full">
                ログインリンクを送る
              </SubmitButton>
            </>
          )}
          <button
            type="button"
            onClick={() => setMode('password')}
            className="block w-full text-center text-sm text-navy underline"
          >
            パスワードでログインに戻る
          </button>
        </form>
      )}

      <div className="flex items-center gap-3 text-sm text-foreground/40">
        <span className="h-px flex-1 bg-foreground/15" />
        または
        <span className="h-px flex-1 bg-foreground/15" />
      </div>

      {/* Google SSO */}
      <form action={signInWithGoogle}>
        <Button variant="secondary" size="lg" type="submit" className="w-full">
          Google でログイン
        </Button>
      </form>
    </div>
  );
}
