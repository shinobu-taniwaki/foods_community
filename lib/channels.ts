import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface Channel {
  id: string;
  label: string;
  description: string | null;
  iconEmoji: string | null;
  color: string;
  requiredPlan: string;
  onlyAdminCanPost: boolean;
  trialPreviewCount: number | null;
}

/** 閲覧可能なチャンネル一覧（RLS でプラン制限を反映）。sort_order 昇順。 */
export async function listChannels(): Promise<Channel[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('channels')
    .select(
      'id, label, description, icon_emoji, color, required_plan, only_admin_can_post, trial_preview_count',
    )
    .eq('is_active', true)
    .order('sort_order');

  if (error || !data) return [];
  return data.map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description,
    iconEmoji: c.icon_emoji,
    color: c.color,
    requiredPlan: c.required_plan,
    onlyAdminCanPost: c.only_admin_can_post,
    trialPreviewCount: c.trial_preview_count,
  }));
}

export async function getChannel(id: string): Promise<Channel | null> {
  const channels = await listChannels();
  return channels.find((c) => c.id === id) ?? null;
}
