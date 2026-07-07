-- ============================================================
-- 掲示板投稿の画像添付用バケット（設計書 §11 / single-domain-image-proxy.md）
--
-- avatars / stores と同方針:
--   - private バケット・画像3形式・2MB 上限
--   - 書込は自分のフォルダ（パス先頭 = auth.uid()）のみ
--   - 閲覧は認証ユーザー全員（配信はアプリの /api/img プロキシ経由）
--   - 削除は本人 または admin
-- 添付枚数の上限（3枚）はアプリ層（createPost）で検証する。
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('posts', 'posts', false, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY posts_bucket_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'posts');

CREATE POLICY posts_bucket_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY posts_bucket_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'posts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY posts_bucket_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'posts'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );
