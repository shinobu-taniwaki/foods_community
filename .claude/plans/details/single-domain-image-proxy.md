# 単一ドメイン化（marketing-camp.jp 1枚）+ 画像プロキシ設計

**決定日**: 2026-06-24
**決定**: 外部公開ドメインは `marketing-camp.jp`（+ `www`）の **1つだけ**。
`api.marketing-camp.jp` サブドメインは**廃止**し、Self-hosted Supabase は**外部非公開**にする。
SSL 証明書は `marketing-camp.jp`（+www は無料例外）の **1枚**で運用する（追加 1,500円/月を回避）。

> 関連メモリ: SSL は FQDN 単位課金（サブドメイン毎 +1,500円/月、ワイルドカード 5,000円/月）。
> 旧前提（`api.` サブドメイン）の記述が残る [deploy-runbook.md](deploy-runbook.md) §0・§7、
> [../../../infra/nginx/marketing-camp.jp.conf](../../../infra/nginx/marketing-camp.jp.conf)、
> [../../../infra/supabase/README.md](../../../infra/supabase/README.md) は本設計で上書きする。

---

## 1. なぜ単一ドメインにできるか（調査の結論）

ブラウザが Supabase(Kong) を**直接叩く経路は存在しない**ことをコードで確認済み：

| 確認項目 | 結果 |
|---|---|
| ブラウザ用 `lib/supabase/client.ts` の import 元 | **0件**（未使用） |
| Realtime 購読（`.channel`/`.subscribe`） | **0件** |
| `'use client'` からの `@supabase/supabase-js` 直利用 | **0件** |
| 署名付き URL 生成箇所 | 4箇所すべて**サーバー側**（RSC / Server Action） |

認証・データ取得はすべて Next.js サーバー経由（`server.ts`/`middleware.ts` が `getServerSupabaseUrl()` 利用）。
ブラウザが Supabase ホストを必要とする唯一の理由は**画像の署名付き URL（read）**だけ。
→ この画像配信を Next.js 経由（プロキシ）に変えれば、ブラウザは `marketing-camp.jp` だけを見れば済む。

### Storage RLS（[20260529120005_storage_buckets.sql](../../../supabase/migrations/20260529120005_storage_buckets.sql)）

- 全バケット `private`（avatars / stores / contents）。
- **SELECT（閲覧）は `TO authenticated`＝ログイン済みなら全員可**（所有者を問わない＝コミュニティ内共有）。
- INSERT は自分のフォルダ（先頭セグメント = `auth.uid()`）。contents は admin のみ。

→ **画像プロキシの認可は「ログイン済みか」だけでよい**。ユーザーセッションのまま Supabase を呼べば RLS が自動で担保する。

---

## 2. アーキテクチャ（Before → After）

### Before（api. サブドメイン前提・廃止）
```
ブラウザ ─→ marketing-camp.jp      → Next.js(:3000)
ブラウザ ─→ api.marketing-camp.jp  → Kong(:8100)     ← SSL 追加課金の原因
```

### After（単一ドメイン・本設計）
```
ブラウザ ─→ marketing-camp.jp ─┬─ /            → Next.js(:3000)
                               ├─ /api/auth/...  → Next.js（既存・認証コールバック）
                               └─ /api/img/...   → Next.js（新規・画像プロキシ）
                                                     │ サーバー内部のみ
                                                     ▼
                                          Kong(127.0.0.1:8100, 外部非公開)
                                          └ auth / rest / storage（RLS）
```
Kong は `127.0.0.1` バインドのまま。Nginx からも **proxy しない**（完全に内部）。

---

## 3. 画像配信プロキシ（read）

### 3.1 Route Handler
- 新規: `app/api/img/[...path]/route.ts`（`GET` のみ）
- URL 形: `/api/img/<bucket>/<storagePath...>`
  - 例: `/api/img/contents/<uuid>/announcement/<uuid>.jpg`
  - **middleware matcher が `api/img/` を除外**するため、拡張子の大小・有無に関わらずセッション更新は走らない（パフォーマンス）。
- 処理:
  1. 先頭セグメントを `bucket`、残りを `storagePath` として分解。
  2. `bucket` を**許可リスト**（`avatars`/`stores`/`contents`）で検証。外なら `400`。
  3. `storagePath` を検証（空・`..`・先頭`/`を拒否＝パストラバーサル防止）。
  4. `createClient()`（`server.ts`・anon + cookie・**RLS 配下**）で
     `supabase.storage.from(bucket).download(storagePath)` を実行。
     - 未ログイン or 権限なし → RLS が弾く → `download` エラー → **`404`**（情報を漏らさず一律 404）。
  5. 取得 Blob を `Response` で返す。
     - `Content-Type`: 許可 MIME（image/jpeg|png|webp）のみ反射、それ以外は `application/octet-stream`。
     - `X-Content-Type-Options: nosniff` ＋ `Content-Disposition: inline`（Nginx 非依存の多層防御）。
     - `Cache-Control: private, no-cache` ＋ `ETag`（storage_path は不変）。毎回 RLS 再検証し、未変更なら `304` で本文転送を省く。
       ログアウト後は download 失敗で `404` となりキャッシュは再利用されない。
  6. download 失敗（RLS 拒否・障害）は一律 `404`。サーバー側のみ `console.error` で記録（秘匿は維持・規約: エラーを握りつぶさない）。
