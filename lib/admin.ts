import 'server-only';
import { createClient, createAdminClient } from '@/lib/supabase/server';

async function countOf(
  table: 'profiles' | 'posts' | 'contents' | 'invitations',
  build: (q: ReturnType<ReturnType<typeof createClient>['from']>) => unknown,
): Promise<number> {
  const supabase = createClient();
  // 件数のみ取得
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase.from(table).select('*', { count: 'exact', head: true });
  q = build(q);
  const { count } = await q;
  return count ?? 0;
}

export interface DashboardStats {
  activeMembers: number;
  suspendedMembers: number;
  deletedMembers: number;
  pendingInvites: number;
  totalPosts: number;
  publishedAnnouncements: number;
}

/** 管理ダッシュボードの集計（設計書 §8.1）。 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const [active, suspended, deleted, pending, posts, anns] = await Promise.all([
    countOf('profiles', (q) => q.eq('role', 'member').eq('status', 'active')),
    countOf('profiles', (q) => q.eq('status', 'suspended')),
    countOf('profiles', (q) => q.eq('status', 'deleted')),
    countOf('invitations', (q) => q.is('accepted_at', null).is('revoked_at', null)),
    countOf('posts', (q) => q.is('deleted_at', null)),
    countOf('contents', (q) => q.eq('status', 'published').is('deleted_at', null)),
  ]);
  return {
    activeMembers: active,
    suspendedMembers: suspended,
    deletedMembers: deleted,
    pendingInvites: pending,
    totalPosts: posts,
    publishedAnnouncements: anns,
  };
}

export interface AdminMemberRow {
  id: string;
  displayName: string;
  avatar: string;
  storeName: string;
  role: string;
  plan: string | null;
  status: string;
  lastActiveAt: string;
}

/** メンバー一覧（admin・全ステータス）（api-endpoints.md §11.1）。 */
export async function adminListMembers(params: {
  status?: string;
  plan?: string;
  nameQuery?: string;
  limit?: number;
}): Promise<AdminMemberRow[]> {
  const supabase = createClient();
  let query = supabase
    .from('profiles')
    .select('id, display_name, avatar, store_name, role, plan, status, last_active_at')
    .order('last_active_at', { ascending: false })
    .limit(params.limit ?? 50);

  if (params.status && params.status !== 'all') query = query.eq('status', params.status);
  if (params.plan && params.plan !== 'all') query = query.eq('plan', params.plan);
  const q = params.nameQuery?.trim();
  if (q && q.length >= 2) {
    const safe = q.replace(/[%_,()]/g, '');
    query = query.or(`display_name.ilike.%${safe}%,store_name.ilike.%${safe}%`);
  }

  const { data } = await query;
  return (data ?? []).map((m) => ({
    id: m.id,
    displayName: m.display_name,
    avatar: m.avatar,
    storeName: m.store_name,
    role: m.role,
    plan: m.plan,
    status: m.status,
    lastActiveAt: m.last_active_at,
  }));
}

export interface AdminMemberDetail extends AdminMemberRow {
  email: string | null;
  bio: string | null;
  region: string | null;
  product: string | null;
  suspendedUntil: string | null;
  deletedAt: string | null;
  deletionReason: string | null;
  createdAt: string;
  stats: { posts: number; comments: number; reports: number };
}

/** メンバー詳細（admin）（api-endpoints.md §11.2）。 */
export async function adminGetMember(id: string): Promise<AdminMemberDetail | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select(
      'id, display_name, avatar, store_name, region, product, bio, role, plan, status, suspended_until, deleted_at, deletion_reason, last_active_at, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  const [{ count: posts }, { count: comments }, { count: sales }] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', id),
    supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('author_id', id),
    supabase.from('sales_reports').select('*', { count: 'exact', head: true }).eq('author_id', id),
  ]);

  // email は auth.users から（service role）
  let email: string | null = null;
  try {
    const adminClient = createAdminClient();
    const { data: u } = await adminClient.auth.admin.getUserById(id);
    email = u.user?.email ?? null;
  } catch {
    email = null;
  }

  return {
    id: data.id,
    displayName: data.display_name,
    avatar: data.avatar,
    storeName: data.store_name,
    region: data.region,
    product: data.product,
    bio: data.bio,
    role: data.role,
    plan: data.plan,
    status: data.status,
    suspendedUntil: data.suspended_until,
    deletedAt: data.deleted_at,
    deletionReason: data.deletion_reason,
    lastActiveAt: data.last_active_at,
    createdAt: data.created_at,
    email,
    stats: { posts: posts ?? 0, comments: comments ?? 0, reports: sales ?? 0 },
  };
}
