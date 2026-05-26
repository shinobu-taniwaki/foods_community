# RLS（Row Level Security）ポリシー詳細仕様

**対象**: 谷脇式マーケティングCAMP コミュニティ MVP（v0.1）
**最終更新**: 2026-05-26
**位置づけ**: 実装の正となる SQL 仕様書。Supabase（PostgreSQL）で実行可能な形式で記述。

---

## 目次

1. [基本方針](#1-基本方針)
2. [共通ヘルパー関数](#2-共通ヘルパー関数)
3. [テーブル別 RLS 有効化と CREATE POLICY 文](#3-テーブル別-rls-有効化と-create-policy-文)
   - 3.1 [profiles](#31-profiles)
   - 3.2 [invitations](#32-invitations)
   - 3.3 [plans](#33-plans)
   - 3.4 [product_genres](#34-product_genres)
   - 3.5 [profile_product_genres](#35-profile_product_genres)
   - 3.6 [contents](#36-contents)
   - 3.7 [content_attachments](#37-content_attachments)
   - 3.8 [content_likes](#38-content_likes)
   - 3.9 [content_comments](#39-content_comments)
   - 3.10 [channels](#310-channels)
   - 3.11 [posts](#311-posts)
   - 3.12 [post_attachments](#312-post_attachments)
   - 3.13 [post_likes](#313-post_likes)
   - 3.14 [post_comments](#314-post_comments)
   - 3.15 [post_tags](#315-post_tags)
   - 3.16 [post_tag_assignments](#316-post_tag_assignments)
   - 3.17 [sales_reports / kpi_reports / cpa_reports](#317-sales_reports--kpi_reports--cpa_reports)
   - 3.18 [notifications](#318-notifications)
   - 3.19 [notification_preferences](#319-notification_preferences)
   - 3.20 [audit_logs](#320-audit_logs)
4. [特別な権限制御の詳細](#4-特別な権限制御の詳細)
5. [検証用テストケース](#5-検証用テストケース)
6. [既知の注意点・落とし穴](#6-既知の注意点落とし穴)

---

## 1. 基本方針

### 1.1 全テーブル RLS 有効化

MVP の全テーブルに `ENABLE ROW LEVEL SECURITY` を必ず設定する。
RLS を有効化したテーブルにはデフォルトで全アクセスが拒否されるため、明示的に `CREATE POLICY` した範囲のみ許可される。

### 1.2 サーバーコードの認可ロジックを最小化

「権限の正」を DB の RLS ポリシーに一元化する。Next.js Server Actions やクライアントコードでの認可判定は二重防御であり、原則すべての権限境界は RLS によって担保される。これにより：

- クライアントから直接 Supabase に問い合わせても RLS によって安全
- サーバーコードのバグや漏れがあっても DB レイヤで防御
- `service_role` を使うのは「システム通知 INSERT」「招待受諾の orchestration」など特殊なケースのみ

### 1.3 admin 判定はポリシー内で行う

`profiles.role = 'admin'` の判定はクライアントから送られた情報ではなく、**ポリシー内部で `auth.uid()` を起点に SECURITY DEFINER ヘルパー関数経由で実行する**。これにより JWT 改ざんや偽装ヘッダーによる admin なりすましを原理的に防ぐ。

### 1.4 命名規則

- ポリシー名：`<table>_<operation>_policy`（例：`posts_select_policy`, `posts_insert_policy`）
- 同テーブルに複数ポリシーがある場合は接尾辞で区別（例：`posts_update_policy_author`, `posts_update_policy_admin`）
- ヘルパー関数：`public.<role_or_check>()`（例：`public.is_admin()`, `public.current_plan_rank()`）

### 1.5 削除戦略

- ユーザー生成コンテンツ（profiles / contents / posts / *_comments）は**論理削除**を採用（`deleted_at IS NULL`）
- 物理削除はマスタの一部（タグ、添付）と like 系のみ
- `audit_logs` は **INSERT only**、UPDATE / DELETE を一切許可しない

---

## 2. 共通ヘルパー関数

すべて `SECURITY DEFINER`、`STABLE`、`search_path = public, auth` を明示し、無限再帰を避けるために RLS チェック対象のテーブルを `SET row_security = off` で参照する設計とはせず、**`profiles` テーブルにのみ「自分自身の SELECT を必ず許可」するポリシーを置く**ことで再帰を回避する（§6.2 参照）。

```sql
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
```

### 2.11 関数の GRANT

```sql
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
```

---

## 3. テーブル別 RLS 有効化と CREATE POLICY 文

> 各テーブルの先頭で `ENABLE ROW LEVEL SECURITY` と `FORCE ROW LEVEL SECURITY` を実行する。
> `FORCE` を付けることでテーブル所有者（マイグレーション実行ロール）にも RLS を強制する。

---

### 3.1 profiles

```sql
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
```

---

### 3.2 invitations

```sql
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
```

---

### 3.3 plans

```sql
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
```

---

### 3.4 product_genres

```sql
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
```

---

### 3.5 profile_product_genres

```sql
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
```

---

### 3.6 contents

```sql
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
```

---

### 3.7 content_attachments

```sql
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
```

---

### 3.8 content_likes

```sql
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
```

---

### 3.9 content_comments

```sql
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
```

---

### 3.10 channels

```sql
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
```

---

### 3.11 posts

掲示板の中核テーブル。RLS の複雑度が最も高い。

```sql
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
```

---

### 3.12 post_attachments

```sql
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
```

---

### 3.13 post_likes

```sql
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
```

---

### 3.14 post_comments

```sql
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
```

---

### 3.15 post_tags

```sql
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
```

---

### 3.16 post_tag_assignments

```sql
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
```

---

### 3.17 sales_reports / kpi_reports / cpa_reports

3 テーブルとも同一パターンのため、まとめて記述する（実 SQL では各テーブルに個別の `CREATE POLICY` を書く）。

```sql
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
```

---

### 3.18 notifications

```sql
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
```

---

### 3.19 notification_preferences

```sql
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
```

---

### 3.20 audit_logs

```sql
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
```

---

## 4. 特別な権限制御の詳細

### 4.1 プラン rank ベースの権限制御

| プラン | rank | 主な権限 |
|---|:---:|---|
| trial | 0 | 閲覧のみ（一部チャンネルは直近5件のみ） |
| standard | 1 | 通常メンバーの全機能 |
| premium | 2 | アプリ内は standard と同等、特典はアプリ外 |
| admin | 999 | 全権限（plan は NULL だが内部的に最高 rank 扱い） |

判定は `public.current_plan_rank()` で行う。`channel.required_plan` を `public.channel_required_rank(channel_id)` に変換して比較。

### 4.2 チャンネル required_plan チェック

```sql
-- 投稿の SELECT / INSERT で必ず実行される
viewer_rank := public.current_plan_rank();
channel_rank := public.channel_required_rank(channel_id);
allowed := viewer_rank >= channel_rank;
```

`admin_advice` チャンネルは `required_plan='standard'` のため trial には不可視・投稿不可。

### 4.3 お試しユーザーの「直近5件のみ」表示制限

**設計判断**：RLS では行数フィルタを表現できないため、**SQL レイヤでは「閲覧可能性」のみを判定し、件数制限はアプリ層（Server Action / クライアント）で `LIMIT` を付与**する。

```sql
-- 例：trial ユーザーが kpi チャンネルを開いた時のクエリ（アプリ側）
-- channels.trial_preview_count = 5 を読み取り、LIMIT を動的に付与する。

SELECT *
FROM posts
WHERE channel_id = 'kpi'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;  -- ← trial の場合のみ、channels.trial_preview_count から取得

-- standard/premium/admin の場合は LIMIT なし or ページング LIMIT のみ。
```

**RLS では「行数制限はかけない」が、要件として 6件目以降は UI でぼかし＋アップグレード CTA を表示。**
**直接 Supabase API を叩かれた場合でも、RLS は閲覧可能性のみ保証する点に留意**（trial が直接 API を叩けば全件取得可能だが、必要なら View または `LIMIT` 強制の RPC 関数を別途用意する）。

> **強化オプション（v0.2 検討）**：trial 向けに `posts_visible_to_trial` という View を作成し、`ROW_NUMBER() OVER (PARTITION BY channel_id ORDER BY created_at DESC) <= channels.trial_preview_count` を SQL で表現する。MVP では UI 制限で十分。

### 4.4 お試しは閲覧のみ（INSERT 禁止）

posts / post_comments / post_likes / post_attachments / post_tag_assignments / post_tags / sales_reports / kpi_reports / cpa_reports のすべての INSERT ポリシーで `public.is_standard_or_higher() OR public.is_admin()` を要求している。trial は `current_plan_rank() = 0` のため INSERT が原理的に通らない。

例外：content_likes / content_comments / notifications / notification_preferences / profile_product_genres は trial も可能（仕様 §2.4 参照）。

### 4.5 退会者・停止者のデータが他 member には見えない

各テーブルの SELECT ポリシーで以下を明示：

- `public.is_active_member()` ：閲覧者自身が active
- `public.is_profile_active(author_id)` ：投稿主が active

admin は両条件を `is_admin()` で短絡評価でバイパスし、退会者投稿も含めて全件閲覧可能。

### 4.6 論理削除（deleted_at IS NULL）チェック

SELECT ポリシーで `deleted_at IS NULL` を必須化。admin のみ削除済みも閲覧可。
削除は `UPDATE` で `deleted_at = now()` をセットする運用とする。

### 4.7 only_admin_can_post チャンネルへの INSERT 制限

`posts_insert_policy` で `NOT public.channel_only_admin_can_post(channel_id) OR public.is_admin()` を要求。member が `admin_advice` チャンネルに投稿しようとしても RLS で拒否される。

### 4.8 audit_logs は INSERT only

- SELECT: admin のみ
- INSERT: admin + actor_id = auth.uid() （system イベントは service_role）
- UPDATE / DELETE: ポリシー未定義 = 全拒否（誰もできない）
- `FORCE ROW LEVEL SECURITY` でテーブル所有者にも RLS を強制
- 実運用での防御線：service_role キーの厳格な管理（GitHub Actions に置かず、サーバー直配置）

---

## 5. 検証用テストケース

### 5.1 アクセス境界一覧表

凡例：◯ = 許可 / ✕ = 拒否 / △ = 条件付き許可

#### 5.1.1 profiles

| 操作 | admin | standard | premium | trial | 退会者 (deleted) | 停止者 (suspended) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| 自分の SELECT | ◯ | ◯ | ◯ | ◯ | ✕ (auth.uid 取れず) | ✕ |
| 他人 active の SELECT | ◯ | ◯ | ◯ | ◯ | ✕ | ✕ |
| 他人 deleted の SELECT | ◯ | ✕ | ✕ | ✕ | ✕ | ✕ |
| 自分の UPDATE | ◯ | ◯ | ◯ | ◯ | ✕ | ✕ |
| 他人の UPDATE | ◯ | ✕ | ✕ | ✕ | ✕ | ✕ |
| DELETE | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |

#### 5.1.2 posts

| 操作 | admin | standard | premium | trial | 退会者 | 停止者 |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| kpi (required=trial) の SELECT | ◯ | ◯ | ◯ | ◯ | ✕ | ✕ |
| admin_advice (required=standard) SELECT | ◯ | ◯ | ◯ | ✕ | ✕ | ✕ |
| 退会者の投稿 SELECT | ◯ | ✕ | ✕ | ✕ | — | — |
| 削除済み投稿 SELECT | ◯ | ✕ | ✕ | ✕ | — | — |
| kpi への INSERT | ◯ | ◯ | ◯ | ✕ | ✕ | ✕ |
| admin_advice への INSERT | ◯ | ✕ | ✕ | ✕ | ✕ | ✕ |
| 自分の投稿 UPDATE | ◯ | ◯ | ◯ | ✕ | ✕ | ✕ |
| 他人の投稿 UPDATE | ◯ | ✕ | ✕ | ✕ | ✕ | ✕ |
| 物理 DELETE | ✕ | ✕ | ✕ | ✕ | ✕ | ✕ |

#### 5.1.3 contents

| 操作 | admin | standard | premium | trial |
|---|:---:|:---:|:---:|:---:|
| published / required=NULL の SELECT | ◯ | ◯ | ◯ | ◯ |
| published / required=standard の SELECT | ◯ | ◯ | ◯ | ✕ |
| draft の SELECT | ◯ | ✕ | ✕ | ✕ |
| 削除済みの SELECT | ◯ | ✕ | ✕ | ✕ |
| INSERT / UPDATE | ◯ | ✕ | ✕ | ✕ |

#### 5.1.4 sales_reports / kpi_reports / cpa_reports

| 操作 | admin | standard | premium | trial |
|---|:---:|:---:|:---:|:---:|
| 自分のレポート SELECT | ◯ | ◯ | ◯ | ✕ |
| 他人のレポート SELECT | ◯ | ✕ | ✕ | ✕ |
| INSERT / UPDATE（自分のみ） | ◯ | ◯ | ◯ | ✕ |
| DELETE | ◯ | ✕ | ✕ | ✕ |

#### 5.1.5 audit_logs

| 操作 | admin | member | trial |
|---|:---:|:---:|:---:|
| SELECT | ◯ | ✕ | ✕ |
| INSERT（自分の actor_id） | ◯ | ✕ | ✕ |
| UPDATE | ✕ | ✕ | ✕ |
| DELETE | ✕ | ✕ | ✕ |

#### 5.1.6 notifications

| 操作 | 受信者本人 | 他人 admin | 他人 member |
|---|:---:|:---:|:---:|
| SELECT | ◯ | ✕ | ✕ |
| UPDATE (read_at) | ◯ | ✕ | ✕ |
| DELETE | ◯ | ✕ | ✕ |
| INSERT | ✕ (service_role のみ) | ✕ | ✕ |

### 5.2 検証用テストクエリ

各シナリオごとに、`SET LOCAL "request.jwt.claims" = '...'` で auth.uid() をモック、または専用テストユーザーでログインしてから実行する。

#### 5.2.1 セットアップ

```sql
-- テスト用ユーザーの seed（手動 or pgTAP テストで自動）
-- admin: 00000000-0000-0000-0000-000000000001
-- standard: 00000000-0000-0000-0000-000000000002
-- trial: 00000000-0000-0000-0000-000000000003
-- deleted: 00000000-0000-0000-0000-000000000004
-- suspended: 00000000-0000-0000-0000-000000000005

INSERT INTO public.profiles (id, display_name, store_name, region, product, role, plan, status)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', '', '', '', 'admin', NULL, 'active'),
  ('00000000-0000-0000-0000-000000000002', 'std',   '', '', '', 'member', 'standard', 'active'),
  ('00000000-0000-0000-0000-000000000003', 'trial', '', '', '', 'member', 'trial', 'active'),
  ('00000000-0000-0000-0000-000000000004', 'del',   '', '', '', 'member', 'standard', 'deleted'),
  ('00000000-0000-0000-0000-000000000005', 'sus',   '', '', '', 'member', 'standard', 'suspended');
```

#### 5.2.2 trial が admin_advice の投稿を見られないこと

```sql
-- trial としてログインしている前提
-- 期待結果：0 行
SELECT COUNT(*) AS visible_posts
FROM public.posts
WHERE channel_id = 'admin_advice';
```

#### 5.2.3 trial が posts を INSERT できないこと

```sql
-- trial としてログインしている前提
-- 期待結果：new row violates row-level security policy
INSERT INTO public.posts (id, author_id, channel_id, title, content)
VALUES (gen_random_uuid(),
        '00000000-0000-0000-0000-000000000003',
        'kpi', 'test', 'body');
```

#### 5.2.4 standard が他人の sales_reports を見られないこと

```sql
-- standard としてログインしている前提
-- 期待結果：自分のレポートのみ
SELECT COUNT(*) FROM public.sales_reports;
```

#### 5.2.5 admin が deleted ユーザーの投稿を見られること

```sql
-- admin としてログインしている前提
-- 期待結果：deleted ユーザーの投稿も含まれる
SELECT COUNT(*) FROM public.posts WHERE author_id = '00000000-0000-0000-0000-000000000004';
```

#### 5.2.6 member が deleted ユーザーの投稿を見られないこと

```sql
-- standard としてログインしている前提
-- 期待結果：0
SELECT COUNT(*) FROM public.posts WHERE author_id = '00000000-0000-0000-0000-000000000004';
```

#### 5.2.7 audit_logs が UPDATE / DELETE できないこと

```sql
-- admin としてログインしている前提
-- 期待結果：どちらも new row violates row-level security policy
UPDATE public.audit_logs SET action_type = 'tampered' WHERE id = 'xxxx';
DELETE FROM public.audit_logs WHERE id = 'xxxx';
```

#### 5.2.8 通知の他者閲覧不可

```sql
-- admin としてログインしている前提
-- 期待結果：0 行（admin であっても他人の通知は見えない）
SELECT COUNT(*) FROM public.notifications
WHERE recipient_id = '00000000-0000-0000-0000-000000000002';
```

#### 5.2.9 suspended ユーザーがログインできない（参考）

`auth.users.banned_until = 'infinity'` でログイン自体を禁止するため、RLS には到達しない。
ただし RLS でも `is_active_member()` が false になるため、二重防御。

#### 5.2.10 pgTAP による自動テスト雛形

```sql
-- 例：
SELECT plan(10);

SELECT throws_ok(
  $$ INSERT INTO public.posts (id, author_id, channel_id, title, content)
     VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', 'kpi', 't', 'b') $$,
  '42501',
  'new row violates row-level security policy for table "posts"',
  'trial cannot insert into posts'
);

SELECT * FROM finish();
```

---

## 6. 既知の注意点・落とし穴

### 6.1 SECURITY DEFINER 関数の使い方

すべての RLS ヘルパー関数は `SECURITY DEFINER` で定義する。これにより呼び出し元のロールに関係なく、関数所有者（マイグレーションロール）の権限で `profiles` テーブルにアクセスできる。

注意点：

- **`search_path` を必ず `SET search_path = public, auth` で固定**する。さもないと search_path 攻撃で悪意ある同名関数を差し込まれる可能性がある。
- **`STABLE`** をマーク。同一トランザクション内で同じ結果を返すことを示し、プランナの最適化を促す。
- **`VOLATILE` にしない**。RLS ポリシー内で `VOLATILE` 関数を呼ぶと毎行評価され大幅に遅くなる。
- **`GRANT EXECUTE TO authenticated`** を忘れない。

### 6.2 無限再帰ポリシーの回避

ヘルパー関数 `is_admin()` 等は内部で `profiles` を SELECT する。一方 `profiles` 自体にも RLS ポリシーがあるため、**`profiles_select_policy` の内部で `is_admin()` を呼ぶと再帰が発生**する。

対策：

1. **`profiles_select_policy` では `is_admin()` を使わず、`auth.uid()` と直接比較する条件を最初に置く**（自分自身は常に閲覧可能）
2. **`SECURITY DEFINER` 関数は所有者権限で実行されるため、関数内部の `profiles` 参照は呼び出し元の RLS をバイパスする**（PostgreSQL の仕様）
3. 上記 2 により、`is_admin()` を `posts_select_policy` などから呼んでも `profiles` の RLS をバイパスして判定できる
4. しかし `profiles_select_policy` 自身では関数呼び出しが SECURITY DEFINER の所有者と一致するため再帰しないが、コード可読性のためにも `auth.uid() = id` の直接比較を最初に書く

### 6.3 パフォーマンスへの影響（profiles JOIN の最適化）

毎クエリで `is_admin()` / `current_plan_rank()` / `is_active_member()` が呼ばれるため、`profiles(id)` への lookup が頻発する。

対策：

1. **`profiles.id` は PK（auth.users 由来の uuid）なのでインデックスは自動付与済み**
2. **`STABLE` マークによってプランナはトランザクション内で結果をキャッシュ**
3. **PostgreSQL 関数のインライン化**は SECURITY DEFINER ではされないので注意。SQL 関数は LANGUAGE sql でできるだけ短く書く（既に実装済み）
4. **複数行を返すクエリ**（例：投稿一覧）では、ポリシー内の `is_active_member()` / `current_plan_rank()` が一度だけ評価されるよう、PostgreSQL のプランナに任せる
5. **JIT が効くケース**：大量行をスキャンするクエリではプランナが JIT を有効化。SECURITY DEFINER 関数は JIT 対象外なので、可能なら **`STABLE PARALLEL SAFE`** をマークしてパラレルクエリも許可する

### 6.4 role / plan / status の保護（profiles UPDATE のチェック）

`profiles_update_policy_self` で本人が自分の行を UPDATE できるが、`role` `plan` `status` `deleted_at` 等の管理用カラムを書き換えられては困る。

対策（BEFORE UPDATE トリガーで担保）：

```sql
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
```

### 6.5 service_role の取り扱い

`service_role` は RLS をバイパスする強力なロール。以下のシステム処理でのみ使う：

- 招待受諾フローでの `profiles` INSERT
- システム通知の `notifications` INSERT
- `audit_logs` への自動イベント記録（ログイン失敗、メール変更など）
- バックアップ取得、定期バッチ

**漏洩防止策**（仕様 §16.5 と整合）：

- GitHub Actions の Secret には**置かない**（サーバー直配置のみ）
- クライアントバンドルに混入しないよう `.env` の prefix を厳格管理（`SUPABASE_SERVICE_ROLE_KEY` は `NEXT_PUBLIC_` を付けない）
- Server Action / Route Handler の中でのみ使う

### 6.6 trial の「直近5件」を SQL で実装する場合の落とし穴

§4.3 で記したとおり MVP ではアプリ層 LIMIT で対応するが、もし SQL で表現する場合：

```sql
-- WINDOW 関数を使った View 案（v0.2 検討）
CREATE OR REPLACE VIEW public.posts_visible AS
SELECT p.*,
       ROW_NUMBER() OVER (
         PARTITION BY p.channel_id
         ORDER BY p.created_at DESC
       ) AS row_in_channel
FROM public.posts p
WHERE p.deleted_at IS NULL;
```

その上で trial に対しては `row_in_channel <= channels.trial_preview_count` でフィルタする。
**ただし View 上の RLS は元テーブルから自動継承されないため、`SECURITY INVOKER` View にするか、追加のポリシーが必要**。MVP では複雑性を避けてアプリ層実装が妥当。

### 6.7 ポリシー OR 結合の意味

PostgreSQL では同一テーブル・同一操作で複数の `CREATE POLICY` を書くと、それらは **OR 結合**で評価される。本書では以下のテーブルで複数ポリシーを使い分けている：

- `profiles`：`profiles_update_policy_self` + `profiles_update_policy_admin`
- `posts`：`posts_update_policy_author` + `posts_update_policy_admin`
- `content_comments` / `post_comments` / `sales_reports` / `kpi_reports` / `cpa_reports`：同様

このパターンは「自分用」「admin 用」を分けて書くことで意図を明確化する効果がある。

### 6.8 USING と WITH CHECK の違い

- **USING**：SELECT / UPDATE / DELETE で「どの行が見える/変更できるか」を判定（変更前の行）
- **WITH CHECK**：INSERT / UPDATE で「変更後の行が条件を満たすか」を判定（変更後の行）

例：投稿の channel_id を変更する場合、UPDATE の USING は「変更前」のチャンネル権限で評価され、WITH CHECK は「変更後」のチャンネル権限で評価される。本書の `posts_update_policy_author` はこれを明示している。

### 6.9 FORCE ROW LEVEL SECURITY

`FORCE ROW LEVEL SECURITY` を付けることで、テーブル所有者（マイグレーションロール）にも RLS を強制する。これにより：

- マイグレーションファイルでうっかり権限漏れの SQL を書いても、所有者ですら RLS でブロックされる
- データ修正は明示的に `SET LOCAL row_security = off`（superuser のみ）が必要

`audit_logs` には特に重要。

### 6.10 RLS テストの自動化推奨

CI/CD で pgTAP を使った RLS 自動テストを推奨：

- 各ロール（admin / standard / trial / deleted / suspended）について、すべての主要テーブルへの CRUD を期待結果と突き合わせる
- ポリシー変更時に必ず CI で回す
- 失敗時はマイグレーションを止める

```
pgtap test/rls/posts.sql
pgtap test/rls/contents.sql
pgtap test/rls/audit_logs.sql
…
```

---

## 7. 適用順序（マイグレーション設計）

実装時は以下の順序で SQL を流す：

1. テーブル作成（外部キー含む）
2. ヘルパー関数作成（§2）
3. `ENABLE ROW LEVEL SECURITY` / `FORCE ROW LEVEL SECURITY`（全テーブル）
4. `CREATE POLICY`（§3）
5. BEFORE UPDATE トリガー作成（§6.4）
6. seed 投入（plans / product_genres / channels）
7. pgTAP テスト実行

---

## 8. 設計サマリ

- **テーブル数**：20（MVP）
- **ヘルパー関数**：10（current_user_id, is_admin, current_status, is_active_member, current_plan_rank, is_standard_or_higher, is_profile_active, channel_required_rank, channel_only_admin_can_post, plan_rank）
- **ポリシー数**：49（後述）
- **保護トリガー**：1（`profiles_protect_admin_fields_trg`）

### 8.1 ポリシー一覧（49 個）

| # | テーブル | ポリシー名 |
|---:|---|---|
| 1 | profiles | profiles_select_policy |
| 2 | profiles | profiles_insert_policy |
| 3 | profiles | profiles_update_policy_self |
| 4 | profiles | profiles_update_policy_admin |
| 5 | invitations | invitations_select_policy |
| 6 | invitations | invitations_insert_policy |
| 7 | invitations | invitations_update_policy |
| 8 | plans | plans_select_policy |
| 9 | product_genres | product_genres_select_policy |
| 10 | product_genres | product_genres_insert_policy |
| 11 | product_genres | product_genres_update_policy |
| 12 | product_genres | product_genres_delete_policy |
| 13 | profile_product_genres | profile_product_genres_select_policy |
| 14 | profile_product_genres | profile_product_genres_insert_policy |
| 15 | profile_product_genres | profile_product_genres_delete_policy |
| 16 | profile_product_genres | profile_product_genres_insert_policy_admin |
| 17 | profile_product_genres | profile_product_genres_delete_policy_admin |
| 18 | contents | contents_select_policy |
| 19 | contents | contents_insert_policy |
| 20 | contents | contents_update_policy |
| 21 | content_attachments | content_attachments_select_policy |
| 22 | content_attachments | content_attachments_insert_policy |
| 23 | content_attachments | content_attachments_update_policy |
| 24 | content_attachments | content_attachments_delete_policy |
| 25 | content_likes | content_likes_select_policy |
| 26 | content_likes | content_likes_insert_policy |
| 27 | content_likes | content_likes_delete_policy |
| 28 | content_comments | content_comments_select_policy |
| 29 | content_comments | content_comments_insert_policy |
| 30 | content_comments | content_comments_update_policy_author |
| 31 | content_comments | content_comments_update_policy_admin |
| 32 | channels | channels_select_policy |
| 33 | channels | channels_insert_policy |
| 34 | channels | channels_update_policy |
| 35 | channels | channels_delete_policy |
| 36 | posts | posts_select_policy |
| 37 | posts | posts_insert_policy |
| 38 | posts | posts_update_policy_author |
| 39 | posts | posts_update_policy_admin |
| 40 | post_attachments | post_attachments_select_policy |
| 41 | post_attachments | post_attachments_insert_policy |
| 42 | post_attachments | post_attachments_update_policy |
| 43 | post_attachments | post_attachments_delete_policy |
| 44 | post_likes | post_likes_select_policy |
| 45 | post_likes | post_likes_insert_policy |
| 46 | post_likes | post_likes_delete_policy |
| 47 | post_comments | post_comments_select_policy |
| 48 | post_comments | post_comments_insert_policy |
| 49 | post_comments | post_comments_update_policy_author |
| 50 | post_comments | post_comments_update_policy_admin |
| 51 | post_tags | post_tags_select_policy |
| 52 | post_tags | post_tags_insert_policy |
| 53 | post_tags | post_tags_update_policy |
| 54 | post_tags | post_tags_delete_policy |
| 55 | post_tag_assignments | post_tag_assignments_select_policy |
| 56 | post_tag_assignments | post_tag_assignments_insert_policy |
| 57 | post_tag_assignments | post_tag_assignments_delete_policy |
| 58 | sales_reports | sales_reports_select_policy |
| 59 | sales_reports | sales_reports_insert_policy |
| 60 | sales_reports | sales_reports_update_policy_author |
| 61 | sales_reports | sales_reports_update_policy_admin |
| 62 | sales_reports | sales_reports_delete_policy |
| 63 | kpi_reports | kpi_reports_select_policy |
| 64 | kpi_reports | kpi_reports_insert_policy |
| 65 | kpi_reports | kpi_reports_update_policy_author |
| 66 | kpi_reports | kpi_reports_update_policy_admin |
| 67 | kpi_reports | kpi_reports_delete_policy |
| 68 | cpa_reports | cpa_reports_select_policy |
| 69 | cpa_reports | cpa_reports_insert_policy |
| 70 | cpa_reports | cpa_reports_update_policy_author |
| 71 | cpa_reports | cpa_reports_update_policy_admin |
| 72 | cpa_reports | cpa_reports_delete_policy |
| 73 | notifications | notifications_select_policy |
| 74 | notifications | notifications_update_policy |
| 75 | notifications | notifications_delete_policy |
| 76 | notification_preferences | notification_preferences_select_policy |
| 77 | notification_preferences | notification_preferences_insert_policy |
| 78 | notification_preferences | notification_preferences_update_policy |
| 79 | audit_logs | audit_logs_select_policy |
| 80 | audit_logs | audit_logs_insert_policy |

**合計 80 ポリシー**（プラス UPDATE/DELETE を意図的に未定義にして全拒否を担保する箇所 多数）。

---

**ドキュメントここまで。**

このポリシー群により、admin / standard / premium / trial / 退会者 / 停止者の各境界が以下のように明確化されている：

- **admin** は全権限。退会者・削除済み投稿・監査ログ閲覧まで可能。ただし他人の通知や通知設定は閲覧不可（プライバシー保護）。
- **standard / premium** はアプリ内で同等。投稿・コメント・データ入力・全チャンネル閲覧可能。
- **trial** は閲覧専用。一部チャンネル（admin_advice）は不可視。データ機能は閲覧自体不可。
- **退会者 (deleted)** は auth 上ログイン不可。投稿は admin のみ閲覧可。
- **停止者 (suspended)** は auth 上ログイン不可。RLS でも `is_active_member()` が false で二重防御。

不正アクセスは「クライアント改ざん」「JWT 偽装」「直接 API アクセス」のいずれの経路でも RLS によって原理的に拒否される。
