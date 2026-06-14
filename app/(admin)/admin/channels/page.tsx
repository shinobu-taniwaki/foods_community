import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { CreateChannelForm } from './create-channel-form';
import { ChannelToggle } from './channel-toggle';

export const metadata: Metadata = { title: 'チャンネル管理' };

const PLAN_LABEL: Record<string, string> = {
  trial: 'お試し以上',
  standard: 'スタンダード以上',
  premium: 'プレミアムのみ',
};

export default async function AdminChannelsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('channels')
    .select('id, label, icon_emoji, required_plan, only_admin_can_post, is_active, sort_order')
    .order('sort_order');

  const channels = data ?? [];

  return (
    <div className="space-y-6">
      <Heading level={1}>チャンネル管理</Heading>

      <section className="space-y-2">
        <Heading level={3}>既存チャンネル</Heading>
        <ul className="space-y-2">
          {channels.map((c) => (
            <li key={c.id}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {c.icon_emoji && <span className="mr-1">{c.icon_emoji}</span>}
                    {c.label}
                    {!c.is_active && (
                      <span className="ml-2 text-xs text-foreground/40">（非表示）</span>
                    )}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {PLAN_LABEL[c.required_plan] ?? c.required_plan}
                    {c.only_admin_can_post && ' ・ 運営のみ投稿'}
                  </p>
                </div>
                <ChannelToggle id={c.id} isActive={c.is_active} />
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <Heading level={3}>新規チャンネル</Heading>
        <CreateChannelForm />
      </section>
    </div>
  );
}
