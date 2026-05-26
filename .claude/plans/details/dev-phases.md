# MCC MVP 開発フェーズ分割計画

**最終更新**: 2026-05-26
**対象**: マーケティングCampコミュニティ（MCC）MVP（v0.1）
**前提ドキュメント**:
- `.claude/plans/foods-community-design.plan.md`（設計書本体）
- `.claude/plans/details/data-model.md`
- `.claude/plans/details/api-endpoints.md`
- `.claude/plans/details/rls-policies.md`

本書は MVP を **6 Phase / 6〜10 週間** に分割し、Sprint 単位（1〜2 週間）で進めるための実行計画です。実装コードは含みません。

---

## 1. 開発方針

### 1.1 開発体制

- **個人開発**：しのぶさん主導 + Claude Code による実装支援
- **ペア開発スタイル**：しのぶさんが要件・動作確認・意思決定、Claude が実装案・コード生成・レビュー
- **小さく動かす**：各 Sprint で「実際に手元で触れる成果物」を必ず出す

### 1.2 Sprint の進め方

| 項目 | 方針 |
|---|---|
| Sprint 長 | 1〜2 週間（タスク量で柔軟に調整） |
| 着手時 | `/plan` を実行して Phase 単位の TODO を可視化 |
| セッション開始時 | `git status` で前回の変更を確認 → 必要なら commit |
| 完了時 | 動作確認 → `git commit` → 次タスクへ |
| ブランチ | `main` + `feature/<phase>-<slug>` |
| マージ | PR ベース（セルフレビュー、CI が緑になったら merge） |

### 1.3 テスト方針

**MVP では TDD を厳密に適用しない**。機能優先で進めるが、以下のみテストを書く：

- RLS ポリシー（クリティカル、誤ると情報漏えい）
- 招待トークン検証ロジック
- プラン権限判定（`viewer.plan.rank >= channel.required_plan.rank` の境界条件）
- 画像バリデーション（MIME マジックバイト・YouTube URL）
- generated カラムの計算式（achievement_rate / change_rate / cpa）

その他の UI・CRUD・遷移は手動テストで担保。

### 1.4 コミット・PR ルール

- Conventional Commits（`feat: ` / `fix: ` / `refactor: ` / `docs: ` / `chore: `）
- 1 PR = 1 関心（複数機能を1 PR に混ぜない）
- PR タイトルは「[Phase 2] 掲示板の投稿一覧画面」など Phase 番号を含める
- PR 本文は変更内容＋手動確認手順を箇条書き

### 1.5 Definition of Done（共通）

各 Phase 内のタスクは以下を全て満たした時点で完了：

- [ ] ローカルで実装し、`pnpm dev` で動作確認済み
- [ ] TypeScript の型エラー・ESLint エラーなし
- [ ] 関連する RLS ポリシーをデプロイ・動作確認
- [ ] `git commit` 済み、PR をマージ済み
- [ ] 該当 Phase のチェックリストに反映

---

## 2. 全体タイムライン目安

| Phase | 内容 | 想定期間 | 累計 |
|---|---|---|---|
| Phase 0 | 環境構築・初期設定 | 3〜5 日 | 〜5 日 |
| Phase 1 | 認証・プロフィール・お知らせ | 1〜2 週間 | 〜3 週 |
| Phase 2 | 掲示板・タグ・検索 | 1〜2 週間 | 〜5 週 |
| Phase 3 | データ記録・仲間一覧 | 1 週間 | 〜6 週 |
| Phase 4 | 管理者画面 | 1〜2 週間 | 〜8 週 |
| Phase 5 | 通知・PWA・最終調整 | 1 週間 | 〜10 週 |

**合計：6〜10 週間（1.5〜2.5 ヶ月）**

タスクの粒度感の前提：
- 1 日 = 集中作業 3〜4 時間（しのぶさんの本業との両立を想定）
- Claude 活用で実装速度はベース工数の 1/2〜1/3 を期待
- 想定より遅れた場合は §6 のリスク管理に沿ってスコープを調整

---

## 3. 各 Phase の詳細

### Phase 0：環境構築・初期設定

#### ゴール

`pnpm dev` でローカルにアプリが起動し、Supabase に接続でき、空のページが表示される状態。GitHub にリポジトリがあり、`main` に push したら CI（lint / typecheck）が走る。

#### 含むタスク

**3.0.1 リポジトリ・基盤**
- Next.js 14（App Router）+ TypeScript プロジェクト作成（`pnpm create next-app`）
- `pnpm` 採用、`.nvmrc`（Node 20 LTS）固定
- Tailwind CSS セットアップ
- ESLint + Prettier 設定（`pnpm lint`、`pnpm format`）
- Git リポジトリ初期化、GitHub にリモート作成
- `.gitignore`（`.env.local`、`.env.production`、`node_modules/` を除外）

**3.0.2 ドキュメント・設定ファイル**
- `CLAUDE.md` 作成：
  - プロジェクト概要・技術スタック・コーディング方針
  - ディレクトリ構成ルール
  - コミット・PR ルール（§1.4 を反映）
  - Phase の現在地（Phase 0 → 1 → ... を更新可能に）
- `README.md`：セットアップ手順・環境変数の説明

