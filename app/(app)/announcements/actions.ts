'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireMember } from '@/lib/auth';
import { zodFieldErrors } from '@/lib/validation/common';
import { ok, err, type Result } from '@/lib/result';

const uuidSchema = z.string().uuid();

/** いいねトグル（api-endpoints.md §4.3）。 */
export async function toggleAnnouncementLike(
  contentId: string,
): Promise<Result<{ liked: boolean; likeCount: number }>> {
  const profile = await requireMember();
  if (!uuidSchema.safeParse(contentId).success) return err('NOT_FOUND');

  const supabase = createClient();

  const { data: existing } = await supabase
    .from('content_likes')
    .select('content_id')
    .eq('content_id', contentId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('content_likes')
      .delete()
      .eq('content_id', contentId)
      .eq('user_id', profile.id);
  } else {
    const { error } = await supabase
      .from('content_likes')
      .insert({ content_id: contentId, user_id: profile.id });
    if (error) return err('NOT_FOUND');
  }

  const { count } = await supabase
    .from('content_likes')
    .select('*', { count: 'exact', head: true })
    .eq('content_id', contentId);

  revalidatePath(`/announcements/${contentId}`);
  revalidatePath('/announcements');
  return ok({ liked: !existing, likeCount: count ?? 0 });
}

const commentSchema = z.object({
  contentId: uuidSchema,
  body: z.string().trim().min(1, 'コメントを入力してください').max(1000),
});

/** コメント作成（api-endpoints.md §4.4）。 */
export async function createAnnouncementComment(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const profile = await requireMember();
  const parsed = commentSchema.safeParse({
    contentId: formData.get('contentId'),
    body: formData.get('body'),
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { error } = await supabase.from('content_comments').insert({
    content_id: parsed.data.contentId,
    author_id: profile.id,
    body: parsed.data.body,
  });
  if (error) return err('NOT_FOUND');

  revalidatePath(`/announcements/${parsed.data.contentId}`);
  return ok(null);
}

/** コメント削除（論理削除）（api-endpoints.md §4.5）。RLS で本人 or admin に限定。 */
export async function deleteAnnouncementComment(
  commentId: string,
  contentId: string,
): Promise<Result<null>> {
  await requireMember();
  if (!uuidSchema.safeParse(commentId).success) return err('NOT_FOUND');

  const supabase = createClient();
  const { error } = await supabase
    .from('content_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) return err('FORBIDDEN');

  revalidatePath(`/announcements/${contentId}`);
  return ok(null);
}
