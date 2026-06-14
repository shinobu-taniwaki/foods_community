-- =============================================================================
-- RLS ポリシーおよびヘルパー関数
-- rls-policies.md から転記。設計の正典は同ドキュメント。
-- 対象: .claude/plans/details/rls-policies.md
-- 前提: テーブル作成と ENABLE ROW LEVEL SECURITY は別マイグレーション（0001〜0003）で適用済み
-- =============================================================================


-- =============================================================================
-- Section 2: 共通ヘルパー関数
-- =============================================================================

-- =========================================================================
-- 2.1 現在認証中のユーザー ID（auth.uid() の薄いラッパー）
-- =========================================================================
CREATE OR REPLACE FUNCTION public.current_user_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT auth.uid();
$$;

COMMENT ON FUNCTION public.current_user_id() IS
  '現在認証中のユーザー ID を返す。未認証の場合は NULL。';


-- =========================================================================
-- 2.2 現在のユーザーが admin か
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND p.status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  '現在のユーザーが active かつ admin ロールであるかを返す。';


-- =========================================================================
-- 2.3 現在のユーザーの status を返す
-- =========================================================================
CREATE OR REPLACE FUNCTION public.current_status()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT p.status
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

COMMENT ON FUNCTION public.current_status() IS
  '現在のユーザーの profiles.status を返す。未登録は NULL。';


-- =========================================================================
-- 2.4 現在のユーザーが active メンバーまたは admin か
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_active_member()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('admin', 'member')
  );
$$;

COMMENT ON FUNCTION public.is_active_member() IS
  'active 状態のメンバーまたは admin であるかを返す。閲覧系ポリシーの起点。';


-- =========================================================================
-- 2.5 現在のユーザーの plan rank を返す
--   admin は plan NULL のため、内部的に 999（事実上の最高 rank）を返す
-- =========================================================================
CREATE OR REPLACE FUNCTION public.current_plan_rank()
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT CASE
           WHEN p.role = 'admin' THEN 999
           ELSE COALESCE(pl.rank, -1)
         END
  FROM public.profiles p
  LEFT JOIN public.plans pl ON pl.id = p.plan
  WHERE p.id = auth.uid();
$$;

COMMENT ON FUNCTION public.current_plan_rank() IS
  '現在のユーザーのプラン rank を返す。admin は 999、未認証/未登録は -1。';


-- =========================================================================
-- 2.6 現在のユーザーが standard 以上（rank >= 1）か
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_standard_or_higher()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT public.current_plan_rank() >= 1;
$$;

COMMENT ON FUNCTION public.is_standard_or_higher() IS
  'standard / premium / admin かを返す（投稿・コメント・データ入力の権限境界）。';