**3.0.3 Supabase**
- Supabase プロジェクト作成（Free プラン）
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` を `.env.local` に設定
- `@supabase/supabase-js` インストール
- `lib/supabase/client.ts`（クライアント用）と `lib/supabase/server.ts`（サーバー用）の雛形
- 接続確認（適当な SELECT 1 を画面に表示）

**3.0.4 PWA 下準備**
- `next-pwa` インストール
- `app/manifest.ts` 雛形（設計書 §14.2）
- アイコン素材は仮置き（Phase 5 で本番アイコン差し替え）

**3.0.5 デザイントークン**
- `tailwind.config.ts` に配色をセット：
  - `cream: '#faf5ed'` / `terracotta: '#c05e3f'` / `mustard: '#d9a43d'` / `olive: '#5a6b42'`
- フォント：Noto Serif JP（見出し）、Zen Kaku Gothic Antique（本文）を Google Fonts 経由で読み込み
- `globals.css` でベースの文字サイズ・余白を大きめに設定（50代向け）
- 基本コンポーネント雛形：`Button`、`Card`、`Container`、`Heading`

**3.0.6 環境変数テンプレ**
- `.env.local.example`：開発用テンプレ
- `.env.production.example`：本番用テンプレ（Phase 5 で実値投入）
- 設計書 §15.3 の環境変数一覧を全て記載

**3.0.7 GitHub Actions スキャフォールド**
- `.github/workflows/ci.yml`：`pnpm install` + `pnpm lint` + `pnpm typecheck` + `pnpm build`
- `.github/workflows/deploy.yml` は雛形のみ（実デプロイは Phase 5 で完成）

#### 依存関係

なし（最初の Phase）

#### 成果物

- ローカルで起動するスケルトン Next.js アプリ
- GitHub リポジトリ + CI 緑
- Supabase 接続確認済み
- 配色・フォントが反映されたサンプル画面

#### チェックリスト

- [ ] `pnpm dev` で `http://localhost:3000` が表示される
- [ ] Tailwind の配色クラスが効いている（例：`bg-cream text-terracotta`）
- [ ] Supabase クライアントから簡単なクエリが叩ける
- [ ] `pnpm lint` `pnpm typecheck` `pnpm build` が全てローカルで成功
- [ ] `main` への push で CI が緑になる
- [ ] `CLAUDE.md` がプロジェクトの最新方針を反映
- [ ] `.env.local.example` に必要な全変数が列挙されている

#### 想定リスク・落とし穴

- **Tailwind v4 の breaking changes**：`@tailwindcss/postcss` 系の設定差異。安定版（v3 系）で進めるのが無難
- **next-pwa と App Router の相性**：v0.x 系で App Router 対応が完全でない場合がある。動かない時は `@ducanh2912/next-pwa` を検討
- **Supabase SSR**：App Router では `@supabase/ssr` を使う。古い記事の `@supabase/auth-helpers-nextjs` は deprecated
- **環境変数の漏洩**：`SUPABASE_SERVICE_ROLE_KEY` を絶対にクライアント側で `NEXT_PUBLIC_` プレフィックスで使わない

---

### Phase 1：認証・プロフィール・お知らせ

#### ゴール

招待されたユーザーがログインし、プロフィールを編集し、しのぶさんが発信するお知らせを閲覧・いいね・コメントできる。ボトムナビ 4 タブの土台が完成。

#### 含むタスク

**3.1.1 データモデル（マイグレーション）**
- `plans`（マスタ・seed: trial / standard / premium）
- `product_genres`（マスタ・12 種 seed）
- `profiles`
- `profile_product_genres`
- `invitations`
- `contents`、`content_attachments`、`content_likes`、`content_comments`
- 全テーブルに RLS を有効化、§4 のポリシーを適用（`rls-policies.md` 参照）

**3.1.2 招待・認証**
- 招待受諾画面 `/invite?token=xxx`
  - トークン検証（accepted_at IS NULL、expires_at > now()）
  - メール+PW 登録 / Google SSO の二択
  - 利用規約・プラポリ同意チェック
  - 受諾時に `profiles` / `notification_preferences` INSERT、`invitations.accepted_at` 更新（トランザクション）
- ログイン画面 `/login`
  - メール+PW / Google OAuth / Magic Link の 3 方法
- ログアウト
- パスワードリセット（Supabase 標準フロー）
- ログイン後ホーム遷移：`/announcements`

**3.1.3 アカウント設定**
- `/me/settings/account`
  - メールアドレス変更（Supabase 標準・両方確認）
  - パスワード変更（再認証あり、8 文字以上・英数字含む）
  - Google 連携の有無表示

**3.1.4 プロフィール編集**
- `/me/settings/profile`
  - 個人セクション（アイコン絵文字 or 画像、表示名、自己紹介）
  - 屋号・お店セクション（屋号、地域、扱う商品、お店説明、お店写真）
  - 会社情報セクション（任意）
  - 販売ジャンルセクション（最大 5 個、`product_genres` から複数選択）
  - 公開設定セクション（MVP は項目固定でOK）
- `/me`：自分のプロフィール表示

**3.1.5 画像アップロード基盤**
- `lib/image-compression.ts`（設計書 §12.3）
- アバター用プリセット（512px / 0.8 / 200KB）
- お店写真用プリセット（1280px / 0.85 / 800KB）
- お知らせ画像プリセット（1600px / 0.85 / 1.5MB）
- Supabase Storage バケット作成（`avatars`、`stores`、`contents`）
- パス命名：`{bucket}/{user_id}/{type}/{uuid}.jpg`
- サーバー側マジックバイト検証

**3.1.6 お知らせ機能（メンバー側）**
- `/announcements`：一覧（カテゴリ絞り込み、ピン留め優先表示）
- `/announcements/:id`：詳細
  - 画像表示、YouTube サムネ→iframe 遅延ロード
  - いいねボタン、コメント投稿フォーム
  - `required_plan` 制限（trial には Pro 限定記事を非表示）
- オーナーヘッダー（しのぶさん紹介カード、テラコッタグラデーション）

**3.1.7 お知らせ作成（admin 側のごく一部のみ）**
- `/admin/announcements/new` の最小版
  - カテゴリ / タイトル / 本文 / ピン留め / required_plan / 画像（3 枚）/ YouTube URL（1 個）/ status（draft|published）
