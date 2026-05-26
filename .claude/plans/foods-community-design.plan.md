# マーケティングCampコミュニティ（MCC） MVP 設計書

**最終更新**: 2026-05-26
**ステータス**: ドラフト（実装着手前のレビュー対象）
**スコープ**: MVP（v0.1）の機能設計と運用フロー

---

## 0. プロジェクト概要

| 項目 | 内容 |
|---|---|
| プロダクト名 | マーケティングCampコミュニティ（MCC） |
| 運営者 | しのぶさん（admin 1名） |
| ターゲット | 食品生産者・職人（50代中心、ITリテラシー低めを想定） |
| 初期規模 | 20〜50人（β期間後の本ローンチ規模） |
| 将来規模 | 既存クライアント 2,000名規模への展開を視野 |
| 配信形態 | PWA（スマホファースト、ホーム画面追加誘導） |
| 課金 | 月額サブスク／**MVP は手動運用**（admin 手動付与、Google フォームで申請受付） |
| 開発方針 | β期間を経て本ローンチ |

### 0.1 解決する課題

- 食品生産者・職人がマーケティング知見を相互に共有する場がない
- 運営者からの一方的な情報配信だけでなく、メンバー同士の成果共有・成長記録を可視化したい
- 50代中心の低ITリテラシー層でも継続利用できるシンプルな UX

### 0.2 本書の位置づけ

実装の前提となる仕様書。確定事項は実装の正となるが、未決事項（最終章）は決定後に追記。

---

## 1. 技術スタック

| 領域 | 採用 |
|---|---|
| フロントエンド | Next.js 14 App Router + TypeScript |
| スタイル | Tailwind CSS |
| BaaS | Supabase（PostgreSQL + Auth + Storage + Realtime + RLS） |
| デプロイ | GitHub Actions → 自前サーバー（管理会社経由、詳細未確定） |
| メール送信 | Resend（招待・通知メール用 SMTP） |
| PWA | next-pwa（manifest・限定的オフライン対応） |
| 認証 | Supabase Auth：招待制＋メール&パスワード or Google SSO |
| 画像圧縮 | browser-image-compression（クライアントサイド） |
| アクセス解析 | Plausible Analytics |
| エラー監視 | Sentry（無料プラン） |

### 1.1 デザイン指針

- **配色**：クリーム #faf5ed、テラコッタ #c05e3f、マスタード #d9a43d、オリーブ #5a6b42
- **フォント**：見出し Noto Serif JP（700）、本文 Zen Kaku Gothic Antique（400/500）
- **角丸**：14px 基本（紙の質感）
- **影**：ほぼ使わない or 極淡
- **モバイル幅**：360〜414px 基本、デスクトップは中央 640px カラム
- **アクセシビリティ**：50代向けに文字サイズは標準より大きめ、コントラスト確保

### 1.2 サーバー前提（要調査）

| 項目 | 内容 |
|---|---|
| 管理会社経由のオンプレ／VPS | 別途調査中（請求書から特定する） |
| OS | 未確認 |
| Docker 可否 | 未確認 |
| Node.js | 未インストール想定 |
| 構成方針 | Supabase Cloud + 定期バックアップを自前サーバーに保持（リスクヘッジ） |

サーバー実態が判明次第、Self-hosted Supabase 採用も検討。

---

## 2. ユーザー・ロール・プラン

### 2.1 ロール

| ロール | 説明 | 人数 |
|---|---|---|
| `admin` | 運営者（しのぶさん） | 1名（複数 admin は v0.2 で検討） |
| `member` | 一般会員（食品生産者） | 20〜50名想定 |

### 2.2 プラン

| ID | プラン名 | 月額 | 税 | rank |
|---|---|---|---|:---:|
| `trial` | お試しプラン | 980 円 | 税込 | 0 |
| `standard` | スタンダードプラン | 25,000 円 | 税込 | 1 |
| `premium` | プレミアムプラン | 77,000 円 | 税込 | 2 |

#### プレミアム特典
アプリ内機能は standard と同等。プレミアム特典は**アプリ外**（TikTokショップ構築サポート・LP制作支援などの個別サポート）。**詳細はサービス説明資料を後日連携、設計書に追記**。

### 2.3 ステータス

ユーザーライフサイクル：

```
[新規登録] → active ─┬→ suspended ─┐
                    │              │
                    └→ deleted ───┐│
                          │       ││
                          └→ hard_deleted（v0.2）
                          (90日経過後)
```

| status | ログイン | 投稿表示 | 通知配信 | 仲間一覧 |
|---|:---:|:---:|:---:|:---:|
| `active` | ◯ | ◯ | ◯ | ◯ |
| `suspended` | ✕ | △ | ✕ | ✕ |
| `deleted` | ✕ | ✕（admin のみ閲覧可） | ✕ | ✕ |
| `hard_deleted` | — | — | — | — |

### 2.4 プラン別権限線引き

| 機能 | trial | standard | premium |
|---|:---:|:---:|:---:|
| プロフィール編集 | ◯ | ◯ | ◯ |
| 仲間一覧の閲覧 | ◯ | ◯ | ◯ |
| お知らせ閲覧（基本） | ◯ | ◯ | ◯ |
| お知らせ Pro 限定記事 | ✕ | ◯ | ◯ |
| 掲示板：通常チャンネル閲覧 | △（直近5件のみ） | ◯ | ◯ |
| 掲示板：通常チャンネル投稿・コメント・いいね | ✕（閲覧のみ） | ◯ | ◯ |
| 掲示板：「運営からのアドバイス」チャンネル | ✕ | ◯ | ◯ |
| データ入力（売上/KPI/CPA） | ✕ | ◯ | ◯ |
| データ閲覧（自分のみ） | ✕ | ◯ | ◯ |
| 通知設定 | ◯ | ◯ | ◯ |
| **アプリ内機能差は trial vs (standard+premium) の2段階** | | | |

---

## 3. データモデル（テーブル定義）

### 3.1 認証・ユーザー系

#### `profiles`
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK FK→auth.users | |
| display_name | text | 表示名 |
| avatar | text | 絵文字（デフォルト） |
| avatar_image_path | text nullable | 画像アップロード時のパス |
| bio | text nullable | 自己紹介 |
| store_name | text | 屋号・店名 |
| region | text | 都道府県・市区町村 |
| product | text | 扱う商品 |
| store_description | text nullable | お店の説明 |
| store_image_path | text nullable | お店の写真 |
| company_name | text nullable | 法人名 |
| business_type | text nullable | 業態（株式会社／個人事業主など） |
| company_address | text nullable | 法人住所 |
| company_phone | text nullable | 連絡先電話 |
| website_url | text nullable | 公式サイト |
| social_links | jsonb nullable | `{"instagram":"...","x":"...","tiktok":"..."}` |
| role | text | 'admin' / 'member' |
| plan | text nullable | 'trial' / 'standard' / 'premium'（admin は null） |
| status | text | 'active' / 'suspended' / 'deleted' / 'hard_deleted' |
| suspended_until | timestamptz nullable | |
| deleted_at | timestamptz nullable | |
| deleted_by | uuid FK nullable | |
| deletion_reason | text nullable | |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| last_active_at | timestamptz | |

