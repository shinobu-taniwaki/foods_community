# MCC オンプレデプロイ 作業状況

**最終更新**: 2026-07-07
**現在地**: **本番稼働中（main 53804c3 = Phase 5 全機能 + UI修正 + 画像添付/必須圧縮）** → 残りは Resend キー・Google フォーム・法務文面・Google SSO・Plausible/Sentry の外部依存のみ

### 2026-07-07 デプロイ記録（Phase 5 以降の全成果を本番反映）
- DNS/SSL は設定済みを確認（marketing-camp.jp / Let's Encrypt 〜2026-09-20。**certbot 自動更新の有無は管理者に要確認**）。
- 本番 DB へマイグレーション2本適用: `20260702100000_plan_changed_notification` / `20260707120000_posts_bucket`（適用前に制約・バケット不存在を確認、適用後に検証済み）。
- runbook 方式（ローカル amd64 ビルド 251MB → scp → load）でデプロイ。**`mcc-app:previous` にロールバック用の旧イメージを退避済み**。
- HTTPS スモーク 5 点合格（新ランディング・特商法・PWリセット導線・404）。
- 初期コンテンツ seed 投入（ウェルカム投稿+ガイド3+FAQ5）・lecture チャンネル作成。
- GitHub Actions の Deploy workflow は **secrets/vars 未設定のため未使用**（SSH_HOST/SSH_USER/SSH_KEY/ANON key + DEPLOY_ENABLED=true を登録すれば CI デプロイに移行可能）。
- 備考: 本番には既にメンバーの投稿5件・お知らせ2件・admin 自作の「MEO対策」チャンネルが存在（この12日間で実利用が始まっている）。

### admin アカウント（2026-06-23 作成）
- `henobu@gmail.com` / role=admin / plan=NULL（※`profiles_admin_has_no_plan` 制約＝adminはプラン無し）/ status=active / email確認済み。
- 認証: **メール+PW のみ有効**（パスワードはユーザー設定・本ドキュメントには非記載）。サーバー側でログイン認証(access_token発行)まで検証済み。
- **Google SSO は未有効**（アプリは対応済みだが GoTrue 未設定）。有効化には Google OAuth クライアント発行＋`.env`/compose のコメント解除＋auth再起動＋本番ドメイン。後で同一メールで紐付け予定。
- 最初の admin は手動ブートストラップ必須（招待は `role` 列なし＋`invited_by` 必須の鶏卵問題）。2人目以降は admin が招待発行。

> **メモリ状況（Supabase 起動後）**: available 約1.4GB（Supabase が約2.2GB消費、最大は kong≈0.95GB）。
> Swap 2GB 使い切り（si/so=0）。MCC アプリ（約200MB）は載るが headroom は薄め。要監視。
> 未使用の `functions`(edge/deno,32MB)・`imgproxy`(33MB) は将来トリム候補（効果小のため現状維持）。
**「一旦デプロイ」のゴール**: 外部公開（ドメイン/SSL/IP制限）なしで、サーバー上で MCC が `127.0.0.1` で動く状態。確認は SSH ポートフォワード。

> **実行手順書**: [`deploy-runbook.md`](deploy-runbook.md)（Task #2〜5 の具体コマンド・鍵生成・最小構成・ロールバックを集約）。
> 着手はこの手順書に従う。各サーバー変更タスクは実行前にユーザー承認を得る。

### 2026-06-23 更新（2）— ローカル準備とビルド完了
- **鍵生成**: `.deploy/secrets.local.env`（JWT_SECRET/ANON/SERVICE_ROLE/DB/Studio PW、mode600・gitignore）。署名検証 OK。
- **`.env.production` 生成**（gitignore・mode600）。
- **アプリイメージ build 完了**: `mcc-app:provisional` = 229MB / linux/amd64。焼き込み URL/ANON 検証 OK・旧値混入なし。
- **重要な構成判明（コード確認）**: ブラウザ用 client.ts は未使用＝MCC は完全サーバー経由。唯一ブラウザが Supabase を叩くのは画像署名 URL。
  → 接続を**単一 URL `localhost:8100`＋アプリ host ネットワーク**に変更（署名画像もブラウザ到達可能にする）。
  - `infra/app/docker-compose.deploy.yml` を host ネットワーク版に更新（`HOSTNAME=127.0.0.1`・`SUPABASE_INTERNAL_URL=http://localhost:8100`）。
  - `.env.production` の `SUPABASE_INTERNAL_URL` を `localhost:8100` に。
  - `.dockerignore` に `.deploy` 追加（秘匿値の混入防止）。
  - runbook の接続設計・疎通確認を更新。本番は api.marketing-camp.jp 公開＋再ビルドで対応（依頼書は正）。

