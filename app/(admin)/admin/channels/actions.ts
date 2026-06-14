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
  description: z.string().trim().max(200).optional().or(z.literal('')),
  iconEmoji: z.string().trim().max(8).optional().or(z.literal('')),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, 'カラーは #RRGGBB 形式'),
  requiredPlan: z.enum(['trial', 'standard', 'premium']),
  onlyAdminCanPost: z.boolean(),
  trialPreviewCount: z.coerce.number().int().min(0).optional(),
  sortOrder: z.coerce.number().int().default(100),
});

/** チャンネル作成（api-endpoints.md §11.15）。 */
export async function adminCreateChannel(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse({
    id: formData.get('id'),
    label: formData.get('label'),
    description: formData.get('description') ?? '',
    iconEmoji: formData.get('iconEmoji') ?? '',
    color: formData.get('color') || '#c05e3f',
    requiredPlan: formData.get('requiredPlan') ?? 'trial',
    onlyAdminCanPost: formData.get('onlyAdminCanPost') === 'on',
    trialPreviewCount: formData.get('trialPreviewCount') || undefined,
    sortOrder: formData.get('sortOrder') || 100,
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, { fields: zodFieldErrors(parsed.error) });
  }

  const supabase = createClient();
  const { error } = await supabase.from('channels').insert({
    id: parsed.data.id,
    label: parsed.data.label,
    description: parsed.data.description || null,
    icon_emoji: parsed.data.iconEmoji || null,
    color: parsed.data.color,
    required_plan: parsed.data.requiredPlan,
    only_admin_can_post: parsed.data.onlyAdminCanPost,
    trial_preview_count: parsed.data.trialPreviewCount ?? null,
    sort_order: parsed.data.sortOrder,
    created_by: admin.id,
  });
  if (error) {
    if (error.code === '23505') return err('CHANNEL_ID_TAKEN');
    return err('INTERNAL', undefined, { cause: error.message });
  }

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'channel_created',
    targetType: 'channel',
    targetId: parsed.data.id,
    payload: { label: parsed.data.label },
  });
  revalidatePath('/admin/channels');
  revalidatePath('/feed');
  return ok(null);
}

/** チャンネルの有効/無効切替（論理削除/復活）（api-endpoints.md §11.17）。 */
export async function adminSetChannelActive(
  id: string,
  isActive: boolean,
): Promise<Result<null>> {
  const admin = await requireAdmin();

  const supabase = createClient();
  const { error } = await supabase
    .from('channels')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  await writeAuditLog({
    actorId: admin.id,
    actionType: isActive ? 'channel_updated' : 'channel_deleted',
    targetType: 'channel',
    targetId: id,
    payload: { is_active: isActive },
  });
  revalidatePath('/admin/channels');
  revalidatePath('/feed');
  return ok(null);
}
