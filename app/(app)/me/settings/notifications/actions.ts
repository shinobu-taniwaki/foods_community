'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireMember } from '@/lib/auth';
import { ok, err, type Result } from '@/lib/result';

/**
 * 通知設定の更新（notifications-and-emails.md §1.1）。
 * OFF 可能な 4 種別のみ受け付ける。admin_broadcast / account_* / post_*_by_admin は
 * OFF 不可のため、ここでは扱わない（常に配信）。
 */
export async function updateNotificationPreferences(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const profile = await requireMember();

  // チェックボックスは on/未送信。送信が無ければ false。
  const prefs = {
    user_id: profile.id,
    new_post: formData.get('new_post') === 'on',
    new_announcement: formData.get('new_announcement') === 'on',
    comment_on_my_post: formData.get('comment_on_my_post') === 'on',
    like_on_my_post: formData.get('like_on_my_post') === 'on',
    updated_at: new Date().toISOString(),
  };

  const supabase = createClient();
  const { error } = await supabase
    .from('notification_preferences')
    .upsert(prefs, { onConflict: 'user_id' });
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  revalidatePath('/me/settings/notifications');
  return ok(null);
}
