import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * 全リクエストで Supabase セッションを更新する。
 * 静的アセット・画像最適化・favicon は除外（パフォーマンス）。
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
