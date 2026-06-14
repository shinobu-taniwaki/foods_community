'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { zodFieldErrors } from '@/lib/validation/common';
import { ok, err, type Result } from '@/lib/result';

const uuid = z.string().uuid();

const updateSchema = z.object({
  id: uuid,
  category: z.enum(['important', 'news', 'column', 'seminar']),
  title: z.string().trim().min(1).max(100),
  body: z.string().trim().min(1).max(10000),
  pinned: z.boolean(),
  requiredPlan: z.enum(['none', 'standard']),
  status: z.enum(['draft', 'published']),
});

/** お知らせ更新（api-endpoints.md §4.7）。draft→published で published_at セット。 */
export async function updateAnnouncement(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const admin = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get('id'),
    category: formData.get('category'),
    title: formData.get('title'),
    body: formData.get('body'),
    pinned: formData.get('pinned') === 'on',
    requiredPlan: formData.get('requiredPlan') ?? 'none',
    status: formData.get('status') ?? 'draft',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, { fields: zodFieldErrors(parsed.error) });
  }

  const supabase = createClient();
  const { data: before } = await supabase
    .from('contents')
    .select('status, published_at')
    .eq('id', parsed.data.id)
    .maybeSingle();
  if (!before) return err('NOT_FOUND');

  const becomingPublished =
    parsed.data.status === 'published' && before.status !== 'published';

  const { error } = await supabase
    .from('contents')
    .update({
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body,
      pinned: parsed.data.pinned,
      required_plan: parsed.data.requiredPlan === 'standard' ? 'standard' : null,
      status: parsed.data.status,
      last_edited_at: new Date().toISOString(),
      last_editor_id: admin.id,
      ...(becomingPublished ? { published_at: new Date().toISOString() } : {}),
    })
    .eq('id', parsed.data.id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  // TODO(Phase5): draft→published 時に new_announcement 通知配信
  revalidatePath('/admin/announcements');
  revalidatePath('/announcements');
  redirect('/admin/announcements');
}

/** お知らせ削除（論理）（api-endpoints.md §4.8）。 */
export async function deleteAnnouncement(id: string): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return err('NOT_FOUND');

  const supabase = createClient();
  const { error } = await supabase
    .from('contents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'content_deleted_by_admin',
    targetType: 'content',
    targetId: id,
  });
  revalidatePath('/admin/announcements');
  revalidatePath('/announcements');
  return ok(null);
}

/** ピン留めトグル（api-endpoints.md §4.9）。 */
export async function toggleAnnouncementPin(
  id: string,
): Promise<Result<{ pinned: boolean }>> {
  await requireAdmin();
  if (!uuid.safeParse(id).success) return err('NOT_FOUND');

  const supabase = createClient();
  const { data: current } = await supabase
    .from('contents')
    .select('pinned')
    .eq('id', id)
    .maybeSingle();
  if (!current) return err('NOT_FOUND');

  const { error } = await supabase
    .from('contents')
    .update({ pinned: !current.pinned })
    .eq('id', id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  revalidatePath('/admin/announcements');
  revalidatePath('/announcements');
  return ok({ pinned: !current.pinned });
}
