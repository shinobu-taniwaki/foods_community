'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getSiteOrigin } from '@/lib/site';
import { emailSchema, zodFieldErrors } from '@/lib/validation/common';
import { ok, err, type Result } from '@/lib/result';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'パスワードを入力してください'),
});

/**
 * メール + パスワードでログイン（api-endpoints.md §2.4）。
 * 成功時は /announcements へ redirect。停止・退会アカウントはサインアウトしてエラー。
 */
export async function signInWithPassword(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    // GoTrue のロックアウト（429）を区別
    if (error?.status === 429) return err('RATE_LIMITED');
    return err('INVALID_CREDENTIALS');
  }

  // ステータス確認
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profile?.status === 'suspended') {
    await supabase.auth.signOut();
    return err('ACCOUNT_SUSPENDED');
  }
  if (profile?.status === 'deleted' || profile?.status === 'hard_deleted') {
    await supabase.auth.signOut();
    return err('ACCOUNT_DELETED');
  }

  // 最終アクティブ時刻を更新（失敗しても致命的ではない）
  await supabase.rpc('touch_last_active', { p_user_id: data.user.id });

  redirect('/announcements');
}

const magicLinkSchema = z.object({ email: emailSchema });

/**
 * Magic Link 送信（api-endpoints.md §2.5）。
 * 存在しないメールでも { sent: true } を返し、アカウント有無の漏洩を防ぐ。
 */
export async function sendMagicLink(
  _prev: Result<{ sent: true }> | null,
  formData: FormData,
): Promise<Result<{ sent: true }>> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: `${getSiteOrigin()}/api/auth/callback` },
  });

  // 結果に関わらず送信済みとして返す（情報漏洩防止）
  return ok({ sent: true });
}

/** Google OAuth 開始（api-endpoints.md §2.3）。フォームアクション。プロバイダ URL へ redirect。 */
export async function signInWithGoogle(_formData: FormData): Promise<void> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${getSiteOrigin()}/api/auth/callback` },
  });
  if (error || !data.url) redirect('/login?error=oauth_failed');
  redirect(data.url);
}
