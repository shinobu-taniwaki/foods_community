# MCC オンプレ デプロイ runbook

設計書 §15 とサーバー調査（`.claude/plans/details/server-investigation.md`）の
**パターン A（Docker 可・リソース余裕あり）** を前提とした、オンプレ本番構築手順。

> **構成の決定**: サーバーにリソースの余裕があるため、
> DB / Auth / Storage / Realtime を **Self-hosted Supabase**（オンプレ）で運用し、
> Next.js も同一サーバーで稼働させる。データを完全に自社管理下に置く。

---

## 1. 全体像

```
                         ┌──────────────── オンプレサーバー ────────────────┐
[インターネット] ──443──▶ │ [Nginx] ── example.com ──────▶ [Next.js :3000]   │
                         │   └────── api.example.com ───▶ [Supabase Kong]   │
                         │                                  :8000           │
                         │                          ┌───────────────────┐  │
                         │                          │ Postgres15 / Auth │  │
                         │                          │ Storage / Realtime│  │
                         │                          └───────────────────┘  │
                         └──────────────────────────────────────────────────┘
```

## 2. ディレクトリ

| パス | 内容 |
|---|---|
| `infra/app/Dockerfile` | Next.js（standalone）コンテナ |
| `infra/app/docker-compose.yml` | アプリ単体起動 |
| `infra/nginx/mcc.conf` | Nginx リバースプロキシ（SSL 終端） |
| `infra/supabase/README.md` | Self-hosted Supabase 構築・バックアップ手順 |

## 3. 構築手順（初回）

### 3.1 前提（サーバー側）
- Docker / Docker Compose 利用可
- ポート 80 / 443 開放、独自ドメイン（example.com / api.example.com）
- deploy 専用ユーザー（root 不可、`sudo systemctl reload nginx` 等に限定）

### 3.2 Self-hosted Supabase を起動
`infra/supabase/README.md` の手順に従い、Supabase 一式を起動し、
本リポジトリの `supabase/migrations/` と `supabase/seed.sql` を適用する。
生成した ANON_KEY / SERVICE_ROLE_KEY / URL を控える。

### 3.3 環境変数
リポジトリ直下に `.env.production` を作成（`.env.production.example` を複製）。
`chmod 600 .env.production`。`SUPABASE_SERVICE_ROLE_KEY` は GitHub には置かない（§15.4）。

### 3.4 アプリをビルド・起動
```bash
docker compose -f infra/app/docker-compose.yml --env-file .env.production up -d --build
```
`127.0.0.1:3000` で待ち受ける。

### 3.5 Nginx + SSL
`infra/nginx/mcc.conf` を `/etc/nginx/sites-available/` に配置し有効化。
certbot で example.com / api.example.com の証明書を取得:
```bash
sudo certbot --nginx -d example.com -d api.example.com
```
`certbot renew` を cron に登録（自動更新）。

## 4. 継続的デプロイ（GitHub Actions）

`.github/workflows/deploy.yml`（雛形）。`main` への push で:
1. `pnpm install --frozen-lockfile` → `pnpm build`（CI で検証）
2. SSH 経由でサーバーに接続し、`git pull` + `docker compose up -d --build`

必要な GitHub Secrets（§15.4）:
- `SSH_HOST` / `SSH_USER` / `SSH_KEY`（deploy 専用ユーザーの鍵）

> `SUPABASE_SERVICE_ROLE_KEY` は **Secrets に置かず**、サーバーの
> `.env.production` に直接配置する。

## 5. バックアップ・監視

- DB / Storage バックアップは `infra/supabase/README.md` §4 を参照（日次 pg_dump + rsync、30 日ローテーション、外部ストレージ複製）
- 監視: Plausible（PV）/ Sentry（エラー）/ `docker compose ps`

## 6. セキュリティ チェック（§16）

- [ ] `.env.production` は `chmod 600`、Git 管理外
- [ ] SSH は鍵認証のみ、パスワード認証無効、deploy 専用ユーザー
- [ ] Supabase の JWT_SECRET / 各キーをデフォルトから再生成済み
- [ ] Studio（管理 UI）は Basic 認証 + IP 制限
- [ ] Nginx に HSTS 等のセキュリティヘッダ設定済み
- [ ] 管理会社マイページ・Supabase に 2FA

> サーバー実態の最終確認待ち項目（OS / バックアップ責任範囲など）は
> `.claude/plans/details/server-investigation.md` の記入テンプレートで管理する。
