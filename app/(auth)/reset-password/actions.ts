'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import { passwordSchema, zodFieldErrors } from '@/lib/validation/common';
import { err, type Result } from '@/lib/result';
import { writeSystemAuditLog } from '@/lib/audit';
import { getSiteOrigin } from '@/lib/site';
import { sendEmail } from '@/lib/email/send';
import { buildPasswordChangedEmail } from '@/lib/email/templates/password-changed';

const resetSchema = z
  .object({
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((v) => v.newPassword === v.newPasswordConfirm, {
    message: '新しいパスワードが一致しません',
    path: ['newPasswordConfirm'],
  });

/**
 * 再設定リンク経由の新パスワード設定（設計書 §5.4）。
 * recovery セッションでログイン済みのため、現在のパスワードは不要。
 * 完了後は M-03 メール + 監査ログを記録し、お知らせへ遷移する。
 */
export async function updatePasswordFromRecovery(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const user = await getUser();
  if (!user?.email) return err('UNAUTHORIZED');

  const parsed = resetSchema.safeParse({
    newPassword: formData.get('newPassword'),
    newPasswordConfirm: formData.get('newPasswordConfirm'),
  });
  if (!parsed.success) {
    const fields = zodFieldErrors(parsed.error);
    if (parsed.error.issues.some((i) => i.path[0] === 'newPassword')) {
      return err('WEAK_PASSWORD', undefined, { fields });
    }
    return err('VALIDATION_FAILED', undefined, { fields });
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) {
    if (error.message.toLowerCase().includes('different')) {
      return err('SAME_PASSWORD');
    }
    return err('INTERNAL', undefined, { cause: error.message });
  }

  await writeSystemAuditLog({
    actorId: user.id,
    actionType: 'password_changed',
    targetType: 'auth',
    targetId: user.id,
  });
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();
  await sendEmail(
    buildPasswordChangedEmail({
      to: user.email,
      userName: profile?.display_name ?? 'メンバー',
      changedAt: new Date().toISOString(),
      appUrl: getSiteOrigin(),
    }),
  );

  redirect('/announcements');
}
