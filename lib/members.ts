import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface MemberGenre {
  id: string;
  label: string;
  iconEmoji: string;
}

export interface MemberListItem {
  id: string;
  displayName: string;
  avatar: string;
  storeName: string;
  region: string;
  product: string;
  productGenres: MemberGenre[];
}

interface ProfileRowEmbed {
  id: string;
  display_name: string;
  avatar: string;
  store_name: string;
  region: string;
  product: string;
  profile_product_genres: {
    product_genres: { id: string; label: string; icon_emoji: string } | null;
  }[];
}

function mapGenres(row: ProfileRowEmbed): MemberGenre[] {
  return (row.profile_product_genres ?? [])
    .map((g) => g.product_genres)
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .map((g) => ({ id: g.id, label: g.label, iconEmoji: g.icon_emoji }));
}

const SELECT =
  'id, display_name, avatar, store_name, region, product, profile_product_genres(product_genres(id, label, icon_emoji))';

/**
 * メンバー一覧（api-endpoints.md §7.1）。RLS で active member のみ。
 * ジャンル OR フィルタ・名前/屋号部分一致。last_active_at 降順。
 */
export async function listMembers(params: {
  genreIds?: string[];
  nameQuery?: string;
  limit?: number;
}): Promise<MemberListItem[]> {
  const supabase = createClient();

  // ジャンル絞り込みは中間テーブルから profile_id を引いてから IN する
  let allowedIds: string[] | null = null;
  if (params.genreIds && params.genreIds.length > 0) {
    const { data: links } = await supabase
      .from('profile_product_genres')
      .select('profile_id')
      .in('genre_id', params.genreIds);
    allowedIds = Array.from(new Set((links ?? []).map((l) => l.profile_id)));
    if (allowedIds.length === 0) return [];
  }

  let query = supabase
    .from('profiles')
    .select(SELECT)
    .eq('role', 'member')
    .eq('status', 'active')
    .order('last_active_at', { ascending: false })
    .limit(params.limit ?? 30);

  if (allowedIds) query = query.in('id', allowedIds);

  const nameQuery = params.nameQuery?.trim();
  if (nameQuery && nameQuery.length >= 2) {
    const safe = nameQuery.replace(/[%_,()]/g, '');
    query = query.or(`display_name.ilike.%${safe}%,store_name.ilike.%${safe}%`);
  }

  const { data } = await query;
  return ((data as ProfileRowEmbed[] | null) ?? []).map((row) => ({
    id: row.id,
    displayName: row.display_name,
    avatar: row.avatar,
    storeName: row.store_name,
    region: row.region,
    product: row.product,
    productGenres: mapGenres(row),
  }));
}

export interface MemberDetail extends MemberListItem {
  bio: string | null;
  storeDescription: string | null;
  companyName: string | null;
  businessType: string | null;
  websiteUrl: string | null;
  socialLinks: { instagram?: string; x?: string; tiktok?: string } | null;
  recentPosts: {
    id: string;
    title: string;
    channelLabel: string;
    createdAt: string;
  }[];
}

/** メンバー詳細（api-endpoints.md §7.2）。active のみ。直近投稿10件。 */
export async function getMemberProfile(
  id: string,
): Promise<MemberDetail | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select(
      `${SELECT}, bio, store_description, company_name, business_type, website_url, social_links`,
    )
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();
  if (!data) return null;

  const row = data as ProfileRowEmbed & {
    bio: string | null;
    store_description: string | null;
    company_name: string | null;
    business_type: string | null;
    website_url: string | null;
    social_links: { instagram?: string; x?: string; tiktok?: string } | null;
  };

  const { data: posts } = await supabase
    .from('posts')
    .select(
      'id, title, created_at, channel:channels!posts_channel_id_fkey(label)',
    )
    .eq('author_id', id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    id: row.id,
    displayName: row.display_name,
    avatar: row.avatar,
    storeName: row.store_name,
    region: row.region,
    product: row.product,
    productGenres: mapGenres(row),
    bio: row.bio,
    storeDescription: row.store_description,
    companyName: row.company_name,
    businessType: row.business_type,
    websiteUrl: row.website_url,
    socialLinks: row.social_links,
    recentPosts: (posts ?? []).map((p) => {
      const channel = p.channel as { label: string } | null;
      return {
        id: p.id,
        title: p.title,
        channelLabel: channel?.label ?? '',
        createdAt: p.created_at,
      };
    }),
  };
}
