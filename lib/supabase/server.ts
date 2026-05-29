import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getPublicEnv, getServerEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * サーバー（Server Component / Route Handler / Server Action）用クライアント。
 * Cookie からセッションを読み取り、RLS 配下で操作する。
 *
 * Server Component から呼ぶ場合、Cookie の書き込みは許可されないため
 * setAll の例外を握りつぶす（セッション更新は middleware が担う）。
 */
export function createClient() {
  const cookieStore = cookies();
  const env = getPublicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component からの呼び出し。middleware がセッションを更新する。
          }
        },
      },
    },
  );
}

/**
 * service_role を用いた管理用クライアント（RLS をバイパス）。
 * 招待発行・監査ログ INSERT・通知配信などサーバー専用処理でのみ使用する。
 * 絶対にクライアントへ露出させないこと。
 */
export function createAdminClient() {
  const publicEnv = getPublicEnv();
  const serverEnv = getServerEnv();

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          // 管理用クライアントはセッションを持たない
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