- service_role は使わない（**`createAdminClient` 禁止**）。必ずユーザーセッションで RLS を効かせる。

### 3.2 表示側ヘルパー
- `lib/storage.ts` に追加:
  ```ts
  export function imageProxyPath(bucket: ImageBucket, storagePath: string): string {
    return `/api/img/${bucket}/${storagePath.split('/').map(encodeURIComponent).join('/')}`;
  }
  ```
- 署名 URL 生成ループ（`createSignedUrl`）を**全廃**し、`src={imageProxyPath(bucket, path)}` に置換。
  - [app/(app)/announcements/[id]/page.tsx](../../../app/(app)/announcements/[id]/page.tsx)（bucket: `contents`）
  - [app/(app)/feed/[id]/page.tsx](../../../app/(app)/feed/[id]/page.tsx)（bucket: `contents`）
  - [app/(app)/me/page.tsx](../../../app/(app)/me/page.tsx)（bucket: `avatars`）
- `<Image>` は **`unoptimized` を維持**（同一オリジンだが、`/_next/image` 経由の二重 fetch とオンプレ最適化コストを避ける）。
  - 付随で [me/page.tsx](../../../app/(app)/me/page.tsx) のアバター `<Image>` に `unoptimized` を補完（現状欠落＝軽微バグ）。

---

## 4. 画像アップロード（write）

> アップロード UI は**未結線**（CLAUDE.md §2 / Phase 5 未了）。本設計で**最初からサーバー経由**に確定する。
> ブラウザが Supabase に直接アップロードする経路は**作らない**。

- フロー（avatar / store / announcement 共通）:
  1. ブラウザ: `compressImage`（`browser-image-compression`・クライアント圧縮）→ 圧縮 Blob を **FormData で Server Action** に送信。
  2. Server Action（`'use server'`）:
     - `requireMember()` で認証。
     - サイズ上限（`IMAGE_PURPOSES[purpose].maxBytes`）＋ **マジックバイト検証**（`detectImageType`）。
     - path = `${userId}/${purpose}/${uuid}.${ext}`（`isOwnedPath` 準拠＝ RLS `WITH CHECK` を通過）。
     - `createClient()`（ユーザーセッション・RLS 配下）で `storage.from(bucket).upload(path, blob)`。
     - 対象テーブル更新（`profiles.avatar_image_path` 等）＋旧画像 `remove`。
- 既存 `confirmImageUpload`（download→検証→署名URL 返却＝「ブラウザ直 upload 後の確認」モデル）は
  本設計の upload Server Action に**検証ロジックを取り込みつつ置換**（署名 URL 返却は不要になる）。

---

## 5. 環境変数・ビルド

| 変数 | 役割（After） |
|---|---|
| `SUPABASE_INTERNAL_URL` | **唯一の実働 Supabase URL**。サーバー→Kong。`http://kong:8000`（同一 compose net）または `http://localhost:8100`（host net）。 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | サーバークライアントの anon key（URL 非依存・JWT 署名）。 |
| `SUPABASE_SERVICE_ROLE_KEY` | 招待・監査・通知のサーバー専用処理のみ。 |
| `NEXT_PUBLIC_SUPABASE_URL` | **ブラウザからは参照されなくなる**。`getPublicEnv()` の zod 検証を通すための有効 URL 文字列であればよい（値は内部到達先で可）。 |

- **重要な利点**: `NEXT_PUBLIC_SUPABASE_URL` がブラウザ動作に影響しなくなるため、
  **本番ドメイン確定後の「焼き込み再ビルド」が不要**になる（旧 runbook §7 の再ビルド項目を撤廃）。
- zod 検証（`lib/env.ts`）は現状維持。`NEXT_PUBLIC_SUPABASE_URL` は将来の整理で optional 化も可（YAGNI のため今はしない）。

---

## 6. インフラ（Nginx / SSL）

### 6.1 Nginx（[marketing-camp.jp.conf](../../../infra/nginx/marketing-camp.jp.conf) を改訂）
- `server_name ... api.marketing-camp.jp` を **80→443 リダイレクトから除去**。
- **`api.marketing-camp.jp` の 443 server ブロックを削除**。
- 残すのは 3 ブロックのみ:
  1. `80` → `https://marketing-camp.jp`（apex + www）
  2. `443` `www.marketing-camp.jp` → apex 正規化
  3. `443` `marketing-camp.jp` → `proxy_pass http://127.0.0.1:3000`（アプリ唯一の入口）
