import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { ExternalFormLink } from '@/components/external-form-link';
import { requireMember, getUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'プランのご案内' };

interface PlanRow {
  id: string;
  label: string;
  display_price: string;
  description: string;
  features: string[];
  rank: number;
}

export default async function UpgradePage() {
  const profile = await requireMember();
  const user = await getUser();
  const supabase = createClient();

  const { data } = await supabase
    .from('plans')
    .select('id, label, display_price, description, features, rank')
    .eq('is_active', true)
    .gte('rank', 1)
    .order('rank');

  const plans = (data ?? []) as PlanRow[];

  return (
    <div className="space-y-5">
      <Heading level={1}>プランのご案内</Heading>
      <p className="text-foreground/70">
        投稿・データ記録などの機能はスタンダードプラン以上でご利用いただけます。
      </p>

      <div className="space-y-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Heading level={3}>{plan.label}</Heading>
              <span className="text-lg font-medium text-terracotta">
                {plan.display_price}
              </span>
            </div>
            <p className="text-base text-foreground/70">{plan.description}</p>
            <ul className="space-y-1 text-base">
              {plan.features.map((f, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="text-olive">
                    ✓
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <ExternalFormLink
              formKey="PLAN_UPGRADE"
              label={`${plan.label}に申し込む`}
              prefill={{
                [process.env.NEXT_PUBLIC_FORM_PLAN_ENTRY_NAME ?? '']:
                  profile.display_name,
                [process.env.NEXT_PUBLIC_FORM_PLAN_ENTRY_EMAIL ?? '']:
                  user?.email ?? undefined,
                [process.env.NEXT_PUBLIC_FORM_PLAN_ENTRY_CURRENT_PLAN ?? '']:
                  plan.label,
              }}
            />
          </Card>
        ))}
      </div>

      <p className="text-sm text-foreground/50">
        お申し込み後、運営が確認のうえプランを変更します。ご不明な点は
        <Link href="/me/settings" className="text-navy underline">
          設定
        </Link>
        からお問い合わせください。
      </p>
    </div>
  );
}