#### `invitations`
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| email | text | 招待先メール |
| token | text | 64文字ランダム |
| plan | text FK→plans | 'trial' / 'standard' / 'premium' |
| invited_by | uuid FK | admin |
| expires_at | timestamptz | 7日後 |
| accepted_at | timestamptz nullable | |
| created_at | timestamptz | |

### 3.2 プラン・分類系

#### `plans`（マスタ・ハードコード seed）
| カラム | 型 | 説明 |
|---|---|---|
| id | text PK | 'trial' / 'standard' / 'premium' |
| label | text | 表示名 |
| price_amount | numeric | 数値 |
| tax_included | boolean | true |
| display_price | text | 「月額 25,000 円（税込）」 |
| rank | int | 0/1/2（権限比較用） |
| description | text | プラン説明 |
| features | jsonb | 機能リスト（UI 表示用） |
| sort_order | int | |
| is_active | boolean | |

#### `product_genres`（販売ジャンル マスタ）
admin が管理、ユーザー本人が選択。

| カラム | 型 | 説明 |
|---|---|---|
| id | text PK | 'vegetable' / 'fruit' / ... |
| label | text | 「野菜」「果物」 |
| icon_emoji | text | 🥬🍎 など |
| description | text nullable | |
| sort_order | int | |
| is_active | boolean | 論理削除 |
| created_by | uuid FK | admin |
| created_at, updated_at | timestamptz | |

**初期 seed**：vegetable🥬 / fruit🍎 / rice_grain🌾 / seafood🐟 / meat🍖 / bakery🥖 / dairy🧀 / tea_beverage🍵 / condiment🍯 / sake🍶 / dried_nuts🌰 / other🌱

#### `profile_product_genres`（多対多、最大5個）
| カラム | 型 |
|---|---|
| profile_id | uuid FK |
| genre_id | text FK |
| created_at | timestamptz |
| PK (profile_id, genre_id) |

### 3.3 コンテンツ系

#### `contents`（お知らせ・admin 発信）
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| author_id | uuid FK→profiles | 必ず admin |
| category | text | 'important' / 'news' / 'column' / 'seminar' |
| title | text | |
| body | text | 最大10,000文字 |
| pinned | boolean | |
| required_plan | text FK→plans nullable | NULL=全員 / 'standard'=Pro限定 |
| status | text | 'draft' / 'published' |
| published_at | timestamptz nullable | |
| last_edited_at | timestamptz nullable | |
| last_editor_id | uuid FK nullable | |
| created_at, updated_at | timestamptz | |
| deleted_at | timestamptz nullable | 論理削除 |

#### `content_attachments`
画像・YouTube動画を統一的に扱う。

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| content_id | uuid FK | |
| attachment_type | text | 'image' / 'video_embed' |
| storage_path | text nullable | 画像時 |
| external_url | text nullable | YouTube URL |
| external_provider | text nullable | 'youtube' |
| video_id | text nullable | YouTube 動画 ID |
| thumbnail_url | text nullable | |
| caption | text nullable | |
| display_order | int | |

#### `content_likes` / `content_comments`
| comments: id, content_id, author_id, body (max 1000), created_at, deleted_at, last_edited_at |
| likes: content_id, user_id, created_at（PK 複合）|

### 3.4 掲示板系

#### `channels`（掲示板チャンネル マスタ）
| カラム | 型 | 説明 |
|---|---|---|
| id | text PK | 'kpi' / 'sales' / 'customer' / 'admin_advice' |
| label | text | |
| description | text nullable | |
| icon_emoji | text nullable | |
| color | text | UI 色 |
| required_plan | text FK→plans | 'trial' / 'standard' / 'premium' |
| only_admin_can_post | boolean | |
| trial_preview_count | int nullable | trial 閲覧件数（NULL=全件） |
| sort_order | int | |
| is_active | boolean | |
| created_by | uuid FK | admin |
| created_at, updated_at | timestamptz | |

**初期 seed**：
| id | label | required_plan | only_admin_can_post | trial_preview |
|---|---|---|:---:|---|
| kpi | KPI改善 | trial | ✕ | 5件 |
| sales | 売上UP | trial | ✕ | 5件 |
| customer | 集客 | trial | ✕ | 5件 |
| admin_advice | 運営からのアドバイス | standard | ◯ | 非表示 |

#### `posts`
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| author_id | uuid FK | |
| channel_id | text FK→channels | |
| title | text | 最大100文字 |
| content | text | 最大5,000文字 |
| created_at, updated_at | timestamptz | |
| last_edited_at | timestamptz nullable | |
| last_editor_id | uuid FK nullable | |
| edited_by_admin | boolean default false | |
| deleted_at | timestamptz nullable | 論理削除 |
| deleted_by | uuid FK nullable | |

#### `post_attachments`
画像（最大3枚）＋ YouTube 動画（最大1個、admin のみ）

| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| post_id | uuid FK | |
| attachment_type | text | 'image' / 'video_embed' |
| storage_path | text nullable | |
| external_url | text nullable | YouTube 限定公開 URL |
| external_provider | text nullable | 'youtube' |
| video_id | text nullable | |
| thumbnail_url | text nullable | |
| caption | text nullable | |
| display_order | int | |

#### `post_likes` / `post_comments`
（contents と同様）

#### `post_tags`（タグマスタ）
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| label | text | 「MEO」「LINE公式」 |
| slug | text UNIQUE | 半角・小文字化 |
| description | text nullable | |
| usage_count | int | キャッシュ（トリガー更新） |
| created_by | uuid FK | member or admin |
| is_active | boolean | |
| created_at, updated_at | timestamptz | |

#### `post_tag_assignments`（多対多、最大5個/投稿）
| post_id | uuid FK | tag_id | uuid FK | created_at | PK 複合 |

### 3.5 月次データ系（admin レビューは v0.2）

#### `sales_reports`
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| author_id | uuid FK | |
| month | text | 'YYYY-MM' UNIQUE(author_id, month) |
| sales | numeric | 売上 |
| sales_target | numeric | 目標 |
| achievement_rate | numeric generated | `sales / NULLIF(sales_target, 0) * 100` |
| initiatives_count | int | 施策数 |
| note | text | 所感 |
| image_path | text nullable | |
| created_at, updated_at | timestamptz | |

#### `kpi_reports`
| カラム | 型 | 説明 |
|---|---|---|
| id, author_id, month | | |
| kpi_name | text | 「LINE開封率」など |
| before_value | numeric | |
| after_value | numeric | |
| unit | text | '%', '件', '円', '人', '回' |
| change_rate | numeric generated | `(after - before) / NULLIF(before, 0) * 100` |
| note, image_path, created_at, updated_at | | |

#### `cpa_reports`
| カラム | 型 | 説明 |
|---|---|---|
| id, author_id, month | | |
| campaign_name | text | |
| cost | numeric | |
| conversions | int | |
| cpa | numeric generated | `cost / NULLIF(conversions, 0)` |
| note, image_path, created_at, updated_at | | |

### 3.6 通知系

