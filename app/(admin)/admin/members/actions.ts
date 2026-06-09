'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { ok, err, type Result } from '@/lib/result';

const uuid = z.string().uuid();
const reasonSchema = z.string().trim().max(500).optional().or(z.literal(''));

// 100年（事実上の無期限 ban）
const INDEFINITE_BAN = '876000h';

function revalidateMember(userId: string) {
  revalidatePath('/admin/members');
  revalidatePath(`/admin/members/${userId}`);
}

/** プラン変更（api-endpoints.md §11.3）。 */
export async function adminChangeMemberPlan(
  userId: string,
  newPlan: string,
  reason?: string,
): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(userId).success) return err('NOT_FOUND');
  if (userId === admin.id) return err('SELF_OPERATION_FORBIDDEN');
  if (!['trial', 'standard', 'premium'].includes(newPlan)) {
    return err('VALIDATION_FAILED');
  }

  const supabase = createClient();
  const { data: before } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', userId)
    .maybeSingle();
  if (!before) return err('NOT_FOUND');

  const { error } = await supabase
    .from('profiles')
    .update({ plan: newPlan })
    .eq('id', userId);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'user_plan_changed',
    targetType: 'profile',
    targetId: userId,
    payload: { before: { plan: before.plan }, after: { plan: newPlan }, reason: reason ?? '' },
  });
  // TODO(Phase5): 本人へ plan_changed 通知
  revalidateMember(userId);
  return ok(null);
}

const suspendSchema = z.object({
  userId: uuid,
  duration: z.enum(['1_week', '1_month', 'indefinite']),
  reason: reasonSchema,
});

/** 一時停止（api-endpoints.md §11.4）。 */
export async function adminSuspendMember(
  userId: string,
  duration: string,
  reason?: string,
): Promise<Result<{ suspendedUntil: string | null }>> {
  const admin = await requireAdmin();
  const parsed = suspendSchema.safeParse({ userId, duration, reason: reason ?? '' });
  if (!parsed.success) return err('VALIDATION_FAILED');
  if (userId === admin.id) return err('SELF_OPERATION_FORBIDDEN');

  const now = Date.now();
  let suspendedUntil: string | null = null;
  let banDuration = INDEFINITE_BAN;
  if (parsed.data.duration === '1_week') {
    suspendedUntil = new Date(now + 7 * 864e5).toISOString();
    banDuration = '168h';
  } else if (parsed.data.duration === '1_month') {
    suspendedUntil = new Date(now + 30 * 864e5).toISOString();
    banDuration = '720h';
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended', suspended_until: suspendedUntil })
    .eq('id', userId);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  // auth.users をバン（ログイン不可に）
  const adminClient = createAdminClient();
  await adminClient.auth.admin.updateUserById(userId, { ban_duration: banDuration });

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'user_suspended',
    targetType: 'profile',
    targetId: userId,
    payload: { duration: parsed.data.duration, reason: parsed.data.reason ?? '' },
  });
  // TODO(Phase5): 本人へ account_suspended 通知（メール並走）
  revalidateMember(userId);
  return ok({ suspendedUntil });
}

/** 復活（api-endpoints.md §11.5）。 */
export async function adminRestoreMember(
  userId: string,
  reason?: string,
): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(userId).success) return err('NOT_FOUND');

  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'active',
      suspended_until: null,
      deleted_at: null,
      deleted_by: null,
      deletion_reason: null,
    })
    .eq('id', userId);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  const adminClient = createAdminClient();
  await adminClient.auth.admin.updateUserById(userId, { ban_duration: 'none' });

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'user_restored',
    targetType: 'profile',
    targetId: userId,
    payload: { reason: reason ?? '' },
  });
  // TODO(Phase5): 本人へ account_restored 通知
  revalidateMember(userId);
  return ok(null);
}

/** 退会処理（api-endpoints.md §11.6）。reason 必須。 */
export async function adminDeleteMember(
  userId: string,
  reason: string,
): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(userId).success) return err('NOT_FOUND');
  if (userId === admin.id) return err('SELF_OPERATION_FORBIDDEN');
  if (!reason || reason.trim().length === 0) {
    return err('VALIDATION_FAILED', '退会理由を入力してください。');
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      status: 'deleted',
      deleted_at: new Date().toISOString(),
      deleted_by: admin.id,
      deletion_reason: reason.trim(),
    })
    .eq('id', userId);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  const adminClient = createAdminClient();
  await adminClient.auth.admin.updateUserById(userId, { ban_duration: INDEFINITE_BAN });

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'user_deleted',
    targetType: 'profile',
    targetId: userId,
    payload: { reason: reason.trim() },
  });
  // TODO(Phase5): 本人へ account_deleted 通知（メール）
  revalidateMember(userId);
  return ok(null);
}
