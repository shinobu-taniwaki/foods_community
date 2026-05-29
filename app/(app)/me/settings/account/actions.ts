'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth';
import {
  emailSchema,
  passwordSchema,
  zodFieldErrors,
} from '@/lib/validation/common';
import { ok, err, type Result } from '@/lib/result';

// ============================================================
// パスワード変更（api-endpoints.md §2.7）
// ============================================================
const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
    newPassword: passwordSchema,
    newPasswordConfirm: z.string(),
  })
  .refine((v) => v.newPassword === v.newPasswordConfirm, {
    message: '新しいパスワードが一致しません',
    path: ['newPasswordConfirm'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: '現在のパスワードと異なるパスワードにしてください',
    path: ['newPassword'],
  });

export async function changePassword(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const user = await getUser();
  if (!user?.email) return err('UNAUTHORIZED');

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    newPasswordConfirm: formData.get('newPasswordConfirm'),
  });
  if (!parsed.success) {
    const fields = zodFieldErrors(parsed.error);
    if (fields.newPassword?.includes('異なる')) return err('SAME_PASSWORD');
    if (parsed.error.issues.some((i) => i.path[0] === 'newPassword')) {
      return err('WEAK_PASSWORD', undefined, { fields });
    }
    return err('VALIDATION_FAILED', undefined, { fields });
  }

  const supabase = createClient();

  // 現パスワードで再認証
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) return err('INVALID_CREDENTIALS');

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  // TODO(Phase5): Resend で「パスワードが変更されました」通知 + audit_logs(password_changed)
  return ok(null);
}

// ============================================================
// メールアドレス変更（api-endpoints.md §2.8）
// ============================================================
const emailChangeSchema = z.object({
  newEmail: emailSchema,
  currentPassword: z.string().min(1, '現在のパスワードを入力してください'),
});

export async function changeEmail(
  _prev: Result<{ confirmationSent: true }> | null,
  formData: FormData,
): Promise<Result<{ confirmationSent: true }>> {
  const user = await getUser();
  if (!user?.email) return err('UNAUTHORIZED');

  const parsed = emailChangeSchema.safeParse({
    newEmail: formData.get('newEmail'),
    currentPassword: formData.get('currentPassword'),
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }
  if (parsed.data.newEmail.toLowerCase() === user.email.toLowerCase()) {
    return err('VALIDATION_FAILED', '現在と異なるメールアドレスを入力してください');
  }

  const supabase = createClient();
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) return err('INVALID_CREDENTIALS');

  // 新旧両方のメールに確認リンクが送られる（Supabase 標準・config の double_confirm_changes）
  const { error } = await supabase.auth.updateUser({
    email: parsed.data.newEmail,
  });
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return err('EMAIL_ALREADY_EXISTS');
    }
    return err('INTERNAL', undefined, { cause: error.message });
  }

  return ok({ confirmationSent: true });
}
