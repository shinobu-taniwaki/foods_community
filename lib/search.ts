import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface SearchPostResult {
  id: string;
  title: string;
  excerpt: string;
  channelLabel: string;
}
export interface SearchAnnouncementResult {
  id: string;
  title: string;
  excerpt: string;
}
export interface SearchMemberResult {
  id: string;
  displayName: string;
  storeName: string;
  avatar: string;
}

export interface SearchResults {
  posts: SearchPostResult[];
  announcements: SearchAnnouncementResult[];
  members: SearchMemberResult[];
}

/** ILIKE 用に特殊文字をエスケープし、OR パターンを作る。 */
function buildOrIlike(columns: string[], terms: string[]): string {
  const parts: string[] = [];
  for (const term of terms) {
    const safe = term.replace(/[%_,()]/g, '');
    if (!safe) continue;
    for (const col of columns) {
      parts.push(`${col}.ilike.%${safe}%`);
    }
  }
  return parts.join(',');
}

/**
 * 横断検索（api-endpoints.md §7.3）。MVP は ILIKE の OR 検索。
 * RLS により閲覧可能な範囲のみ返る。
 */
export async function searchAll(
  q: string,
  limitPerScope = 10,
): Promise<SearchResults> {
  const terms = q.trim().split(/\s+/).filter(Boolean).slice(0, 5);
  if (terms.length === 0) {
    return { posts: [], announcements: [], members: [] };
  }
  const supabase = createClient();

  const postOr = buildOrIlike(['title', 'content'], terms);
  const annOr = buildOrIlike(['title', 'body'], terms);
  const memberOr = buildOrIlike(
    ['display_name', 'store_name', 'product'],
    terms,
  );

  const [posts, announcements, members] = await Promise.all([
    supabase
      .from('posts')
      .select(
        'id, title, content, channel:channels!posts_channel_id_fkey(label)',
      )
      .is('deleted_at', null)
      .or(postOr)
      .order('created_at', { ascending: false })
      .limit(limitPerScope),
    supabase
      .from('contents')
      .select('id, title, body')
      .eq('status', 'published')
      .is('deleted_at', null)
      .or(annOr)
      .order('published_at', { ascending: false })
      .limit(limitPerScope),
    supabase
      .from('profiles')
      .select('id, display_name, store_name, avatar')
      .eq('role', 'member')
      .eq('status', 'active')
      .or(memberOr)
      .limit(limitPerScope),
  ]);

  return {
    posts: (posts.data ?? []).map((p) => {
      const channel = p.channel as { label: string } | null;
      return {
        id: p.id,
        title: p.title,
        excerpt: p.content.slice(0, 80),
        channelLabel: channel?.label ?? '',
      };
    }),
    announcements: (announcements.data ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.body.slice(0, 80),
    })),
    members: (members.data ?? []).map((m) => ({
      id: m.id,
      displayName: m.display_name,
      storeName: m.store_name,
      avatar: m.avatar,
    })),
  };
}
