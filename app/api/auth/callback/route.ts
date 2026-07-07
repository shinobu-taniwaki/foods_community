import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  checkInvitationToken,
  provisionMemberProfile,
} from '@/lib/invitations';

/**
 * Supabase Auth コールバック（api-endpoints.md §2.3）。
 * - Magic Link / Google ログイン: code をセッションに交換し /announcements へ。
 * - 招待（invite_token あり）: 招待メールと認証メールの一致を厳密検証し profiles 作成。
 */
/** 認証後の遷移先として許可する next の値（オープンリダイレクト防止のホワイトリスト）。 */
const ALLOWED_NEXT_PATHS = ['/reset-password'] as const;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const inviteToken = searchParams.get('invite_token');
  const nextParam = searchParams.get('next');
  const nextPath = ALLOWED_NEXT_PATHS.find((p) => p === nextParam) ?? null;

  const redirectTo = (path: string) =>
    NextResponse.redirect(`${origin}${path}`);

  if (!code) return redirectTo('/login?error=oauth_failed');

  const supabase = createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return redirectTo('/login?error=oauth_failed');

  const user = data.user;

  // 既存プロフィールの確認
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .maybeSingle();

  // --- 招待フロー（Google SSO 受諾）---
  if (inviteToken) {
    if (profile) {
      // 既に登録済みならそのまま入室判定へ流す
      return routeByStatus(profile.status, redirectTo);
    }

    const check = await checkInvitationToken(inviteToken);
    if (!check.valid) {
      await supabase.auth.signOut();
      return redirectTo('/login?error=invitation_invalid');
    }

    // 招待メールと Google アカウントのメールが一致するか（厳密・大文字小文字無視）
    const sameEmail =
      (user.email ?? '').toLowerCase() === check.invitation.email.toLowerCase();
    if (!sameEmail) {
      await supabase.auth.signOut();
      return redirectTo('/login?error=email_mismatch');
    }

    const provisioned = await provisionMemberProfile({
      userId: user.id,
      invitation: check.invitation,
    });
    if (!provisioned.ok) {
      await supabase.auth.signOut();
      return redirectTo('/login?error=oauth_failed');
    }
    return redirectTo('/announcements');
  }

  // --- 通常ログイン（Magic Link / 連携済み Google / パスワード再設定）---
  if (!profile) {
    // 招待なしでアカウントが無い → 入室不可
    await supabase.auth.signOut();
    return redirectTo('/login?error=no_account');
  }
  // パスワード再設定リンク（recovery）は active なら新パスワード設定ページへ
  if (nextPath && profile.status === 'active') {
    return redirectTo(nextPath);
  }
  return routeByStatus(profile.status, redirectTo);
}

function routeByStatus(
  status: string,
  redirectTo: (path: string) => NextResponse,
): NextResponse {
  if (status === 'active') return redirectTo('/announcements');
  return redirectTo('/login?reason=inactive');
}