-- =========================================================================
-- 2.7 任意のプロフィール ID が active かを返す
--   投稿者・コメント主が active であることを確認する用途
-- =========================================================================
CREATE OR REPLACE FUNCTION public.is_profile_active(profile_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = profile_id
      AND p.status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_profile_active(uuid) IS
  '指定 profile が active か。退会者・停止者の投稿を非表示にするために使用。';


-- =========================================================================
-- 2.8 指定チャンネルの required_plan rank を返す
-- =========================================================================
CREATE OR REPLACE FUNCTION public.channel_required_rank(channel_id text)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT COALESCE(pl.rank, 0)
  FROM public.channels c
  LEFT JOIN public.plans pl ON pl.id = c.required_plan
  WHERE c.id = channel_id
    AND c.is_active = true;
$$;

COMMENT ON FUNCTION public.channel_required_rank(text) IS
  'チャンネルの required_plan に対応する rank を返す。is_active=false のチャンネルは無効として扱う。';


-- =========================================================================
-- 2.9 指定チャンネルが only_admin_can_post か
-- =========================================================================
CREATE OR REPLACE FUNCTION public.channel_only_admin_can_post(channel_id text)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT COALESCE(c.only_admin_can_post, false)
  FROM public.channels c
  WHERE c.id = channel_id
    AND c.is_active = true;
$$;

COMMENT ON FUNCTION public.channel_only_admin_can_post(text) IS
  '指定チャンネルが admin 専用投稿かを返す。';


-- =========================================================================
-- 2.10 plan ID から rank を引く（汎用）
-- =========================================================================
CREATE OR REPLACE FUNCTION public.plan_rank(plan_id text)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT rank FROM public.plans WHERE id = plan_id AND is_active = true;
$$;

COMMENT ON FUNCTION public.plan_rank(text) IS
  '指定プラン ID の rank を返す。is_active=false のプランは無効として NULL を返す。';


-- =========================================================================
-- 2.11 関数の GRANT
-- =========================================================================
-- 認証済みユーザーから呼び出し可能にする
GRANT EXECUTE ON FUNCTION public.current_user_id()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_status()              TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_member()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_plan_rank()           TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_standard_or_higher()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_profile_active(uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.channel_required_rank(text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.channel_only_admin_can_post(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plan_rank(text)               TO authenticated;


-- =============================================================================
-- Section 6.4: BEFORE UPDATE トリガー（profiles 管理フィールド保護）
-- rls-policies.md §6.4 に定義。RLS ポリシーと一体の保護機構のためここに含める。
-- =============================================================================
CREATE OR REPLACE FUNCTION public.profiles_protect_admin_fields()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, auth
AS $$
BEGIN
  -- admin による更新は何でも許可
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- 本人による更新では以下のフィールドの変更を拒否
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.plan IS DISTINCT FROM OLD.plan
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.suspended_until IS DISTINCT FROM OLD.suspended_until
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by
     OR NEW.deletion_reason IS DISTINCT FROM OLD.deletion_reason
  THEN
    RAISE EXCEPTION
      'Forbidden: cannot modify admin-managed fields (role/plan/status/suspended_until/deleted_*)';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_admin_fields_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_protect_admin_fields();


-- =============================================================================
-- Section 3: テーブル別 RLS ポリシー
-- ENABLE / FORCE ROW LEVEL SECURITY は別マイグレーション（0001〜0003）で適用済みの前提。
-- ただしドキュメントに記載の ALTER TABLE 文は冪等性のため再掲し、
-- すでに有効化済みであれば無害（エラーにならない）。
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 3.1 profiles
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 自分自身は常に閲覧可能（無限再帰回避の最初の砦）
--        active メンバー / admin は他の active プロフィールを閲覧可能
--        admin は status を問わず全プロフィールを閲覧可能
-- -------------------------------------------------------------------------
CREATE POLICY profiles_select_policy ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- 自分自身（再帰回避のため、ヘルパー関数を使わず auth.uid() で直接比較）
  id = auth.uid()
  -- もしくは admin
  OR public.is_admin()
  -- もしくは閲覧者が active かつ 対象が active
  OR (
    public.is_active_member()
    AND status = 'active'
  )
);
COMMENT ON POLICY profiles_select_policy ON public.profiles IS
  '自分は常に閲覧可。active 同士は相互閲覧可。admin は退会者を含め全件閲覧可。';

-- -------------------------------------------------------------------------
-- INSERT: 通常のユーザー操作では不可。
--        招待受諾フローでは service_role が直接 INSERT するため、
--        authenticated にはポリシーを与えない（=拒否）。
--
--        ただし「自分の id = auth.uid() の行を作成する」ケースのみ許可
--        したい場合は以下を使う（招待受諾を Server Action で行う設計時に有効）：
-- -------------------------------------------------------------------------
CREATE POLICY profiles_insert_policy ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- 自分の auth ユーザーに紐づく行のみ作成可能
  -- ただし招待受諾フローでは service_role で INSERT する想定であり
  -- このポリシーはセーフティネット
  id = auth.uid()
);
COMMENT ON POLICY profiles_insert_policy ON public.profiles IS
  '招待受諾時のセーフティネット。通常は service_role 経由で INSERT する。';

-- -------------------------------------------------------------------------
-- UPDATE: 自分の行のみ更新可能（ただし role / plan / status は変更不可）
--        role/plan/status の変更は admin（service_role 経由 or ポリシーで admin 経由）
-- -------------------------------------------------------------------------
CREATE POLICY profiles_update_policy_self ON public.profiles
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  AND status = 'active'  -- 停止・退会者は更新不可
)
WITH CHECK (
  id = auth.uid()
  -- WITH CHECK 句で禁止フィールドの変更を防ぐのは難しいため、
  -- 「変更前 = 変更後」のチェックは BEFORE UPDATE トリガーで担保する（§6.4 参照）。
);
COMMENT ON POLICY profiles_update_policy_self ON public.profiles IS
  '自分のプロフィールのみ更新可能。role/plan/status の変更はトリガーで防御。';

CREATE POLICY profiles_update_policy_admin ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
COMMENT ON POLICY profiles_update_policy_admin ON public.profiles IS
  'admin は全プロフィールを更新可能（プラン変更、停止、退会処理）。';

-- -------------------------------------------------------------------------
-- DELETE: 不可（論理削除のみ）
-- -------------------------------------------------------------------------
-- ポリシー未作成 = 全 DELETE 拒否


-- -----------------------------------------------------------------------------
-- 3.2 invitations
-- -----------------------------------------------------------------------------
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: admin のみ
--        受諾画面でのトークン検証は service_role 経由（無認証ルート）
-- -------------------------------------------------------------------------
CREATE POLICY invitations_select_policy ON public.invitations
FOR SELECT
TO authenticated
USING (public.is_admin());
COMMENT ON POLICY invitations_select_policy ON public.invitations IS
  'admin のみ閲覧可能。招待受諾の検証は service_role 経由で行う。';

-- -------------------------------------------------------------------------
-- INSERT: admin のみ
-- -------------------------------------------------------------------------
CREATE POLICY invitations_insert_policy ON public.invitations
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND invited_by = auth.uid()
);
COMMENT ON POLICY invitations_insert_policy ON public.invitations IS
  'admin のみ招待を発行可能。invited_by は本人の uid と一致必須。';

