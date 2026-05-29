-- ============================================================
-- 0002 テーブル定義（全 22 テーブル）
-- 設計: .claude/plans/details/data-model.md §4〜§10
--
-- 依存解決のため宣言順を「plans → profiles → product_genres → channels
-- → 残り」とする（FK 先のテーブルを先に作成）。
-- COMMENT と updated_at トリガーはテーブル直後に付与する。
-- ============================================================

-- ============================================================
-- マスタ: plans
-- ============================================================
CREATE TABLE public.plans (
  id              text         PRIMARY KEY,
  label           text         NOT NULL,
  price_amount    numeric(10,0) NOT NULL CHECK (price_amount >= 0),
  tax_included    boolean      NOT NULL DEFAULT true,
  display_price   text         NOT NULL,
  rank            integer      NOT NULL UNIQUE,
  description     text         NOT NULL DEFAULT '',
  features        jsonb        NOT NULL DEFAULT '[]'::jsonb,
  sort_order      integer      NOT NULL DEFAULT 0,
  is_active       boolean      NOT NULL DEFAULT true,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT plans_id_check CHECK (id IN ('trial','standard','premium'))
);

COMMENT ON TABLE  public.plans                  IS '料金プランのマスタ（ハードコード seed）';
COMMENT ON COLUMN public.plans.id               IS '''trial'' / ''standard'' / ''premium''';
COMMENT ON COLUMN public.plans.price_amount     IS '月額の数値（円・税込）';
COMMENT ON COLUMN public.plans.tax_included     IS '税込フラグ（MVP は全て true）';
COMMENT ON COLUMN public.plans.display_price    IS 'UI に表示する完全表記文字列（例: 「月額 25,000 円（税込）」）';
COMMENT ON COLUMN public.plans.rank             IS '権限比較用の数値（0=trial, 1=standard, 2=premium）';
COMMENT ON COLUMN public.plans.features         IS 'UI 表示用の機能リスト（jsonb 配列）';

CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 認証: profiles（auth.users と 1:1）
-- deleted_by / last_editor は自己参照 FK
-- ============================================================
CREATE TABLE public.profiles (
  id                  uuid         PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  display_name        text         NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 50),
  avatar              text         NOT NULL DEFAULT '🍅',
  avatar_image_path   text,
  bio                 text         CHECK (bio IS NULL OR char_length(bio) <= 500),
  store_name          text         NOT NULL DEFAULT '' CHECK (char_length(store_name) <= 100),
  region              text         NOT NULL DEFAULT '' CHECK (char_length(region) <= 100),
  product             text         NOT NULL DEFAULT '' CHECK (char_length(product) <= 200),
  store_description   text         CHECK (store_description IS NULL OR char_length(store_description) <= 1000),
  store_image_path    text,
  company_name        text,
  business_type       text,
  company_address     text,
  company_phone       text,
  website_url         text,
  social_links        jsonb        CHECK (social_links IS NULL OR jsonb_typeof(social_links) = 'object'),
  role                text         NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  plan                text         REFERENCES public.plans(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  status              text         NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','suspended','deleted','hard_deleted')),
  suspended_until     timestamptz,
  deleted_at          timestamptz,
  deleted_by          uuid         REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  deletion_reason     text,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  updated_at          timestamptz  NOT NULL DEFAULT now(),
  last_active_at      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT profiles_admin_has_no_plan CHECK (
    (role = 'admin' AND plan IS NULL) OR
    (role = 'member' AND plan IS NOT NULL)
  ),
  CONSTRAINT profiles_deleted_consistency CHECK (
    (status IN ('deleted','hard_deleted') AND deleted_at IS NOT NULL) OR
    (status NOT IN ('deleted','hard_deleted') AND deleted_at IS NULL)
  )
);