### 2026-06-23 更新（1）— 手順書作り直し
- サーバー状態を再確認: 接続OK・k-bean 10コンテナ無傷・MCC 未作成（クリーン）・available 3.5GB・3000/5432/8100 空き。
- 確定方針（ローカルビルド→`save`→`load`／全ポート127.0.0.1／Supabase最小構成）に合わせ infra 資材を整理:
  - 新規 `infra/app/docker-compose.deploy.yml`（load 方式・runtime 注入）。
  - `.env.production.example` に `SUPABASE_INTERNAL_URL` を追記。
  - `.gitignore` に `.deploy/`（鍵生成物）を追加。
  - 完全手順書 `deploy-runbook.md` を作成。Nginx 設定一式・依頼書を `infra/nginx/` に用意。

---

## 1. 調査で判明したサーバー実態（hariki@27.133.240.132）

- 管理会社 **savacus/directorz 運用の相乗り本番サーバー**（専用サーバーではない）。逆引き savacus.net。
- OS: **Rocky Linux 8.9**。Nginx は `conf.d` + 独自 `conf.v` 方式（`sites-available` ではない）。
- 既存稼働: 別事業 **k-bean.jp** の本番/stg/dev（k-been backend×6 + frontend×3 + MySQL5.5）が約2年無停止。**絶対に壊さない**。
- 権限: `hariki` は **sudo 不可**（パスワード要求）。**docker グループ所属＝docker 操作は可**。`/home/hariki/` は書込可。
- メモリ: 15GB 中 available 約 3.4〜3.7GB、Swap 2GB 使い切り（過去の名残・現在 si/so=0・OOM 累計 0）。**定常運用は載るがサーバー上ビルドは OOM 危険**。
- ポート: 80/443/8000 使用中（8000=k-been）。3000/5432 は空き。
- ディスク: 447GB 中 195GB 空き。`/` と `/home` は同一パーティション。
- 永続化の先例: 既存は **bind mount 方式**（例 `/home/mysql5.5/data`）。Docker 自動起動 `enabled`。
- 証明書: certbot 未導入。`/etc/nginx/ssl/<domain>/` に手動配置する運用（Let's Encrypt 自動更新ではない）。

## 2. 確定した方針

- **ビルド方式**: Next.js は **ローカル Mac で `--platform linux/amd64` ビルド → `docker save` → scp → サーバーで `load` → 起動**（レジストリ不要・サーバーメモリ安全）。
- **Supabase**: 公式 self-hosting compose を **最小構成（analytics/vector 無効）** でサーバー起動（pull のみ）。
- **配置先**: `/home/hariki/mcc/`（ホーム配下＝root 不要）。データは `/home/hariki/mcc/volumes/` に bind mount、`restart: unless-stopped`。
- **ポート**: Supabase Kong を `8000→8100` 等にずらし、全コンポーネントを `127.0.0.1` バインド（Nginx 経由のみ公開）。
- **URL 二系統**（重要・コードで確認済み）:
  - ブラウザ: `NEXT_PUBLIC_SUPABASE_URL`（**ビルド時に焼き込み**）
  - コンテナ内サーバー: `SUPABASE_INTERNAL_URL`（runtime・未設定なら NEXT_PUBLIC にフォールバック。`lib/env.ts` の `getServerSupabaseUrl()`）
  - 「一旦デプロイ」では NEXT_PUBLIC を暫定値（例 `http://localhost:8100`＋SSHトンネル）でビルドし、本番ドメイン確定後に再ビルドする。

## 3. ドメイン

- 本番ドメインは **marketing-camp.jp**（MCC 専用に新規取得する B 案。取得済み・お名前.com・有効期限 2027/06/30）。
- 2026-06-20 時点で **DNS 未設定**（apex 未設定、www は別サーバー 150.95.255.38 向き）。
- **DNS 移管/設定は未実施＝保留。ドメイン管理者が後で実施**（情報共有して動いてもらう）。

## 4. 残ブロッカー / 保留（外部依存・root が絡む）

| 項目 | 状態 |
|---|---|
| root 権限（Nginx vhost / SSL 配置 / firewall / Swap 拡張） | ❓未確認（管理会社 savacus 依頼 or sudo 付与）。Nginx 設定一式・依頼書は `infra/nginx/`（`marketing-camp.jp.conf` ＋ `ADMIN-HANDOFF.md`）に用意済み |
| DNS 設定（marketing-camp.jp → 27.133.240.132） | 保留（管理者が後で） |
| IP 制限 | これからかける予定 |
| VPN（管理アクセス保護） | **ConoHa で別途進行中**（本デプロイ作業のスコープ外） |
| git 取得の認証 | pull 方式採用で「サーバーで clone/build しない」→ 回避可能 |
| 自動デプロイ | pull 方式なら GitHub の送信元 IP 許可は不要（SSH inbound を開けない） |

## 5. デプロイ手順タスクと進捗

