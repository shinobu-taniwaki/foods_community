import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '監査ログ' };

const ACTION_LABEL: Record<string, string> = {
  user_suspended: 'メンバー停止',
  user_deleted: 'メンバー退会',
  user_restored: 'メンバー復活',
  user_plan_changed: 'プラン変更',
  post_edited_by_admin: '投稿編集',
  post_deleted_by_admin: '投稿削除',
  content_deleted_by_admin: 'お知らせ削除',
  invitation_created: '招待発行',
  invitation_revoked: '招待取消',
  invitation_resent: '招待再送',
  channel_created: 'チャンネル作成',
  channel_updated: 'チャンネル更新',
  channel_deleted: 'チャンネル削除',
  product_genre_created: 'ジャンル作成',
  product_genre_updated: 'ジャンル更新',
  product_genre_deleted: 'ジャンル削除',
  post_tag_created: 'タグ作成',
  post_tag_merged: 'タグ統合',
  post_tag_deleted: 'タグ削除',
  broadcast_sent: '全体通知送信',
  email_changed: 'メール変更',
  password_changed: 'パスワード変更',
};

type ActorEmbed = { display_name: string } | null;

export default async function AdminAuditLogPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('audit_logs')
    .select(
      'id, action_type, target_type, target_id, payload, created_at, actor:profiles!audit_logs_actor_id_fkey(display_name)',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  const logs = data ?? [];

  return (
    <div className="space-y-5">
      <Heading level={1}>監査ログ</Heading>
      <p className="text-sm text-foreground/60">
        管理操作の記録（改ざん不可・無期限保持）。直近100件。
      </p>

      {logs.length === 0 ? (
        <Card className="text-center text-foreground/60">記録はありません。</Card>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => {
            const actor = log.actor as ActorEmbed;
            return (
              <li key={log.id}>
                <Card className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {ACTION_LABEL[log.action_type] ?? log.action_type}
                    </span>
                    <time className="text-xs text-foreground/40">
                      {new Date(log.created_at).toLocaleString('ja-JP')}
                    </time>
                  </div>
                  <p className="text-sm text-foreground/60">
                    実行者: {actor?.display_name ?? '—'} ／ 対象: {log.target_type}
                  </p>
                  {log.payload && Object.keys(log.payload).length > 0 && (
                    <pre className="overflow-x-auto rounded bg-foreground/5 p-2 text-xs">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