-- -------------------------------------------------------------------------
-- UPDATE: admin のみ（再送・取消）
--        accepted_at の更新は service_role 経由
-- -------------------------------------------------------------------------
CREATE POLICY invitations_update_policy ON public.invitations
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
COMMENT ON POLICY invitations_update_policy ON public.invitations IS
  'admin のみ更新可能。accepted_at の自動更新は service_role 経由。';

-- -------------------------------------------------------------------------
-- DELETE: 不可
-- -------------------------------------------------------------------------
-- ポリシー未作成 = 全 DELETE 拒否


-- -----------------------------------------------------------------------------
-- 3.3 plans
-- -----------------------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 全認証ユーザーが閲覧可能（is_active=true のみ表示は UI 側で制御）
-- -------------------------------------------------------------------------
CREATE POLICY plans_select_policy ON public.plans
FOR SELECT
TO authenticated
USING (true);
COMMENT ON POLICY plans_select_policy ON public.plans IS
  'プランマスタは全認証ユーザーが閲覧可能（料金表示等で使用）。';

-- -------------------------------------------------------------------------
-- INSERT / UPDATE / DELETE: ポリシー未作成 = 全拒否
--   plans はマイグレーション seed のみ。実運用での変更は migration で行う。
-- -------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 3.4 product_genres
-- -----------------------------------------------------------------------------
ALTER TABLE public.product_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_genres FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 全認証ユーザー（is_active フィルタは UI で実施）
-- -------------------------------------------------------------------------
CREATE POLICY product_genres_select_policy ON public.product_genres
FOR SELECT
TO authenticated
USING (true);
COMMENT ON POLICY product_genres_select_policy ON public.product_genres IS
  '販売ジャンルマスタは全認証ユーザーが閲覧可能。';

-- -------------------------------------------------------------------------
-- INSERT / UPDATE / DELETE: admin のみ
-- -------------------------------------------------------------------------
CREATE POLICY product_genres_insert_policy ON public.product_genres
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND created_by = auth.uid()
);

CREATE POLICY product_genres_update_policy ON public.product_genres
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY product_genres_delete_policy ON public.product_genres
FOR DELETE
TO authenticated
USING (public.is_admin());
COMMENT ON POLICY product_genres_delete_policy ON public.product_genres IS
  '物理削除は admin のみ。通常は is_active=false で論理削除を推奨。';


-- -----------------------------------------------------------------------------
-- 3.5 profile_product_genres
-- -----------------------------------------------------------------------------
ALTER TABLE public.profile_product_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_product_genres FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 親 profile が閲覧可能なら見える
-- -------------------------------------------------------------------------
CREATE POLICY profile_product_genres_select_policy ON public.profile_product_genres
FOR SELECT
TO authenticated
USING (
  -- 自分
  profile_id = auth.uid()
  -- admin
  OR public.is_admin()
  -- 閲覧者が active で対象が active
  OR (
    public.is_active_member()
    AND public.is_profile_active(profile_id)
  )
);
COMMENT ON POLICY profile_product_genres_select_policy ON public.profile_product_genres IS
  '親 profile の閲覧可否と同じ条件で見える。';

-- -------------------------------------------------------------------------
-- INSERT / DELETE: 自分の行のみ（5個上限はトリガーまたは Server Action で担保）
-- -------------------------------------------------------------------------
CREATE POLICY profile_product_genres_insert_policy ON public.profile_product_genres
FOR INSERT
TO authenticated
WITH CHECK (
  profile_id = auth.uid()
  AND public.is_active_member()
);

