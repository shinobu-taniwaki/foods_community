# MCC「一旦デプロイ」実行手順書（Task #2〜5）

**対象**: 外部公開（ドメイン/SSL/IP制限）なしで、相乗り本番サーバー上で MCC を
`127.0.0.1` で動かし、SSH ポートフォワードで疎通確認する。
**サーバー**: `hariki@27.133.240.132`（Rocky8 / sudo不可 / docker可 / k-bean 同居・**絶対に壊さない**）
**最終更新**: 2026-06-23

> ⚠️ この手順書のうち §2 以降は**サーバー変更操作**を含む。各タスク着手前にユーザー承認を得る。
> 読み取り確認（ssh status / docker ps / dig 等）は承認不要。

---

## 0. 設計サマリ（なぜこの形か）

| 論点 | 決定 | 理由 |
|---|---|---|
| ビルド場所 | **ローカル Mac**（`--platform linux/amd64`）→ `docker save` → scp → サーバー `load` | サーバー available 3.5GB / Swap 使い切り → サーバー上ビルドは OOM 危険 |
| Supabase | 公式 self-hosting を**最小構成**（analytics/vector 無効）でサーバー起動（pull のみ） | メモリ節約・ベンダー追従 |
| 配置先 | `/home/hariki/mcc/`（ホーム配下＝root 不要） | sudo 不可 |
| ポート | Kong `8000→8100`、全コンポーネント `127.0.0.1` バインド | 8000 は k-bean 使用中・外部非公開 |
| 永続化 | `/home/hariki/mcc/` 配下に bind mount、`restart: unless-stopped` | 既存サーバーの先例に倣う |
| **接続（単一 URL）** | サーバーもブラウザも `http://localhost:8100`（Kong）。アプリは host ネットワークで起動 | 下記「重要な構成事実」参照 |

### 重要な構成事実（コードで確認済み）

- MCC の**ブラウザ用 Supabase クライアント（`lib/supabase/client.ts`）はどこからも import されていない**。
  → 認証・データ取得はすべて Next.js サーバー経由（`server.ts`/`middleware.ts` が `getServerSupabaseUrl()` 利用）。
- ~~唯一ブラウザが Supabase を直接叩くのは画像の署名付き URL~~
  → **【更新 2026-06-24】単一ドメイン化により署名 URL は廃止**。画像はアプリの `/api/img` 経由で
  サーバーが download して配信し、ブラウザは Supabase を一切直接叩かない
  （[single-domain-image-proxy.md](single-domain-image-proxy.md)）。
- 結論: サーバー(コンテナ)から Kong への内部到達 `http://localhost:8100` だけ確保すればよい。
  アプリを **host ネットワーク**で起動すると、コンテナの `localhost` = ホストの `localhost:8100`(Kong) になる。
  `HOSTNAME=127.0.0.1` で待受をループバックに限定。

### 接続図（「一旦デプロイ」時）

```
[Mac ブラウザ]    ──http://localhost:3000──┐ (SSH トンネル)
[署名付き画像URL]  ─http://localhost:8100──┤
                                          ▼  ssh -L 3000 / -L 8100
              ┌──────────── サーバー 127.0.0.1 ────────────┐
              │  mcc-app (host net, HOSTNAME=127.0.0.1)        │
              │     :3000 待受 ─┐                              │
              │                 └─▶ localhost:8100 ──▶ kong    │
              │   kong(127.0.0.1:8100) ── auth/rest/storage/realtime/db │
              └───────────────────────────────────────────────┘
```

- 焼き込み: `NEXT_PUBLIC_SUPABASE_URL=http://localhost:8100`、runtime `SUPABASE_INTERNAL_URL=http://localhost:8100`。
- ANON/SERVICE キーは URL 非依存（JWT_SECRET 署名）。

> **本番（marketing-camp.jp）への移行時（単一ドメイン化・[single-domain-image-proxy.md](single-domain-image-proxy.md)）:**
> - **アプリ再ビルドは不要**。ブラウザは Supabase URL を参照しないため、`NEXT_PUBLIC_SUPABASE_URL` の
>   ドメイン差し替え目的の再ビルドは発生しない（焼き込み値は内部到達先のままでよい）。
> - 画像は署名付き URL を使わず、アプリの `/api/img` 経由でサーバーが download して配信する。
>   サーバー→Kong は `SUPABASE_INTERNAL_URL=http://localhost:8100`（内部到達）のまま。
> - `api.marketing-camp.jp` は**不要**。公開は `marketing-camp.jp`（+www）の1ドメインのみ
>   （[`../../../infra/nginx/ADMIN-HANDOFF.md`](../../../infra/nginx/ADMIN-HANDOFF.md)）。