- `client_max_body_size`: アップロードは Server Action 経由＝圧縮後最大 2MB。`10M` で十分（余裕）。
- Kong(8100) への `location` は**作らない**。

### 6.2 SSL
- 証明書 SAN: `marketing-camp.jp` + `www.marketing-camp.jp`（www は無料例外）。**1枚**。
- `api.*` 証明書は**不要**（佐々木さんへ「marketing-camp.jp のみ」で確定回答済み）。

### 6.3 Supabase 側 `.env`
- `API_EXTERNAL_URL` / `SUPABASE_PUBLIC_URL` は外部到達不要になるが、GoTrue のメールリンク
  （招待・magic link）は `SITE_URL` / リダイレクト URL ベース。
  - `SITE_URL=https://marketing-camp.jp`
  - 認証コールバックは `https://marketing-camp.jp/api/auth/callback`（既存・Next.js）。
  - `ADDITIONAL_REDIRECT_URLS` に `https://marketing-camp.jp/**`。
- Studio は従来どおり SSH トンネル + Basic 認証（外部非公開）。

---

## 7. セキュリティ考慮

- **認可は RLS に一元化**: プロキシはユーザーセッションで `download`。`createAdminClient` を使わない（バイパス禁止）。
- **入力検証**: bucket 許可リスト、storagePath の `..`/絶対パス拒否、`encodeURIComponent`。
- **情報秘匿**: 権限なし/不在は一律 `404`（download 失敗はサーバーログにのみ記録）。
- **キャッシュ**: `Cache-Control: private, no-cache` ＋ ETag（共有キャッシュ禁止＋毎回 RLS 再検証。ログアウト後は 404）。
- **多層防御**: Route 自身で `X-Content-Type-Options: nosniff` / `Content-Disposition: inline` / Content-Type ホワイトリスト（Nginx 非依存）。
- **攻撃面の縮小**: Supabase(Kong/GoTrue/PostgREST/Storage) が外部に一切出ない。

---

## 8. 影響ファイル

**新規**
- `app/api/img/[...path]/route.ts` … 画像配信プロキシ
- アップロード用 Server Action ＋ クライアント結線（Phase 5「アバター画像UI結線」と統合）

**変更**
- `app/(app)/announcements/[id]/page.tsx` / `app/(app)/feed/[id]/page.tsx` / `app/(app)/me/page.tsx` … 署名URL→`imageProxyPath`
- `lib/storage.ts` … `imageProxyPath` + `ImageBucket` 型、アップロード検証の集約
- `app/(app)/me/actions.ts` … `confirmImageUpload` を upload Server Action へ再設計
- `infra/nginx/marketing-camp.jp.conf` … api ブロック削除
- `.env.production.example`（+ サーバー `.env.production`）… 変数の役割コメント更新
- `infra/supabase/README.md` / `.claude/plans/details/deploy-runbook.md` … 構成図・本番移行手順を単一ドメインへ更新
- `infra/app/docker-compose.deploy.yml` … `extra_hosts: api.marketing-camp.jp` 等が不要に

---

## 9. 実装ステップ

1. **プロキシ（read）**【api. 廃止のブロッカー解消＝最優先】
   - `imageProxyPath` 追加 → 表示3箇所を置換 → `app/api/img/[...path]/route.ts` 実装。
   - ローカル（`localhost:8100`）で画像表示を確認。
2. **アップロード（write）**【Phase 5 のUI結線と統合】
   - upload Server Action ＋ クライアント圧縮結線（avatar→store→announcement の順）。
3. **インフラ更新**
   - Nginx conf 改訂（api ブロック削除）、`.env` 整理、runbook / README / compose の単一ドメイン化。
4. **回帰確認**
   - お知らせ/掲示板の画像・アバターが `/api/img/...` で表示。未ログインで 404。アップロード→表示往復。

---

## 10. テスト観点

- [ ] 未ログインで `/api/img/...` → `404`（RLS 拒否）
- [ ] ログイン済みで avatars/stores/contents の画像が表示
- [ ] bucket 許可リスト外・`..` パス → `400`/`404`
- [ ] アップロード: 非画像（マジックバイト不一致）拒否、サイズ超過拒否、他人フォルダ拒否（RLS）
- [ ] `NEXT_PUBLIC_SUPABASE_URL` を変えても**ブラウザ動作不変**（再ビルド不要の確認）
- [ ] Nginx 改訂後、`api.marketing-camp.jp` が解決不要・`marketing-camp.jp` のみで全機能動作

---

## 11. ロールバック

- 表示側は `imageProxyPath` → `createSignedUrl` に戻すだけ（コミット単位で可逆）。
- Nginx は api ブロックを再追加すれば旧構成へ復帰（ただし api. の DNS/SSL が再度必要）。
- DB・Storage のスキーマ変更は伴わない（本設計はアプリ層 + インフラ設定のみ）。