CREATE POLICY profile_product_genres_delete_policy ON public.profile_product_genres
FOR DELETE
TO authenticated
USING (
  profile_id = auth.uid()
  AND public.is_active_member()
);

-- -------------------------------------------------------------------------
-- admin による代理操作
-- -------------------------------------------------------------------------
CREATE POLICY profile_product_genres_insert_policy_admin ON public.profile_product_genres
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY profile_product_genres_delete_policy_admin ON public.profile_product_genres
FOR DELETE
TO authenticated
USING (public.is_admin());

-- UPDATE は (profile_id, genre_id) PK のため不要


-- -----------------------------------------------------------------------------
-- 3.6 contents
-- -----------------------------------------------------------------------------
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT:
--   - admin: 全件（draft / 削除済み含む）
--   - active member:
--       status='published' AND deleted_at IS NULL
--       かつ required_plan が NULL もしくは自分の rank >= required_plan.rank
-- -------------------------------------------------------------------------
CREATE POLICY contents_select_policy ON public.contents
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_active_member()
    AND status = 'published'
    AND deleted_at IS NULL
    AND (
      required_plan IS NULL
      OR public.current_plan_rank() >= COALESCE(public.plan_rank(required_plan), 0)
    )
  )
);
COMMENT ON POLICY contents_select_policy ON public.contents IS
  'admin は全件閲覧。member は published かつ自プラン以上のもののみ閲覧可。';

-- -------------------------------------------------------------------------
-- INSERT: admin のみ
-- -------------------------------------------------------------------------
CREATE POLICY contents_insert_policy ON public.contents
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND author_id = auth.uid()
);

-- -------------------------------------------------------------------------
-- UPDATE: admin のみ
-- -------------------------------------------------------------------------
CREATE POLICY contents_update_policy ON public.contents
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -------------------------------------------------------------------------
-- DELETE: 不可（論理削除のみ）
-- -------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 3.7 content_attachments
-- -----------------------------------------------------------------------------
ALTER TABLE public.content_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_attachments FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 親 content が閲覧可能なら見える
-- -------------------------------------------------------------------------
CREATE POLICY content_attachments_select_policy ON public.content_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.contents c
    WHERE c.id = content_attachments.content_id
    -- 親側の RLS が自動評価されるため、ここでは存在チェックのみ
  )
);
COMMENT ON POLICY content_attachments_select_policy ON public.content_attachments IS
  '親 content の RLS と連動。サブクエリで親が見えれば添付も見える。';

-- -------------------------------------------------------------------------
-- INSERT / UPDATE / DELETE: admin のみ
-- -------------------------------------------------------------------------
CREATE POLICY content_attachments_insert_policy ON public.content_attachments
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY content_attachments_update_policy ON public.content_attachments
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY content_attachments_delete_policy ON public.content_attachments
FOR DELETE
TO authenticated
USING (public.is_admin());


-- -----------------------------------------------------------------------------
-- 3.8 content_likes
-- -----------------------------------------------------------------------------
ALTER TABLE public.content_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_likes FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 親 content が閲覧可能なら見える（カウント用）
-- -------------------------------------------------------------------------
CREATE POLICY content_likes_select_policy ON public.content_likes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.contents c WHERE c.id = content_likes.content_id
  )
);

-- -------------------------------------------------------------------------
-- INSERT: 自分の like のみ。trial も含めて active member ならOK
--        （いいねは trial にも開放されている §2.4）
--        ただし「閲覧できる content にのみ」like を打てる
-- -------------------------------------------------------------------------
CREATE POLICY content_likes_insert_policy ON public.content_likes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_active_member()
  AND EXISTS (
    SELECT 1 FROM public.contents c WHERE c.id = content_likes.content_id
  )
);

-- -------------------------------------------------------------------------
-- DELETE: 自分の like のみ
-- -------------------------------------------------------------------------
CREATE POLICY content_likes_delete_policy ON public.content_likes
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_active_member()
);

-- UPDATE は不要（PK のみ）


-- -----------------------------------------------------------------------------
-- 3.9 content_comments
-- -----------------------------------------------------------------------------
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT:
--   - admin: 全件
--   - active member:
--       親 content が閲覧可能（存在チェックで RLS 連動）
--       AND deleted_at IS NULL
--       AND コメント主が active
-- -------------------------------------------------------------------------
CREATE POLICY content_comments_select_policy ON public.content_comments
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_active_member()
    AND deleted_at IS NULL
    AND public.is_profile_active(author_id)
    AND EXISTS (
      SELECT 1 FROM public.contents c WHERE c.id = content_comments.content_id
    )
  )
);

