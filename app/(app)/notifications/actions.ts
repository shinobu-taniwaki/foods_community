'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireMember } from '@/lib/auth';
import { ok, err, type Result } from '@/lib/result';

const uuid = z.string().uuid();

/** 通知 1 件を既読にする（RLS で本人宛のみ更新可）。 */
export async function markNotificationRead(id: string): Promise<Result<null>> {
  await requireMember();
  if (!uuid.safeParse(id).success) return err('NOT_FOUND');

  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  revalidatePath('/notifications');
  return ok(null);
}

/** 自分宛の未読通知をすべて既読にする。 */
export async function markAllNotificationsRead(): Promise<Result<null>> {
  await requireMember();

  const supabase = createClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  revalidatePath('/notifications');
  return ok(null);
}
