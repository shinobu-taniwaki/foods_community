import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { ExternalFormLink } from '@/components/external-form-link';
import { requireMember, getUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'プラン' };

/** 現在のプラン表示とプラン変更申請（dev-phases §3.5.6 / 設計書 §10）。 */
export default async function PlanSettingsPage() {
  const profile = await requireMember();
  const user = await getUser();

  const supabase = createClient();
  const { data: plan } = profile.plan
    ? await supabase
        .from('plans')
        .select('label, display_price, description')
        .eq('id', profile.plan)
        .maybeSingle()
    : { data: null };

  const planLabel = plan?.label ?? '（プランなし）';

  return (
    <div className="space-y-6">
      <Heading level={1}>プラン</Heading>

      <Card className="space-y-2">
        <p className="text-sm text-foreground/60">現在のプラン</p>
        <p className="text-xl font-medium text-terracotta">{planLabel}</p>
        {plan?.display_price && (
          <p className="text-base text-foreground/70">{plan.display_price}</p>
        )}
        {plan?.description && (
          <p className="text-base text-foreground/70">{plan.description}</p>
        )}
      </Card>

      <Card className="space-y-3">
        <Heading level={3}>プランの変更</Heading>
        <p className="text-base text-foreground/70">
          プランの変更は下のフォームからお申し込みください。
          運営が確認のうえ、変更のお手続きをします。
        </p>
        <ExternalFormLink
          formKey="PLAN_UPGRADE"
          label="プラン変更を申し込む"
          prefill={{
            [process.env.NEXT_PUBLIC_FORM_PLAN_ENTRY_NAME ?? '']:
              profile.display_name,
            [process.env.NEXT_PUBLIC_FORM_PLAN_ENTRY_EMAIL ?? '']:
              user?.email ?? undefined,
            [process.env.NEXT_PUBLIC_FORM_PLAN_ENTRY_CURRENT_PLAN ?? '']:
              planLabel,
          }}
        />
        <p className="text-sm text-foreground/50">
          各プランの内容は
          <Link href="/upgrade" className="text-navy underline">
            プランのご案内
          </Link>
          をご覧ください。
        </p>
      </Card>

      <Link href="/me/settings" className="block text-navy underline">
        ‹ 設定に戻る
      </Link>
    </div>
  );
}