#### `notifications`
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| recipient_id | uuid FK | |
| type | text | （通知種別、後述） |
| title | text | |
| body | text | |
| link_path | text | |
| actor_id | uuid FK nullable | |
| read_at | timestamptz nullable | |
| created_at | timestamptz | |

既読 30 日経過で日次バッチ削除。未読は無期限保持。

#### `notification_preferences`
| カラム | 型 | デフォルト |
|---|---|:---:|
| user_id | uuid PK FK | — |
| new_post | boolean | true |
| new_announcement | boolean | true |
| comment_on_my_post | boolean | true |
| like_on_my_post | boolean | **false** |
| admin_broadcast | boolean | true（UI 上で OFF 不可） |
| updated_at | timestamptz | |

### 3.7 監査・運用系

#### `audit_logs`（INSERT のみ、UPDATE/DELETE 不可）
| カラム | 型 | 説明 |
|---|---|---|
| id | uuid PK | |
| actor_id | uuid FK | admin |
| action_type | text | （後述） |
| target_type | text | 'profile' / 'post' / 'content' / ... |
| target_id | uuid nullable | |
| payload | jsonb | 変更前後の値 |
| ip_address | inet nullable | |
| user_agent | text nullable | |
| created_at | timestamptz | |

`action_type` の主要値：
- `user_suspended` / `user_deleted` / `user_restored`
- `user_plan_changed`
- `post_edited_by_admin` / `post_deleted_by_admin`
- `content_deleted_by_admin`
- `invitation_created` / `invitation_revoked`
- `channel_created` / `channel_updated` / `channel_deleted`
- `product_genre_created` / `product_genre_deleted`
- `post_tag_merged` / `post_tag_deleted`

### 3.8 v0.2 で追加予定のテーブル

- `action_templates`（行動チェックリスト・マスタ）
- `monthly_submissions`（月次申告）
- `monthly_submission_actions`
- `monthly_reviews`（管理者レビュー）
- `monthly_award_categories`（賞カテゴリ）
- `monthly_awards`（表彰）
- `praises`（贈り物）

MVP では設計に含めるが**実装しない**。

---

## 4. RLS（Row Level Security）方針

### 4.1 全テーブル RLS 有効化

すべてのテーブルで RLS を有効化し、サーバーコードの認可ロジックを最小化。

### 4.2 主要ポリシー（簡略）

#### `profiles`
```sql
SELECT: 全認証ユーザー（admin は status='deleted' 含めて閲覧可）
INSERT: 招待受諾フロー時のみ（システム）
UPDATE: 自分の行のみ
DELETE: 不可
```

#### `posts`
```sql
SELECT:
  admin
  OR (
    deleted_at IS NULL
    AND author.status = 'active'
    AND viewer.plan.rank >= channel.required_plan.rank
  )

INSERT:
  author_id = auth.uid()
  AND ((NOT channel.only_admin_can_post) OR viewer.role = 'admin')
  AND viewer.plan.rank >= channel.required_plan.rank
  AND viewer.role IN ('member', 'admin')  -- trial は閲覧のみ

UPDATE: 著者本人 or admin
DELETE: 不可（論理削除のみ、UPDATE で deleted_at セット）
```

#### `sales_reports` / `kpi_reports` / `cpa_reports`
```sql
SELECT: viewer = author OR viewer.role = 'admin'
INSERT/UPDATE: viewer = author AND viewer.plan.rank >= 1（standard 以上）
DELETE: admin のみ
```

#### `contents`
```sql
SELECT:
  admin
  OR (
    status = 'published'
    AND deleted_at IS NULL
    AND (required_plan IS NULL OR viewer.plan.rank >= required_plan.rank)
  )
INSERT/UPDATE: admin のみ
```

#### `audit_logs`
```sql
SELECT: admin のみ
INSERT: システム（service_role）のみ
UPDATE/DELETE: 不可（誰も変更できない）
```

#### `notifications`
```sql
SELECT/UPDATE/DELETE: recipient_id = auth.uid()
INSERT: システム（service_role）
```

---

## 5. 認証・招待・退会フロー

### 5.1 招待→登録フロー

```
[admin が /admin/invites/new で招待]
  ├─ メールアドレス入力
  ├─ プラン選択（trial / standard / premium）
  └─ [招待を送る]
    ↓
[invitations に INSERT、Resend でメール送信]
  メール本文：
    {label} さん
    {ownerName} よりコミュニティに招待されました。
    下記リンクから登録してください（7日間有効）：
    https://{domain}/invite?token=xxxxx
    ↓
[受諾画面 /invite?token=xxx]
  ├─ トークン検証（accepted_at IS NULL かつ expires_at > now()）
  └─ 認証方法選択
       ├─ Googleで登録 → OAuth → メール一致確認 → 登録完了
       └─ パスワード設定 → 8文字以上＋英数字 → 登録完了
    ↓
[トランザクション]
  ├─ auth.users 作成（or 連携）
  ├─ profiles INSERT
  │   - role='member'
  │   - plan=invitations.plan
  │   - status='active'
  ├─ notification_preferences INSERT（デフォルト値）
  └─ invitations UPDATE（accepted_at=now()）
    ↓
[ホーム画面 /announcements へ]
  └─ オンボーディング 3 ステップツアー
```

### 5.2 ログインフロー

- Magic Link（メールでログインリンク）
- メール＋パスワード
- Google OAuth（連携済みアカウント）

3つの方法を `/login` で並列に提示。

### 5.3 不正ログイン対策

- 同一メールに対して **5 回失敗で 15 分ロックアウト**
- Supabase Auth の `auth.flow_state` を活用

### 5.4 セッション管理

- セッション有効期限：30 日（モバイル前提で長め）
- リフレッシュトークン有効期限：60 日

### 5.5 パスワード変更フロー

```
[/me/settings/account → パスワードを変更]
    ↓
[現在のパスワード入力 → 再認証]
    ↓
[新パスワード入力（8文字以上、英数字含む、現在と異なる）]
    ↓
[Supabase Auth updateUser({ password })]
    ↓
[本人にメール通知「パスワードが変更されました」]
[既存セッションは維持]
```

### 5.6 メールアドレス変更フロー

```
[新メール入力]
    ↓
[Supabase: updateUser({ email })]
    ↓
[新旧両方のメールに確認リンク送信（Supabase 標準）]
    ↓
[両方クリックされて確定]
    ↓
[audit_logs に email_changed を記録]
```

### 5.7 退会フロー

**メンバー本人による即時退会は不可**。Google フォームで申請 → admin が手動処理。

```
[ /me/settings/danger]
[「退会を申請する」ボタン]
    ↓
[Google フォーム（環境変数 NEXT_PUBLIC_FORM_WITHDRAWAL）を新規タブで開く]
    ↓
[ユーザーがフォーム送信]
    ↓
[しのぶさんがフォーム回答を確認]
    ↓
[/admin/members/:id で「退会させる」]
    ↓
[確認ダイアログ → 実行]
  ├─ profiles.status = 'deleted'
  ├─ profiles.deleted_at, deleted_by 設定
  ├─ auth.users.banned_until = 'infinity'
  ├─ audit_logs に user_deleted を記録
  └─ 既存セッション失効
    ↓
[RLS により、退会者の投稿/コメント/データは admin のみ閲覧可]
[コメントは「（退会したメンバー）」表記で残す]
```

