import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { InviteForm } from './invite-form';
import { InviteRowActions } from './invite-row-actions';

export const metadata: Metadata = { title: '招待管理' };

const PLAN_LABEL: Record<string, string> = {
  trial: 'お試し',
  standard: 'スタンダード',
  premium: 'プレミアム',
};

export default async function AdminInvitesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('invitations')
    .select('id, email, plan, expires_at, accepted_at, revoked_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const invites = data ?? [];
  const now = Date.now();
  const pending = invites.filter(
    (i) => !i.accepted_at && !i.revoked_at && new Date(i.expires_at).getTime() > now,
  );
  const accepted = invites.filter((i) => i.accepted_at);

  return (
    <div className="space-y-6">
      <Heading level={1}>招待管理</Heading>

      <InviteForm />

      <section className="space-y-3">
        <Heading level={3}>未受諾（{pending.length}）</Heading>
        {pending.length === 0 ? (
          <Card className="text-center text-foreground/60">
            未受諾の招待はありません。
          </Card>
        ) : (
          <ul className="space-y-2">
            {pending.map((i) => (
              <li key={i.id}>
                <Card className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{i.email}</p>
                    <p className="text-sm text-foreground/60">
                      {PLAN_LABEL[i.plan] ?? i.plan} ・ 期限{' '}
                      {new Date(i.expires_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <InviteRowActions id={i.id} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <Heading level={3}>受諾済み（{accepted.length}）</Heading>
        {accepted.length === 0 ? (
          <Card className="text-center text-foreground/60">
            受諾済みの招待はありません。
          </Card>
        ) : (
          <ul className="space-y-2">
            {accepted.map((i) => (
              <li key={i.id}>
                <Card className="flex items-center justify-between">
                  <p className="font-medium">{i.email}</p>
                  <span className="text-sm text-olive">受諾済み</span>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
