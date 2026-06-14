import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * アプリ内通知の読み取り（screens §通知）。
 * createClient（Cookie セッション）で叩くため、RLS により本人宛のみ取得できる。
 */

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  linkPath: string;
  readAt: string | null;
  createdAt: string;
}

const DEFAULT_LIMIT = 50;

/** 自分宛の通知を新しい順に取得する。 */
export async function listNotifications(
  limit = DEFAULT_LIMIT,
): Promise<NotificationItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, body, link_path, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    linkPath: n.link_path,
    readAt: n.read_at,
    createdAt: n.created_at,
  }));
}

/** 自分宛の未読件数（ヘッダーバッジ用）。 */
export async function countUnreadNotifications(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  return count ?? 0;
}
