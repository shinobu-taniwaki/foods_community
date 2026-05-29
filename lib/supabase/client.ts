import { createBrowserClient } from '@supabase/ssr';
import { getPublicEnv } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

/**
 * ブラウザ（Client Component）用の Supabase クライアント。
 * anon key のみを使用し、アクセス制御は RLS で担保する。
 */
export function createClient() {
  const env = getPublicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