- 本格的な admin 画面整備は Phase 4 だが、Phase 1 で Phase 1 内の動作確認用に最低限の作成 UI が必要
- 一覧・編集は Phase 4 で完成

**3.1.8 ボトムナビ・ヘッダー**
- 4 タブ：📣お知らせ / 🏠掲示板 / 📊データ / 👥仲間
- 掲示板・データ・仲間は Phase 2 / 3 で実装するため、Phase 1 では「準備中」のダミー画面でOK
- ヘッダー（左：アプリ名 / 右：検索🔍・通知🔔・プロフ👤）
  - 検索・通知は Phase 2 / 5 でリンク有効化

#### 依存関係

- Phase 0 完了

#### 成果物

- 招待 → 登録 → ログイン → プロフィール作成 → お知らせ閲覧の一連が動く
- しのぶさんが自分で 1 つお知らせを投稿してメンバー側で見える
- 50代向けに大きめの文字サイズ・配色が反映された UI

#### チェックリスト

- [ ] 招待トークンを使って新規登録できる（7 日経過のものは弾かれる）
- [ ] 同じトークンを 2 回使えない
- [ ] Google SSO で登録した場合、招待メールと OAuth メールが一致しないとエラー
- [ ] パスワードリセットメールが届き、再設定できる
- [ ] プロフィール画像をアップロードすると圧縮されて表示される
- [ ] 販売ジャンルを 5 個選択して保存できる（6 個目はブロック）
- [ ] お知らせを admin で作成、メンバーで閲覧、いいね・コメントできる
- [ ] trial プランで Pro 限定お知らせが見えない
- [ ] RLS：別ユーザーの profile を UPDATE できない（curl で確認）
- [ ] ボトムナビが全画面で表示され、4 タブの遷移ができる

#### 想定リスク・落とし穴

- **Supabase Auth と profiles の同期**：`auth.users` 作成タイミングと `profiles` INSERT のタイミングを誤るとログインできない。トリガーで自動 INSERT or Server Action でトランザクション
- **Google SSO のメール一致確認**：OAuth 後に invitations.email と一致しないと拒否するロジックをサーバー側で実装。クライアント信用しない
- **画像 MIME 偽装**：拡張子だけでは不十分。`file-type` ライブラリでマジックバイト検証
- **HEIC 画像**：iPhone から直接アップロードされる HEIC は `browser-image-compression` で JPEG 変換できる（オプション `fileType: 'image/jpeg'`）
- **RLS デバッグの難しさ**：Supabase ダッシュボードの SQL Editor で `set role authenticated; set request.jwt.claims = '{"sub":"..."}'` で再現確認

---

### Phase 2：掲示板・タグ・検索

#### ゴール

メンバーがチャンネルを選んで投稿し、タグを付けて検索できる。trial は最新 5 件のぼかし表示、standard 以上は全件閲覧可。「運営からのアドバイス」チャンネルは admin 投稿専用。

#### 含むタスク

**3.2.1 データモデル**
- `channels`（マスタ・4 種 seed: kpi / sales / customer / admin_advice）
- `posts`
- `post_attachments`
- `post_likes`、`post_comments`
- `post_tags`
- `post_tag_assignments`
- 全テーブル RLS 適用

**3.2.2 掲示板一覧・詳細**
- `/feed`：チャンネルタブ + 投稿リスト
  - チャンネル切替（kpi / sales / customer / admin_advice）
  - trial：各チャンネルで最新 5 件のみ表示、それ以降はぼかし＋アップグレード CTA
  - admin_advice チャンネル：trial には非表示
  - 各投稿カード：著者アバター・名前・販売ジャンルバッジ・タイトル・本文プレビュー・タグ・いいね数・コメント数
- `/feed/:id`：投稿詳細
  - 画像（最大 3 枚）の表示、YouTube サムネ→iframe
  - いいねトグル
  - コメント一覧 + 投稿フォーム
  - 著者本人 or admin に編集・削除ボタン

**3.2.3 投稿作成・編集**
- `/feed/new`：新規投稿フォーム
  - チャンネル選択（必須・単一）
  - タイトル（100 字）/ 本文（5,000 字）
  - 画像 3 枚アップロード（圧縮・プレビュー）
  - 動画埋め込み（admin のみ、YouTube URL 検証→video_id 抽出→サムネ自動取得）
  - タグ選択：オートコンプリート + 新規作成（最大 5 個）
- 編集画面：作成と同じフォームを再利用
- 削除：論理削除（`deleted_at` セット）
- trial：投稿不可、CTA に誘導

**3.2.4 タグ機能**
- タグの作成（member が投稿時に可能、slug 自動生成）
- オートコンプリート：完全一致＞前方一致＞使用回数順
- `usage_count` の更新（トリガー or Server Action で increment/decrement）
- 投稿に複数タグ付与

**3.2.5 検索**
- ヘッダー🔍からオーバーレイ起動 or `/search` ページ
- 対象：投稿（title / content / tag.label）、お知らせ（title / body）、メンバー（display_name / store_name）の横断検索
- フィルタ：種別（投稿 / お知らせ / 仲間）、チャンネル、タグ、期間
- 検索方式：PostgreSQL ILIKE + タグ完全一致
- 最小文字数：2 文字
- AND/OR：MVP は OR
- 検索履歴：localStorage

**3.2.6 YouTube 動画埋め込み（共通基盤）**
- `lib/youtube.ts`：
  - URL バリデーション（youtube.com / youtu.be のみ）
  - video_id 抽出（英数字 + `-_` のみ許可）
  - サムネ URL 生成