COMMENT ON TABLE  public.profiles                    IS 'ユーザープロフィール（auth.users と 1:1）';
COMMENT ON COLUMN public.profiles.id                 IS 'auth.users.id と同一の UUID';
COMMENT ON COLUMN public.profiles.avatar             IS 'デフォルトの絵文字アバター（画像未設定時に表示）';
COMMENT ON COLUMN public.profiles.avatar_image_path  IS 'Supabase Storage 内のパス（NULL なら絵文字を使用）';
COMMENT ON COLUMN public.profiles.social_links       IS '{"instagram":"...", "x":"...", "tiktok":"..."} 形式';
COMMENT ON COLUMN public.profiles.role               IS '''admin'' / ''member''';
COMMENT ON COLUMN public.profiles.plan               IS 'admin は NULL、member は plans.id を参照';
COMMENT ON COLUMN public.profiles.status             IS 'ライフサイクル状態 active/suspended/deleted/hard_deleted';
COMMENT ON COLUMN public.profiles.suspended_until    IS '一時停止解除予定時刻（NULL=無期限 or 停止中でない）';
COMMENT ON COLUMN public.profiles.last_active_at     IS '最終アクティビティ時刻（ログイン・API アクセス時に更新）';

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- マスタ: product_genres
-- ============================================================
CREATE TABLE public.product_genres (
  id            text         PRIMARY KEY,
  label         text         NOT NULL,
  icon_emoji    text         NOT NULL,
  description   text,
  sort_order    integer      NOT NULL DEFAULT 0,
  is_active     boolean      NOT NULL DEFAULT true,
  created_by    uuid         REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.product_genres            IS '販売ジャンルのマスタ（admin 管理）';
COMMENT ON COLUMN public.product_genres.id         IS '''vegetable'' / ''fruit'' などのスラッグ';
COMMENT ON COLUMN public.product_genres.icon_emoji IS '表示用絵文字（例: 🥬）';
COMMENT ON COLUMN public.product_genres.is_active  IS '論理削除フラグ';

CREATE TRIGGER trg_product_genres_updated_at
  BEFORE UPDATE ON public.product_genres
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- マスタ: channels
-- ============================================================
CREATE TABLE public.channels (
  id                    text         PRIMARY KEY,
  label                 text         NOT NULL,
  description           text,
  icon_emoji            text,
  color                 text         NOT NULL DEFAULT '#c05e3f',
  required_plan         text         NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  only_admin_can_post   boolean      NOT NULL DEFAULT false,
  trial_preview_count   integer      CHECK (trial_preview_count IS NULL OR trial_preview_count >= 0),
  sort_order            integer      NOT NULL DEFAULT 0,
  is_active             boolean      NOT NULL DEFAULT true,
  created_by            uuid         REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.channels                     IS '掲示板チャンネル マスタ（admin 管理）';
COMMENT ON COLUMN public.channels.required_plan       IS 'このチャンネルを閲覧/投稿するのに必要な最低プラン';
COMMENT ON COLUMN public.channels.only_admin_can_post IS 'true の場合 admin のみ投稿可（運営からのアドバイス用）';
COMMENT ON COLUMN public.channels.trial_preview_count IS 'trial プランで閲覧可能な最新件数（NULL=全件 or 非表示）';
COMMENT ON COLUMN public.channels.color               IS 'UI 表示色（HEX）';

CREATE TRIGGER trg_channels_updated_at
  BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 認証: profile_product_genres（多対多、最大5個はトリガーで担保）
-- ============================================================
CREATE TABLE public.profile_product_genres (
  profile_id   uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  genre_id     text         NOT NULL REFERENCES public.product_genres(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, genre_id)
);

COMMENT ON TABLE public.profile_product_genres IS 'ユーザーと販売ジャンルの多対多（最大5個／ユーザー、トリガーで制約）';

-- ============================================================
-- 認証: invitations
-- ============================================================
CREATE TABLE public.invitations (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  email        citext       NOT NULL,
  token        text         NOT NULL UNIQUE CHECK (char_length(token) = 64),
  plan         text         NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  invited_by   uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  expires_at   timestamptz  NOT NULL,
  accepted_at  timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT invitations_expires_after_created CHECK (expires_at > created_at)
);

COMMENT ON TABLE  public.invitations             IS '招待トークン（7日有効、使い回し不可）';
COMMENT ON COLUMN public.invitations.email       IS '招待先メールアドレス（大文字小文字無視・citext）';
COMMENT ON COLUMN public.invitations.token       IS '64文字ランダム文字列';
COMMENT ON COLUMN public.invitations.plan        IS '招待時点で付与するプラン';
COMMENT ON COLUMN public.invitations.invited_by  IS '招待を発行した admin の profiles.id';
COMMENT ON COLUMN public.invitations.expires_at  IS '有効期限（通常 created_at + 7day）';
COMMENT ON COLUMN public.invitations.accepted_at IS 'NULL なら未受諾、値があれば受諾済み';
COMMENT ON COLUMN public.invitations.revoked_at  IS '取消時刻（NULL なら有効）';

-- 受諾済みでない招待のメール重複を防ぐ（部分 UNIQUE）
CREATE UNIQUE INDEX uniq_invitations_email_pending
  ON public.invitations (email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- ============================================================
-- コンテンツ（お知らせ）: contents
-- ============================================================
CREATE TABLE public.contents (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  category        text         NOT NULL CHECK (category IN ('important','news','column','seminar')),
  title           text         NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body            text         NOT NULL CHECK (char_length(body) <= 10000),
  pinned          boolean      NOT NULL DEFAULT false,
  required_plan   text         REFERENCES public.plans(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  status          text         NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at    timestamptz,
  last_edited_at  timestamptz,
  last_editor_id  uuid         REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT contents_published_has_date CHECK (
    (status = 'draft') OR (status = 'published' AND published_at IS NOT NULL)
  )
);

COMMENT ON TABLE  public.contents               IS 'お知らせ（admin 発信、4カテゴリ）';
COMMENT ON COLUMN public.contents.author_id     IS '発信者（必ず admin。アプリ層と RLS で担保）';
COMMENT ON COLUMN public.contents.category      IS 'important / news / column / seminar';
COMMENT ON COLUMN public.contents.required_plan IS 'NULL=全員 / ''standard''=Pro 限定';
COMMENT ON COLUMN public.contents.pinned        IS 'ピン留め（無期限、admin が手動解除）';
COMMENT ON COLUMN public.contents.deleted_at    IS '論理削除フラグ';

CREATE TRIGGER trg_contents_updated_at
  BEFORE UPDATE ON public.contents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- コンテンツ: content_attachments
-- ============================================================
CREATE TABLE public.content_attachments (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id          uuid         NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  attachment_type     text         NOT NULL CHECK (attachment_type IN ('image','video_embed')),
  storage_path        text,
  external_url        text,
  external_provider   text         CHECK (external_provider IS NULL OR external_provider IN ('youtube')),
  video_id            text         CHECK (video_id IS NULL OR video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  thumbnail_url       text,
  caption             text         CHECK (caption IS NULL OR char_length(caption) <= 200),
  display_order       integer      NOT NULL DEFAULT 0,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT content_attachments_kind_consistency CHECK (
    (attachment_type = 'image'       AND storage_path IS NOT NULL AND external_url IS NULL) OR
    (attachment_type = 'video_embed' AND external_url IS NOT NULL AND storage_path IS NULL AND video_id IS NOT NULL)
  )
);

COMMENT ON TABLE  public.content_attachments                  IS 'お知らせの画像・YouTube 動画添付';
COMMENT ON COLUMN public.content_attachments.attachment_type  IS '''image'' / ''video_embed''';
COMMENT ON COLUMN public.content_attachments.storage_path     IS 'image 時の Supabase Storage パス';
COMMENT ON COLUMN public.content_attachments.external_url     IS 'video_embed 時の YouTube URL';
COMMENT ON COLUMN public.content_attachments.video_id         IS 'YouTube 動画 ID（英数字＋ハイフン＋アンダースコア）';

-- ============================================================
-- コンテンツ: content_likes
-- ============================================================
CREATE TABLE public.content_likes (
  content_id  uuid         NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id     uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (content_id, user_id)
);

COMMENT ON TABLE public.content_likes IS 'お知らせへのいいね（PK=複合主キー）';

-- ============================================================
-- コンテンツ: content_comments
-- ============================================================
CREATE TABLE public.content_comments (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id      uuid         NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE ON UPDATE CASCADE,
  author_id       uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  body            text         NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  last_edited_at  timestamptz,
  deleted_at      timestamptz
);

COMMENT ON TABLE public.content_comments IS 'お知らせへのコメント（最大 1000 文字、論理削除）';

CREATE TRIGGER trg_content_comments_updated_at
  BEFORE UPDATE ON public.content_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 掲示板: posts
-- ============================================================
CREATE TABLE public.posts (
  id                uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id         uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  channel_id        text         NOT NULL REFERENCES public.channels(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  title             text         NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
  content           text         NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now(),
  last_edited_at    timestamptz,
  last_editor_id    uuid         REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  edited_by_admin   boolean      NOT NULL DEFAULT false,
  deleted_at        timestamptz,
  deleted_by        uuid         REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE
);

COMMENT ON TABLE  public.posts                  IS '掲示板投稿（タイトル100 / 本文5000 文字、論理削除）';
COMMENT ON COLUMN public.posts.channel_id       IS '所属チャンネル（必須・単一）';
COMMENT ON COLUMN public.posts.edited_by_admin  IS 'admin による編集が行われた場合 true（UI に「※運営により編集」表示）';
COMMENT ON COLUMN public.posts.deleted_at       IS '論理削除時刻（NULL なら有効）';
COMMENT ON COLUMN public.posts.deleted_by       IS '削除を行ったユーザー（admin or 著者本人）';

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 掲示板: post_attachments
-- ============================================================
CREATE TABLE public.post_attachments (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id             uuid         NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  attachment_type     text         NOT NULL CHECK (attachment_type IN ('image','video_embed')),
  storage_path        text,
  external_url        text,
  external_provider   text         CHECK (external_provider IS NULL OR external_provider IN ('youtube')),
  video_id            text         CHECK (video_id IS NULL OR video_id ~ '^[A-Za-z0-9_-]{6,20}$'),
  thumbnail_url       text,
  caption             text         CHECK (caption IS NULL OR char_length(caption) <= 200),
  display_order       integer      NOT NULL DEFAULT 0,
  created_at          timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT post_attachments_kind_consistency CHECK (
    (attachment_type = 'image'       AND storage_path IS NOT NULL AND external_url IS NULL) OR
    (attachment_type = 'video_embed' AND external_url IS NOT NULL AND storage_path IS NULL AND video_id IS NOT NULL)
  )
);

COMMENT ON TABLE public.post_attachments IS '投稿の画像（最大3枚）・YouTube 動画（最大1個、admin のみ）添付';

-- ============================================================
-- 掲示板: post_likes
-- ============================================================
CREATE TABLE public.post_likes (
  post_id     uuid         NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  user_id     uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

COMMENT ON TABLE public.post_likes IS '投稿へのいいね（PK=複合主キー）';

-- ============================================================
-- 掲示板: post_comments
-- ============================================================
CREATE TABLE public.post_comments (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id         uuid         NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  author_id       uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  body            text         NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  last_edited_at  timestamptz,
  deleted_at      timestamptz
);

COMMENT ON TABLE public.post_comments IS '投稿へのコメント（最大 1000 文字、論理削除）';

CREATE TRIGGER trg_post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 掲示板: post_tags
-- ============================================================
CREATE TABLE public.post_tags (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text         NOT NULL CHECK (char_length(label) BETWEEN 1 AND 50),
  slug          text         NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9_-]+$' AND char_length(slug) BETWEEN 1 AND 50),
  description   text         CHECK (description IS NULL OR char_length(description) <= 200),
  usage_count   integer      NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  created_by    uuid         REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  is_active     boolean      NOT NULL DEFAULT true,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.post_tags             IS '投稿タグのマスタ（member も作成可、admin が整理）';
COMMENT ON COLUMN public.post_tags.label       IS '表示用ラベル（表記そのまま、例: 「LINE公式」）';
COMMENT ON COLUMN public.post_tags.slug        IS '正規化スラッグ（半角小文字・英数記号、UNIQUE）';
COMMENT ON COLUMN public.post_tags.usage_count IS 'キャッシュされた使用回数（トリガーで更新）';
COMMENT ON COLUMN public.post_tags.is_active   IS '論理削除フラグ';

CREATE TRIGGER trg_post_tags_updated_at
  BEFORE UPDATE ON public.post_tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 掲示板: post_tag_assignments（多対多、最大5個／投稿はトリガーで担保）
-- ============================================================
CREATE TABLE public.post_tag_assignments (
  post_id     uuid         NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
  tag_id      uuid         NOT NULL REFERENCES public.post_tags(id) ON DELETE CASCADE ON UPDATE CASCADE,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, tag_id)
);

COMMENT ON TABLE public.post_tag_assignments IS '投稿とタグの多対多（最大 5 個／投稿、トリガーで制約）';

-- ============================================================
-- 月次データ: sales_reports
-- ============================================================
CREATE TABLE public.sales_reports (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id          uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  month              text         NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  sales              numeric(14,2) NOT NULL CHECK (sales >= 0),
  sales_target       numeric(14,2) NOT NULL CHECK (sales_target >= 0),
  achievement_rate   numeric(10,2) GENERATED ALWAYS AS (
                       CASE
                         WHEN sales_target IS NULL OR sales_target = 0 THEN NULL
                         ELSE round((sales / sales_target) * 100, 2)
                       END
                     ) STORED,
  initiatives_count  integer      NOT NULL DEFAULT 0 CHECK (initiatives_count >= 0),
  note               text         CHECK (note IS NULL OR char_length(note) <= 2000),
  image_path         text,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT sales_reports_unique_author_month UNIQUE (author_id, month)
);

COMMENT ON TABLE  public.sales_reports                  IS '月次売上報告（standard 以上）';
COMMENT ON COLUMN public.sales_reports.month            IS '''YYYY-MM'' 形式（例: ''2026-05''）';
COMMENT ON COLUMN public.sales_reports.achievement_rate IS '達成率（%）: sales / sales_target * 100、target=0 は NULL';
COMMENT ON COLUMN public.sales_reports.initiatives_count IS '当月実施した施策数';

CREATE TRIGGER trg_sales_reports_updated_at
  BEFORE UPDATE ON public.sales_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 月次データ: kpi_reports
-- ============================================================
CREATE TABLE public.kpi_reports (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  month         text         NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  kpi_name      text         NOT NULL CHECK (char_length(kpi_name) BETWEEN 1 AND 100),
  before_value  numeric(14,4) NOT NULL,
  after_value   numeric(14,4) NOT NULL,
  unit          text         NOT NULL CHECK (unit IN ('%','件','円','人','回')),
  change_rate   numeric(10,2) GENERATED ALWAYS AS (
                  CASE
                    WHEN before_value IS NULL OR before_value = 0 THEN NULL
                    ELSE round(((after_value - before_value) / before_value) * 100, 2)
                  END
                ) STORED,
  note          text         CHECK (note IS NULL OR char_length(note) <= 2000),
  image_path    text,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT kpi_reports_unique_author_month_kpi UNIQUE (author_id, month, kpi_name)
);

COMMENT ON TABLE  public.kpi_reports             IS '月次 KPI 改善報告（standard 以上）';
COMMENT ON COLUMN public.kpi_reports.kpi_name    IS '改善した KPI 名（例: ''LINE開封率''）';
COMMENT ON COLUMN public.kpi_reports.change_rate IS '改善率（%）: (after - before) / before * 100、before=0 は NULL';
COMMENT ON COLUMN public.kpi_reports.unit        IS '''%'' / ''件'' / ''円'' / ''人'' / ''回''';

CREATE TRIGGER trg_kpi_reports_updated_at
  BEFORE UPDATE ON public.kpi_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 月次データ: cpa_reports
-- ============================================================
CREATE TABLE public.cpa_reports (
  id              uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id       uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  month           text         NOT NULL CHECK (month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  campaign_name   text         NOT NULL CHECK (char_length(campaign_name) BETWEEN 1 AND 100),
  cost            numeric(14,2) NOT NULL CHECK (cost >= 0),
  conversions     integer      NOT NULL CHECK (conversions >= 0),
  cpa             numeric(14,2) GENERATED ALWAYS AS (
                    CASE
                      WHEN conversions IS NULL OR conversions = 0 THEN NULL
                      ELSE round(cost / conversions, 2)
                    END
                  ) STORED,
  note            text         CHECK (note IS NULL OR char_length(note) <= 2000),
  image_path      text,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT cpa_reports_unique_author_month_campaign UNIQUE (author_id, month, campaign_name)
);

COMMENT ON TABLE  public.cpa_reports               IS '月次 施策 CPA 報告（standard 以上）';
COMMENT ON COLUMN public.cpa_reports.campaign_name IS '施策名（例: ''LINE 友だち追加キャンペーン''）';
COMMENT ON COLUMN public.cpa_reports.cpa           IS 'CPA（円）: cost / conversions、conversions=0 は NULL';

CREATE TRIGGER trg_cpa_reports_updated_at
  BEFORE UPDATE ON public.cpa_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 通知: notifications
-- ============================================================
CREATE TABLE public.notifications (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id  uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  type          text         NOT NULL CHECK (type IN (
                  'new_post',
                  'new_announcement',
                  'comment_on_my_post',
                  'like_on_my_post',
                  'admin_broadcast',
                  'account_suspended',
                  'account_deleted',
                  'account_restored',
                  'post_edited_by_admin',
                  'post_deleted_by_admin'
                )),
  title         text         NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body          text         NOT NULL DEFAULT '' CHECK (char_length(body) <= 2000),
  link_path     text         NOT NULL DEFAULT '/',
  actor_id      uuid         REFERENCES public.profiles(id) ON DELETE SET NULL ON UPDATE CASCADE,
  read_at       timestamptz,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.notifications              IS '通知（既読 30 日経過で日次バッチ削除、未読は無期限）';
COMMENT ON COLUMN public.notifications.recipient_id IS '通知の受信者';
COMMENT ON COLUMN public.notifications.actor_id     IS '通知を発生させたユーザー（NULL=システム）';
COMMENT ON COLUMN public.notifications.link_path    IS 'タップ時の遷移先パス（例: ''/feed/<uuid>''）';
COMMENT ON COLUMN public.notifications.read_at      IS '既読時刻（NULL=未読）';

-- ============================================================
-- 通知: notification_preferences
-- ============================================================
CREATE TABLE public.notification_preferences (
  user_id              uuid         PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
  new_post             boolean      NOT NULL DEFAULT true,
  new_announcement     boolean      NOT NULL DEFAULT true,
  comment_on_my_post   boolean      NOT NULL DEFAULT true,
  like_on_my_post      boolean      NOT NULL DEFAULT false,
  admin_broadcast      boolean      NOT NULL DEFAULT true,
  updated_at           timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.notification_preferences                    IS 'ユーザーごとの通知 ON/OFF 設定';
COMMENT ON COLUMN public.notification_preferences.like_on_my_post    IS 'デフォルト OFF（うるさくならないように）';
COMMENT ON COLUMN public.notification_preferences.admin_broadcast    IS 'UI 上で OFF 不可（運営からの全体通知は強制 ON）';

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 監査ログ: audit_logs（INSERT only、UPDATE/DELETE はトリガー+RLS で禁止）
-- ============================================================
CREATE TABLE public.audit_logs (
  id            uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  action_type   text         NOT NULL CHECK (action_type IN (
                  'user_suspended', 'user_deleted', 'user_restored',
                  'user_plan_changed',
                  'post_edited_by_admin', 'post_deleted_by_admin',
                  'content_deleted_by_admin',
                  'invitation_created', 'invitation_revoked', 'invitation_resent',
                  'channel_created', 'channel_updated', 'channel_deleted',
                  'product_genre_created', 'product_genre_updated', 'product_genre_deleted',
                  'post_tag_created', 'post_tag_merged', 'post_tag_deleted',
                  'broadcast_sent',
                  'email_changed', 'password_changed'
                )),
  target_type   text         NOT NULL CHECK (target_type IN (
                  'profile','post','content','invitation','channel','product_genre','post_tag','broadcast','auth'
                )),
  target_id     uuid,
  payload       jsonb        NOT NULL DEFAULT '{}'::jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz  NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.audit_logs              IS '監査ログ（INSERT only、UPDATE/DELETE 不可、無期限保持）';
COMMENT ON COLUMN public.audit_logs.actor_id     IS '操作を実行した admin の profiles.id';
COMMENT ON COLUMN public.audit_logs.action_type  IS '操作種別（user_suspended など）';
COMMENT ON COLUMN public.audit_logs.target_type  IS '対象リソース種別';
COMMENT ON COLUMN public.audit_logs.target_id    IS '対象リソースの UUID（target_type が ''auth'' の場合 NULL 可）';
COMMENT ON COLUMN public.audit_logs.payload      IS '変更前後の値や理由（{"before":{...},"after":{...},"reason":"..."}）';
