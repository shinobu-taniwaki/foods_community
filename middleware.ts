import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * 全リクエストで Supabase セッションを更新する。
 * 静的アセット・画像最適化・favicon・画像プロキシ(api/img) は除外（パフォーマンス）。
 * ※ api/img/ は拡張子の大小・有無に関わらず常にスキップ（認可は Route 側 RLS が担う）。
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!api/img/|_next/static|_next/image|favicon.ico|icon-.*\\.png|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
