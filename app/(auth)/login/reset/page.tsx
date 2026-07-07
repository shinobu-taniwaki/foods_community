import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { ResetRequestForm } from './reset-request-form';

export const metadata: Metadata = { title: 'パスワードの再設定' };

export default function PasswordResetRequestPage() {
  return (
    <div className="mx-auto max-w-md space-y-5">
      <Heading level={1}>パスワードの再設定</Heading>
      <Card className="space-y-4">
        <p className="text-base leading-relaxed text-foreground/80">
          登録したメールアドレスを入力してください。
          パスワードを設定し直すためのリンクをメールでお送りします。
        </p>
        <ResetRequestForm />
      </Card>
      <Link href="/login" className="block text-center text-navy underline">
        ‹ ログイン画面に戻る
      </Link>
    </div>
  );
}
