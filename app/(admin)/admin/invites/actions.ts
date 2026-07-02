'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { getSiteOrigin } from '@/lib/site';
import { writeAuditLog } from '@/lib/audit';
import { emailSchema, zodFieldErrors } from '@/lib/validation/common';
import { ok, err, type Result } from '@/lib/result';
import { sendEmail } from '@/lib/email/send';
import { buildInviteEmail } from '@/lib/email/templates/invite';

const INVITE_TTL_DAYS = 7;

/** M-01 招待メールを送信（Resend 未設定・失敗時は false → リンク手動共有に切替）。 */
async function sendInvitationEmail(params: {
  email: string;
  plan: string;
  inviteUrl: string;
  expiresAt: string;
}): Promise<boolean> {
  const supabase = createClient();
  const { data: planRow } = await supabase
    .from('plans')
    .select('label, display_price')
    .eq('id', params.plan)
    .maybeSingle();

  return sendEmail(
    buildInviteEmail({
      to: params.email,
      planLabel: planRow?.label ?? params.plan,
      planPrice: planRow?.display_price ?? '',
      inviteUrl: params.inviteUrl,
      expiresAt: params.expiresAt,
      appUrl: getSiteOrigin(),
    }),
  );
}

const createSchema = z.object({
  email: emailSchema,
  plan: z.enum(['trial', 'standard', 'premium']),
});

/** 既存 auth ユーザーに同じメールが登録済みか（service role）。 */
async function isEmailRegistered(email: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  return data.users.some((u) => u.email?.toLowerCase() === email.toLowerCase());
}

/**
 * 招待発行（api-endpoints.md §11.8）。
 * Resend で招待メール（M-01）を送信し、失敗時はリンクを admin が手動共有する。
 */
export async function adminCreateInvitation(
  _prev: Result<{ inviteUrl: string; email: string; emailSent: boolean }> | null,
  formData: FormData,
): Promise<Result<{ inviteUrl: string; email: string; emailSent: boolean }>> {
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse({
    email: formData.get('email'),
    plan: formData.get('plan'),
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, { fields: zodFieldErrors(parsed.error) });
  }

  if (await isEmailRegistered(parsed.data.email)) {
    return err('EMAIL_ALREADY_REGISTERED');
  }

  const supabase = createClient();
  // 既存の pending 招待は取消（メール部分 UNIQUE と整合）
  await supabase
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('email', parsed.data.email)
    .is('accepted_at', null)
    .is('revoked_at', null);

  const token = randomBytes(32).toString('hex'); // 64 文字
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 864e5).toISOString();

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      email: parsed.data.email,
      token,
      plan: parsed.data.plan,
      invited_by: admin.id,
      expires_at: expiresAt,
    })
    .select('id')
    .single();
  if (error || !invitation) {
    return err('INTERNAL', undefined, { cause: error?.message });
  }

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'invitation_created',
    targetType: 'invitation',
    targetId: invitation.id,
    payload: { email: parsed.data.email, plan: parsed.data.plan },
  });

  const inviteUrl = `${getSiteOrigin()}/invite?token=${token}`;
  const emailSent = await sendInvitationEmail({
    email: parsed.data.email,
    plan: parsed.data.plan,
    inviteUrl,
    expiresAt,
  });

  revalidatePath('/admin/invites');
  return ok({ inviteUrl, email: parsed.data.email, emailSent });
}

const uuid = z.string().uuid();

/** 招待取消（api-endpoints.md §11.9）。 */
export async function adminRevokeInvitation(id: string): Promise<Result<null>> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return err('NOT_FOUND');

  const supabase = createClient();
  const { data: inv } = await supabase
    .from('invitations')
    .select('accepted_at')
    .eq('id', id)
    .maybeSingle();
  if (!inv) return err('NOT_FOUND');
  if (inv.accepted_at) return err('INVITATION_ALREADY_ACCEPTED');

  const { error } = await supabase
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'invitation_revoked',
    targetType: 'invitation',
    targetId: id,
  });
  revalidatePath('/admin/invites');
  return ok(null);
}

/** 招待再送（有効期限を延長し、招待メールを再送）（api-endpoints.md §11.10）。 */
export async function adminResendInvitation(
  id: string,
): Promise<Result<{ inviteUrl: string; emailSent: boolean }>> {
  const admin = await requireAdmin();
  if (!uuid.safeParse(id).success) return err('NOT_FOUND');

  const supabase = createClient();
  const { data: inv } = await supabase
    .from('invitations')
    .select('token, accepted_at, email, plan')
    .eq('id', id)
    .maybeSingle();
  if (!inv) return err('NOT_FOUND');
  if (inv.accepted_at) return err('INVITATION_ALREADY_ACCEPTED');

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 864e5).toISOString();
  const { error } = await supabase
    .from('invitations')
    .update({ expires_at: expiresAt, revoked_at: null })
    .eq('id', id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'invitation_resent',
    targetType: 'invitation',
    targetId: id,
  });

  const inviteUrl = `${getSiteOrigin()}/invite?token=${inv.token}`;
  const emailSent = await sendInvitationEmail({
    email: inv.email,
    plan: inv.plan,
    inviteUrl,
    expiresAt,
  });

  revalidatePath('/admin/invites');
  return ok({ inviteUrl, emailSent });
}
