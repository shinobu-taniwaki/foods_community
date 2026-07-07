'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSiteOrigin } from '@/lib/site';
import { emailSchema, zodFieldErrors } from '@/lib/validation/common';
import { ok, err, type Result } from '@/lib/result';

const requestSchema = z.object({ email: emailSchema });

/**
 * パスワード再設定メールの送信（設計書 §5.4 / notifications-and-emails.md M-02）。
 * Supabase Auth（GoTrue）の recovery フローを使い、メール内リンク →
 * /api/auth/callback?next=/reset-password → 新パスワード設定ページへ誘導する。
 * 存在しないメールでも { sent: true } を返し、アカウント有無の漏洩を防ぐ。
 */
export async function requestPasswordReset(
  _prev: Result<{ sent: true }> | null,
  formData: FormData,
): Promise<Result<{ sent: true }>> {
  const parsed = requestSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getSiteOrigin()}/api/auth/callback?next=/reset-password`,
  });

  // 結果に関わらず送信済みとして返す（情報漏洩防止）
  return ok({ sent: true });
}
