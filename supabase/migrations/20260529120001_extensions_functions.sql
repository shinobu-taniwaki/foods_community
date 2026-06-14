-- ============================================================
-- 0001 拡張機能と共通関数
-- 設計: .claude/plans/details/data-model.md §3
-- ============================================================

-- ============================================================
-- 拡張機能
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "citext";     -- 大文字小文字無視テキスト（メールアドレス用）
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- ILIKE 検索高速化（GIN trigram）

-- ============================================================
-- 共通: updated_at 自動更新トリガー関数
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  '更新時に updated_at を now() に書き換える共通トリガー関数';