90 日後の物理削除は v0.2。

### 5.8 一時停止フロー

```
[/admin/members/:id → 一時停止]
    ↓
[期間入力（1週間／1ヶ月／無期限）]
    ↓
[profiles.status='suspended', suspended_until 設定]
[auth.users.banned_until 設定]
[本人にメール通知]
    ↓
[期間経過で自動的に active に復帰（バッチ）]
```

---

## 6. 画面構成（IA・ルーティング）

### 6.1 ボトムナビ（4タブ）

```
┌──────────────────────────────────────┐
│      コンテンツ領域                   │
├──────┬──────┬──────┬──────────────┤
│ 📣   │ 🏠   │ 📊   │ 👥            │
│お知らせ│掲示板│データ│ 仲間           │
└──────┴──────┴──────┴──────────────┘
```

v0.2 で 5 タブ目「🏆 称賛」を追加予定。

### 6.2 ルーティング一覧

```
[未ログイン]
  /                    → ランディング
  /login               → ログイン画面
  /invite?token=xxx    → 招待受諾

[認証後（メンバー）]
  /announcements                → お知らせ（初期タブ）
  /announcements/:id            → お知らせ詳細

  /feed                         → 掲示板
  /feed/:id                     → 投稿詳細
  /feed/new                     → 新規投稿

  /data                         → データ
  /data/sales/new               → 売上報告フォーム
  /data/kpi/new                 → KPI改善フォーム
  /data/cpa/new                 → 施策CPAフォーム

  /members                      → 仲間一覧
  /members/:id                  → 他人のプロフィール

  /me                           → 自分のプロフィール
  /me/settings                  → 設定ハブ
  /me/settings/profile          → プロフィール編集
  /me/settings/account          → アカウント設定（メール/パスワード）
  /me/settings/notifications    → 通知設定
  /me/settings/privacy          → 公開設定
  /me/settings/plan             → プラン情報・変更申請
  /me/settings/danger           → 退会申請

  /notifications                → 通知一覧
  /search                       → 検索

  /upgrade                      → アップグレード案内（ロック機能から遷移）

[admin 専用]
  /admin                        → ダッシュボード
  /admin/members                → メンバー管理
  /admin/members/:id            → メンバー個別詳細
  /admin/members/deleted        → 退会済み一覧（復活可）
  /admin/invites                → 招待管理
  /admin/invites/new            → 新規招待
  /admin/announcements          → お知らせ管理
  /admin/announcements/new      → 新規配信
  /admin/posts                  → 投稿モデレーション
  /admin/comments               → コメントモデレーション
  /admin/post-tags              → 投稿タグ管理
  /admin/channels               → チャンネル管理
  /admin/product-genres         → 販売ジャンル マスタ管理
  /admin/broadcasts             → 全体通知送信
  /admin/audit-log              → 監査ログ
```

### 6.3 ヘッダー

```
[アプリ名]              🔍  🔔  👤
              検索  通知  プロフ
```

- アプリ名：左、Noto Serif JP
- 検索アイコン：タップでオーバーレイ検索画面
- 通知ベル：未読件数バッジ付き、タップで `/notifications`
- プロフ：自分のアバター、タップで `/me`

---

## 7. 各機能の詳細仕様

### 7.1 お知らせ（📣 `/announcements`）

#### 7.1.1 概要
admin（しのぶさん）からの一方向配信。メンバーは閲覧・いいね・コメント可能。

#### 7.1.2 カテゴリ（4種）

| id | label | アイコン | 色 |
|---|---|---|---|
| important | 重要なお知らせ | ⚠️ | テラコッタ |
| news | ニュース | 📰 | ネイビー |
| column | コラム | 📖 | オリーブ |
| seminar | セミナー情報 | 📅 | マスタード |

#### 7.1.3 機能

- ピン留め（無期限、admin が手動解除）
- カテゴリ絞り込み
- いいね・コメント
- 画像添付（最大3枚）
- 動画埋め込み（YouTube 限定公開、1個まで）
- `required_plan` で Pro 限定記事の制御
- 編集履歴（last_edited_at / last_editor_id）
- 削除（論理削除）

#### 7.1.4 オーナーヘッダー

ページ上部に admin（しのぶさん）の紹介カード（テラコッタグラデーション）を表示。

### 7.2 掲示板（🏠 `/feed`）

#### 7.2.1 概要
メンバー同士の成果共有・知見交換。チャンネル × タグ × 検索で情報整理。

#### 7.2.2 チャンネル（初期4種）

| id | label | required_plan | only_admin_can_post |
|---|---|---|:---:|
| kpi | KPI改善 | trial | ✕ |
| sales | 売上UP | trial | ✕ |
| customer | 集客 | trial | ✕ |
| admin_advice | 運営からのアドバイス | standard | ◯ |

admin が追加・改名・削除（論理削除）可能。

#### 7.2.3 投稿

- タイトル（100文字）+ 本文（5,000文字）
- チャンネル選択（必須、単一）
- タグ（最大5個、自由作成可）
- 画像添付（最大3枚、5MB、自動圧縮）
- 動画埋め込み（YouTube のみ、1個、admin のみ）
- 編集無期限（編集マーク付与）

#### 7.2.4 タグ

- member が投稿時に自由作成
- オートコンプリート（完全一致＞前方一致＞使用回数順）
- admin が後から統合・改名・削除可能
- slug は半角・小文字化、label は表記そのまま

#### 7.2.5 お試しプランの閲覧制限

trial プランのユーザーは各チャンネルの**最新5件のみ**閲覧可能。それ以上はぼかし表示＋アップグレード CTA。

#### 7.2.6 検索

- ヘッダー🔍からアクセス
- 対象：title / content / tag.label
- フィルター：チャンネル、タグ、期間
- 検索方式：PostgreSQL ILIKE + タグ完全一致
- 最小文字数：2文字
- AND/OR：MVP は OR、AND は v0.2
- 検索履歴：localStorage のみ

### 7.3 データ（📊 `/data`）

#### 7.3.1 概要
スタンダード以上の機能。月次の売上 / KPI / CPA を**自分専用で記録**。MVP では「みんな」表示なし、レビューもなし。

#### 7.3.2 trial プランの挙動

タブをタップするとアップグレード案内画面（`/upgrade`）を表示。

#### 7.3.3 データ種別

| 種別 | 入力項目 |
|---|---|
| 売上報告 | 月、売上、目標、施策数、所感、画像 |
| KPI改善 | 月、KPI 指標名、改善前、改善後、単位、所感、画像 |
| 施策CPA | 月、施策名、費用、獲得数、所感、画像 |

`achievement_rate` / `change_rate` / `cpa` は generated カラムで自動計算。

#### 7.3.4 入力ルール

- 同月同種別の重複は不可（UNIQUE 制約）
- 月内であれば何度でも編集可能
- 月末経過後は admin のみ編集可
- 削除は admin のみ

### 7.4 仲間（👥 `/members`）

#### 7.4.1 機能