-- -------------------------------------------------------------------------
-- INSERT: 自分のコメントのみ。閲覧可能な content にコメント可能
--        trial も「お知らせコメント」は可能（仕様 §2.4 のお知らせは trial に開放）
-- -------------------------------------------------------------------------
CREATE POLICY content_comments_insert_policy ON public.content_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_active_member()
  AND EXISTS (
    SELECT 1 FROM public.contents c WHERE c.id = content_comments.content_id
  )
);

-- -------------------------------------------------------------------------
-- UPDATE: 著者本人 or admin
-- -------------------------------------------------------------------------
CREATE POLICY content_comments_update_policy_author ON public.content_comments
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  AND public.is_active_member()
  AND deleted_at IS NULL
)
WITH CHECK (
  author_id = auth.uid()
);

CREATE POLICY content_comments_update_policy_admin ON public.content_comments
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -------------------------------------------------------------------------
-- DELETE: 不可（論理削除）
-- -------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 3.10 channels
-- -----------------------------------------------------------------------------
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 認証ユーザー全員（is_active=false は UI で非表示）
--        trial が見えるかどうかは投稿一覧側で制御。
--        チャンネル定義自体はリストアップに必要なので全員閲覧可。
-- -------------------------------------------------------------------------
CREATE POLICY channels_select_policy ON public.channels
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_active_member()
    AND is_active = true
  )
);
COMMENT ON POLICY channels_select_policy ON public.channels IS
  'admin は全件閲覧、member は is_active=true のみ閲覧可。';

-- -------------------------------------------------------------------------
-- INSERT / UPDATE / DELETE: admin のみ
-- -------------------------------------------------------------------------
CREATE POLICY channels_insert_policy ON public.channels
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND created_by = auth.uid()
);

CREATE POLICY channels_update_policy ON public.channels
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY channels_delete_policy ON public.channels
FOR DELETE
TO authenticated
USING (public.is_admin());


-- -----------------------------------------------------------------------------
-- 3.11 posts
-- -----------------------------------------------------------------------------
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT:
--   - admin: 全件（退会者・削除済み含む）
--   - active member:
--       deleted_at IS NULL
--       AND 投稿者が active
--       AND 自分の rank >= channel.required_plan.rank
--
--   ※ trial の「直近5件のみ」制限はこのポリシーでは表現しない。
--     →§4.3 のとおりアプリ側 LIMIT で対応する設計（SQL コメント参照）
-- -------------------------------------------------------------------------
CREATE POLICY posts_select_policy ON public.posts
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_active_member()
    AND deleted_at IS NULL
    AND public.is_profile_active(author_id)
    AND public.current_plan_rank() >= public.channel_required_rank(channel_id)
  )
);
COMMENT ON POLICY posts_select_policy ON public.posts IS
  'admin は全件閲覧。member は active な author の生存投稿のみ、自プラン以上の'
  'required_plan を持つチャンネルに限り閲覧可能。'
  'trial の「直近5件」制限は SQL では実装せず、アプリ層で LIMIT を付与する。';

-- -------------------------------------------------------------------------
-- INSERT:
--   - author_id = auth.uid()
--   - viewer が active かつ standard 以上（trial は閲覧のみ）
--   - viewer rank >= channel.required_plan.rank
--   - チャンネルが only_admin_can_post なら admin 必須
-- -------------------------------------------------------------------------
CREATE POLICY posts_insert_policy ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_active_member()
  -- trial は閲覧のみ。member は standard 以上、または admin
  AND (public.is_admin() OR public.is_standard_or_higher())
  -- 自プランがチャンネルの要求プラン以上
  AND public.current_plan_rank() >= public.channel_required_rank(channel_id)
  -- only_admin_can_post チャンネルは admin のみ
  AND (
    NOT public.channel_only_admin_can_post(channel_id)
    OR public.is_admin()
  )
);
COMMENT ON POLICY posts_insert_policy ON public.posts IS
  'trial は投稿不可。standard 以上で required_plan を満たし、'
  'only_admin_can_post チャンネルは admin のみが投稿可能。';

-- -------------------------------------------------------------------------
-- UPDATE: 著者本人 or admin
--        論理削除（deleted_at セット）もこの UPDATE で行う
-- -------------------------------------------------------------------------
CREATE POLICY posts_update_policy_author ON public.posts
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  AND public.is_active_member()
  AND public.is_standard_or_higher()
  AND deleted_at IS NULL
)
WITH CHECK (
  author_id = auth.uid()
  -- 著者が channel_id を別チャンネルに変更しても、変更後チャンネルの required_plan を満たす必要
  AND public.current_plan_rank() >= public.channel_required_rank(channel_id)
);

