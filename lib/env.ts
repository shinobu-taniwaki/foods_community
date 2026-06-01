import { z } from 'zod';

/**
 * 環境変数のスキーマ検証（システム境界でのバリデーション）。
 *
 * - クライアントに露出してよいのは NEXT_PUBLIC_ 接頭辞のみ。
 * - SERVICE_ROLE_KEY などの秘匿値はサーバー専用関数からのみ参照する。
 * - ビルド時に落とさないよう、参照時に遅延検証する方針。
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL は有効な URL である必要があります',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です'),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY が未設定です'),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

/**
 * クライアント／サーバー双方から参照可能な公開環境変数を検証して返す。
 * Next.js は NEXT_PUBLIC_ をビルド時にインライン展開するため明示参照する。
 */
export function getPublicEnv(): PublicEnv {
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `公開環境変数の検証に失敗しました: ${parsed.error.issues
        .map((i) => i.message)
        .join(', ')}`,
    );
  }

  return parsed.data;
}

/**
 * サーバー側（RSC / Server Action / middleware）から Supabase へ接続する URL を返す。
 *
 * Docker 等でコンテナ内サーバーとブラウザの到達先が異なる場合に使う:
 *   - ブラウザ:        NEXT_PUBLIC_SUPABASE_URL（例 http://localhost:54421）
 *   - コンテナ内サーバー: SUPABASE_INTERNAL_URL（例 http://host.docker.internal:54421）
 * SUPABASE_INTERNAL_URL が未設定なら公開 URL にフォールバックする。
 */
export function getServerSupabaseUrl(): string {
  const internal = process.env.SUPABASE_INTERNAL_URL?.trim();
  if (internal) {
    const parsed = z.string().url().safeParse(internal);
    if (!parsed.success) {
      throw new Error(
        'SUPABASE_INTERNAL_URL は有効な URL である必要があります',
      );
    }
    return parsed.data;
  }
  return getPublicEnv().NEXT_PUBLIC_SUPABASE_URL;
}

/**
 * サーバー専用の秘匿環境変数を検証して返す。
 * クライアントバンドルに含めないこと（'server-only' 境界で利用）。
 */
export function getServerEnv(): ServerEnv {
  const parsed = serverSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      `サーバー環境変数の検証に失敗しました: ${parsed.error.issues
        .map((i) => i.message)
        .join(', ')}`,
    );
  }

  return parsed.data;
}