- メンバー一覧（アクティブのみ）
- 販売ジャンルフィルタ
- 名前検索（簡易）
- 各メンバーカードに販売ジャンルバッジ表示
- カードタップで詳細プロフィール `/members/:id`

#### 7.4.2 プロフィール詳細（他人）

- 個人情報（名前・地域・自己紹介）
- 屋号情報（店名・扱う商品・お店説明）
- 会社情報（公開設定されている場合）
- 販売ジャンルバッジ
- 過去の投稿一覧

### 7.5 設定・プロフィール（`/me`）

#### 7.5.1 プロフィール編集（`/me/settings/profile`）

セクション構成：
1. **個人**：アイコン（絵文字 or 画像）、表示名、自己紹介
2. **屋号・お店**：屋号、地域、扱う商品、お店説明、お店写真
3. **会社情報**：法人名、業態、住所、電話、サイト、SNSリンク
4. **販売ジャンル**：最大5個まで複数選択（バッジになる）
5. **公開設定**：（v0.2 で売上開示など追加）

#### 7.5.2 アカウント設定（`/me/settings/account`）

- メールアドレス変更
- パスワード変更
- ログイン方法（Google 連携の有無）
- Google 連携の追加・解除

#### 7.5.3 プラン情報（`/me/settings/plan`）

```
プラン
──────────────────────
現在：お試しプラン（月額 980円・税込）
[プラン変更を申し込む]   ← Google フォーム
```

#### 7.5.4 退会申請（`/me/settings/danger`）

```
退会
──────────────────────
アカウントを退会される場合は、下記から
ご連絡ください。運営が確認のうえ、退会処理を行います。
[📝 退会を申請する]   ← Google フォーム
```

### 7.6 通知（🔔 `/notifications`）

#### 7.6.1 通知タイプ（MVP）

| タイプ | トリガー | 初期ON/OFF | OFF可 | メール |
|---|---|:---:|:---:|:---:|
| `new_post` | 掲示板新規投稿 | ON | ◯ | ✕ |
| `new_announcement` | お知らせ新規配信 | ON | ◯ | ✕ |
| `comment_on_my_post` | 自分の投稿にコメント | ON | ◯ | ✕ |
| `like_on_my_post` | 自分の投稿にいいね | OFF | ◯ | ✕ |
| `admin_broadcast` | 管理者の全体通知 | ON | ✕ | ◯ |
| `account_suspended` | 一時停止された | ON | ✕ | ◯ |
| `account_deleted` | 退会された | ON | ✕ | ◯ |
| `account_restored` | 復活された | ON | ✕ | ◯ |
| `post_edited_by_admin` | 投稿が admin に編集された | ON | ✕ | ✕ |
| `post_deleted_by_admin` | 投稿が admin に削除された | ON | ✕ | ✕ |
| `comment_edited_by_admin` | コメントが admin に編集された | ON | ✕ | ✕ |
| `comment_deleted_by_admin` | コメントが admin に削除された | ON | ✕ | ✕ |
| `plan_changed` | プランが変更された（admin 操作後） | ON | ✕ | ✕ |
| 招待・パスワードリセット | — | — | — | ◯ メール必須 |

v0.2 で追加予定：
- `review_published`（月次レビュー公開）
- `award_received`（表彰）
- `praise_received`（贈り物）
- `submission_reminder`（月次提出リマインダー）

#### 7.6.2 通知一覧画面

- 時系列で表示
- 既読/未読の視覚区別
- クリックで該当ページに遷移し自動既読
- 「すべて既読にする」ボタン
- 既読 30 日経過で自動削除（バッチ）

#### 7.6.3 配信ロジック

```
[イベント発生]
    ↓
[受信者リスト抽出]
    ↓
[notification_preferences で ON のユーザーに絞る]
    ↓
[notifications INSERT]
    ↓
[Supabase Realtime で受信者へ配信]
```

メール並走は Resend で送信。月次リマインダー（v0.2 で復活時）は pg_cron で実装。

---

## 8. 管理者機能

### 8.1 ダッシュボード（`/admin`）

サマリーカード：
- アクティブ会員数 / 招待中 / 停止中
- 今月の新規投稿数 / 新規コメント数

未処理タスク：
- 招待未受諾 N 件
- 一時停止中 N 人

最近の活動：
- 新規投稿
- 新規コメント

### 8.2 メンバー管理（`/admin/members`）

- 一覧（プラン・ステータス・販売ジャンル・最終アクセス）
- ステータスフィルタ（active / suspended / deleted）
- プラン変更（プルダウン → 保存）
- ステータス変更（一時停止 / 退会させる / 復活）

### 8.3 個別メンバー詳細（`/admin/members/:id`）

- 基本情報＋活動統計（投稿数・コメント数・データ数）
- プラン変更
- ステータス変更（一時停止／退会／復活）
- 監査ログへのリンク

### 8.4 投稿モデレーション（`/admin/posts`）

- 全投稿の一覧（退会者の投稿も閲覧可）
- 編集（edited_by_admin=true 自動セット、本人通知）
- 削除（論理削除、削除理由入力、本人通知）

### 8.5 マスタ管理

- `/admin/channels`：チャンネル CRUD
- `/admin/product-genres`：販売ジャンル CRUD
- `/admin/post-tags`：タグ整理（統合・改名・削除）

#### 削除時の挙動（共通）
- マスタは論理削除（is_active=false）
- 関連レコードは CASCADE 物理削除
- 削除前に「影響範囲（{N}件の投稿/メンバー）」を警告
- audit_logs に記録

### 8.6 招待管理（`/admin/invites`）

- pending：未受諾の招待一覧（有効期限表示、再送・取消可）
- accepted：受諾済みの履歴
- 新規招待発行

### 8.7 全体通知（`/admin/broadcasts`）

- タイトル・本文入力
- メール並走の有無を選択（admin_broadcast 通知）
- 送信 → 全 active member の notifications に INSERT、メール一斉送信

### 8.8 監査ログ（`/admin/audit-log`）

- INSERT only、UPDATE/DELETE 不可
- フィルタ：actor / action_type / target_type / 期間
- ペイロード詳細表示

### 8.9 admin の制約

- **自分自身のロール変更不可**
- **自分自身の停止・退会不可**
- 重要操作（退会・削除）はすべて確認ダイアログ必須

---

## 9. ユーザー削除・停止・編集フロー

### 9.1 退会フロー（admin 操作）

§5.7 を参照。

### 9.2 一時停止フロー

§5.8 を参照。

### 9.3 投稿編集フロー（admin による）

```
[/admin/posts/:id を開く]
    ↓
[編集フォーム＋編集理由（任意）]
    ↓
[保存]
  ├─ posts UPDATE
  ├─ last_edited_at, last_editor_id 更新
  ├─ edited_by_admin = true
  └─ audit_logs に post_edited_by_admin を記録
    ↓
[他メンバー表示]
  └─ 「※ 運営により編集されました（5/26）」を投稿下部に表示
    ↓
[著者本人に通知]
  「あなたの投稿が運営により編集されました」
```

### 9.4 投稿削除フロー（admin による）