- 表示コンポーネント `<YouTubeEmbed>`：
  - サムネ → 再生ボタンタップ → iframe 遅延ロード
  - sandbox 属性付き

#### 依存関係

- Phase 1 完了（認証・プロフィール・画像アップロード基盤）

#### 成果物

- メンバーが投稿・コメント・いいねできる
- タグを付けて検索できる
- trial / standard / premium で見え方が異なる
- admin が「運営からのアドバイス」に YouTube 動画付きで投稿できる

#### チェックリスト

- [ ] 通常チャンネル（kpi / sales / customer）に standard で投稿できる
- [ ] trial は投稿ボタンが非活性、閲覧は最新 5 件まで
- [ ] admin_advice チャンネルは admin のみ投稿可、trial は閲覧不可
- [ ] 画像 3 枚、タグ 5 個、本文 5,000 字の上限が正しくバリデーションされる
- [ ] YouTube URL 以外を入れるとエラー、サムネが正しく取得される
- [ ] タグ検索で完全一致投稿がヒットする
- [ ] 検索結果が投稿・お知らせ・仲間で分かれて表示される
- [ ] 投稿削除後、admin だけが「（削除済み）」として閲覧できる
- [ ] RLS：trial が直接 API を叩いても 6 件目以降を取得できない（curl で確認）

#### 想定リスク・落とし穴

- **trial の 5 件制限の実装**：RLS だけで件数制限するのは難しい。`required_plan` でアクセス制御 + アプリ側で trial の時のみ `LIMIT 5` を強制
- **タグの重複作成**：「MEO」と「meo」「MEO」が別タグになる事故。slug を半角小文字化して UNIQUE 制約
- **タグの大量作成スパム**：member が際限なくタグを作れると masterが汚れる。Phase 4 で admin による整理機能が必須
- **ILIKE のパフォーマンス**：投稿が 1,000 件超えると遅くなる。インデックス（pg_trgm）を貼る or v0.2 で FTS に移行
- **iframe の Safari 表示問題**：iOS Safari で sandbox 属性が一部効かない場合あり。`allow-presentation` で代替

---

### Phase 3：データ記録・仲間一覧

#### ゴール

standard 以上のメンバーが月次の売上 / KPI / CPA を自分専用で記録できる。trial はアップグレード案内に誘導。仲間一覧で他のメンバーが見え、販売ジャンルで絞り込める。

#### 含むタスク

**3.3.1 データモデル**
- `sales_reports`（generated カラム：achievement_rate）
- `kpi_reports`（generated カラム：change_rate）
- `cpa_reports`（generated カラム：cpa）
- UNIQUE 制約：`(author_id, month)` を sales / kpi / cpa それぞれに
- RLS：自分のみ INSERT/UPDATE、admin は SELECT 可、削除は admin のみ

**3.3.2 データタブ**
- `/data`：自分の月次データ概観
  - 売上 / KPI / CPA の 3 セクション
  - 月別のカード一覧（最新 12 ヶ月分）
  - 各セクション右上に「+ 追加」ボタン

**3.3.3 入力フォーム**
- `/data/sales/new`、`/data/sales/:id/edit`
- `/data/kpi/new`、`/data/kpi/:id/edit`
- `/data/cpa/new`、`/data/cpa/:id/edit`
- 月選択（YYYY-MM、デフォルトは今月）
- 数値入力（金額 / 件数 / 単位）
- 所感（テキストエリア）
- 画像 1 枚（任意、月次データ用プリセット 1280px / 1MB）
- 計算値（achievement_rate / change_rate / cpa）はサーバー側で generated カラム

**3.3.4 trial の挙動**
- `/data` タブを tap → `/upgrade` にリダイレクト
- `/upgrade`：「データ記録はスタンダード以上の機能です」+ プラン変更 Google フォームへの CTA
- 共通コンポーネント `<ExternalFormLink>`（設計書 §10.3）を実装

**3.3.5 仲間一覧**
- `/members`：active メンバー一覧
  - カード：アバター・名前・屋号・地域・販売ジャンルバッジ
  - 販売ジャンルフィルタ（チェックボックス or バッジトグル）
  - 名前検索（display_name / store_name）
- `/members/:id`：他人のプロフィール詳細
  - 個人情報・屋号情報・会社情報（公開設定されているもののみ）
  - 販売ジャンルバッジ
  - 過去の投稿一覧（最新 10 件、ページネーション）
  - 自分自身の場合は `/me` にリダイレクト

**3.3.6 入力ルール・エッジケース**
- 同月同種別の重複 INSERT → UNIQUE 制約違反エラーを「すでに今月の売上報告があります。編集してください。」と表示
- 月末経過後の編集制限：MVP では実装せず、自由に編集可とする（運用判断）
  - ※ 設計書 §7.3.4 に「月末経過後は admin のみ編集可」とあるが、判断機構が複雑なので MVP 後半 or v0.2 で導入

#### 依存関係

- Phase 1 完了（プロフィール・販売ジャンル）
- Phase 2 完了（仲間一覧で投稿を一覧表示するため）

#### 成果物

- standard 以上のメンバーが自分の月次データを入力・編集できる
- 仲間一覧で販売ジャンル別に検索できる
- trial がデータタブを開くとアップグレード案内に飛ぶ

#### チェックリスト

- [ ] standard で売上報告を 1 件作成、achievement_rate が自動計算される
- [ ] KPI / CPA も同様に作成、計算式が正しい
- [ ] 同月同種別を 2 件目入れるとエラーになる
- [ ] trial で /data をタップすると /upgrade に遷移
- [ ] /upgrade の「申し込む」で Google フォームが新規タブで開く（prefill 確認）
- [ ] 仲間一覧で販売ジャンルフィルタが効く（複数選択 OR）
- [ ] 他人のプロフィール詳細が見られる（退会者は表示されない）
- [ ] RLS：別ユーザーの sales_reports を SELECT できない

