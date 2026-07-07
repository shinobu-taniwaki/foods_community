import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { ExternalFormLink } from '@/components/external-form-link';
import { requireMember, getUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '退会' };

/** 退会申請（dev-phases §3.5.6 / 設計書 §10）。実処理は運営が admin 画面で行う。 */
export default async function DangerSettingsPage() {
  const profile = await requireMember();
  const user = await getUser();

  const supabase = createClient();
  const { data: plan } = profile.plan
    ? await supabase
        .from('plans')
        .select('label')
        .eq('id', profile.plan)
        .maybeSingle()
    : { data: null };

  return (
    <div className="space-y-6">
      <Heading level={1}>退会</Heading>

      <Card className="space-y-3">
        <p className="text-base leading-relaxed">
          退会をご希望の方は、下のフォームからお申し込みください。
          運営が確認のうえ、退会のお手続きをします。
        </p>
        <div className="rounded bg-cream p-4 text-sm leading-relaxed text-foreground/70">
          <p>※ 退会後はログインできなくなります。</p>
          <p>
            ※ これまでの投稿・コメントは「（退会したメンバー）」の表記で
            コミュニティにしばらく残ります。
          </p>
          <p>
            ※ 個人情報の取り扱いは
            <Link href="/legal/privacy" className="text-navy underline">
              プライバシーポリシー
            </Link>
            をご確認ください。
          </p>
        </div>
        <ExternalFormLink
          formKey="WITHDRAWAL"
          label="退会を申し込む"
          variant="secondary"
          prefill={{
            [process.env.NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_NAME ?? '']:
              profile.display_name,
            [process.env.NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_EMAIL ?? '']:
              user?.email ?? undefined,
            [process.env.NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_CURRENT_PLAN ?? '']:
              plan?.label,
          }}
        />
      </Card>

      <Link href="/me/settings" className="block text-navy underline">
        ‹ 設定に戻る
      </Link>
    </div>
  );
}