---

## 1. 事前準備（ローカル・サーバー変更なし）

### 1.1 プリフライト確認（読み取りのみ・承認不要）

```bash
ssh hariki@27.133.240.132 '
  free -h;                         # available 3GB 以上あるか
  df -h /home;                     # 空き十分か
  docker compose version;          # v2 系か
  curl -sI https://github.com -o /dev/null -w "github:%{http_code}\n" 2>/dev/null || echo "outbound 要確認";
  ss -tlnp | grep -E ":(3000|5432|8100) " || echo "3000/5432/8100 空き";
'
```

### 1.2 鍵・秘匿値の生成（ローカル Mac）

「一旦デプロイ」用に一式生成し、**ローカルの gitignore 済みファイル**に保存する
（実値は commit しない）。Supabase 側 `.env` とアプリ `.env.production` で**同じ値**を使う。

```bash
mkdir -p .deploy && chmod 700 .deploy   # .deploy/ は .gitignore 済みであること（後述 §6）

# JWT_SECRET（40文字以上）/ DB / Studio パスワード
node -e '
  const c = require("crypto");
  const b64u = (b) => b.toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  const JWT_SECRET = c.randomBytes(48).toString("base64").replace(/[^a-zA-Z0-9]/g,"").slice(0,48);
  const POSTGRES_PASSWORD = c.randomBytes(24).toString("base64").replace(/[^a-zA-Z0-9]/g,"").slice(0,32);
  const DASHBOARD_PASSWORD = c.randomBytes(18).toString("base64").replace(/[^a-zA-Z0-9]/g,"").slice(0,24);

  // HS256 JWT を JWT_SECRET で署名（ANON / SERVICE_ROLE）
  const sign = (role) => {
    const now = Math.floor(Date.now()/1000);
    const header = b64u(Buffer.from(JSON.stringify({alg:"HS256",typ:"JWT"})));
    const payload = b64u(Buffer.from(JSON.stringify({
      role, iss:"supabase", iat: now, exp: now + 60*60*24*365*10  // 10年
    })));
    const data = header + "." + payload;
    const sig = b64u(c.createHmac("sha256", JWT_SECRET).update(data).digest());
    return data + "." + sig;
  };
  const ANON_KEY = sign("anon");
  const SERVICE_ROLE_KEY = sign("service_role");

  const out = [
    "# === MCC 一旦デプロイ 秘匿値（commit 禁止）===",
    "JWT_SECRET="+JWT_SECRET,
    "POSTGRES_PASSWORD="+POSTGRES_PASSWORD,
    "DASHBOARD_USERNAME=mcc_admin",
    "DASHBOARD_PASSWORD="+DASHBOARD_PASSWORD,
    "ANON_KEY="+ANON_KEY,
    "SERVICE_ROLE_KEY="+SERVICE_ROLE_KEY,
  ].join("\n")+"\n";
  require("fs").writeFileSync(".deploy/secrets.local.env", out, {mode:0o600});
  console.log("wrote .deploy/secrets.local.env");
'
```

> 検証: 生成した ANON_KEY を jwt.io 等で `JWT_SECRET` 署名検証 → role=anon を確認できればOK。
> （任意。node で `crypto.createHmac` 再計算でも検証可。）

### 1.3 アプリ用 `.env.production`（ローカルで作成 → 後でサーバーへ）

