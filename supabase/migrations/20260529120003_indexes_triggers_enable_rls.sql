-- ============================================================
-- 0003 インデックス・業務トリガー・RLS 有効化
-- 設計: .claude/plans/details/data-model.md §11 §12
-- ============================================================

-- ============================================================
-- §11 インデックス定義
-- ============================================================

-- ===== profiles =====
CREATE INDEX idx_profiles_status            ON public.profiles (status);
CREATE INDEX idx_profiles_role_status       ON public.profiles (role, status);
CREATE INDEX idx_profiles_plan              ON public.profiles (plan) WHERE plan IS NOT NULL;
CREATE INDEX idx_profiles_last_active_at    ON public.profiles (last_active_at DESC);

-- ===== invitations =====
CREATE INDEX idx_invitations_invited_by     ON public.invitations (invited_by);
CREATE INDEX idx_invitations_expires_at     ON public.invitations (expires_at);

-- ===== profile_product_genres =====
CREATE INDEX idx_ppg_genre_id               ON public.profile_product_genres (genre_id);

-- ===== contents =====
CREATE INDEX idx_contents_published         ON public.contents (status, published_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX idx_contents_category          ON public.contents (category, published_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_pinned            ON public.contents (pinned, published_at DESC)
  WHERE pinned = true AND deleted_at IS NULL;
CREATE INDEX idx_contents_author            ON public.contents (author_id);

-- ===== content_attachments / comments =====
CREATE INDEX idx_content_attachments_cid    ON public.content_attachments (content_id, display_order);
CREATE INDEX idx_content_comments_cid       ON public.content_comments (content_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ===== posts =====
CREATE INDEX idx_posts_channel_created      ON public.posts (channel_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_author               ON public.posts (author_id, created_at DESC);
CREATE INDEX idx_posts_created_at           ON public.posts (created_at DESC)
  WHERE deleted_at IS NULL;

-- ===== post_attachments / comments / likes =====
CREATE INDEX idx_post_attachments_pid       ON public.post_attachments (post_id, display_order);
CREATE INDEX idx_post_comments_pid          ON public.post_comments (post_id, created_at DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_post_likes_user            ON public.post_likes (user_id);

-- ===== post_tags / assignments =====
CREATE INDEX idx_post_tags_usage_count      ON public.post_tags (usage_count DESC)
  WHERE is_active = true;
CREATE INDEX idx_post_tag_assignments_tag   ON public.post_tag_assignments (tag_id);

-- ===== sales / kpi / cpa reports =====
CREATE INDEX idx_sales_reports_author_month ON public.sales_reports (author_id, month DESC);
CREATE INDEX idx_kpi_reports_author_month   ON public.kpi_reports   (author_id, month DESC);
CREATE INDEX idx_cpa_reports_author_month   ON public.cpa_reports   (author_id, month DESC);

-- ===== notifications =====
CREATE INDEX idx_notifications_recipient_unread
  ON public.notifications (recipient_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX idx_notifications_recipient_all
  ON public.notifications (recipient_id, created_at DESC);

-- ===== audit_logs =====
CREATE INDEX idx_audit_logs_actor           ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX idx_audit_logs_action_type     ON public.audit_logs (action_type, created_at DESC);
CREATE INDEX idx_audit_logs_target          ON public.audit_logs (target_type, target_id);

-- ===== ILIKE 検索高速化（pg_trgm。拡張は 0001 で作成済み）=====
CREATE INDEX idx_posts_title_trgm    ON public.posts    USING gin (title gin_trgm_ops)   WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_content_trgm  ON public.posts    USING gin (content gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_title_trgm ON public.contents USING gin (title gin_trgm_ops)   WHERE deleted_at IS NULL;
CREATE INDEX idx_contents_body_trgm  ON public.contents USING gin (body  gin_trgm_ops)   WHERE deleted_at IS NULL;
CREATE INDEX idx_post_tags_label_trgm ON public.post_tags USING gin (label gin_trgm_ops) WHERE is_active = true;

-- ============================================================
-- §12.1 post_tags.usage_count の自動更新
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_post_tag_usage_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.post_tags
       SET usage_count = usage_count + 1
     WHERE id = NEW.tag_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.post_tags
       SET usage_count = GREATEST(usage_count - 1, 0)
     WHERE id = OLD.tag_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.update_post_tag_usage_count() IS
  'post_tag_assignments の INSERT/DELETE に応じて post_tags.usage_count を増減する';

CREATE TRIGGER trg_post_tag_assignments_count
  AFTER INSERT OR DELETE ON public.post_tag_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_post_tag_usage_count();

-- ============================================================
-- §12.2 投稿あたりタグ最大 5 個の制約
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_post_tags_max()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.post_tag_assignments
   WHERE post_id = NEW.post_id;
  IF v_count >= 5 THEN
    RAISE EXCEPTION '1 投稿あたりのタグ数は最大 5 個までです（post_id=%）', NEW.post_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_post_tag_assignments_max
  BEFORE INSERT ON public.post_tag_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_post_tags_max();

-- ============================================================
-- §12.3 プロフィールあたり販売ジャンル最大 5 個の制約
-- ============================================================
CREATE OR REPLACE FUNCTION public.enforce_profile_genres_max()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
    FROM public.profile_product_genres
   WHERE profile_id = NEW.profile_id;
  IF v_count >= 5 THEN
    RAISE EXCEPTION '1 ユーザーあたりの販売ジャンルは最大 5 個までです（profile_id=%）', NEW.profile_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profile_product_genres_max
  BEFORE INSERT ON public.profile_product_genres
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_genres_max();

-- ============================================================
-- §12.4 profiles.last_active_at の更新ヘルパー
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_last_active(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
     SET last_active_at = now()
   WHERE id = p_user_id;
$$;

COMMENT ON FUNCTION public.touch_last_active(uuid) IS
  'API 呼び出しごとにアプリ層から呼んで profiles.last_active_at を更新する';

-- ============================================================
-- §12.5 監査ログの UPDATE/DELETE 禁止トリガー
-- RLS で十分カバーできるが、誤操作（service_role 経由）を二重で防ぐ。
-- ============================================================
CREATE OR REPLACE FUNCTION public.forbid_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs は INSERT only です';
END;
$$;

CREATE TRIGGER trg_audit_logs_no_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.forbid_audit_log_mutation();

CREATE TRIGGER trg_audit_logs_no_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.forbid_audit_log_mutation();

-- ============================================================
-- §12.6 RLS 有効化（ポリシー本体は 0004 で定義）
-- ============================================================
ALTER TABLE public.plans                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_genres          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_product_genres  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_attachments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_likes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_attachments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tag_assignments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpa_reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs              ENABLE ROW LEVEL SECURITY;