```
[admin が「削除」を選択]
    ↓
[確認＋削除理由入力（任意）]
    ↓
[posts.deleted_at = now(), deleted_by = admin.id]
[audit_logs 記録]
    ↓
[他メンバー：非表示]
[admin：「（削除済み）」表示で閲覧可]
    ↓
[著者本人に通知]
  「あなたの投稿が運営により削除されました。理由：◯◯」
```

---

## 10. プラン変更・お問い合わせ（Google フォーム連携）

### 10.1 Google フォーム化する機能

| 機能 | 環境変数 |
|---|---|
| プラン変更申請 | `NEXT_PUBLIC_FORM_PLAN_UPGRADE` |
| 退会申請 | `NEXT_PUBLIC_FORM_WITHDRAWAL` |
| お問い合わせ | `NEXT_PUBLIC_FORM_INQUIRY` |
| 不具合報告 | `NEXT_PUBLIC_FORM_BUG_REPORT` |
| セミナー申込 | `NEXT_PUBLIC_FORM_SEMINAR`（必要時） |

### 10.2 URL prefill

可能であれば氏名・メール・希望プランをクエリパラメータで prefill：

```
https://docs.google.com/forms/d/e/xxxxx/viewform
  ?entry.111=田島 和子
  ?entry.222=tajima@example.com
  ?entry.333=スタンダードプラン
```

各フォーム質問の `entry.id` を環境変数で管理：

```
NEXT_PUBLIC_FORM_PLAN_ENTRY_NAME=entry.111
NEXT_PUBLIC_FORM_PLAN_ENTRY_EMAIL=entry.222
NEXT_PUBLIC_FORM_PLAN_ENTRY_REQUESTED_PLAN=entry.333
```

### 10.3 共通コンポーネント

`ExternalFormLink` を実装：
- props: `formKey`, `prefillData`
- `target="_blank"` `rel="noopener noreferrer"` で新規タブ

### 10.4 フロー（プラン変更）

```
[アップグレード案内画面 or /me/settings/plan]
    ↓
[「申し込む」ボタン]
    ↓
[Google フォームを新規タブで開く（prefill 済み）]
    ↓
[ユーザー送信]
    ↓
[しのぶさんが回答を確認＋振込確認]
    ↓
[/admin/members/:id でプランを直接変更]
    ↓
[本人に通知「プランが変更されました」]
```

---

## 11. 動画コンテンツ仕様

### 11.1 動画の取り扱い

- **YouTube 埋め込みのみ**対応（Vimeo・直接アップロードは対応しない）
- YouTube 上では**限定公開**前提
- admin のみ投稿可能
- 1 投稿あたり 1 個まで

### 11.2 投稿 UI（admin のみ）

```
[新規投稿/お知らせフォーム]
[🎬 動画を追加]
  ↓
[URL 入力]
  https://www.youtube.com/watch?v=xxxxx
  または
  https://youtu.be/xxxxx
  ↓
[URL バリデーション]
  ├─ youtube.com / youtu.be のみ許可
  ├─ video_id 抽出
  └─ 不正な URL はエラー
  ↓
[サムネ自動取得]
  https://img.youtube.com/vi/{video_id}/maxresdefault.jpg
  ↓
[プレビュー表示]
```

### 11.3 表示

```
[投稿カード一覧]
  ├─ サムネイル画像のみ表示
  └─ 再生ボタンオーバーレイ
      ↓ タップ
[詳細画面で iframe 遅延ロード]
  <iframe
    src="https://www.youtube.com/embed/{video_id}"
    allowfullscreen
    sandbox="allow-scripts allow-same-origin allow-presentation"
  />
```

### 11.4 セキュリティ

- URL バリデーション：YouTube ドメインのみ許可
- iframe sandbox：`allow-scripts allow-same-origin allow-presentation` のみ
- video_id の英数字＋ハイフン＋アンダースコア以外を拒否

---

## 12. 画像処理仕様（圧縮・アップロード）

### 12.1 ライブラリ

`browser-image-compression`

```bash
pnpm add browser-image-compression
```

### 12.2 用途別プリセット

| 用途 | 最大長辺 | 品質 | 目標サイズ |
|---|---|---|---|
| アバター | 512px | 0.8 | 200KB |
| お店写真 | 1280px | 0.85 | 800KB |
| 投稿画像 | 1600px | 0.85 | 1.5MB |
| お知らせ画像 | 1600px | 0.85 | 1.5MB |
| 月次データ画像 | 1280px | 0.85 | 1.0MB |

### 12.3 共通ユーティリティ：`lib/image-compression.ts`

```typescript
import imageCompression from 'browser-image-compression';

export type ImagePreset =
  | 'avatar' | 'store' | 'post' | 'announcement' | 'data';

const PRESETS: Record<ImagePreset, {
  maxWidthOrHeight: number;
  initialQuality: number;
  maxSizeMB: number;
}> = {
  avatar:       { maxWidthOrHeight: 512,  initialQuality: 0.80, maxSizeMB: 0.2 },
  store:        { maxWidthOrHeight: 1280, initialQuality: 0.85, maxSizeMB: 0.8 },
  post:         { maxWidthOrHeight: 1600, initialQuality: 0.85, maxSizeMB: 1.5 },
  announcement: { maxWidthOrHeight: 1600, initialQuality: 0.85, maxSizeMB: 1.5 },
  data:         { maxWidthOrHeight: 1280, initialQuality: 0.85, maxSizeMB: 1.0 },
};

export async function compressImage(
  file: File,
  preset: ImagePreset
): Promise<File> {
  const opts = {
    ...PRESETS[preset],
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  };
  return await imageCompression(file, opts);
}
```

### 12.4 処理フロー

```
[ユーザー画像選択]
    ↓
[クライアント圧縮（HEIC→JPEG 自動変換）]
    ↓
[プレビュー＋圧縮結果表示「4.2MB → 380KB」]
    ↓
[Supabase Storage アップロード]
    ↓
[サーバー側マジックバイト検証＋サイズ上限チェック]
    ↓
[失敗時：Storage ファイル削除]
[成功時：DB に storage_path 保存]
```

### 12.5 Storage パス命名

```
{bucket}/{user_id}/{type}/{uuid}.jpg

例：
  posts/abc-123/avatar/de4-5fg.jpg
  posts/abc-123/post/h7i-8jk.jpg
```

UUID で一意性保証、パストラバーサル防止。

### 12.6 削除時の Storage クリーンアップ

日次バッチで「論理削除されたレコードの画像」を Storage から物理削除。

---

## 13. β期間運用

### 13.1 方針

シンプル運用。専用フラグは持たず、運用で対応。

### 13.2 環境変数

```
NEXT_PUBLIC_BETA_MODE=true
NEXT_PUBLIC_BETA_END_DATE=2026-07-31
```

### 13.3 β期間中の表示

ヘッダー直下に**β期間バナー**を表示：

```
🌱 βテスト期間中 〜 2026年7月31日まで（無料体験中）
```

`BETA_END_DATE` を過ぎたら自動的に非表示。

### 13.4 β期間中の招待・課金

- 初期βメンバー 5〜10名を Google フォームで募集
- admin が「スタンダード or プレミアム相当の権限」で招待（plan は手動で `standard` で発行）
- 課金は**無料**（しのぶさんが個別に伝達）
- β期間終了 1 週間前に全体通知
- 終了時に admin が一括 or 個別でプランを変更（継続：standard / 様子見：trial）

