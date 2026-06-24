import { type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isImageBucket } from '@/lib/storage';

// スニッフィング対策: 反射してよい Content-Type は画像3形式のみ（バケットの allowed_mime_types と一致）
const ALLOWED_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * 画像配信プロキシ（single-domain-image-proxy.md §3）。
 *
 * ブラウザは Supabase(Kong) に直接アクセスせず、このエンドポイント経由で画像を取得する。
 * これにより外部公開ドメインは marketing-camp.jp の1つだけで済む（api. サブドメイン不要）。
 *
 * 認可は Storage RLS（SELECT TO authenticated）に一元化する。
 * ユーザーセッションのまま download するため、未ログイン・権限なしは RLS が弾く。
 * service_role（createAdminClient）は使わない。
 *
 * URL 形: /api/img/<bucket>/<storagePath...>（middleware は api/img/ を除外しセッション更新を回避）。
 * キャッシュ: 認証必須リソースのため private, no-cache（毎回再検証）。storage_path は不変なので
 *   ETag を付け、未変更なら 304 で本文転送を省く。ログアウト後は download 失敗で 404 になり再利用されない。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } },
): Promise<Response> {
  const segments = params.path ?? [];
  // 最低 bucket + 1 セグメント（storagePath）が必要
  if (segments.length < 2) {
    return new Response('Not Found', { status: 404 });
  }

  const [bucket, ...rest] = segments;
  if (!bucket || !isImageBucket(bucket)) {
    return new Response('Bad Request', { status: 400 });
  }

  // パストラバーサル防止: 各セグメントに空・"."・".." を許さない
  if (rest.some((seg) => seg === '' || seg === '.' || seg === '..')) {
    return new Response('Bad Request', { status: 400 });
  }
  const storagePath = rest.join('/');

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .download(storagePath);

  if (error || !data) {
    // 秘匿のためレスポンスは一律 404。サーバー側のみ詳細を記録（規約: エラーを握りつぶさない）。
    console.error('[img-proxy] download failed', {
      bucket,
      error: error?.message,
    });
    return new Response('Not Found', { status: 404 });
  }

  // Content-Type は許可 MIME のみ反射（Nginx 非依存の多層防御）
  const contentType = ALLOWED_CONTENT_TYPES.has(data.type)
    ? data.type
    : 'application/octet-stream';

  // storage_path（UUID 命名で不変）を ETag に使う
  const etag = `"${bucket}/${storagePath}"`;
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Disposition': 'inline',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'private, no-cache',
    ETag: etag,
  };

  // 認可（download）を毎回通した上で、未変更なら本文転送を省く
  if (request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(data, { headers });
}
