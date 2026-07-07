import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface PostTag {
  id: string;
  label: string;
  slug: string;
}

export interface PostAuthor {
  id: string;
  displayName: string;
  avatar: string;
  /** 運営（admin）による投稿か。UI で「運営」バッジ・背景色の出し分けに使う。 */
  isAdmin: boolean;
  genreEmojis: string[];
}

export interface PostListItem {
  id: string;
  channel: {
    id: string;
    label: string;
    iconEmoji: string | null;
    color: string;
  };
  title: string;
  contentExcerpt: string;
  tags: PostTag[];
  author: PostAuthor | null;
  createdAt: string;
  lastEditedAt: string | null;
  editedByAdmin: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  hasVideo: boolean;
  hasImage: boolean;
}

const TRIAL_RANK = 0;

type ChannelEmbed = {
  id: string;
  label: string;
  icon_emoji: string | null;
  color: string;
} | null;
type CountAgg = { count: number }[];

interface AuthorEmbed {
  id: string;
  display_name: string;
  avatar: string;
  status: string;
  role: string;
  profile_product_genres: { product_genres: { icon_emoji: string } | null }[];
}

function mapAuthor(author: AuthorEmbed | null): PostAuthor | null {
  if (!author || author.status !== 'active') return null;
  return {
    id: author.id,
    displayName: author.display_name,
    avatar: author.avatar,
    isAdmin: author.role === 'admin',
    genreEmojis: (author.profile_product_genres ?? [])
      .map((g) => g.product_genres?.icon_emoji)
      .filter((e): e is string => Boolean(e)),
  };
}

/**
 * 投稿一覧（api-endpoints.md §5.1）。
 * trial（rank 0）はチャンネルの trial_preview_count 件までに制限する。
 */
export async function listPosts(params: {
  viewerId: string;
  viewerPlanRank: number;
  channelId: string;
  trialPreviewCount: number | null;
}): Promise<{ items: PostListItem[]; trialLimitReached: boolean }> {
  const supabase = createClient();
  const isTrial = params.viewerPlanRank <= TRIAL_RANK;
  const cap = isTrial ? (params.trialPreviewCount ?? 5) : 20;

  // trial は「上限+1」件取得して、超過の有無を判定
  const fetchLimit = isTrial ? cap + 1 : cap;

  const { data, error } = await supabase
    .from('posts')
    .select(
      `id, title, content, created_at, last_edited_at, edited_by_admin,
       channel:channels!posts_channel_id_fkey(id, label, icon_emoji, color),
       author:profiles!posts_author_id_fkey(id, display_name, avatar, status, role,
         profile_product_genres(product_genres(icon_emoji))),
       post_tag_assignments(post_tags(id, label, slug)),
       post_attachments(attachment_type),
       post_likes(count), post_comments(count)`,
    )
    .eq('channel_id', params.channelId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (error || !data) return { items: [], trialLimitReached: false };

  let rows = data;
  let trialLimitReached = false;
  if (isTrial && rows.length > cap) {
    rows = rows.slice(0, cap);
    trialLimitReached = true;
  }

  const likedSet = await fetchLikedPosts(
    params.viewerId,
    rows.map((r) => r.id),
  );

  const items = rows.map((row): PostListItem => {
    const channel = row.channel as ChannelEmbed;
    const tags = (row.post_tag_assignments ?? [])
      .map((a) => a.post_tags)
      .filter((t): t is PostTag => Boolean(t))
      .map((t) => ({ id: t.id, label: t.label, slug: t.slug }));
    const hasVideo = (row.post_attachments ?? []).some(
      (a) => a.attachment_type === 'video_embed',
    );
    const hasImage = (row.post_attachments ?? []).some(
      (a) => a.attachment_type === 'image',
    );
    return {
      id: row.id,
      channel: channel
        ? {
            id: channel.id,
            label: channel.label,
            iconEmoji: channel.icon_emoji,
            color: channel.color,
          }
        : { id: '', label: '', iconEmoji: null, color: '#c05e3f' },
      title: row.title,
      contentExcerpt: row.content.slice(0, 120),
      tags,
      author: mapAuthor(row.author as AuthorEmbed | null),
      createdAt: row.created_at,
      lastEditedAt: row.last_edited_at,
      editedByAdmin: row.edited_by_admin,
      likeCount: (row.post_likes as CountAgg)[0]?.count ?? 0,
      commentCount: (row.post_comments as CountAgg)[0]?.count ?? 0,
      likedByMe: likedSet.has(row.id),
      hasVideo,
      hasImage,
    };
  });

  return { items, trialLimitReached };
}

async function fetchLikedPosts(
  viewerId: string,
  postIds: string[],
): Promise<Set<string>> {
  if (postIds.length === 0) return new Set();
  const supabase = createClient();
  const { data } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('user_id', viewerId)
    .in('post_id', postIds);
  return new Set((data ?? []).map((l) => l.post_id));
}
