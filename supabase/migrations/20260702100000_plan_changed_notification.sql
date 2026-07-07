-- ============================================================
-- plan_changed 通知の追加（notifications-and-emails.md §1.14）
--
-- admin がプランを変更した際、本人に「プランが変更されました」を届ける。
-- OFF 不可のシステム通知のため notification_preferences に列は追加しない。
-- ============================================================

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'new_post',
    'new_announcement',
    'comment_on_my_post',
    'like_on_my_post',
    'admin_broadcast',
    'account_suspended',
    'account_deleted',
    'account_restored',
    'post_edited_by_admin',
    'post_deleted_by_admin',
    'plan_changed'
  ));