`.env.production.example` を複製し、§1.2 の値と暫定 URL を埋める。

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:8100          # ブラウザ（焼き込み・暫定）
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>            # 秘匿・runtime
SUPABASE_INTERNAL_URL=http://kong:8000                 # サーバー内部（runtime）
NEXT_PUBLIC_BETA_MODE=true
NEXT_PUBLIC_BETA_END_DATE=2026-07-31
# Resend / SENTRY / フォーム類はスモークテストでは空 or プレースホルダで可
```

---

## 2. Task #2 — サーバーに Supabase（最小構成）を起動 ★要承認

### 2.1 配置先の作成と公式 self-hosting 取得

```bash
ssh hariki@27.133.240.132
mkdir -p /home/hariki/mcc && cd /home/hariki/mcc
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
git -C /home/hariki/mcc/supabase rev-parse HEAD   # ★使用コミットを記録（再現性）
cp .env.example .env
```

### 2.2 `.env` の秘匿値・URL・ポートを差し替え

`.deploy/secrets.local.env` の値で以下を上書き（手で編集 or sed）:

| キー | 値 |
|---|---|
| `POSTGRES_PASSWORD` | 生成値 |
| `JWT_SECRET` | 生成値 |
| `ANON_KEY` | 生成値 |
| `SERVICE_ROLE_KEY` | 生成値 |
| `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` | mcc_admin / 生成値 |
| `SITE_URL` | `http://localhost:3000` |
| `API_EXTERNAL_URL` | `http://localhost:8100` |
| `SUPABASE_PUBLIC_URL` | `http://localhost:8100` |
| `KONG_HTTP_PORT` | `8100` |
| `KONG_HTTPS_PORT` | `8543`（衝突回避・未使用） |
| `STUDIO_PORT`（あれば） | `8101` |
| `POOLER_PROXY_PORT_TRANSACTION` 等 | 既定のまま（127.0.0.1 化は §2.3） |

> `ADDITIONAL_REDIRECT_URLS` が空でも email+PW ログインは可。SSO/招待を試すなら
> `http://localhost:3000/**` を追加。

### 2.3 ポートを 127.0.0.1 バインド・最小構成化（compose 編集）

`docker-compose.yml` を編集（k-bean に影響しないよう**全公開ポートを 127.0.0.1 に限定**）:

1. **ポート公開を localhost 限定に**: `ports:` の各 `"<host>:<container>"` を
   `"127.0.0.1:<host>:<container>"` に変更（kong/db/studio/analytics 等すべて）。
   - kong: `127.0.0.1:8100:8000`（HTTPS 行は不要なら削除）
   - db: `127.0.0.1:5432:5432`
   - studio: `127.0.0.1:8101:3000`（**ホスト 3000 はアプリ用なので必ずずらす**）
2. **メモリ節約（最小構成）**: `analytics`（Logflare）と `vector` サービスを無効化。
   - 両サービス定義をコメントアウト。
   - 他サービスの `depends_on:` から `analytics` / `vector`（特に `condition: service_healthy`）を除去。
     ※これを残すと依存待ちで起動しない。**ここが最大の手戻りポイント**。
   - `db` 等の `command`/logging で vector へ送る設定があれば無効化（任意）。
3. 永続化は bind mount を維持（既定の `./volumes/...` が `/home/hariki/mcc/supabase/docker/volumes/` 配下に作られる）。

> ⚠️ 公式 compose はバージョンで構成が変わる。**実物を読んで** `depends_on` と `ports` を確認すること。
> 不確実な編集は一度に行わず、`docker compose config` で検証してから up する。

### 2.4 起動（pull のみ・メモリ安全）

```bash
cd /home/hariki/mcc/supabase/docker
export COMPOSE_PROJECT_NAME=supabase          # ★ネットワーク名を supabase_default に固定
docker compose config >/dev/null              # 構文・参照の事前検証
docker compose pull
docker compose up -d
docker compose ps                             # 全サービス healthy/running を確認
docker network ls | grep supabase             # supabase_default の存在を確認
```

### 2.5 起動直後チェック

```bash
# 既存 k-bean が無傷か（最優先）
docker ps --format '{{.Names}}' | grep k-been | wc -l   # 9 のまま
free -h                                                  # available の余裕を確認
# Kong 越しに REST が応答するか（curl 不可環境のため docker exec / node fetch を使う）
docker exec supabase-db psql -U postgres -d postgres -c '\dn'   # スキーマ一覧（auth/storage 等）
```

---

## 3. Task #3 — スキーマ・seed の適用 ★要承認

`supabase/migrations/*.sql`（5本）を昇順で、最後に `supabase/seed.sql` を適用する。
**Supabase の Postgres superuser（postgres）で docker exec 経由**（host curl/psql 不要）。

```bash
# ローカルから migration/seed をサーバーへ転送
scp supabase/migrations/2026*.sql supabase/seed.sql hariki@27.133.240.132:/home/hariki/mcc/sql/

# サーバーで昇順適用（1本ずつ・エラーで停止）
ssh hariki@27.133.240.132
cd /home/hariki/mcc/sql
for f in $(ls 2026*_*.sql | sort); do
  echo "=== applying $f ===";
  docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f" || { echo "FAILED: $f"; break; }
done
echo "=== seed ===";
docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < seed.sql
```

### 3.1 適用後チェック

