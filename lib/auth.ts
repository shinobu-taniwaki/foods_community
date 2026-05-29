import 'server-only';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/types';

export type ProfileRow = Tables<'profiles'>;

export interface ProfileGenre {
  id: string;
  label: string;
  iconEmoji: string;
}

export interface CurrentProfile extends ProfileRow {
  productGenres: ProfileGenre[];
}

/** 認証済みユーザー（auth.users）を返す。未認証なら null。 */
export async function getUser(): Promise<User | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * 自分のプロフィール（販売ジャンル付き）を返す。未認証・未登録なら null。
 */
export async function getMyProfile(): Promise<CurrentProfile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(
      '*, profile_product_genres(product_genres(id, label, icon_emoji))',
    )
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) return null;

  const { profile_product_genres, ...profile } = data as ProfileRow & {
    profile_product_genres: {
      product_genres: { id: string; label: string; icon_emoji: string } | null;
    }[];
  };

  const productGenres: ProfileGenre[] = (profile_product_genres ?? [])
    .map((row) => row.product_genres)
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .map((g) => ({ id: g.id, label: g.label, iconEmoji: g.icon_emoji }));

  return { ...(profile as ProfileRow), productGenres };
}

/**
 * 認証必須。未認証なら /login へ。active 以外（停止・退会）も /login へ。
 * 認証後ページの layout / Server Action 冒頭で使用する。
 */
export async function requireMember(): Promise<CurrentProfile> {
  const profile = await getMyProfile();
  if (!profile) redirect('/login');
  if (profile.status !== 'active') redirect('/login?reason=inactive');
  return profile;
}

/**
 * admin 必須。member や未認証は 404（存在を隠す）。
 */
export async function requireAdmin(): Promise<CurrentProfile> {
  const profile = await getMyProfile();
  if (!profile) redirect('/login');
  if (profile.role !== 'admin' || profile.status !== 'active') {
    // 情報漏洩を避けるため admin ページの存在自体を隠す
    redirect('/announcements');
  }
  return profile;
}