#### 想定リスク・落とし穴

- **generated カラムのゼロ除算**：`NULLIF(target, 0)` で除算保護済み（設計書 §3.5）。動作テスト必須
- **UNIQUE 制約のエラー文言**：PostgreSQL のエラーをそのまま見せると意味不明。アプリ側で人間向けに翻訳
- **Google フォームの prefill 失敗**：`entry.id` を取り違えると prefill が効かないだけで送信はできる。最初は手動入力でも問題ない前提に
- **仲間一覧の N+1**：販売ジャンルバッジを表示するために各メンバーごとに JOIN が必要。`profiles + profile_product_genres + product_genres` を 1 クエリで取得

---

### Phase 4：管理者画面

#### ゴール

しのぶさんが運営に必要な全ての操作を `/admin/*` 配下で完結できる。メンバー管理・招待・モデレーション・マスタ管理・監査ログが揃う。

#### 含むタスク

**3.4.1 ダッシュボード**
- `/admin`：トップ
  - サマリーカード：アクティブ会員数 / 招待中 / 停止中
  - 今月の新規投稿数 / 新規コメント数
  - 未処理タスク：招待未受諾、一時停止中
  - 最近の活動：新規投稿・新規コメント

**3.4.2 メンバー管理**
- `/admin/members`：一覧
  - フィルタ：ステータス（active / suspended / deleted）、プラン、販売ジャンル
  - カラム：名前 / プラン / ステータス / 販売ジャンル / 最終アクセス / 操作
- `/admin/members/:id`：個別詳細
  - 基本情報・活動統計（投稿数・コメント数・データ数）
  - プラン変更（プルダウン → 保存 → audit_logs 記録 → 本人通知）
  - 一時停止（期間 1 週間 / 1 ヶ月 / 無期限）
  - 退会させる（確認ダイアログ → status=deleted、auth.users banned_until=infinity）
  - 復活（status=active に戻す）
  - 監査ログへのリンク
- `/admin/members/deleted`：退会済み一覧（復活可）

**3.4.3 招待管理**
- `/admin/invites`：
  - pending タブ：未受諾の一覧（有効期限・再送・取消）
  - accepted タブ：受諾済み履歴
- `/admin/invites/new`：新規招待
  - メールアドレス入力（複数可、改行区切り）
  - プラン選択（trial / standard / premium）
  - 送信 → invitations INSERT、Resend でメール送信

**3.4.4 お知らせ管理（Phase 1 の admin 機能を本格化）**
- `/admin/announcements`：一覧
  - status（draft / published）、カテゴリ、ピン留め切替
- `/admin/announcements/new`：作成
- `/admin/announcements/:id/edit`：編集
  - 編集時に `last_edited_at` / `last_editor_id` 更新

**3.4.5 投稿モデレーション**
- `/admin/posts`：全投稿一覧（退会者の投稿も閲覧可）
  - フィルタ：チャンネル、状態（公開 / 削除済み）、著者
- 編集：`edited_by_admin = true` 自動セット、本人通知（Phase 5 の通知システム待ち、まずは DB 記録のみ）
- 削除：論理削除、理由入力、本人通知
- `/admin/comments`：コメント一覧（同じく編集・削除）

**3.4.6 マスタ管理**
- `/admin/channels`：チャンネル CRUD
  - 追加・改名・required_plan / only_admin_can_post / trial_preview_count の変更
  - 論理削除（is_active=false）、影響範囲警告
- `/admin/product-genres`：販売ジャンル CRUD
  - icon_emoji の絵文字選択
  - 論理削除、影響範囲警告
- `/admin/post-tags`：タグ整理
  - 統合（A → B にマージ）、改名、削除
  - usage_count 表示

**3.4.7 全体通知（Phase 5 の通知 UI と連動するが、admin 側の入力 UI は Phase 4 で）**
- `/admin/broadcasts`：
  - タイトル・本文入力
  - メール並走の有無
  - 送信 → 全 active member の notifications に INSERT（Phase 5 で実配信フックを追加）

**3.4.8 監査ログ**
- `audit_logs` テーブル作成（§3.7）
- 全 admin アクション（プラン変更・停止・退会・復活・投稿編集・削除・招待・マスタ変更・全体通知送信）で INSERT
- `/admin/audit-log`：
  - フィルタ：actor / action_type / target_type / 期間
  - ペイロード詳細表示
- RLS：SELECT は admin のみ、UPDATE/DELETE 不可

**3.4.9 admin の制約**
- 自分自身のロール変更不可
- 自分自身の停止・退会不可
- 重要操作は確認ダイアログ必須

#### 依存関係

- Phase 1, 2, 3 完了（管理対象データが揃っている前提）

#### 成果物

- しのぶさんが運用で必要な全操作をブラウザから実行できる
- 監査ログに全アクションが記録される
- メンバー側からの動作（プラン制限・モデレーション結果）が即時反映される

#### チェックリスト

- [ ] メンバーのプラン変更が反映され、本人のアクセス制限が即時変わる
- [ ] 一時停止後、本人がログインできない（auth.users.banned_until 確認）
- [ ] 退会させたメンバーの投稿は member には見えないが admin には「（退会したメンバー）」表記で見える
- [ ] 復活させると active に戻り、通常通り使える
- [ ] 招待を再送・取消できる、期限切れは pending から消える
- [ ] チャンネルを削除すると関連投稿は CASCADE 削除（事前警告）
- [ ] 投稿を admin が編集すると `edited_by_admin=true`、投稿下部に「※運営により編集されました」表示
- [ ] 監査ログに全 admin 操作が記録され、UPDATE/DELETE できない
- [ ] admin 自身を停止・退会しようとするとエラー