### 13.5 βフィードバック収集

「お問い合わせ」Google フォームを兼用。

### 13.6 β初期メンバーの可視化（v0.2）

`profiles.created_at` で「β期間前の参加」を判定可能。「β初期メンバー」称号は v0.2 で実装。

---

## 14. PWA・モバイル対応

### 14.1 実装方針

`next-pwa` を採用。

```bash
pnpm add next-pwa
```

### 14.2 `app/manifest.ts`

```typescript
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'マーケティングCampコミュニティ（MCC）',
    short_name: 'CAMP',
    description: '食品生産者のためのコミュニティ',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf5ed',
    theme_color: '#c05e3f',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

iOS Safari 用に `apple-touch-icon` も別途配置。

### 14.3 インストール誘導

50代向けに「ホーム画面に追加」を画像付きで案内する初回チュートリアル。

- iOS：共有→ホーム画面に追加のステップ画像
- Android：自動表示のインストールバナー＋カスタム説明

### 14.4 オフライン対応

限定的。「圏外です」UI のみ。本格的な Sync は v0.2。

### 14.5 Push 通知

MVP では非対応。v0.2 で iOS 16.4+ 対応を検討。

---

## 15. デプロイ・インフラ

### 15.1 構成

```
[GitHub main ブランチ push]
    ↓
[GitHub Actions]
  ├─ pnpm install --frozen-lockfile
  ├─ pnpm build
  └─ SSH 経由で rsync/scp デプロイ
    ↓
[自前サーバー]
  ├─ Nginx（SSL 終端、リバースプロキシ）
  ├─ Next.js（systemd / PM2）
  └─ ※ Supabase は Cloud（バックアップを自前サーバーに保持）
    ↓
[Supabase Cloud（DB / Auth / Storage / Realtime）]
```

### 15.2 サーバー側必要要件

- Node.js 20 LTS
- systemd または PM2
- Nginx + Let's Encrypt
- deploy 専用ユーザー（sudo systemctl restart のみ許可）
- ディスク容量（バックアップ用）：50GB 以上推奨

### 15.3 環境変数（サーバー `.env.production`）

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# メール送信
RESEND_API_KEY=...
RESEND_FROM_EMAIL=noreply@example.com

# β期間
NEXT_PUBLIC_BETA_MODE=true
NEXT_PUBLIC_BETA_END_DATE=2026-07-31

# Google フォーム URL（詳細は details/google-forms.md を参照）
NEXT_PUBLIC_FORM_PLAN_UPGRADE=https://docs.google.com/forms/.../viewform
NEXT_PUBLIC_FORM_WITHDRAWAL=https://docs.google.com/forms/.../viewform
NEXT_PUBLIC_FORM_INQUIRY=https://docs.google.com/forms/.../viewform
NEXT_PUBLIC_FORM_BUG_REPORT=https://docs.google.com/forms/.../viewform
NEXT_PUBLIC_FORM_SEMINAR=https://docs.google.com/forms/.../viewform

# Google フォーム prefill 用 entry ID
# (各フォームの「事前入力された URL を取得」で得た entry.xxx 値)
NEXT_PUBLIC_FORM_PLAN_ENTRY_NAME=entry.111
NEXT_PUBLIC_FORM_PLAN_ENTRY_EMAIL=entry.222
NEXT_PUBLIC_FORM_PLAN_ENTRY_CURRENT_PLAN=entry.333
NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_NAME=entry.111
NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_EMAIL=entry.222
NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_CURRENT_PLAN=entry.333
NEXT_PUBLIC_FORM_INQUIRY_ENTRY_NAME=entry.111
NEXT_PUBLIC_FORM_INQUIRY_ENTRY_EMAIL=entry.222
NEXT_PUBLIC_FORM_BUG_REPORT_ENTRY_NAME=entry.111
NEXT_PUBLIC_FORM_BUG_REPORT_ENTRY_EMAIL=entry.222
NEXT_PUBLIC_FORM_SEMINAR_ENTRY_NAME=entry.111
NEXT_PUBLIC_FORM_SEMINAR_ENTRY_EMAIL=entry.222
NEXT_PUBLIC_FORM_SEMINAR_ENTRY_CURRENT_PLAN=entry.333

# アクセス解析・エラー監視
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=...
SENTRY_DSN=...
```

### 15.4 GitHub Actions Secrets

