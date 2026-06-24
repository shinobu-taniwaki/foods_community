# 【サーバー管理者向け】MCC 公開のための Nginx / DNS 設定依頼（単一ドメイン版）

**対象サーバー**: 27.133.240.132（k-bean 同居の相乗りサーバー / Rocky Linux 8）
**公開ドメイン**: marketing-camp.jp（+ www）の **1つだけ**
**依頼日**: 2026-06-24（2026-06-23 版を単一ドメイン構成に更新）

> **SSL/証明書はサーバー側でご対応いただけるとのこと**、ありがとうございます。
> 設計を見直し、**追加サブドメイン（`api.marketing-camp.jp`）は不要**となりました。
> 必要な証明書は **`marketing-camp.jp`（+ www）の1枚のみ**です（`api.` 分の +1,500円/月は発生しません）。
> 本依頼は **DNS** と **Nginx のリバースプロキシ設定** の 2 点です。
> 証明書の取得・配置、および `listen 443 ssl` / `ssl_certificate*` の記述は御社の標準運用にお任せします。

---

## 0. 概要（何をするものか）

食品生産者向け学習コミュニティ **MCC** を `marketing-camp.jp` で公開します。
アプリ（Next.js）と Supabase（DB/認証/ストレージ）は **すべて `127.0.0.1`（ローカル）** で
Docker 稼働します。外部公開のための **リバースプロキシ（SSL 終端 → ローカルへ転送）だけ Nginx（root 権限）** が必要です。

```
[インターネット] ──443──▶ [Nginx (既存)]
        marketing-camp.jp   ─▶ 127.0.0.1:3000  (MCC アプリ / Next.js)

        ※ Supabase(API/Kong:8100) はアプリ内部からのみ利用し、外部公開しません。
          画像配信もアプリの /api/img/... 経由でサーバー内部から取得するため、
          ブラウザが触れるのは marketing-camp.jp だけです。
```

> **公開ドメインは marketing-camp.jp（+www）の1つだけ**です。`api.` サブドメインは使いません。
> **既存 k-bean には一切影響しません。** 追加するのは新しい server ブロックのみで、
> upstream は 127.0.0.1 に閉じています。0.0.0.0 で公開中の既存サービスや k-bean のポートには触れません。

---

## 1. お願いしたい作業（2点）

| # | 作業 | 権限 |
|---|---|---|
| A | **DNS**: A レコード2件を 27.133.240.132 へ向ける | ドメイン管理 |
| B | **Nginx**: 添付 `marketing-camp.jp.conf` を参考に vhost を追加し reload（SSL は御社運用で付加） | root |

---

## 2. A. DNS 設定

| ホスト名 | タイプ | 値 |
|---|---|---|
| `marketing-camp.jp`（apex） | A | `27.133.240.132` |
| `www.marketing-camp.jp` | A | `27.133.240.132` |

> 現状: apex は未設定、`www` は別サーバー(150.95.255.38)向き。上記へ変更してください。
> **`api.marketing-camp.jp` は不要**です（設計変更により Supabase を外部公開しないため）。

---

## 3. B. Nginx 設定

- 添付ファイル: **`marketing-camp.jp.conf`**（このフォルダ内）。
- 配置先は御社の vhost 運用に合わせて（`conf.d/` もしくは `conf.v/` 等の include 先）。
- **SSL の行（`listen 443 ssl` / `ssl_certificate*`）は御社の証明書設定に合わせて記述・調整してください。**
  添付 conf には参考用のプレースホルダパスを記載しています。
- 証明書: **`marketing-camp.jp` + `www.marketing-camp.jp` の1枚（SAN）** で足ります。
- 振り分けの要点（ここが本依頼の本質です）:
  - `marketing-camp.jp` → `proxy_pass http://127.0.0.1:3000`（アプリ）
    - 画像アップロード（アプリ経由・圧縮後）のため `client_max_body_size 10M;`
  - `www.marketing-camp.jp` → `marketing-camp.jp` へ 301 正規化
  - **Supabase(Kong:8100) への proxy は設定不要**（外部公開しません）。
  - `default_server` は使っていません（SNI / server_name で既存と共存）。
  - Rocky8 標準 nginx(1.14) 向けに `listen 443 ssl http2;` 形式。既存ブロックの listen 記法に合わせて調整可。
- 反映:
  ```bash
  nginx -t                  # 構文チェック（必須）
  systemctl reload nginx    # 既存に影響を与えずリロード
  ```

> ⚠️ **Supabase API(Kong:8100) / Studio(8101) は公開しないでください。**
> いずれも `127.0.0.1` で動かし、アプリ内部利用および SSH トンネル＋Basic 認証で到達します。
> Nginx で proxy しないでください。

---

## 4. 作業の順序（依存関係）

アプリが 127.0.0.1 で起動していない状態で Nginx を有効化すると 502 になります。推奨順:

1. （MCC 側）アプリ・Supabase を 127.0.0.1 で起動 ← **こちらで実施・完了後に連絡します**
2. **A. DNS** を反映（伝播待ち最大数時間）／ SSL 証明書のご準備（御社側・1枚）
3. **B. Nginx** conf を配置（SSL 付加）→ `nginx -t` → `reload`

> 1 と 2 は並行可能です。**3 は 1 の完了後**にお願いします（502 回避のため）。
> 着手タイミングは別途すり合わせさせてください。

---

## 5. 反映後の確認

```bash
nginx -t                                  # OK であること
curl -I https://marketing-camp.jp         # 200/302 等が返る（アプリ）
curl -I https://www.marketing-camp.jp     # 301 → marketing-camp.jp
docker ps --format '{{.Names}}' | grep k-been | wc -l  # ★9 のまま（k-bean 無傷）
```

> `api.marketing-camp.jp` への確認は不要です（公開しないため）。

---

## 6. 補足（MCC 側で対応する事項・参考）

- Supabase はアプリ内部からのみ利用するため、ブラウザ向けの外部 URL を持ちません。
  これにより従来必要だった「ドメイン確定後のアプリ再ビルド」も**不要**になりました（こちら側の作業が軽くなります）。
- IP 制限・VPN は別途進行中（本依頼のスコープ外）。将来 Nginx 側で社内 IP 許可を
  追加する可能性があります（その際は別途相談）。

不明点や、御社の vhost 配置・証明書設定の標準があれば、それに合わせて conf を調整します。
お手数ですがご確認のほどよろしくお願いします。
