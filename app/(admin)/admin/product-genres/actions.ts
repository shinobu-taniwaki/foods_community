'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { zodFieldErrors } from '@/lib/validation/common';
import { ok, err, type Result } from '@/lib/result';

const createSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9_-]+$/, 'ID は半角英数字・ハイフン・アンダースコアのみ')
    .min(1)
    .max(40),
  label: z.string().trim().min(1, 'ラベルを入力してください').max(50),
  iconEmoji: z.string().trim().min(1, '絵文字を入力してください').max(8),
  sortOrder: z.coerce.number().int().default(100),
});

/** 販売ジャンル作成（api-endpoints.md §11.18）。 */
export async function adminCreateProductGenre(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse({
    id: formData.get('id'),
    label: formData.get('label'),
    iconEmoji: formData.get('iconEmoji'),
    sortOrder: formData.get('sortOrder') || 100,
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, { fields: zodFieldErrors(parsed.error) });
  }

  const supabase = createClient();
  const { error } = await supabase.from('product_genres').insert({
    id: parsed.data.id,
    label: parsed.data.label,
    icon_emoji: parsed.data.iconEmoji,
    sort_order: parsed.data.sortOrder,
    created_by: admin.id,
  });
  if (error) {
    if (error.code === '23505') return err('GENRE_ID_TAKEN');
    return err('INTERNAL', undefined, { cause: error.message });
  }

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'product_genre_created',
    targetType: 'product_genre',
    targetId: parsed.data.id,
    payload: { label: parsed.data.label },
  });
  revalidatePath('/admin/product-genres');
  return ok(null);
}

/** 販売ジャンルの有効/無効切替（論理削除/復活）。 */
export async function adminSetGenreActive(
  id: string,
  isActive: boolean,
): Promise<Result<null>> {
  const admin = await requireAdmin();

  const supabase = createClient();
  const { error } = await supabase
    .from('product_genres')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  await writeAuditLog({
    actorId: admin.id,
    actionType: isActive ? 'product_genre_updated' : 'product_genre_deleted',
    targetType: 'product_genre',
    targetId: id,
    payload: { is_active: isActive },
  });
  revalidatePath('/admin/product-genres');
  return ok(null);
}