CREATE POLICY posts_update_policy_admin ON public.posts
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -------------------------------------------------------------------------
-- DELETE: 不可（論理削除のみ）
-- -------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 3.12 post_attachments
-- -----------------------------------------------------------------------------
ALTER TABLE public.post_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_attachments FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 親 post が閲覧可能なら見える
-- -------------------------------------------------------------------------
CREATE POLICY post_attachments_select_policy ON public.post_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_attachments.post_id
  )
);

-- -------------------------------------------------------------------------
-- INSERT:
--   画像：投稿の著者本人 or admin、standard 以上
--   video_embed：admin のみ（仕様 §11.1）
-- -------------------------------------------------------------------------
CREATE POLICY post_attachments_insert_policy ON public.post_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = post_attachments.post_id
      AND (
        -- 投稿者本人 かつ 画像 かつ standard 以上
        (
          p.author_id = auth.uid()
          AND post_attachments.attachment_type = 'image'
          AND public.is_standard_or_higher()
          AND public.is_active_member()
        )
        -- もしくは admin（画像/動画ともに可）
        OR public.is_admin()
      )
  )
);
COMMENT ON POLICY post_attachments_insert_policy ON public.post_attachments IS
  '画像は投稿者本人または admin、動画埋め込み（video_embed）は admin のみ。';

-- -------------------------------------------------------------------------
-- UPDATE: 投稿の著者 or admin
-- -------------------------------------------------------------------------
CREATE POLICY post_attachments_update_policy ON public.post_attachments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = post_attachments.post_id
      AND (
        (p.author_id = auth.uid() AND public.is_active_member())
        OR public.is_admin()
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = post_attachments.post_id
      AND (
        (
          p.author_id = auth.uid()
          AND post_attachments.attachment_type = 'image'
          AND public.is_standard_or_higher()
        )
        OR public.is_admin()
      )
  )
);

-- -------------------------------------------------------------------------
-- DELETE: 投稿の著者 or admin
-- -------------------------------------------------------------------------
CREATE POLICY post_attachments_delete_policy ON public.post_attachments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = post_attachments.post_id
      AND (
        (p.author_id = auth.uid() AND public.is_active_member())
        OR public.is_admin()
      )
  )
);


-- -----------------------------------------------------------------------------
-- 3.13 post_likes
-- -----------------------------------------------------------------------------
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 親 post が閲覧可能なら見える
-- -------------------------------------------------------------------------
CREATE POLICY post_likes_select_policy ON public.post_likes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_likes.post_id
  )
);

-- -------------------------------------------------------------------------
-- INSERT: 自分の like のみ。standard 以上（仕様 §2.4 で trial は閲覧のみ）
-- -------------------------------------------------------------------------
CREATE POLICY post_likes_insert_policy ON public.post_likes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.is_active_member()
  AND (public.is_admin() OR public.is_standard_or_higher())
  AND EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_likes.post_id
  )
);
COMMENT ON POLICY post_likes_insert_policy ON public.post_likes IS
  '掲示板への like は standard 以上または admin のみ。trial は閲覧のみ。';

-- -------------------------------------------------------------------------
-- DELETE: 自分の like のみ
-- -------------------------------------------------------------------------
CREATE POLICY post_likes_delete_policy ON public.post_likes
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND public.is_active_member()
);


-- -----------------------------------------------------------------------------
-- 3.14 post_comments
-- -----------------------------------------------------------------------------
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT:
--   - admin: 全件
--   - active member:
--       deleted_at IS NULL
--       AND コメント主が active
--       AND 親 post が閲覧可能
-- -------------------------------------------------------------------------
CREATE POLICY post_comments_select_policy ON public.post_comments
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    public.is_active_member()
    AND deleted_at IS NULL
    AND public.is_profile_active(author_id)
    AND EXISTS (
      SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id
    )
  )
);

-- -------------------------------------------------------------------------
-- INSERT: standard 以上 or admin
-- -------------------------------------------------------------------------
CREATE POLICY post_comments_insert_policy ON public.post_comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_active_member()
  AND (public.is_admin() OR public.is_standard_or_higher())
  AND EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_comments.post_id
  )
);