```bash
docker exec supabase-db psql -U postgres -d postgres -c "\dt public.*"          # テーブル一覧
docker exec supabase-db psql -U postgres -d postgres -c \
  "select count(*) from pg_policies where schemaname='public';"                  # RLS ポリシー数 > 0
docker exec supabase-db psql -U postgres -d postgres -c "select * from storage.buckets;"  # bucket 作成確認
```

> 注意: migration は CLI `db reset` 用に書かれている。self-hosted の Postgres には
> `anon/authenticated/service_role` ロールと `auth/storage` スキーマが既に存在するため流せる想定。
> エラーが出たら該当行を確認（既存オブジェクトとの衝突なら `IF NOT EXISTS` 等で吸収）。

---

## 4. Task #4 — Next.js イメージをローカルビルド→転送→起動 ★要承認

### 4.1 ローカル Mac でビルド（linux/amd64）★2026-06-23 実施済み

```bash
# リポジトリ直下。NEXT_PUBLIC_* はビルド時に焼き込み（暫定 URL = localhost:8100）
# ★ .dockerignore に .deploy を含め、秘匿値をビルドコンテキストに入れないこと。
ANON=$(grep '^ANON_KEY=' .deploy/secrets.local.env | cut -d= -f2-)
docker buildx build --platform linux/amd64 \
  -f infra/app/Dockerfile \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=http://localhost:8100 \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$ANON" \
  --build-arg NEXT_PUBLIC_BETA_MODE=true \
  --build-arg NEXT_PUBLIC_BETA_END_DATE=2026-07-31 \
  -t mcc-app:provisional --load .
```

> 実施結果: `mcc-app:provisional` = 229MB / linux/amd64。焼き込み URL/ANON 検証 OK・旧値混入なし。
> フォーム系 `NEXT_PUBLIC_FORM_*` はスモークテストでは未指定（該当機能のみ動かない）。本番ビルドでは全て指定する。

### 4.2 save → 転送 → load

```bash
docker save mcc-app:provisional | gzip > /tmp/mcc-app.tar.gz
scp /tmp/mcc-app.tar.gz hariki@27.133.240.132:/home/hariki/mcc/
ssh hariki@27.133.240.132 'gunzip -c /home/hariki/mcc/mcc-app.tar.gz | docker load'
```

### 4.3 アプリ資材を配置して起動

```bash
# load 方式の compose と .env.production をサーバーへ
scp infra/app/docker-compose.deploy.yml hariki@27.133.240.132:/home/hariki/mcc/
scp .env.production hariki@27.133.240.132:/home/hariki/mcc/.env.production

ssh hariki@27.133.240.132
cd /home/hariki/mcc
chmod 600 .env.production
# host ネットワークで起動（コンテナ localhost = ホスト localhost:8100 = Kong）
MCC_APP_IMAGE=mcc-app:provisional \
  docker compose -f docker-compose.deploy.yml --env-file .env.production up -d
docker compose -f docker-compose.deploy.yml ps
docker logs --tail=50 mcc-app          # 起動ログにエラーがないか
# 待受がループバック限定か確認（0.0.0.0 で公開されていないこと）
ss -tlnp | grep ':3000 '               # 127.0.0.1:3000 のみであること
```

---

## 5. Task #5 — 疎通確認（SSH ポートフォワード）

ローカル Mac で:

```bash
ssh -N -L 3000:127.0.0.1:3000 -L 8100:127.0.0.1:8100 hariki@27.133.240.132
```

別ターミナル / ブラウザで:

- `http://localhost:3000` … トップ/ログイン画面が表示される（ブラウザ→アプリ）
- 認証・データ取得はすべてサーバー（コンテナ）→ `localhost:8100`（Kong）経由
- 画像の署名付き URL は `http://localhost:8100/...` になり、ブラウザは `-L 8100` トンネル経由で取得
- Studio: `http://localhost:8101`（要トンネル追加 `-L 8101:127.0.0.1:8101`、Basic 認証）

確認観点:
- [ ] トップ表示・静的アセット配信
- [ ] 認証フロー（招待 or email+PW ログイン）
- [ ] お知らせ/掲示板の一覧取得（RLS 越しの読取）
- [ ] 画像取得（署名付き URL `localhost:8100` がトンネル経由で表示される）
- [ ] `docker logs mcc-app` に URL 到達エラーが出ていない

---

## 6. 永続化・後片付け・ロールバック

### 6.1 永続化・自動起動（Task #6・2026-06-23 検証/実装済み）

