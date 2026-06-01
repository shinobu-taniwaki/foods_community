import 'server-only';
import { createClient } from '@/lib/supabase/server';

/** お知らせカテゴリの表示メタ（設計書 §7.1.2）。 */
export const ANNOUNCEMENT_CATEGORIES = {
  important: { label: '重要なお知らせ', icon: '⚠️', color: 'text-terracotta' },
  news: { label: 'ニュース', icon: '📰', color: 'text-navy' },
  column: { label: 'コラム', icon: '📖', color: 'text-olive' },
  seminar: { label: 'セミナー情報', icon: '📅', color: 'text-mustard' },
} as const;

export type AnnouncementCategory = keyof typeof ANNOUNCEMENT_CATEGORIES;

export function isAnnouncementCategory(v: string): v is AnnouncementCategory {
  return v in ANNOUNCEMENT_CATEGORIES;
}

export interface AnnouncementListItem {
  id: string;
  category: AnnouncementCategory;
  title: string;
  bodyExcerpt: string;
  pinned: boolean;
  requiredPlan: string | null;
  publishedAt: string | null;
  author: { id: string; displayName: string; avatar: string } | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

type CountAgg = { count: number }[];
type AuthorEmbed = { id: string; display_name: string; avatar: string } | null;

/** お知らせ一覧（api-endpoints.md §4.1）。RLS でプラン・公開状態を自動フィルタ。 */
export async function listAnnouncements(params: {
  viewerId: string;
  category?: AnnouncementCategory;
  limit?: number;
}): Promise<AnnouncementListItem[]> {
  const supabase = createClient();
  let query = supabase
    .from('contents')
    .select(
      `id, category, title, body, pinned, required_plan, published_at,
       author:profiles!contents_author_id_fkey(id, display_name, avatar),
       content_likes(count), content_comments(count)`,
    )
    .eq('status', 'published')
    .is('deleted_at', null)
    .order('pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(params.limit ?? 20);

  if (params.category) query = query.eq('category', params.category);

  const { data, error } = await query;
  if (error || !data) return [];

  const ids = data.map((d) => d.id);
  const likedSet = await fetchLikedSet(params.viewerId, ids);

  return data.map((row) => {
    const author = row.author as AuthorEmbed;
    return {
      id: row.id,
      category: row.category as AnnouncementCategory,
      title: row.title,
      bodyExcerpt: row.body.slice(0, 120),
      pinned: row.pinned,
      requiredPlan: row.required_plan,
      publishedAt: row.published_at,
      author: author
        ? {
            id: author.id,
            displayName: author.display_name,
            avatar: author.avatar,
          }
        : null,
      likeCount: (row.content_likes as CountAgg)[0]?.count ?? 0,
      commentCount: (row.content_comments as CountAgg)[0]?.count ?? 0,
      likedByMe: likedSet.has(row.id),
    };
  });
}

async function fetchLikedSet(
  viewerId: string,
  contentIds: string[],
): Promise<Set<string>> {
  if (contentIds.length === 0) return new Set();
  const supabase = createClient();
  const { data } = await supabase
    .from('content_likes')
    .select('content_id')
    .eq('user_id', viewerId)
    .in('content_id', contentIds);
  return new Set((data ?? []).map((l) => l.content_id));
}
