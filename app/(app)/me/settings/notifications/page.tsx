import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { requireMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  NotificationSettingsForm,
  type NotificationPrefs,
} from './notification-settings-form';

export const metadata: Metadata = { title: '通知設定' };

const DEFAULT_PREFS: NotificationPrefs = {
  new_post: true,
  new_announcement: true,
  comment_on_my_post: true,
  like_on_my_post: false,
};

export default async function NotificationSettingsPage() {
  const profile = await requireMember();

  const supabase = createClient();
  const { data } = await supabase
    .from('notification_preferences')
    .select('new_post, new_announcement, comment_on_my_post, like_on_my_post')
    .eq('user_id', profile.id)
    .maybeSingle();

  const prefs: NotificationPrefs = data ?? DEFAULT_PREFS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading level={1}>通知設定</Heading>
        <Link href="/me/settings" className="text-sm text-navy underline">
          設定へ戻る
        </Link>
      </div>
      <NotificationSettingsForm prefs={prefs} />
    </div>
  );
}