| # | タスク | 状態 | 種別 |
|---|---|---|---|
| 1 | デプロイ資材をローカルで準備（infra 整備） | ✅ 完了（load方式compose・接続設計・手順書） | ローカル・root不要 |
| 2 | サーバーに Supabase(最小構成)を起動 | ✅ 完了（commit f2e20eac・全11サービスhealthy・127.0.0.1限定・k-bean無傷） | サーバー変更 |
| 3 | スキーマ・seed を適用（migrations 5本＋seed） | ✅ 完了（22テーブル全RLS有効・80ポリシー・bucket3） | サーバー変更 |
| 4 | Next.js イメージをローカルビルド→転送→起動 | ✅ 完了（host net・127.0.0.1:3000待受・/health で Supabase接続成功） | サーバー変更 |
| 5 | 127.0.0.1 で疎通確認（SSHポートフォワード） | ✅ 完了（Chrome実機でログイン→お知らせ→/admin まで確認。トンネルは local3001→server3000） | 確認 |
| 6 | 永続化・バックアップ・自動起動を確認 | ✅ 完了（bind mount永続・全restart unless-stopped・Docker enabled／日次バックアップ cron 3:10 稼働・検証済） | 確認・文書化 |

> Task #2〜6（「一旦デプロイ」一式）は完了。具体手順は [`deploy-runbook.md`](deploy-runbook.md) に集約。

## 6. 今後のタスク（本番公開フェーズ・自動化）

### 6.1 本番公開（ドメイン稼働）
1. **管理者の DNS/SSL 設定**（依頼書 `infra/nginx/ADMIN-HANDOFF.md` 送付済み）。A レコード3件 → 27.133.240.132、SSL はサーバー側対応。
2. **アプリ再ビルド・差し替え**: `NEXT_PUBLIC_SUPABASE_URL=https://api.marketing-camp.jp` で再ビルド → save→転送→load→再起動。Supabase 側 `.env` の `SITE_URL`/`API_EXTERNAL_URL`/`SUPABASE_PUBLIC_URL` を本番ドメインへ、`SUPABASE_INTERNAL_URL` も同 URL に（host net＋`extra_hosts: api.marketing-camp.jp:127.0.0.1`）。auth 再起動。
3. **Nginx vhost 有効化**（`infra/nginx/marketing-camp.jp.conf`・管理者）。

### 6.2 Google SSO 有効化（[[mcc-auth-admin]] 参照）
- Google OAuth クライアント（Client ID/Secret）発行 → リダイレクトURI登録（`https://api.marketing-camp.jp/auth/v1/callback`）。
- `.env` の `GOOGLE_ENABLED=true`＋`GOOGLE_CLIENT_ID/SECRET`、compose の `GOTRUE_EXTERNAL_GOOGLE_*` コメント解除 → auth 再起動。
- しのぶさんが Google ログイン → 既存 admin（henobu@gmail.com）に紐付け確認。

### 6.3 ★GitHub Actions 自動デプロイ（main 更新で本番更新）★ ユーザー要望（2026-06-23）
**要件**: main ブランチが更新されたら、GitHub Actions で本番を自動更新する。
**設計上の論点（着手時に確定）**:
- **ビルドは CI 上で**（GitHub-hosted runner で `docker build --platform linux/amd64`）。サーバー上ビルドは OOM 危険のため不可。
- **サーバーへの配送方法**（最重要・IP制限/VPN 方針と整合させる）。SSH inbound を開けない前提なので候補:
  - (A) **サーバー上に self-hosted runner** を常駐（GitHub へ outbound のみ・inbound 不要）。runner がジョブを受けて `docker load`＋`compose up -d`。ロックダウン環境に最適。
  - (B) **GHCR 等レジストリに push** → サーバーが pull（cron/webhook で `compose pull && up -d`）。
  - (C) SSH push（GitHub の送信元 IP 許可 or VPN/bastion 経由）。inbound を開ける必要あり。
- **秘匿値**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` は build-arg（焼き込み）。`SUPABASE_SERVICE_ROLE_KEY` 等はサーバーの `.env.production`（Secrets に置かない＝設計書 §15.4）。
- **手順の雛形**は `infra/README.md` §4 にあるが SSH 前提のため、上記 (A)/(B) で再設計が必要。
- **マイグレーション**: スキーマ変更を伴う場合の自動適用（`supabase/migrations/*` を docker exec で流す）も CI/CD に組み込むか要検討（破壊的変更・バックアップ前提）。

### 6.4 その他（運用堅牢化）
- **外部バックアップ複製**: 現状は同一ディスク保存。別ディスク/外部ストレージ（S3互換等）への複製（要・保存先と資格情報）。
- メンバー招待フローの動作確認（admin `/admin/invites` → 招待受諾）。
- Swap 拡張（root 作業・OOM 保険）。

## 7. サーバー状態スナップショット（2026-06-23・デプロイ後）

- 接続: OK（`ssh hariki@27.133.240.132`）。
- メモリ: available 約 1.4〜1.5GB（Supabase＋アプリ稼働後）。Swap 2GB 使い切り（si/so=0）。
- 稼働: k-been 9＋MySQL ＋ **MCC（Supabase 11＋mcc-app）**。日次バックアップ cron 稼働。

---

参照: [`../foods-community-design.plan.md`](../foods-community-design.plan.md) §15 / [`server-investigation.md`](server-investigation.md) / [`../../../infra/README.md`](../../../infra/README.md)
