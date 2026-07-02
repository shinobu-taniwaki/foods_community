-- ============================================================
-- 通知バッジのリアルタイム更新（dev-phases §3.5.3）
--
-- notifications テーブルを supabase_realtime publication に追加し、
-- クライアントが postgres_changes を購読できるようにする。
-- RLS（recipient_id = auth.uid() の SELECT ポリシー）が Realtime にも
-- 適用されるため、本人宛の変更イベントのみ配信される。
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
