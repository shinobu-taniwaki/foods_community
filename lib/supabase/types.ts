/**
 * Supabase スキーマの型定義。
 *
 * Phase 1 でマイグレーション適用後、以下で自動生成して置き換える:
 *   pnpm supabase gen types typescript --local > lib/supabase/types.gen.ts
 *
 * それまでは型チェックを通すための最小プレースホルダ。
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// 生成された型に置き換えるまでの暫定。任意テーブルへのアクセスを許可する。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
