import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';
import { PLAN_RANK, ADMIN_RANK, STANDARD_RANK } from '@/lib/plans';

/**
 * アプリ内通知の配信（notifications-and-emails.md §1）。
 *
 * - notifications テーブルへの INSERT は service_role（createAdminClient）でのみ可能
 *   （RLS に authenticated 向け INSERT ポリシーが無いため）。
 * - 受信者は notification_preferences を見て絞り込む（OFF 不可の種別は素通し）。
 * - 監査ログ（lib/audit.ts）と同様、通知失敗で主処理は止めない best-effort 方針。
 */

/** notification_preferences で ON/OFF できる種別のカラム。 */
type PreferenceColumn =
  | 'new_post'
  | 'new_announcement'
  | 'comment_on_my_post'
  | 'like_on_my_post';

interface NotificationRow {
  recipient_id: string;
  type: string;
  title: string;
  body: string;
  link_path: string;
  actor_id: string | null;
}

const POST_TITLE_MAX = 60;
const COMMENT_EXCERPT_MAX = 80;
const BROADCAST_EXCERPT_MAX = 120;

/** 改行・連続空白を 1 つにまとめ、max 超過分を「…」で省略する。 */
function excerpt(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

/** ISO 文字列を日本語日時に整形（null は「無期限」）。 */
function formatJpDateTime(iso: string | null): string {
  if (!iso) return '無期限';
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

/** 通知を一括 INSERT（best-effort・行が無ければ何もしない）。 */
async function insertNotifications(rows: NotificationRow[]): Promise<void> {
  if (rows.length === 0) return;
  const admin = createAdminClient();
  // 失敗しても主処理（投稿・コメント等）は止めない（audit と同方針）
  await admin.from('notifications').insert(rows);
}

/** active な admin/member のうち、プラン rank が minRank 以上の id を返す。 */
async function activeMemberRecipients(opts: {
  excludeId: string;
  minRank: number;
}): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('id, role, plan')
    .eq('status', 'active')
    .in('role', ['admin', 'member']);
  if (!data) return [];

  return data
    .filter((p) => p.id !== opts.excludeId)
    .filter((p) => {
      const rank =
        p.role === 'admin' ? ADMIN_RANK : p.plan ? (PLAN_RANK[p.plan] ?? -1) : -1;
      return rank >= opts.minRank;
    })
    .map((p) => p.id);
}

/** 受信候補のうち、当該種別を ON にしている id だけを残す。 */
async function filterByPreference(
  ids: string[],
  column: PreferenceColumn,
): Promise<string[]> {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from('notification_preferences')
    .select('user_id, new_post, new_announcement, comment_on_my_post, like_on_my_post')
    .in('user_id', ids);
  if (!data) return [];

  const allowed = new Set(data.filter((r) => r[column]).map((r) => r.user_id));
  return ids.filter((id) => allowed.has(id));
}

/** 掲示板新規投稿 → チャンネル閲覧可能な active member（投稿者除く）。 */
export async function notifyNewPost(params: {
  postId: string;
  postTitle: string;
  authorId: string;
  authorName: string;
  channelLabel: string;
  channelRequiredPlan: string;
}): Promise<void> {
  const minRank = PLAN_RANK[params.channelRequiredPlan] ?? 0;
  const candidates = await activeMemberRecipients({
    excludeId: params.authorId,
    minRank,
  });
  const recipients = await filterByPreference(candidates, 'new_post');
  await insertNotifications(
    recipients.map((recipientId) => ({
      recipient_id: recipientId,
      type: 'new_post',
      title: `${params.authorName} さんが新しい投稿をしました`,
      body: `${params.channelLabel}：${excerpt(params.postTitle, POST_TITLE_MAX)}`,
      link_path: `/feed/${params.postId}`,
      actor_id: params.authorId,
    })),
  );
}

/** お知らせ公開 → required_plan を満たす active member（公開者除く）。 */
export async function notifyNewAnnouncement(params: {
  contentId: string;
  title: string;
  categoryEmoji: string;
  requiredPlan: 'none' | 'standard';
  actorId: string;
}): Promise<void> {
  const minRank = params.requiredPlan === 'standard' ? STANDARD_RANK : 0;
  const candidates = await activeMemberRecipients({
    excludeId: params.actorId,
    minRank,
  });
  const recipients = await filterByPreference(candidates, 'new_announcement');
  await insertNotifications(
    recipients.map((recipientId) => ({
      recipient_id: recipientId,
      type: 'new_announcement',
      title: '運営から新しいお知らせが届きました',
      body: `${params.categoryEmoji} ${params.title}`,
      link_path: `/announcements/${params.contentId}`,
      actor_id: params.actorId,
    })),
  );
}

/** 自分の投稿にコメント → 投稿者（本人コメントは除外）。 */
export async function notifyComment(params: {
  postId: string;
  postAuthorId: string;
  commenterId: string;
  commenterName: string;
  commentBody: string;
}): Promise<void> {
  if (params.postAuthorId === params.commenterId) return;
  const allowed = await filterByPreference(
    [params.postAuthorId],
    'comment_on_my_post',
  );
  if (allowed.length === 0) return;
  await insertNotifications([
    {
      recipient_id: params.postAuthorId,
      type: 'comment_on_my_post',
      title: `${params.commenterName} さんがあなたの投稿にコメントしました`,
      body: excerpt(params.commentBody, COMMENT_EXCERPT_MAX),
      link_path: `/feed/${params.postId}`,
      actor_id: params.commenterId,
    },
  ]);
}

/** 自分の投稿にいいね → 投稿者（既定 OFF・本人いいねは除外）。 */
export async function notifyLike(params: {
  postId: string;
  postTitle: string;
  postAuthorId: string;
  likerId: string;
  likerName: string;
}): Promise<void> {
  if (params.postAuthorId === params.likerId) return;
  const allowed = await filterByPreference([params.postAuthorId], 'like_on_my_post');
  if (allowed.length === 0) return;
  await insertNotifications([
    {
      recipient_id: params.postAuthorId,
      type: 'like_on_my_post',
      title: `${params.likerName} さんがあなたの投稿にいいねしました`,
      body: excerpt(params.postTitle, POST_TITLE_MAX),
      link_path: `/feed/${params.postId}`,
      actor_id: params.likerId,
    },
  ]);
}

/**
 * 運営からの全体通知 → 全 active member（送信 admin 除く・OFF 不可）。
 * 全体通知は主処理そのものなので best-effort ではなく、INSERT 失敗を throw で伝える。
 * 戻り値は配信した受信者 id 一覧（メール並走の宛先解決に使う）。
 */
export async function notifyAdminBroadcast(params: {
  title: string;
  body: string;
  adminId: string;
}): Promise<string[]> {
  const recipients = await activeMemberRecipients({
    excludeId: params.adminId,
    minRank: 0,
  });
  if (recipients.length === 0) return [];

  const admin = createAdminClient();
  const { error } = await admin.from('notifications').insert(
    recipients.map((recipientId) => ({
      recipient_id: recipientId,
      type: 'admin_broadcast',
      title: params.title,
      body: excerpt(params.body, BROADCAST_EXCERPT_MAX),
      link_path: '/notifications',
      actor_id: params.adminId,
    })),
  );
  if (error) {
    throw new Error(`全体通知の配信に失敗しました: ${error.message}`);
  }
  return recipients;
}

type AccountNotificationType =
  | 'account_suspended'
  | 'account_deleted'
  | 'account_restored';

/** アカウント状態変更 → 本人（OFF 不可・システム通知のため actor_id は null）。 */
export async function notifyAccountStatus(params: {
  recipientId: string;
  type: AccountNotificationType;
  suspendedUntil?: string | null;
  reason?: string;
}): Promise<void> {
  const content = buildAccountNotification(params);
  await insertNotifications([
    {
      recipient_id: params.recipientId,
      type: params.type,
      title: content.title,
      body: content.body,
      link_path: content.linkPath,
      actor_id: null,
    },
  ]);
}

function buildAccountNotification(params: {
  type: AccountNotificationType;
  suspendedUntil?: string | null;
  reason?: string;
}): { title: string; body: string; linkPath: string } {
  switch (params.type) {
    case 'account_suspended': {
      const until = formatJpDateTime(params.suspendedUntil ?? null);
      const reason = params.reason?.trim()
        ? ` 理由：${params.reason.trim()}`
        : '';
      return {
        title: 'アカウントが一時停止されました',
        body: `${until} まで利用を停止しています。${reason}`.trimEnd(),
        linkPath: '/me/settings/account',
      };
    }
    case 'account_deleted':
      return {
        title: '退会処理が完了しました',
        body: 'これまでご利用いただきありがとうございました。',
        linkPath: '/',
      };
    case 'account_restored':
      return {
        title: 'アカウントが復活しました',
        body: 'また MCC をご利用いただけます。',
        linkPath: '/announcements',
      };
  }
}

type PostModerationType = 'post_edited_by_admin' | 'post_deleted_by_admin';

/** 運営による投稿の編集・削除 → 投稿者（OFF 不可・admin 本人の操作は除外）。 */
export async function notifyPostModeratedByAdmin(params: {
  recipientId: string;
  adminId: string;
  type: PostModerationType;
  postId: string;
  postTitle: string;
  reason?: string;
}): Promise<void> {
  if (params.recipientId === params.adminId) return;

  const reason = params.reason?.trim();
  const content =
    params.type === 'post_edited_by_admin'
      ? {
          title: 'あなたの投稿が運営により編集されました',
          body: `「${params.postTitle}」が編集されました。${reason ?? ''}`.trimEnd(),
          linkPath: `/feed/${params.postId}`,
        }
      : {
          title: 'あなたの投稿が運営により削除されました',
          body: `「${params.postTitle}」が削除されました。理由：${reason ?? '運営判断のため'}`,
          linkPath: '/me',
        };

  await insertNotifications([
    {
      recipient_id: params.recipientId,
      type: params.type,
      title: content.title,
      body: content.body,
      link_path: content.linkPath,
      actor_id: params.adminId,
    },
  ]);
}