**永続化（検証済み）:**
- DB データ: bind mount `volumes/db/data → /var/lib/postgresql/data`（実体 68M・uid100 postgres 所有のため hariki から直接 du すると 4K に見えるが実データあり）。
- Storage: bind mount `volumes/storage → /var/lib/storage`（root 所有）。
- named volume は `supabase_db-config`・`supabase_deno-cache` のみ（設定/キャッシュ＝非重要）。
- mcc-app は mount 無し＝ステートレス（状態は全て Supabase）。

**自動起動（検証済み）:**
- 全12コンテナ `restart: unless-stopped`、Docker デーモン `enabled` → **サーバー再起動で自動復帰**。
- 注: 再起動直後、アプリが Kong より先に起きると一時的に Supabase 到達エラーになるが Kong 起動後（数秒）に解消。ハード依存ではない。

**バックアップ（実装済み）:**
- スクリプト: `/home/hariki/mcc/backup.sh`（DB `pg_dump`→gzip ＋ Storage コンテナ経由 tar、30日ローテーション、`backups/backup.log` へログ）。
- cron: `10 3 * * * /home/hariki/mcc/backup.sh`（hariki ユーザー・毎日 3:10・crond active）。
- 保存先: `/home/hariki/mcc/backups/{db,storage}/`。
- 検証: 手動実行 OK。dump に `auth.users`・`public.profiles` を含む・gzip 整合性 OK。
- ⚠️ **同一ディスク（/dev/sda2）保存**＝誤削除/論理破損には有効だが**物理障害には無力**。別ディスク/外部複製は後続（要・外部保存先）。
- Swap 拡張は root 作業（保留）。

### 6.1.1 リストア手順
```bash
# DB（新規 or 同一 Supabase の postgres DB へ。要・事前に対象を空に近い状態へ）
gunzip -c /home/hariki/mcc/backups/db/db-YYYY-MM-DD_HHMMSS.sql.gz \
  | docker exec -i supabase-db psql -U postgres -d postgres
# ※ 既存インスタンスへ戻す場合は "already exists" を避けるため、
#    新規 Supabase を起動 → 復元、もしくは対象スキーマを drop してから流す。
#    本番リストアは事前にテスト実施を推奨。

# Storage（コンテナ経由で展開）
gunzip -c /home/hariki/mcc/backups/storage/storage-YYYY-MM-DD_HHMMSS.tar.gz \
  | docker exec -i supabase-storage tar xzf - -C /var/lib
```

### 6.2 完全ロールバック（k-bean に触れず MCC だけ撤去）

```bash
ssh hariki@27.133.240.132
cd /home/hariki/mcc
docker compose -f docker-compose.deploy.yml down            # アプリ停止・削除
cd supabase/docker && COMPOSE_PROJECT_NAME=supabase docker compose down   # Supabase 停止
docker image rm mcc-app:provisional 2>/dev/null
# データも消すなら（要注意）: rm -rf /home/hariki/mcc/supabase/docker/volumes
docker ps --format '{{.Names}}' | grep k-been | wc -l       # ★9 のまま＝k-bean 無傷を確認
```

### 6.3 gitignore 確認（秘匿値の漏洩防止）
- `.deploy/`、`.env.production`、`.env.production.local` が `.gitignore` 済みであること。
- サーバー `.env`・`.env.production` は `chmod 600`。

---

## 7. 残ブロッカー（「一旦デプロイ」スコープ外）

| 項目 | 状態 |
|---|---|
| DNS（marketing-camp.jp → 27.133.240.132） | 保留・ドメイン管理者が後で設定 |
| Nginx vhost / SSL | root 必要・管理者へ依頼。設定一式: [`../../../infra/nginx/marketing-camp.jp.conf`](../../../infra/nginx/marketing-camp.jp.conf) ＋ 依頼書 [`ADMIN-HANDOFF.md`](../../../infra/nginx/ADMIN-HANDOFF.md) |
| ~~本番 URL でのアプリ再ビルド~~ → **不要**（単一ドメイン化。ブラウザは Supabase URL 非参照） | 解消 |
| IP 制限 / VPN（ConoHa で別途進行中） | デプロイ作業のスコープ外 |
| Swap 拡張 | root 作業・保留 |

---

参照: [`deploy-progress.md`](deploy-progress.md) / [`../foods-community-design.plan.md`](../foods-community-design.plan.md) §15 /
[`../../../infra/README.md`](../../../infra/README.md) / [`../../../infra/supabase/README.md`](../../../infra/supabase/README.md)
