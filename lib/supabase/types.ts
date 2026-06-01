/**
 * Supabase スキーマの型定義。
 *
 * 実体は `types.gen.ts`（`supabase gen types typescript --local` で生成）。
 * スキーマ変更時は以下で再生成する:
 *   pnpm supabase gen types typescript --local > lib/supabase/types.gen.ts
 */
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from './types.gen';
