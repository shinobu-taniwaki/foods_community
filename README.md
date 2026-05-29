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

## ローカルで Docker 動作確認

アプリを Docker コンテナで起動し、CLI 管理のローカル Supabase に接続してブラウザで確認できる
（オンプレ本番に近い形での確認）。

```bash
# 1. ローカル Supabase 起動（DB スタック・マイグレーション + seed 自動適用）
pnpm db:start

# 2. デモアカウント・サンプルお知らせを投入（任意・冪等）
SUPABASE_SERVICE_ROLE_KEY=$(supabase status -o env | sed -n 's/^SERVICE_ROLE_KEY="\(.*\)"/\1/p') \
  node scripts/seed-demo.mjs

# 3. Docker 設定を用意（既定のローカルデモキーが入っている）
cp .env.docker.local.example .env.docker.local

# 4. アプリをコンテナでビルド・起動
docker compose --env-file .env.docker.local -f docker-compose.local.yml up --build -d

# 5. ブラウザで http://localhost:3000 を開く
#    デモ会員でログイン: member@mcc.local / Passw0rd123
#    運営(admin)でログイン: admin@mcc.local / Passw0rd123

# 停止
docker compose -f docker-compose.local.yml down
```

> **仕組み**: ブラウザ用 `NEXT_PUBLIC_SUPABASE_URL`（`localhost:54421`）はビルド時に焼き込み、
> コンテナ内サーバーは `SUPABASE_INTERNAL_URL`（`host.docker.internal:54421`）で Supabase に到達する。
> コードを変更したら `--build` を付けて再起動する（`NEXT_PUBLIC_*` はビルド時反映のため）。

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