-- -------------------------------------------------------------------------
-- UPDATE: 著者本人 or admin
-- -------------------------------------------------------------------------
CREATE POLICY post_comments_update_policy_author ON public.post_comments
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  AND public.is_active_member()
  AND public.is_standard_or_higher()
  AND deleted_at IS NULL
)
WITH CHECK (author_id = auth.uid());

CREATE POLICY post_comments_update_policy_admin ON public.post_comments
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- -------------------------------------------------------------------------
-- DELETE: 不可（論理削除）
-- -------------------------------------------------------------------------


-- -----------------------------------------------------------------------------
-- 3.15 post_tags
-- -----------------------------------------------------------------------------
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 認証ユーザー全員（オートコンプリート・絞り込みで使用）
-- -------------------------------------------------------------------------
CREATE POLICY post_tags_select_policy ON public.post_tags
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (public.is_active_member() AND is_active = true)
);

-- -------------------------------------------------------------------------
-- INSERT: standard 以上 or admin（仕様 §7.2.4 で member が自由作成可）
-- -------------------------------------------------------------------------
CREATE POLICY post_tags_insert_policy ON public.post_tags
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.is_active_member()
  AND (public.is_admin() OR public.is_standard_or_higher())
);

-- -------------------------------------------------------------------------
-- UPDATE / DELETE: admin のみ（タグの整理・統合・改名）
-- -------------------------------------------------------------------------
CREATE POLICY post_tags_update_policy ON public.post_tags
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY post_tags_delete_policy ON public.post_tags
FOR DELETE
TO authenticated
USING (public.is_admin());


-- -----------------------------------------------------------------------------
-- 3.16 post_tag_assignments
-- -----------------------------------------------------------------------------
ALTER TABLE public.post_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tag_assignments FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 親 post が閲覧可能なら見える
-- -------------------------------------------------------------------------
CREATE POLICY post_tag_assignments_select_policy ON public.post_tag_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.posts p WHERE p.id = post_tag_assignments.post_id
  )
);

-- -------------------------------------------------------------------------
-- INSERT / DELETE: 投稿者本人 or admin
--   5個上限はトリガー or Server Action で担保
-- -------------------------------------------------------------------------
CREATE POLICY post_tag_assignments_insert_policy ON public.post_tag_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = post_tag_assignments.post_id
      AND (
        (
          p.author_id = auth.uid()
          AND public.is_active_member()
          AND public.is_standard_or_higher()
        )
        OR public.is_admin()
      )
  )
);

CREATE POLICY post_tag_assignments_delete_policy ON public.post_tag_assignments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = post_tag_assignments.post_id
      AND (
        (p.author_id = auth.uid() AND public.is_active_member())
        OR public.is_admin()
      )
  )
);


-- -----------------------------------------------------------------------------
-- 3.17 sales_reports / kpi_reports / cpa_reports
-- -----------------------------------------------------------------------------

-- ＝＝＝ sales_reports ＝＝＝
ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_reports FORCE ROW LEVEL SECURITY;

-- SELECT: 本人 or admin
CREATE POLICY sales_reports_select_policy ON public.sales_reports
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR (
    author_id = auth.uid()
    AND public.is_active_member()
  )
);
COMMENT ON POLICY sales_reports_select_policy ON public.sales_reports IS
  '自分のレポートのみ閲覧可能。admin は全件閲覧可。MVP では「みんな」表示なし。';

-- INSERT: 本人 かつ standard 以上 かつ active
CREATE POLICY sales_reports_insert_policy ON public.sales_reports
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_active_member()
  AND public.is_standard_or_higher()
);

-- UPDATE: 本人 かつ standard 以上 かつ active、または admin
CREATE POLICY sales_reports_update_policy_author ON public.sales_reports
FOR UPDATE
TO authenticated
USING (
  author_id = auth.uid()
  AND public.is_active_member()
  AND public.is_standard_or_higher()
)
WITH CHECK (
  author_id = auth.uid()
);
CREATE POLICY sales_reports_update_policy_admin ON public.sales_reports
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- DELETE: admin のみ
CREATE POLICY sales_reports_delete_policy ON public.sales_reports
FOR DELETE
TO authenticated
USING (public.is_admin());


-- ＝＝＝ kpi_reports ＝＝＝
ALTER TABLE public.kpi_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_reports FORCE ROW LEVEL SECURITY;

CREATE POLICY kpi_reports_select_policy ON public.kpi_reports
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR (author_id = auth.uid() AND public.is_active_member())
);

CREATE POLICY kpi_reports_insert_policy ON public.kpi_reports
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_active_member()
  AND public.is_standard_or_higher()
);

