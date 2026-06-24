# Self-hosted Supabase（オンプレ）運用ガイド

設計書 §1.2 / §15、`.claude/plans/details/server-investigation.md` のパターン A
（Docker 可・メモリ 4GB 以上・SSH 可）を前提とした、オンプレでの Supabase 自前運用手順。

> **方針**: サーバーにリソースの余裕があるため、DB / Auth / Storage / Realtime を
> Supabase Cloud ではなくオンプレで自前運用する（データを完全に自社サーバーに保持）。

---

## 1. 構成概要

```
[ブラウザ / PWA]
   │  https://marketing-camp.jp（単一ドメイン）
   ▼
[Nginx] ── / ──▶ [Next.js:3000]
                     │  認証・データ・画像(/api/img)はすべてサーバー経由
                     ▼
              [Kong:8000]（外部非公開・アプリ内部からのみ到達）
                  ├─ GoTrue（Auth）
                  ├─ PostgREST（DB REST）
                  ├─ Realtime
                  ├─ Storage
                  └─ Postgres 15
```

## 2. セットアップ手順（公式 self-hosting を利用）

Supabase 公式の docker-compose を用いるのが最も安全・追従しやすい。
本リポジトリでは構成方針のみを管理し、巨大な compose 本体はベンダーを追従する。

```bash
# 1) 公式 self-hosting 一式を取得
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# 2) 環境変数を作成（.env.example をコピーして秘匿値を強い値に置換）
cp .env.example .env
#   - POSTGRES_PASSWORD       … 強いパスワード
#   - JWT_SECRET              … 40 文字以上のランダム
#   - ANON_KEY / SERVICE_ROLE_KEY … JWT_SECRET で署名し直して再生成
#   - DASHBOARD_USERNAME / DASHBOARD_PASSWORD … Studio 用 Basic 認証
#   - SITE_URL                … https://example.com（本番ドメイン）
#   - API_EXTERNAL_URL        … https://api.example.com

# 3) 起動
docker compose up -d
```

### JWT / キーの再生成（重要・セキュリティ）

`.env.example` のデフォルト鍵は**公開されている**ため必ず再生成する。
`JWT_SECRET` を新規生成し、それで署名した `ANON_KEY`（role: anon）/
`SERVICE_ROLE_KEY`（role: service_role）を作る。
（Supabase ドキュメント「Self-Hosting > Generate API Keys」を参照）

生成した値を本リポジトリの `.env.production` にも反映する:

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ← ANON_KEY
- `SUPABASE_SERVICE_ROLE_KEY`     ← SERVICE_ROLE_KEY
- `NEXT_PUBLIC_SUPABASE_URL`      ← https://api.example.com

## 3. スキーマ・seed の適用

スキーマは本リポジトリの `supabase/migrations/` が正典。
self-hosted の Postgres に対して Supabase CLI でリンク・push する:

```bash
# リポジトリ直下で
supabase link --project-ref <self-hosted は db 接続文字列で代替>
# もしくは直接 psql / db push で migrations を適用
supabase db push --db-url "postgresql://postgres:<password>@<host>:5432/postgres"

# seed（マスタ）を投入
psql "postgresql://postgres:<password>@<host>:5432/postgres" -f supabase/seed.sql
```

> 簡便には、各 `supabase/migrations/*.sql` を昇順で psql に流し、
> 最後に `supabase/seed.sql` を流すだけでも適用できる。

## 4. バックアップ（設計書 §15.5）

オンプレのため**自前でバックアップ必須**。

```bash
# 日次 pg_dump（cron 例: 毎日 3:00）
0 3 * * * pg_dump "postgresql://postgres:<password>@127.0.0.1:5432/postgres" \
  | gzip > /var/backups/mcc/db-$(date +\%F).sql.gz

# Storage ファイルのバックアップ（volumes ディレクトリを rsync）
0 4 * * * rsync -a /path/to/supabase/docker/volumes/storage/ /var/backups/mcc/storage/
```

- 30 日ローテーション（`find /var/backups/mcc -mtime +30 -delete`）
- 別ディスク or 外部ストレージ（S3 互換）へ複製し、災害時の全損に備える
  （`server-investigation.md` §8.3 別地域保管を推奨）

## 5. 監視・更新

- `docker compose ps` でコンテナ稼働確認
- Supabase イメージは定期的に `docker compose pull && docker compose up -d` で更新
  （破壊的変更に注意。更新前に必ずバックアップ）
- Studio（管理 UI）は Basic 認証 + 社内 IP 制限を推奨

## 6. リソース目安

| 規模 | メモリ | ディスク |
|---|---|---|
| β（5〜10人） | 2〜4GB | 20GB |
| 20〜50人 | 4GB | 50GB |
| 1,000〜2,000人 | 8GB+ | 100GB+ |

Postgres + GoTrue + PostgREST + Realtime + Storage + Kong + Studio の合計で
アイドル時 1.5〜2GB 程度を消費する。
