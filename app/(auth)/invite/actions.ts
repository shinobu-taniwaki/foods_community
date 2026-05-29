'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getSiteOrigin } from '@/lib/site';
import {
  passwordSchema,
  inviteTokenSchema,
  zodFieldErrors,
} from '@/lib/validation/common';
import { checkInvitationToken, provisionMemberProfile } from '@/lib/invitations';
import { err, type Result } from '@/lib/result';

const acceptSchema = z
  .object({
    token: inviteTokenSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
    agreeToTerms: z
      .union([z.literal('on'), z.literal('true'), z.literal('')])
      .optional(),
  })
  .refine((v) => v.password === v.passwordConfirm, {
    message: 'パスワードが一致しません',
    path: ['passwordConfirm'],
  });

/**
 * 招待受諾（メール + パスワード）（api-endpoints.md §2.2）。
 * トークン検証 → signUp → profiles/notification_preferences 作成 → 招待を accepted に。
 */
export async function acceptInvitationWithPassword(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const agree = formData.get('agreeToTerms');
  const parsed = acceptSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    passwordConfirm: formData.get('passwordConfirm'),
    agreeToTerms: agree === null ? '' : agree,
  });
  if (!parsed.success) {
    if (parsed.error.issues.some((i) => i.path[0] === 'password')) {
      return err('WEAK_PASSWORD', undefined, {
        fields: zodFieldErrors(parsed.error),
      });
    }
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  if (parsed.data.agreeToTerms !== 'on' && parsed.data.agreeToTerms !== 'true') {
    return err('TERMS_NOT_AGREED');
  }

  // トークン検証
  const check = await checkInvitationToken(parsed.data.token);
  if (!check.valid) return err('INVITATION_INVALID');
  const { invitation } = check;

  // signUp（招待メールで作成。ローカルはメール確認なしで即セッション）
  const supabase = createClient();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: invitation.email,
    password: parsed.data.password,
  });

  if (signUpError || !signUpData.user) {
    if (
      signUpError?.code === 'user_already_exists' ||
      signUpError?.message?.toLowerCase().includes('already')
    ) {
      return err('EMAIL_ALREADY_EXISTS');
    }
    return err('INTERNAL', undefined, { cause: signUpError?.message });
  }

  // プロフィール作成（失敗時は作成した auth ユーザーをクリーンアップ）
  const provisioned = await provisionMemberProfile({
    userId: signUpData.user.id,
    invitation,
  });
  if (!provisioned.ok) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(signUpData.user.id);
    await supabase.auth.signOut();
    return err('INTERNAL', undefined, { cause: provisioned.cause });
  }

  redirect('/announcements');
}

const googleInviteSchema = z.object({ token: inviteTokenSchema });

/**
 * 招待受諾（Google SSO）の開始（api-endpoints.md §2.3）。
 * invite_token を callback URL に引き継ぎ、コールバック側でメール一致を検証する。
 */
export async function acceptInvitationWithGoogle(
  formData: FormData,
): Promise<void> {
  const parsed = googleInviteSchema.safeParse({ token: formData.get('token') });
  if (!parsed.success) redirect('/login?error=oauth_failed');

  const supabase = createClient();
  const redirectTo = `${getSiteOrigin()}/api/auth/callback?invite_token=${parsed.data.token}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error || !data.url) redirect('/login?error=oauth_failed');
  redirect(data.url);
}