CREATE POLICY kpi_reports_update_policy_author ON public.kpi_reports
FOR UPDATE TO authenticated
USING (
  author_id = auth.uid()
  AND public.is_active_member()
  AND public.is_standard_or_higher()
)
WITH CHECK (author_id = auth.uid());

CREATE POLICY kpi_reports_update_policy_admin ON public.kpi_reports
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY kpi_reports_delete_policy ON public.kpi_reports
FOR DELETE TO authenticated
USING (public.is_admin());


-- ＝＝＝ cpa_reports ＝＝＝
ALTER TABLE public.cpa_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cpa_reports FORCE ROW LEVEL SECURITY;

CREATE POLICY cpa_reports_select_policy ON public.cpa_reports
FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR (author_id = auth.uid() AND public.is_active_member())
);

CREATE POLICY cpa_reports_insert_policy ON public.cpa_reports
FOR INSERT TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND public.is_active_member()
  AND public.is_standard_or_higher()
);

CREATE POLICY cpa_reports_update_policy_author ON public.cpa_reports
FOR UPDATE TO authenticated
USING (
  author_id = auth.uid()
  AND public.is_active_member()
  AND public.is_standard_or_higher()
)
WITH CHECK (author_id = auth.uid());

CREATE POLICY cpa_reports_update_policy_admin ON public.cpa_reports
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY cpa_reports_delete_policy ON public.cpa_reports
FOR DELETE TO authenticated
USING (public.is_admin());


-- -----------------------------------------------------------------------------
-- 3.18 notifications
-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: 受信者本人のみ（admin であっても他人の通知は見えない）
-- -------------------------------------------------------------------------
CREATE POLICY notifications_select_policy ON public.notifications
FOR SELECT
TO authenticated
USING (recipient_id = auth.uid());
COMMENT ON POLICY notifications_select_policy ON public.notifications IS
  '通知はプライバシー性が高いため、受信者本人のみが閲覧可能（admin も他人の通知は見えない）。';

-- -------------------------------------------------------------------------
-- INSERT: 通常の認証ユーザーは不可。service_role 経由のみ。
--   service_role は RLS をバイパスするためポリシー不要。
--   念のため authenticated には拒否（ポリシー未作成 = 拒否）
-- -------------------------------------------------------------------------

-- -------------------------------------------------------------------------
-- UPDATE: 受信者本人（read_at の更新）
-- -------------------------------------------------------------------------
CREATE POLICY notifications_update_policy ON public.notifications
FOR UPDATE
TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

-- -------------------------------------------------------------------------
-- DELETE: 受信者本人のみ（不要通知の手動削除）
-- -------------------------------------------------------------------------
CREATE POLICY notifications_delete_policy ON public.notifications
FOR DELETE
TO authenticated
USING (recipient_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 3.19 notification_preferences
-- -----------------------------------------------------------------------------
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT / INSERT / UPDATE: 本人のみ
--   admin であっても他人の通知設定は見ない / 変更しない
-- -------------------------------------------------------------------------
CREATE POLICY notification_preferences_select_policy ON public.notification_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY notification_preferences_insert_policy ON public.notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY notification_preferences_update_policy ON public.notification_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: 不可


-- -----------------------------------------------------------------------------
-- 3.20 audit_logs
-- -----------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- SELECT: admin のみ
-- -------------------------------------------------------------------------
CREATE POLICY audit_logs_select_policy ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

-- -------------------------------------------------------------------------
-- INSERT: admin のみ（actor_id = auth.uid() 必須）
--   実際の運用では service_role 経由でも INSERT する想定（システムイベント）
--   service_role は RLS バイパスのため別途許可不要
-- -------------------------------------------------------------------------
CREATE POLICY audit_logs_insert_policy ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  AND actor_id = auth.uid()
);
COMMENT ON POLICY audit_logs_insert_policy ON public.audit_logs IS
  'admin 本人のみが自身の actor_id で監査ログを INSERT 可能。'
  'システム自動イベントは service_role 経由（RLS バイパス）で記録する。';

-- -------------------------------------------------------------------------
-- UPDATE / DELETE: 誰も不可（ポリシー未作成 = 拒否）
--   コンプライアンス要件として「監査ログは改ざん不可」を保証
-- -------------------------------------------------------------------------
-- 注：force row level security のため、テーブル所有者であっても
--    マイグレーションロール以外は UPDATE/DELETE できない。
--    service_role でも RLS をバイパスはするが、ポリシーがあれば拒否される
--    （※実際には service_role は RLS をバイパスするので、運用上は
--      service_role のキーを漏洩させないことが防御線になる）
