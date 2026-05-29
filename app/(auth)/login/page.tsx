import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Heading } from '@/components/ui/heading';
import { Alert } from '@/components/ui/alert';
import { getUser } from '@/lib/auth';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'ログイン' };

const REASON_MESSAGES: Record<string, string> = {
  inactive: 'アカウントが利用できない状態です。運営にお問い合わせください。',
  oauth_failed: 'Google での認証に失敗しました。もう一度お試しください。',
  email_mismatch: '招待されたメールアドレスと一致しませんでした。',
  no_account: 'アカウントが見つかりませんでした。招待リンクからご登録ください。',
  invitation_invalid: '招待リンクが無効か、有効期限が切れています。',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { reason?: string; error?: string };
}) {
  // 既にログイン済みならアプリへ
  if (await getUser()) redirect('/announcements');

  const notice =
    REASON_MESSAGES[searchParams.reason ?? ''] ??
    REASON_MESSAGES[searchParams.error ?? ''];

  return (
    <div className="space-y-6">
      <Heading level={1}>ログイン</Heading>
      {notice && <Alert variant="error">{notice}</Alert>}
      <LoginForm />
      <p className="text-sm text-foreground/60">
        アカウントは招待制です。招待メールのリンクからご登録ください。
      </p>
    </div>
  );
}
