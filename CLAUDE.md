# CLAUDE.md — マーケティングCampコミュニティ（MCC）

このファイルは Claude Code がセッション開始時に読み込むプロジェクト方針。
**現在地・技術スタック・規約・やらないこと**を集約する（dev-phases.md §8.1）。

---

## 1. プロジェクト概要

- **プロダクト**: マーケティングCampコミュニティ（MCC）— 食品生産者・職人のための学習コミュニティ PWA
- **運営**: admin 1名（しのぶさん）＋ member（20〜50名 → 将来 2,000名規模）
- **ターゲット**: 50代中心・低 IT リテラシー層 → **大きめの文字・シンプルな UX・高コントラスト**
- **設計の正典**: `.claude/plans/foods-community-design.plan.md` と `.claude/plans/details/*`

## 2. 現在のフェーズ

> **Phase 4 完了 → Phase 5 着手準備**（`.claude/plans/details/dev-phases.md`）

- Phase 0: 環境構築（Next.js + Tailwind + Self-hosted Supabase + マイグレーション基盤）✅
- Phase 1: 認証・プロフィール・お知らせ ✅
  - 招待受諾（メール+PW / Google SSO）・ログイン・コールバック・認証ゲート
  - プロフィール編集（個人/屋号/会社/販売ジャンル）・アカウント設定
  - お知らせ一覧/詳細/いいね/コメント・admin最小作成・YouTube埋め込み
  - 画像基盤（圧縮・Storage・マジックバイト検証）
  - ※未了の小項目: アバター画像アップロードUIの結線、Resend通知/audit_logs記録（Phase 5）、オンボーディングツアー（Phase 5）
- Phase 2: 掲示板・タグ・横断検索 ✅
- Phase 3: データ記録（売上/KPI/CPA）・仲間一覧 ✅
- Phase 4: 管理者画面一式 ✅
- Phase 5: 通知（Resend）・PWA・最終調整（次に着手）
  - ※Phase 1 の未了小項目（アバターUI結線・audit_logs記録・オンボーディングツアー）もここで回収

## 3. 技術スタック

| 領域 | 採用 |
|---|---|
| フロント | Next.js 14（App Router）+ TypeScript |
| スタイル | Tailwind CSS v3 |
| BaaS | **Self-hosted Supabase**（オンプレ。PostgreSQL15 + Auth + Storage + Realtime + RLS） |
| 認証 | Supabase Auth（招待制 / メール+PW / Google SSO） |
| メール | Resend |
| デプロイ | オンプレ（Docker + Nginx）。`infra/` 参照 |
| パッケージ | pnpm |

> **インフラ方針はオンプレ前提**。Supabase Cloud ではなく Self-hosted を採用
> （サーバーにリソース余裕あり。サーバー実態の最終確認は担当者に依頼中）。

## 4. ディレクトリ構成

```
app/                  … Next.js App Router（ルート = ページ）
components/ui/        … 再利用 UI（Button / Card / Container / Heading）
lib/                  … ユーティリティ
  env.ts              … 環境変数のスキーマ検証（zod）
  supabase/           … client / server / middleware / types
supabase/             … config.toml / migrations / seed.sql（スキーマの正典）
infra/                … オンプレデプロイ（Dockerfile / compose / nginx / supabase 運用）
.claude/plans/        … 設計ドキュメント一式
```

## 5. コーディング規約

- **不変性**: 既存オブジェクトを破壊的変更しない。新規コピーを返す。
- **命名**: 変数/関数 camelCase、型/コンポーネント PascalCase、定数 UPPER_SNAKE_CASE、boolean は is/has/should/can。
- **型**: 公開 API は明示型。`any` 回避（`unknown` + 絞り込み）。props は named type/interface。
- **境界検証**: 外部入力は zod で検証（`lib/env.ts` が手本）。
- **エラー**: 握りつぶさない。UI 向けは日本語メッセージ、サーバーは詳細ログ。
- **ファイル**: 200〜400行目安、800行上限。1関心 = 1ファイル。
- **デザイントークン**: `tailwind.config.ts`（cream/terracotta/mustard/olive/navy、角丸14px、影は極淡）。

## 6. セキュリティ（設計書 §16・最優先）

- 全テーブル RLS 有効（`supabase/migrations/*_rls_policies.sql`）。**RLS は常に厳しい側へ**。
- `SUPABASE_SERVICE_ROLE_KEY` は `lib/supabase/server.ts` の `createAdminClient` 経由のみ。クライアントに絶対露出させない（`server-only`）。
- 招待トークン検証・SSO メール一致・入力長制限・画像 MIME 検証・YouTube URL 検証を厳守。
- `.env*` は Git 管理外。

## 7. 開発コマンド

```bash
pnpm dev            # 開発サーバー（http://localhost:3000）
pnpm build          # 本番ビルド（standalone）
pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
pnpm format         # Prettier

pnpm db:start       # ローカル Supabase 起動（ポート 54421/54422）
pnpm db:reset       # マイグレーション再適用 + seed
pnpm db:stop        # 停止
```

> ローカル Supabase は **ポート 54421番台**（既定 54321 は別プロジェクトが使用中のため退避済み。`supabase/config.toml`）。
> `.env.local` は `supabase status` の anon/service_role キーを設定（`.env.local.example` 参照）。

## 8. 開発フロー

1. Phase 開始時に `dev-phases.md` の該当節を確認
2. ブランチ: `feature/<phase>-<slug>`、1 PR = 1 関心
3. Conventional Commits（`feat:` / `fix:` / `refactor:` / `docs:` / `chore:`）
4. 実装 → `pnpm lint && pnpm typecheck && pnpm build` → 動作確認 → commit
5. RLS・招待・プラン境界・画像/URL 検証・generated 列は重要箇所としてテスト記述
6. **Phase 完了時は §2「現在のフェーズ」を必ず更新**：該当 Phase を ✅ にし、先頭のブロック引用（現在地）と「次に着手」マーカーを次 Phase へ進める

## 9. やらないこと（MVP スコープ外 = v0.2 以降）

ランキング / 月次レビュー・表彰 / 称賛 / データ「みんな」表示 / PWA Push /
Stripe 課金 / 全文検索(FTS) / 通報 / LINE Login / 複数 admin / 物理削除 /
ダークモード / 多言語化。**過剰な抽象化・先回り実装をしない（YAGNI）**。

> **v0.2 以降の新機能要望**は `.claude/plans/details/backlog-v0.2.md` に集約（study 学習コーナー / 集客施策の診断チャート / プラン内容の確認＋依頼）。MVP 完了後に着手。