#### 想定リスク・落とし穴

- **マスタ削除の CASCADE 事故**：販売ジャンルを削除したらメンバーの選択が全部飛ぶ。論理削除（is_active=false）を基本とし、関連レコードは PRESERVE。本当に消すのは v0.2 で慎重に
- **admin 操作の取り消し不能性**：退会させた後の復活はできるが、削除した投稿の復元は手動 SQL が必要。論理削除なら復元可能
- **監査ログの肥大化**：1 アクション = 1 INSERT。年間数千行は問題ないが、十万行を超えると `/admin/audit-log` が重くなる。インデックス（created_at desc、action_type）を貼る
- **メール送信失敗**：Resend が落ちている時のフォールバック。最低限「招待リンクをコピー」ボタンを用意して手動共有可能に

---

### Phase 5：通知・PWA・最終調整

#### ゴール

リアルタイム通知が届き、PWA としてホーム画面に追加でき、本番デプロイが動作する。β初期メンバーに案内できる完成度。

#### 含むタスク

**3.5.1 通知データモデル**
- `notifications`
- `notification_preferences`（招待時にデフォルト値で INSERT、Phase 1 で既に作成済みのはず）
- RLS：recipient のみ閲覧・更新可、INSERT はサービスロール

**3.5.2 通知配信フック**
- 掲示板新規投稿 → 全 active member（除く自分）に new_post 通知
- お知らせ新規配信 → 該当 plan 以上のメンバーに new_announcement 通知
- 自分の投稿にコメント → comment_on_my_post
- 自分の投稿にいいね → like_on_my_post（初期 OFF）
- admin による投稿編集・削除 → 本人に post_edited_by_admin / post_deleted_by_admin
- アカウント停止・退会・復活 → 本人に account_suspended / account_deleted / account_restored
- 全体通知（admin → 全員）：admin_broadcast、`notification_preferences` で OFF にできない
- 全て `notification_preferences` を見て対象を絞る

**3.5.3 通知 UI**
- `/notifications`：通知一覧
  - 時系列表示、既読/未読の視覚区別
  - クリックで該当ページに遷移＋自動既読
  - 「すべて既読にする」ボタン
- ヘッダーの🔔バッジ：未読件数を表示
- Supabase Realtime で受信時にバッジ即時更新

**3.5.4 通知設定**
- `/me/settings/notifications`
  - 種別ごとの ON/OFF トグル
  - admin_broadcast / account_* / post_*_by_admin は OFF 不可（UI で disable）

**3.5.5 メール並走**
- Resend で以下を送信：
  - admin_broadcast
  - account_suspended / account_deleted / account_restored
  - 招待・パスワードリセット（Phase 1 で実装済み）
- メールテンプレートは設計書 §5.1 を参考に MJML or プレーンテキスト

**3.5.6 Google フォーム連携の最終整備**
- `ExternalFormLink` コンポーネント（Phase 3 で実装済みなら本番フォーム URL を `.env.production` に投入）
- 環境変数：
  - `NEXT_PUBLIC_FORM_PLAN_UPGRADE`
  - `NEXT_PUBLIC_FORM_WITHDRAWAL`
  - `NEXT_PUBLIC_FORM_INQUIRY`
  - `NEXT_PUBLIC_FORM_BUG_REPORT`
  - `NEXT_PUBLIC_FORM_SEMINAR`（任意）
- `/me/settings/danger` の退会申請ボタン
- `/me/settings/plan` のプラン変更申請ボタン
- フッターに「お問い合わせ」「不具合報告」リンク

**3.5.7 PWA 仕上げ**
- 本番アイコン差し替え（192px / 512px / maskable / apple-touch-icon）
- `manifest.ts` の最終確認（name / theme_color / background_color）
- インストール誘導 UI：
  - iOS：「共有→ホーム画面に追加」のステップ画像
  - Android：自動 install prompt + カスタム説明
- 50代向けに大きめのスクショ付き案内

**3.5.8 オンボーディング 3 ステップツアー**
- 初回ログイン時に表示（localStorage で完了フラグ）
- Step 1：「ようこそ！」+ お知らせタブ紹介
- Step 2：掲示板タブ紹介
- Step 3：プロフィール設定の案内
- スキップ可

**3.5.9 β期間バナー**
- 環境変数 `NEXT_PUBLIC_BETA_MODE` / `NEXT_PUBLIC_BETA_END_DATE`
- ヘッダー直下に常時表示：「🌱 βテスト期間中 〜 2026年7月31日まで（無料体験中）」
- `BETA_END_DATE` を過ぎたら自動非表示

**3.5.10 エラー画面**
- `app/not-found.tsx`：404 ページ
- `app/error.tsx`：500 ページ（Sentry に送信）
- ネットワークエラー：「圏外です」UI

**3.5.11 監視・解析**
- Plausible Analytics 接続（`NEXT_PUBLIC_PLAUSIBLE_DOMAIN`）
- Sentry 接続（`SENTRY_DSN`）
- Supabase ダッシュボードの監視メトリクス確認

**3.5.12 デプロイ完成**
- GitHub Actions `deploy.yml` 完成
  - `pnpm install --frozen-lockfile`
  - `pnpm build`
  - rsync で自前サーバーへ
- サーバー側：
  - Node.js 20 LTS インストール
  - PM2 or systemd でアプリ起動
  - Nginx 設定（SSL 終端、リバースプロキシ、`/` → `localhost:3000`）
  - Let's Encrypt で SSL 取得
  - deploy 専用ユーザー（sudo systemctl restart のみ許可）
