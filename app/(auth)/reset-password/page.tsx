import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { getUser } from '@/lib/auth';
import { ResetPasswordForm } from './reset-password-form';

export const metadata: Metadata = { title: '新しいパスワードの設定' };

/**
 * パスワード再設定（メールのリンクから遷移・recovery セッションが前提）。
 * 未ログインで直接開かれた場合は再設定メールの請求ページへ誘導する。
 */
export default async function ResetPasswordPage() {
  const user = await getUser();
  if (!user) redirect('/login/reset');

  return (
    <div className="mx-auto max-w-md space-y-5">
      <Heading level={1}>新しいパスワードの設定</Heading>
      <Card className="space-y-4">
        <p className="text-base leading-relaxed text-foreground/80">
          新しいパスワードを入力してください。設定が終わると、そのままご利用いただけます。
        </p>
        <ResetPasswordForm />
      </Card>
    </div>
  );
}
