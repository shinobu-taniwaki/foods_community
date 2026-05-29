import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/types';

export type InvitationRow = Tables<'invitations'>;

export type InvitationCheck =
  | { valid: true; invitation: InvitationRow }
  | { valid: false; reason: 'expired' | 'already_accepted' | 'not_found' };

/**
 * トークンから有効な招待を取得する（api-endpoints.md §2.1）。
 * service_role で参照（invitations は RLS で member には見えないため）。
 */
export async function checkInvitationToken(
  token: string,
): Promise<InvitationCheck> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return { valid: false, reason: 'not_found' };
  if (data.accepted_at || data.revoked_at)
    return { valid: false, reason: 'already_accepted' };
  if (new Date(data.expires_at) <= new Date())
    return { valid: false, reason: 'expired' };

  return { valid: true, invitation: data };
}

/** メールのローカル部から初期表示名を作る（最大50文字、最低1文字）。 */
function defaultDisplayName(email: string): string {
  const local = email.split('@')[0] ?? 'メンバー';
  const trimmed = local.slice(0, 50);
  return trimmed.length > 0 ? trimmed : 'メンバー';
}

/**
 * 招待に基づき member プロフィールを作成する（§2.2 / §2.3 共通）。
 * service_role で profiles / notification_preferences を INSERT し、
 * invitations.accepted_at を更新する。
 *
 * 失敗時は呼び出し側で auth ユーザーのクリーンアップを検討する。
 */
export async function provisionMemberProfile(params: {
  userId: string;
  invitation: InvitationRow;
}): Promise<{ ok: true } | { ok: false; cause: string }> {
  const { userId, invitation } = params;
  const admin = createAdminClient();

  const { error: profileError } = await admin.from('profiles').insert({
    id: userId,
    display_name: defaultDisplayName(invitation.email),
    role: 'member',
    plan: invitation.plan,
    status: 'active',
  });
  if (profileError) return { ok: false, cause: profileError.message };

  const { error: prefError } = await admin
    .from('notification_preferences')
    .insert({ user_id: userId });
  if (prefError) return { ok: false, cause: prefError.message };

  const { error: inviteError } = await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)
    .is('accepted_at', null);
  if (inviteError) return { ok: false, cause: inviteError.message };

  return { ok: true };
}