- `.env.production` 投入（GitHub Actions Secrets には service_role を置かない）

**3.5.13 バックアップ運用**
- 自前サーバーに `pg_dump` を毎日深夜実行する cron 設定
- rsync で別ディスク or S3 互換ストレージに保管
- 30 日ローテーション
- リストア手順を `docs/operations.md` に記載（任意）

**3.5.14 ローンチ準備（設計書 §18）**
- 初期コンテンツ seed：ウェルカム投稿 1 件、利用ガイド 3 件、FAQ 5 件
- Google フォーム 4 種類作成（プラン変更・退会・問い合わせ・不具合）
- 利用規約・プライバシーポリシー・特商法表示の HTML or `/legal/*` ページ公開
- セキュリティレビュー（`ecc:security-reviewer` agent）

#### 依存関係

- Phase 1〜4 完了

#### 成果物

- 本番ドメインで PWA としてアクセス可能
- 通知がリアルタイムで届く
- ホーム画面に追加できる
- β初期メンバー（5〜10 名）への招待が可能

#### チェックリスト

- [ ] 投稿すると他メンバーに通知が届く（Supabase Realtime 確認）
- [ ] 通知設定で OFF にした種別は届かない
- [ ] admin_broadcast は OFF 不可、全員に届く（メール並走確認）
- [ ] iOS Safari でホーム画面に追加して standalone 起動できる
- [ ] Android Chrome でインストール prompt が出る
- [ ] 404 / 500 ページが日本語で表示される
- [ ] Plausible に PV が記録される、Sentry にエラーが届く
- [ ] `main` への merge で自動デプロイされ、本番が更新される
- [ ] バックアップが日次で取られていることを 2 日連続で確認
- [ ] 利用規約・プラポリ・特商法ページが公開されている
- [ ] β初期メンバー 1 名に実際に招待を送って登録完了まで通る

#### 想定リスク・落とし穴

- **Supabase Realtime の RLS**：channel.subscribe する時の RLS が効かないと他人の通知が見える事故。Realtime 用の RLS を別途検証
- **iOS Push 通知**：MVP では非対応。「アプリ内通知のみ」とリリースノートに明記
- **PM2 vs systemd**：管理会社のサーバーに systemd が無い場合は PM2 でも可。`pm2 startup` で永続化
- **Nginx の WebSocket**：Supabase Realtime はクライアント直接接続なので Nginx 経由不要。CORS 設定は Supabase 側で
- **SSL 証明書の自動更新**：Let's Encrypt の `certbot renew` を cron に
- **`.env.production` の漏洩**：サーバーに直接配置、Git に絶対 commit しない。`chmod 600` で root しか読めないように

---

## 4. 各 Phase の検証方法

### 4.1 機能テスト（手動）

各 Phase のチェックリストを「テストケース一覧」として運用：
- 各項目を Sprint 完了時にしのぶさんが手動チェック
- 期待結果と実際の挙動を箇条書きで PR に記載
- 失敗したケースは Issue 化、修正後に再テスト

### 4.2 データ検証

- Supabase ダッシュボードの Table Editor で値を直接確認
- RLS 確認：ダッシュボード上で別ユーザー（authenticated / anon）として SQL を実行し、想定通り拒否されるか
- Storage 確認：アップロードしたファイルの容量・パス・MIME を確認

### 4.3 パフォーマンス

- Chrome DevTools → Lighthouse（モバイル / PWA カテゴリ）
- 目標：
  - Performance 70 以上
  - PWA インストール可能（緑）
  - Accessibility 90 以上
- 100 件投稿時にチャンネル一覧が 2 秒以内に表示されること（Phase 2 後半で確認）

### 4.4 セキュリティ確認

- `curl` で各 API を直接叩き、別ユーザーのデータが取れないこと
- `.env.local` の値が `pnpm build` の bundle に含まれないこと（`NEXT_PUBLIC_` 以外）
- Phase 5 で `ecc:security-reviewer` agent によるレビュー

---

## 5. リリース判定基準

β初期メンバーへの公開前に、以下を全て満たす：

### 5.1 機能完成度
- [ ] Phase 0〜5 の全チェックリストが完了
- [ ] 既知のクリティカル / ハイ重要度バグがゼロ

### 5.2 セキュリティ
- [ ] 設計書 §16 の全項目をクリア
- [ ] `ecc:security-reviewer` agent のレビューを実施し、CRITICAL / HIGH を解消
- [ ] 全テーブル RLS 有効化、ポリシー動作確認済み

### 5.3 法務・コンプライアンス
- [ ] 利用規約が公開されている
- [ ] プライバシーポリシーが公開されている（Supabase の保管場所明記）
- [ ] 特定商取引法表示が公開されている（3 プランの料金明示）
- [ ] 個人情報取扱事業者としての届出（必要に応じて）

### 5.4 運用準備
- [ ] バックアップが日次で稼働（2 日連続確認）
- [ ] 監視（Plausible / Sentry）が稼働
- [ ] Google フォーム 4 種類が公開・受付可能
- [ ] 招待メールの文面が確定
- [ ] admin（しのぶさん）の運用フローが文書化

### 5.5 デモ・受け入れ
- [ ] β初期メンバー 1〜2 名に実機で操作デモが成功
- [ ] 50代の被験者（しのぶさんの知人など 1 名）に「直感で操作できるか」を確認

---

## 6. リスク管理

### 6.1 想定遅延への対処