- `SSH_HOST`, `SSH_USER`, `SSH_KEY`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`
- `RESEND_API_KEY`

`SUPABASE_SERVICE_ROLE_KEY` は GitHub Actions には置かず、サーバー直接配置のみ。

### 15.5 バックアップ

- Supabase 自動バックアップ（Pro プランの PITR 7日）
- 追加で **pg_dump を毎日深夜実行 → 自前サーバーへ rsync**（cron）
- 30 日ローテーション

### 15.6 監視

- Plausible Analytics（PV / イベント）
- Sentry（エラー監視）
- Supabase ダッシュボード（DB / Auth 標準メトリクス）

### 15.7 運用コスト試算

| 規模 | 月額 |
|---|---|
| β（5〜10人） | 約 200円（ドメインのみ） |
| 20〜50人 | 約 200円〜（Supabase Free 内） |
| 100〜500人 | 約 4,000円（Supabase Pro $25） |
| 1,000〜2,000人 | 約 8,000〜12,000円 |

---

## 16. セキュリティ要件

### 16.1 認証・認可

- [ ] 招待トークン：64文字ランダム、7日有効、使い回し不可
- [ ] SSO ルートで「招待メール ≠ Google メール」を拒否
- [ ] パスワード変更時の再認証必須
- [ ] パスワード最低要件：8文字以上、英数字含む
- [ ] ロックアウト：5回失敗で 15分
- [ ] セッション：30日、リフレッシュ 60日

### 16.2 RLS

- [ ] 全テーブル RLS 有効化
- [ ] admin role 判定がポリシーで担保（クライアント信用しない）
- [ ] 退会者・停止者のデータが member には見えない
- [ ] Pro 限定コンテンツ・チャンネルが trial には見えない

### 16.3 入力バリデーション

- [ ] テキスト長制限：投稿100/5000、コメント1000、お知らせ10000
- [ ] 画像 MIME マジックバイト検証（拡張子だけでは不可）
- [ ] 画像サイズ：最終 5MB 上限
- [ ] URL バリデーション：javascript: スキーム禁止
- [ ] HTML エスケープ：投稿本文の表示時
- [ ] YouTube URL バリデーション：ドメイン制限＋video_id サニタイズ

### 16.4 API・データ保護

- [ ] CSRF：Next.js Server Actions の組込み
- [ ] レート制限：招待 admin 10/分、コメント member 30/分
- [ ] audit_logs：INSERT only、UPDATE/DELETE 不可（RLS）
- [ ] ファイル名 UUID 化（パストラバーサル防止）

### 16.5 シークレット管理

- [ ] `.env.production` を `.gitignore` で除外
- [ ] `SUPABASE_SERVICE_ROLE_KEY` がクライアントにバンドルされない
- [ ] GitHub Actions Secrets の権限スコープ最小
- [ ] SSH 鍵は deploy 専用ユーザー（root 不可）

### 16.6 コンプライアンス

- [ ] 利用規約・プライバシーポリシー（招待受諾画面で同意チェック）
- [ ] 特定商取引法表示（料金プラン明示）
- [ ] データ保管場所開示（プラポリに「Supabase」明示）
- [ ] 個人情報取扱事業者として運営

### 16.7 セキュリティレビュー実施

設計確定時に `ecc:security-reviewer` agent によるレビューを実施。

---

## 17. 監査ログ

### 17.1 記録対象イベント

```
user_suspended / user_deleted / user_restored
user_plan_changed
post_edited_by_admin / post_deleted_by_admin
content_deleted_by_admin
invitation_created / invitation_revoked / invitation_resent
channel_created / channel_updated / channel_deleted
product_genre_created / product_genre_updated / product_genre_deleted
post_tag_created / post_tag_merged / post_tag_deleted
broadcast_sent
email_changed
password_changed
```

### 17.2 ペイロード

`jsonb` で柔軟に：

```json
{
  "before": { "plan": "trial" },
  "after": { "plan": "standard" },
  "reason": "振込確認済み（5/26）"
}
```

### 17.3 閲覧

`/admin/audit-log` で admin のみ閲覧可。フィルタ・検索可能。

### 17.4 保管期間

**無期限保持**（コンプライアンス対応）。

---

## 18. ローンチ準備

### 18.1 初期コンテンツ seed

- ウェルカム投稿 1件（important）
- 利用ガイド 3件（news）
- FAQ 5件（column）

### 18.2 マスタ seed

- 販売ジャンル 12 種
- 掲示板チャンネル 4 種（KPI改善 / 売上UP / 集客 / 運営からのアドバイス）

### 18.3 βリリースまでのチェックリスト

- [ ] 全テーブル作成・RLS 設定
- [ ] seed 投入
- [ ] 招待メールテンプレ確認
- [ ] Google フォーム 4 種類作成
- [ ] 環境変数設定
- [ ] PWA manifest・アイコン設置
- [ ] 利用規約・プライバシーポリシー公開
- [ ] 特商法表示公開
- [ ] セキュリティレビュー実施
- [ ] 初期メンバー招待

---

## 19. MVP 機能スコープ確定リスト

### 19.1 含む機能

- 招待制認証（メール+PW / Google SSO）
- 3プラン区分（trial / standard / premium）
- プロフィール（個人・屋号・会社・販売ジャンル）
- お知らせ（admin 発信、4カテゴリ・ピン留め・動画）
- 掲示板（チャンネル・タグ・検索・画像・動画）
- データ記録（売上 / KPI / CPA、自分専用）
- 仲間一覧（販売ジャンルフィルタ）
- 通知（アプリ内・種別ごとON/OFF）
- 販売ジャンル バッジ
- 管理者画面（メンバー・招待・モデレーション・マスタ管理・監査ログ）
- PWA 対応
- β期間運用

### 19.2 含まない機能（v0.2 以降）

- ランキング（行動王・成長賞・挑戦賞）
- 月次行動チェックリスト（自己申告）
- **月次レビュー（admin 点数＋講評）**
- 月次表彰
- 称賛タブ
- 称賛の贈り物
- 「データ」タブの「みんな」表示
- 月次データ未入力者への自動通知
- プランバッジ（銀・金）
- PWA Push 通知
- 90 日経過後の物理削除
- 複数 admin
- LINE Login
- 既存 PHP（GA 連携）の移植
- Stripe 課金連携
- 全文検索（PostgreSQL FTS）
- 通報機能
- 多言語化
- ダークモード
- 文字サイズ調整機能
- 検索 AND
- 投稿の予約配信

---

## 20. v0.2 以降の検討事項

| # | 項目 | 優先度 |
|---|---|---|
| C-1 | 月次レビュー・ランキング機能 | 高（モチベーション向上） |
| C-2 | 称賛・贈り物機能 | 高 |
| C-3 | 「データ」タブの「みんな」表示 | 中 |
| C-4 | 月次データ未入力リマインダー | 中 |
| C-5 | PWA Push 通知 | 中 |
| C-6 | 既存 PHP（GA 連携）移植 | 中 |
| C-7 | 全文検索（FTS） | 中（500件超で） |
| C-8 | Stripe 課金 | 中 |
| C-9 | 通報機能 | 低 |
| C-10 | LINE Login | 低 |
| C-11 | 複数 admin | 低 |
| C-12 | 90日物理削除 | 低 |
| C-13 | データエクスポート | 低 |
| C-14 | 検索 AND | 低 |
| C-15 | 多言語化 | 低 |

---

## 21. 残る未決事項

### 21.1 サービス情報（後日連携待ち）

| # | 項目 | 状態 |
|---|---|---|
| F-3 | プレミアム特典の詳細文言 | **後日連携**（サービス説明資料） |
| F-4 | アプリ正式名称 | ✓ **確定**：「マーケティングCampコミュニティ（MCC）」 |
| F-5 | ドメイン名 | **後日連携** |

### 21.2 サーバー実態調査

| 項目 | 状態 |
|---|---|
| 管理会社・サービス特定 | **要調査**（請求書から） |
| OS / Docker 可否 | 未確認 |
| Node.js インストール可否 | 未確認 |
| 契約上の責任範囲（OS / アプリ / データ） | 未確認 |
| バックアップ運用 | 未確認 |

これらが判明次第、Self-hosted Supabase 採用の是非を最終決定。

### 21.3 法務準備（しのぶさん側）

- 利用規約の執筆（雛形は当方提供可能）
- プライバシーポリシーの執筆
- 特定商取引法表示の準備

---

## 22. 用語集

| 用語 | 意味 |
|---|---|
| admin | 運営者ロール（しのぶさん） |
| member | 一般会員ロール |
| trial / standard / premium | 3つのプラン |
| 販売ジャンル | 売っているもののカテゴリ（野菜・果物など）。バッジとして可視化 |
| バッジ | 名前の横に表示される販売ジャンルアイコン |
| チャンネル | 掲示板のカテゴリ分け（管理者管理） |
| お知らせ | admin 発信の一方向配信コンテンツ |
| 月次データ | 売上 / KPI改善 / 施策CPA の3種類 |
| 月次レビュー | admin による点数＋講評（v0.2） |
| ランキング | 月次表彰（v0.2） |
| 贈り物 | 称賛の物理ギフト送信トリガー（v0.2） |
| β期間 | 本ローンチ前の試験運用期間 |
| RLS | Row Level Security（Supabase の行レベル権限制御） |
| PWA | Progressive Web App（ホーム画面追加可能な Web アプリ） |

---

**設計書の本文ここまで。**

次のアクション：
1. しのぶさんによるレビュー・修正依頼の受領
2. `ecc:security-reviewer` agent によるセキュリティレビュー
3. サーバー実態調査の依頼文作成
4. F-3〜F-5 の確定情報受領後に該当箇所を更新
5. CLAUDE.md 作成と Next.js プロジェクト初期セットアップ
