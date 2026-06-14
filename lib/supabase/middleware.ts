import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getPublicEnv, getServerSupabaseUrl } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * リクエストごとに Supabase セッションを更新する（middleware から呼ぶ）。
 * Cookie のローテーションを行い、認証状態を最新に保つ。
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const env = getPublicEnv();

  const supabase = createServerClient<Database>(
    getServerSupabaseUrl(),
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() を呼ぶことでトークンを検証・更新する（getSession より安全）
  await supabase.auth.getUser();

  return supabaseResponse;
}