| 状況 | 対処 |
|---|---|
| Phase 1 が 3 週超え | 招待メール送信を Resend → Supabase 標準メールに簡略化、メール変更フローを v0.2 へ |
| Phase 2 が 3 週超え | 検索を「投稿のみ」に縮小、お知らせ・仲間横断は v0.2 |
| Phase 3 が 2 週超え | 月次データの画像添付を v0.2、テキスト＋数値のみで MVP |
| Phase 4 が 3 週超え | 監査ログを「最重要アクション 5 種のみ」に縮小、UI も簡素化 |
| Phase 5 が 2 週超え | PWA インストール誘導を Phase 5.5 として後ろにずらし、β初期メンバーは PC ブラウザ運用も可とする |

スコープ削減判断ルール：
1. **削れないもの**：認証・RLS・セキュリティ
2. **削れるもの**：通知の種別数、検索の対象範囲、フィルタ条件、UI のリッチさ

### 6.2 Supabase Cloud 制限到達

| 制限 | Free 上限 | 対応策 |
|---|---|---|
| DB 500MB | 〜200 メンバー想定で十分 | Pro へ（$25/月） |
| Storage 1GB | 〜画像数百枚で到達可能性 | Pro へ、または不要画像の定期削除 |
| MAU 50,000 | 心配なし | — |
| API リクエスト無制限 | — | — |
| バックアップ PITR なし | 自前 pg_dump で代替 | — |

200 メンバー超 or 画像が増えた段階で Pro 移行（月 $25 ≒ 4,000 円）。

### 6.3 Self-hosted Supabase 切替

判断基準：
- 管理会社サーバーが Docker 対応 → Self-hosted を検討
- サーバー要件：4GB RAM 以上、Docker、Postgres 15+
- 切替タイミング：β期間中に Self-hosted を別環境で検証 → 本格運用前に切替

切替の代償：
- バックアップ・監視・スケーリングを自前で運用
- Auth / Storage / Realtime の各サーバー監視が必要
- MVP では Supabase Cloud を強く推奨

### 6.4 サーバー実態調査の遅れ

| 状況 | フォールバック |
|---|---|
| 管理会社が特定できない | Vercel に一時デプロイ（無料枠で β運用） |
| Docker 不可・Node.js 入らない | Vercel 継続 or Cloudflare Pages |
| SSH アクセス不可 | rsync デプロイ不可 → Vercel / Netlify 系へ |

サーバー実態判明前は Vercel での運用も「最悪のシナリオ」として用意しておく。

---

## 7. Phase 完了後の振り返り（KPT）

各 Phase 完了時に **30 分** で振り返り：

### 7.1 Keep（うまくいったこと）
- 例：Claude にスキーマを書かせてから自分でレビューする流れが効率的だった
- 例：チェックリストを PR 本文に書いたら見落としが減った

### 7.2 Problem（うまくいかなかったこと）
- 例：RLS のデバッグに想定の 2 倍かかった
- 例：Tailwind の配色がデザインと微妙にずれた

### 7.3 Try（次に試すこと）
- 例：RLS は最初に SQL Editor でテスト→アプリに反映する順番にする
- 例：Phase 開始時にスクショで配色サンプルを作って都度参照する

振り返り結果は `.claude/plans/details/retrospectives.md` などに追記（任意）。

---

## 8. Claude Code 活用のコツ

### 8.1 CLAUDE.md にプロジェクト方針を集約

セッション開始時に Claude が読み込む情報：
- プロジェクト概要・技術スタック
- 現在の Phase 番号
- コーディング規約（命名・ファイル分割）
- 「やらないこと」のリスト（v0.2 機能、過剰最適化など）
- 各 Phase の完了済みタスク

Phase 進行中は CLAUDE.md を「現在のフォーカス」として更新し続ける。

### 8.2 各 Phase の開始時に /plan

```
/plan Phase 2 の掲示板実装を進めたい。dev-phases.md §3.2 の内容を確認して、
今日着手する 3 タスクを TODO 化して。
```

Claude に Phase の詳細を再認識させ、当日のスコープを絞り込む。

### 8.3 セッション開始時の確認

```bash
git status
git log --oneline -10
```

前回のセッションからの差分・直近のコミットを Claude にも見せて文脈を引き継ぐ。

### 8.4 動作確認は必ずブラウザで

Claude が「実装完了」と言っても、必ず：
1. `pnpm dev` で起動
2. 該当画面を開く
3. スクショ or 画面録画で挙動を確認
4. うまくいかない場合は console / network ログを Claude に共有

### 8.5 動作確認後に毎回 commit

```bash
git add -A
git commit -m "feat: add channel list page"
```

「動いた状態」を細かく保存する。間違えたら `git reset --hard HEAD~1` で戻れる安心感。

### 8.6 PR ベースでセルフレビュー

- feature ブランチで実装
- PR を立てて自分で diff を眺める
- Claude に「この PR をレビューして」と頼んで第三者視点を得る
- 問題なければ self-approve → merge

### 8.7 「行き詰まったら聞く」

設計判断に迷ったら：
```
/plan この設計で迷っている：A 案と B 案、それぞれのメリデメと推奨を示して
```

Claude を意思決定の壁打ち相手として使う。最終決定はしのぶさんが行う。

---

## 9. このドキュメントの使い方

1. **Phase 開始時**：該当 Phase の節を読み、ゴール・タスク・チェックリストを把握
2. **作業中**：CLAUDE.md に「現在 Phase X」を明記し、Claude に文脈を渡す
3. **Phase 完了時**：チェックリストを 1 つずつ確認し、振り返り（KPT）を実施
4. **遅延発生時**：§6 のリスク管理を参照し、スコープ削減を判断
5. **リリース前**：§5 のリリース判定基準を 1 項目ずつ確認

---

**本書の本文ここまで。**

次のアクション：
1. しのぶさんによるレビュー・修正依頼の受領
2. Phase 0 開始時に CLAUDE.md を作成
3. 各 Phase の Sprint 開始時に `/plan` を実行してタスクを具体化
