-- ============================================================
-- 0005 Storage バケットとアクセスポリシー（Phase 1）
-- 設計: data-model/§12（パス命名 {bucket}/{user_id}/{purpose}/{uuid}.ext）
--       api-endpoints.md §9（用途別サイズ上限・マジックバイト検証はアプリ層）
--
-- バケットは private。閲覧は Signed URL or 認証ユーザーの SELECT で行う。
-- 書き込みは「自分のフォルダ（先頭セグメント = auth.uid()）」に限定。
-- ============================================================

-- ============================================================
-- バケット作成（avatars / stores / contents）
-- allowed_mime_types で画像 3 形式に限定（拡張子偽装はアプリ層でマジックバイト検証）
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars',  'avatars',  false,  512000,  ARRAY['image/jpeg','image/png','image/webp']),
  ('stores',   'stores',   false, 1572864,  ARRAY['image/jpeg','image/png','image/webp']),
  ('contents', 'contents', false, 2097152,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- avatars: 自分のフォルダのみ書込、閲覧は認証ユーザー全員
-- ============================================================
CREATE POLICY avatars_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY avatars_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY avatars_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY avatars_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- ============================================================
-- stores: avatars と同方針
-- ============================================================
CREATE POLICY stores_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'stores');

CREATE POLICY stores_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'stores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY stores_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'stores'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY stores_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'stores'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_admin())
  );

-- ============================================================
-- contents（お知らせ画像）: 書込は admin のみ、閲覧は認証ユーザー全員
-- ============================================================
CREATE POLICY contents_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contents');

CREATE POLICY contents_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contents'
    AND public.is_admin()
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY contents_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'contents' AND public.is_admin());

CREATE POLICY contents_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contents' AND public.is_admin());
