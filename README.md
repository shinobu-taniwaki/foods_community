# マーケティングCampコミュニティ（MCC）

食品生産者・職人のためのマーケティング学習コミュニティ PWA。

Next.js 14（App Router）+ TypeScript + Tailwind CSS + **Self-hosted Supabase**（オンプレ）。

- 設計ドキュメント: [`.claude/plans/`](.claude/plans/README.md)
- プロジェクト方針（Claude 向け）: [`CLAUDE.md`](CLAUDE.md)
- オンプレ デプロイ: [`infra/README.md`](infra/README.md)

---

## 必要環境

- Node.js 20 LTS（`.nvmrc` 参照）
- pnpm 10+
- Docker（ローカル Supabase 用）
- Supabase CLI

## セットアップ

```bash
# 1. 依存インストール
pnpm install

# 2. ローカル Supabase を起動（マイグレーション + seed が自動適用される）
pnpm db:start

# 3. 接続情報を取得して .env.local を作成
cp .env.local.example .env.local
supabase status            # anon key / service_role key を .env.local に貼る

# 4. 開発サーバー起動
pnpm dev                   # http://localhost:3000
```

トップページの「システム状態を確認」(`/health`) で Supabase 接続を確認できる。

> **ポート**: ローカル Supabase は 54421（API）/ 54422（DB）/ 54423（Studio）を使用
> （既定の 54321 番台は他プロジェクトと競合するため退避。`supabase/config.toml`）。

## スクリプト

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 開発サーバー |
| `pnpm build` | 本番ビルド（standalone 出力） |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | 型チェック（`tsc --noEmit`） |
| `pnpm format` | Prettier 整形 |
| `pnpm db:start` / `db:stop` | ローカル Supabase 起動 / 停止 |
| `pnpm db:reset` | スキーマ再適用 + seed |

## データベース

スキーマの正典は [`supabase/migrations/`](supabase/migrations/)（DDL）と
[`supabase/seed.sql`](supabase/seed.sql)（マスタ seed）。
22 テーブル・80 RLS ポリシー。設計詳細は
[`data-model.md`](.claude/plans/details/data-model.md) /
[`rls-policies.md`](.claude/plans/details/rls-policies.md)。

スキーマ変更後は型を再生成する:

```bash
pnpm supabase gen types typescript --local > lib/supabase/types.gen.ts
```

## ディレクトリ

```
app/            Next.js ページ（App Router）
components/ui/  再利用 UI コンポーネント
lib/            ユーティリティ・Supabase クライアント・env 検証
supabase/       DB スキーマ（migrations / seed / config）
infra/          オンプレデプロイ（Docker / Nginx / Supabase 運用）
.claude/plans/  設計ドキュメント
```

## デプロイ

オンプレ（Docker + Nginx + Self-hosted Supabase）。手順は
[`infra/README.md`](infra/README.md) を参照。
