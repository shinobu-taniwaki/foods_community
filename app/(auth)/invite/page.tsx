import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { createAdminClient } from '@/lib/supabase/server';
import { checkInvitationToken } from '@/lib/invitations';
import { AcceptForm } from './accept-form';

export const metadata: Metadata = { title: '招待を受ける' };

const REASON_MESSAGE: Record<string, string> = {
  expired: 'この招待リンクは有効期限が切れています。',
  already_accepted: 'この招待は既に使用されています。',
  not_found: '招待リンクが見つかりませんでした。',
};

export default async function InvitePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? '';

  if (!token) {
    return (
      <div className="space-y-4">
        <Heading level={1}>招待</Heading>
        <Alert variant="error">招待トークンが指定されていません。</Alert>
        <Link href="/login" className="text-navy underline">
          ログイン画面へ
        </Link>
      </div>
    );
  }

  const check = await checkInvitationToken(token);

  if (!check.valid) {
    return (
      <div className="space-y-4">
        <Heading level={1}>招待</Heading>
        <Alert variant="error">{REASON_MESSAGE[check.reason]}</Alert>
        <p className="text-sm text-foreground/60">
          お手数ですが、運営者に新しい招待リンクの発行をご依頼ください。
        </p>
        <Link href="/login" className="text-navy underline">
          ログイン画面へ
        </Link>
      </div>
    );
  }

  // 招待情報（プラン名・招待者名）を service_role で取得
  const admin = createAdminClient();
  const [{ data: plan }, { data: inviter }] = await Promise.all([
    admin.from('plans').select('label').eq('id', check.invitation.plan).maybeSingle(),
    admin
      .from('profiles')
      .select('display_name')
      .eq('id', check.invitation.invited_by)
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <Heading level={1}>コミュニティへようこそ</Heading>

      <Card className="space-y-2">
        <p className="text-foreground/80">
          {inviter?.display_name ?? '運営'} さんから
          マーケティングCampコミュニティに招待されています。
        </p>
        <dl className="space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-foreground/60">メール</dt>
            <dd className="font-medium">{check.invitation.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-foreground/60">プラン</dt>
            <dd className="font-medium">{plan?.label ?? check.invitation.plan}</dd>
          </div>
        </dl>
      </Card>

      <AcceptForm token={token} />
    </div>
  );
}
