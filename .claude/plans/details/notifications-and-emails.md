# 通知・メールテンプレート集（MCC MVP）

**最終更新**: 2026-05-26
**ステータス**: ドラフト（実装時にコピペで使えるレベル）
**スコープ**: アプリ内通知・メール送信のテンプレート（MVP v0.1）

> 本書は `/Users/hariki/work/tsutsuura/foods_community/.claude/plans/foods-community-design.plan.md` の §7.6（通知）/ §5（認証・招待・退会フロー）/ §8.7（全体通知）/ §9（削除・停止・編集フロー）の補足ドキュメントです。

---

## 0. 用語と前提

| 用語 | 意味 |
|---|---|
| アプリ内通知 | `notifications` テーブルに INSERT される通知。`/notifications` 画面で閲覧。 |
| メール通知 | Resend 経由で送信される SMTP メール。 |
| `recipient_id` | 通知の受信者（profiles.id）。 |
| `actor_id` | 通知のきっかけとなった行為者（profiles.id, nullable）。 |
| `link_path` | 通知タップ時の遷移先（相対パス）。 |
| プリヘッダー | メール受信トレイのプレビュー文（HTML 内 hidden 要素）。 |

### 0.1 デザイントークン（メール用）

| トークン | 値 |
|---|---|
| ブランドカラー（アクセント） | `#c05e3f`（テラコッタ） |
| 背景（クリーム） | `#faf5ed` |
| マスタード（補助） | `#d9a43d` |
| オリーブ（補助） | `#5a6b42` |
| テキスト本体 | `#2a2a2a` |
| テキスト弱 | `#5a5a5a` |
| 罫線 | `#e4dccc` |
| メール最小フォント | 14px（本文）／16px 推奨／見出し 18〜22px |
| 角丸 | 14px（カード・ボタン） |
| 推奨フォント | `system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif` |

### 0.2 変数記法

- `{{snake_case}}` で記述
- 例：`{{user_name}}`, `{{invite_url}}`, `{{expires_at}}`, `{{plan_label}}`
- 日付は `{{expires_at_jp}}` のように `_jp` サフィックスで「2026年6月2日（火）23:59 まで」形式に整形
- 金額は `{{plan_price}}` のように「25,000 円（税込）」形式
- 通貨記号やゼロ埋めは含めず、整形済みの文字列を渡す前提

### 0.3 環境変数（差し替え対象）

| 変数 | 例 |
|---|---|
| `{{app_name}}` | マーケティングCampコミュニティ |
| `{{app_short_name}}` | MCC |
| `{{app_url}}` | `https://example.com`（後日連携） |
| `{{support_email}}` | `support@example.com` |
| `{{owner_name}}` | しのぶ |
| `{{owner_full_name}}` | （後日連携） |
| `{{from_email}}` | `noreply@example.com` |
| `{{from_name}}` | マーケティングCampコミュニティ |
| `{{reply_to_email}}` | `support@example.com` |
| `{{form_withdrawal_url}}` | Google フォーム URL |
| `{{form_inquiry_url}}` | Google フォーム URL |
| `{{logo_url}}` | `{{app_url}}/email-logo.png`（200×60px 推奨） |
| `{{privacy_policy_url}}` | `{{app_url}}/privacy` |
| `{{terms_url}}` | `{{app_url}}/terms` |

---

## 1. アプリ内通知テンプレート集

### 1.1 一覧（早見表）

| type ID | 配信タイミング | 初期 ON/OFF | OFF 可 | メール並走 |
|---|---|:---:|:---:|:---:|
| `new_post` | 掲示板に新規投稿が公開された | ON | ◯ | ✕ |
| `new_announcement` | お知らせが公開された | ON | ◯ | ✕ |
| `comment_on_my_post` | 自分の投稿にコメントが付いた | ON | ◯ | ✕ |
| `like_on_my_post` | 自分の投稿にいいねが付いた | OFF | ◯ | ✕ |
| `admin_broadcast` | 運営からの全体通知 | ON | ✕ | ◯（admin 選択時） |
| `account_suspended` | アカウントが一時停止された | ON | ✕ | ◯ |
| `account_deleted` | アカウントが退会処理された | ON | ✕ | ◯ |
| `account_restored` | アカウントが復活された | ON | ✕ | ◯ |
| `post_edited_by_admin` | 自分の投稿が運営により編集された | ON | ✕ | ✕ |
| `post_deleted_by_admin` | 自分の投稿が運営により削除された | ON | ✕ | ✕ |
| `comment_edited_by_admin` | 自分のコメントが運営により編集された | ON | ✕ | ✕ |
| `comment_deleted_by_admin` | 自分のコメントが運営により削除された | ON | ✕ | ✕ |
| `plan_changed` | 自分のプランが変更された | ON | ✕ | ✕ |

> 招待メール／パスワードリセット要求／メールアドレス変更確認は「アプリ内通知としては作成しない」（メールのみ）。

### 1.2 通知 1：`new_post`（掲示板新規投稿）

| 項目 | 内容 |
|---|---|
| type | `new_post` |
| recipient | チャンネル閲覧権限を持つ全 active member（投稿者本人を除く）かつ `notification_preferences.new_post = true` |
| actor_id | 投稿者の profile.id |
| title | `{{author_name}} さんが新しい投稿をしました` |
| body | `{{channel_label}}：{{post_title}}` |
| link_path | `/feed/{{post_id}}` |
| 使い方 | actor_id でアバター表示。`{{channel_label}}` はチャンネル名。`{{post_title}}` は 60 文字を超えたら末尾を「…」に。 |
| 表示例 | 田中 久子 さんが新しい投稿をしました<br>KPI改善：LINE開封率が35%から52%になりました |

### 1.3 通知 2：`new_announcement`（お知らせ新規配信）

| 項目 | 内容 |
|---|---|
| type | `new_announcement` |
| recipient | `required_plan` 条件を満たす全 active member |
| actor_id | admin の profile.id |
| title | `運営から新しいお知らせが届きました` |
| body | `{{category_emoji}} {{content_title}}` |
| link_path | `/announcements/{{content_id}}` |
| 使い方 | カテゴリ別の絵文字を body 先頭に。`important` は通知一覧で強調。 |
| 表示例 | 運営から新しいお知らせが届きました<br>📰 6月のセミナー日程をお知らせします |

### 1.4 通知 3：`comment_on_my_post`（自分の投稿にコメント）

| 項目 | 内容 |
|---|---|
| type | `comment_on_my_post` |
| recipient | 投稿の `author_id` |
| actor_id | コメント投稿者の profile.id |
| title | `{{commenter_name}} さんがあなたの投稿にコメントしました` |
| body | `{{comment_excerpt}}`（先頭 80 文字、改行は半角スペース、末尾「…」） |
| link_path | `/feed/{{post_id}}#comment-{{comment_id}}` |
| 使い方 | 投稿者本人とコメント投稿者が同一の場合は通知を作らない。 |
| 表示例 | 佐藤 健一 さんがあなたの投稿にコメントしました<br>素晴らしい施策ですね。うちでも試してみたいです… |

### 1.5 通知 4：`like_on_my_post`（自分の投稿にいいね）

| 項目 | 内容 |
|---|---|
| type | `like_on_my_post` |
| recipient | 投稿の `author_id` |
| actor_id | いいねしたユーザーの profile.id |
| title | `{{liker_name}} さんがあなたの投稿にいいねしました` |
| body | `{{post_title}}` |
| link_path | `/feed/{{post_id}}` |
| 使い方 | デフォルト OFF。連続いいねは集約しない（MVP は素朴に1件1通知）。 |
| 表示例 | 山田 ゆかり さんがあなたの投稿にいいねしました<br>朝採れ枝豆の販売を始めました |

### 1.6 通知 5：`admin_broadcast`（運営からの全体通知）

| 項目 | 内容 |
|---|---|
| type | `admin_broadcast` |
| recipient | 全 active member（admin が `/admin/broadcasts` から送信） |
| actor_id | admin の profile.id |
| title | `{{broadcast_title}}` |
| body | `{{broadcast_body_excerpt}}`（先頭 120 文字、末尾「…」） |
| link_path | `/notifications/{{notification_id}}` または admin 指定の `{{link_path}}` |
| 使い方 | OFF 不可（重要連絡用）。admin が「メール並走」を選択するとメールも送信。 |
| 表示例 | β期間終了のお知らせ<br>2026年7月31日でβテスト期間が終了します。プランの継続についてご案内します… |

### 1.7 通知 6：`account_suspended`（一時停止）

| 項目 | 内容 |
|---|---|
| type | `account_suspended` |
| recipient | 停止対象ユーザー |
| actor_id | NULL（システム通知扱い） |
| title | `アカウントが一時停止されました` |
| body | `{{suspended_until_jp}} まで利用を停止しています。理由：{{suspension_reason}}` |
| link_path | `/me/settings/account` |
| 使い方 | 停止中はログイン不可のため、メールが主導線。アプリ内通知は復帰後に確認できるよう残す。 |
| 表示例 | アカウントが一時停止されました<br>2026年6月10日（水）まで利用を停止しています。理由：利用規約違反の確認のため |

### 1.8 通知 7：`account_deleted`（退会処理完了）

| 項目 | 内容 |
|---|---|
| type | `account_deleted` |
| recipient | 退会対象ユーザー |
| actor_id | NULL |
| title | `退会処理が完了しました` |
| body | `これまでご利用いただきありがとうございました。` |
| link_path | `/` |
| 使い方 | アプリ内通知は記録目的（ログイン不可のため実質メール主導）。 |
| 表示例 | 退会処理が完了しました<br>これまでご利用いただきありがとうございました。 |

### 1.9 通知 8：`account_restored`（復活）

| 項目 | 内容 |
|---|---|
| type | `account_restored` |
| recipient | 復活対象ユーザー |
| actor_id | NULL |
| title | `アカウントが復活しました` |
| body | `また {{app_short_name}} をご利用いただけます。` |
| link_path | `/announcements` |
| 使い方 | 一時停止からの自動復帰、または admin 操作による復活で発火。 |
| 表示例 | アカウントが復活しました<br>また MCC をご利用いただけます。 |

### 1.10 通知 9：`post_edited_by_admin`（運営による投稿編集）

| 項目 | 内容 |
|---|---|
| type | `post_edited_by_admin` |
| recipient | 投稿の `author_id` |
| actor_id | admin の profile.id |
| title | `あなたの投稿が運営により編集されました` |
| body | `「{{post_title}}」が編集されました。{{edit_reason_or_blank}}` |
| link_path | `/feed/{{post_id}}` |
| 使い方 | 編集理由が空の場合は body 末尾の `{{edit_reason_or_blank}}` を空文字に。 |
| 表示例 | あなたの投稿が運営により編集されました<br>「LINE開封率の改善について」が編集されました。誤字の修正のため |

### 1.11 通知 10：`post_deleted_by_admin`（運営による投稿削除）

| 項目 | 内容 |
|---|---|
| type | `post_deleted_by_admin` |
| recipient | 投稿の `author_id` |
| actor_id | admin の profile.id |
| title | `あなたの投稿が運営により削除されました` |
| body | `「{{post_title}}」が削除されました。理由：{{deletion_reason_or_default}}` |
| link_path | `/me` |
| 使い方 | 削除理由未入力時は `deletion_reason_or_default` を「運営判断のため」に。 |
| 表示例 | あなたの投稿が運営により削除されました<br>「テスト投稿」が削除されました。理由：内容が他の投稿と重複していたため |

### 1.12 通知 11：`comment_edited_by_admin`（運営によるコメント編集）

| 項目 | 内容 |
|---|---|
| type | `comment_edited_by_admin` |
| recipient | コメントの `author_id` |
| actor_id | admin の profile.id |
| title | `あなたのコメントが運営により編集されました` |
| body | `{{comment_excerpt}}` |
| link_path | `/feed/{{post_id}}#comment-{{comment_id}}` |
| 表示例 | あなたのコメントが運営により編集されました<br>素晴らしい施策ですね。うちでも試してみたいです… |

### 1.13 通知 12：`comment_deleted_by_admin`（運営によるコメント削除）

| 項目 | 内容 |
|---|---|
| type | `comment_deleted_by_admin` |
| recipient | コメントの `author_id` |
| actor_id | admin の profile.id |
| title | `あなたのコメントが運営により削除されました` |
| body | `理由：{{deletion_reason_or_default}}` |
| link_path | `/feed/{{post_id}}` |
| 表示例 | あなたのコメントが運営により削除されました<br>理由：運営判断のため |

### 1.14 通知 13：`plan_changed`（プラン変更通知）

| 項目 | 内容 |
|---|---|
| type | `plan_changed` |
| recipient | プラン変更されたユーザー |
| actor_id | admin の profile.id |
| title | `プランが変更されました` |
| body | `{{old_plan_label}} から {{new_plan_label}} に変更されました。` |
| link_path | `/me/settings/plan` |
| 表示例 | プランが変更されました<br>お試しプラン から スタンダードプラン に変更されました。 |

---

## 2. メールテンプレート集

### 2.1 メール早見表

| ID | 用途 | カテゴリ |
|---|---|---|
| `M-01` | 招待メール | 認証系 |
| `M-02` | パスワードリセット要求 | 認証系 |
| `M-03` | パスワード変更完了通知 | 認証系 |
| `M-04` | メールアドレス変更（旧アドレス確認） | 認証系 |
| `M-05` | メールアドレス変更（新アドレス確認） | 認証系 |
| `M-06` | 全体通知（admin_broadcast 並走） | 運営系 |
| `M-07` | 一時停止通知 | 運営系 |
| `M-08` | 退会処理完了通知 | 運営系 |
| `M-09` | 復活通知 | 運営系 |
| `M-10` | プラン変更通知 | 運営系（補助） |
| `M-V0.2-01` | 月次レビュー公開通知（v0.2 参考） | お知らせ系 |

### 2.2 共通の Resend メタ情報

すべてのメールに共通：

```
from: "{{from_name}} <{{from_email}}>"   // 例：マーケティングCampコミュニティ <noreply@example.com>
reply_to: "{{reply_to_email}}"           // 例：support@example.com
headers:
  List-Unsubscribe: "<mailto:{{support_email}}?subject=配信停止>"
  X-Entity-Ref-ID: "{{notification_id_or_event_id}}"  // 重複送信防止
```

> 認証系（M-01〜M-05）は List-Unsubscribe を含めない（取引メール扱い）。

### 2.3 共通レイアウト（雛形）

各 HTML メールは以下の雛形を踏襲。`{{content_html}}` 部分のみ各メールで差し替え。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{subject}}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#faf5ed; font-family: system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif; color:#2a2a2a;">
    <!-- プリヘッダー（受信トレイのプレビュー文） -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      {{preheader}}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf5ed;">
      <tr>
        <td align="center" style="padding:24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:14px; border:1px solid #e4dccc;">
            <!-- ヘッダー -->
            <tr>
              <td style="padding:24px 24px 12px 24px; text-align:left; border-bottom:1px solid #e4dccc;">
                <div style="font-family: 'Noto Serif JP', serif; font-size:18px; font-weight:700; color:#c05e3f;">
                  {{app_name}}
                </div>
              </td>
            </tr>

            <!-- 本文 -->
            <tr>
              <td style="padding:24px; font-size:16px; line-height:1.8; color:#2a2a2a;">
                {{content_html}}
              </td>
            </tr>

            <!-- フッター -->
            <tr>
              <td style="padding:16px 24px 24px 24px; border-top:1px solid #e4dccc; font-size:13px; line-height:1.7; color:#5a5a5a;">
                <p style="margin:0 0 8px 0;">
                  このメールは {{app_name}} から自動送信されています。
                </p>
                <p style="margin:0 0 8px 0;">
                  お問い合わせ：<a href="mailto:{{support_email}}" style="color:#c05e3f; text-decoration:underline;">{{support_email}}</a>
                </p>
                <p style="margin:0;">
                  退会をご希望の方は、ログイン後に「設定 → 退会」からお手続きください。
                </p>
              </td>
            </tr>
          </table>

          <div style="max-width:560px; padding:12px 8px 0 8px; font-size:12px; color:#7a7a7a; text-align:center;">
            <a href="{{terms_url}}" style="color:#7a7a7a; text-decoration:underline;">利用規約</a>
            &nbsp;|&nbsp;
            <a href="{{privacy_policy_url}}" style="color:#7a7a7a; text-decoration:underline;">プライバシーポリシー</a>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
```

ボタンの共通スタイル：

```html
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="{{cta_url}}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        {{cta_label}}
      </a>
    </td>
  </tr>
</table>
```

---

### 2.4 M-01：招待メール

#### 送信タイミング
admin が `/admin/invites/new` で招待を発行した直後。`invitations` に行を INSERT した後にトリガー。

#### 件名（subject）
```
{{app_short_name}} へのご招待が届いています（7日以内にご登録ください）
```

#### プリヘッダー
```
{{owner_name}} さんから {{plan_label}} で招待されました。ご登録は7日以内にお願いいたします。
```

#### 変数一覧
| 変数 | 説明 | 例 |
|---|---|---|
| `{{invitee_email}}` | 招待先メールアドレス | tajima@example.com |
| `{{owner_name}}` | 招待者（admin）の表示名 | しのぶ |
| `{{plan_label}}` | プラン表示名 | スタンダードプラン |
| `{{plan_price}}` | プラン価格表記 | 25,000 円（税込） |
| `{{invite_url}}` | 招待リンク（token 付き） | `https://example.com/invite?token=xxxxx` |
| `{{expires_at_jp}}` | 有効期限（日本語） | 2026年6月2日（火）23:59 |

#### HTML 本文（`content_html` に差し込む部分）

```html
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  {{app_name}} へようこそ
</p>

<p style="margin:0 0 16px 0;">
  はじめまして。{{app_name}} 運営の {{owner_name}} です。
</p>

<p style="margin:0 0 16px 0;">
  食品生産者・職人のみなさまが、マーケティングの知見を共有し、励まし合える場として {{app_name}} を開いています。<br>
  このたび、あなたを <strong style="color:#c05e3f;">{{plan_label}}（{{plan_price}}）</strong> にてご招待いたします。
</p>

<p style="margin:0 0 8px 0;">
  下のボタンから、ご登録をお願いいたします。
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="{{invite_url}}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        ご登録に進む
      </a>
    </td>
  </tr>
</table>

<p style="margin:0 0 16px 0; font-size:14px; color:#5a5a5a;">
  ※ このリンクは <strong>{{expires_at_jp}} まで</strong>有効です。<br>
  ※ 期限を過ぎた場合は、運営までお気軽にご連絡ください。
</p>

<p style="margin:24px 0 8px 0; font-size:14px; color:#5a5a5a;">
  ボタンが押せない場合は、下のリンクをコピーしてブラウザで開いてください。
</p>
<p style="margin:0; font-size:13px; color:#5a5a5a; word-break:break-all;">
  <a href="{{invite_url}}" style="color:#c05e3f;">{{invite_url}}</a>
</p>

<p style="margin:32px 0 0 0; font-size:14px; color:#5a5a5a;">
  みなさまとお会いできることを、運営一同楽しみにしております。
</p>
```

#### text 本文（フォールバック）

```
{{app_name}} へようこそ

はじめまして。{{app_name}} 運営の {{owner_name}} です。

食品生産者・職人のみなさまが、マーケティングの知見を共有し、
励まし合える場として {{app_name}} を開いています。

このたび、あなたを {{plan_label}}（{{plan_price}}）にてご招待いたします。

下のリンクから、ご登録をお願いいたします。

{{invite_url}}

※ このリンクは {{expires_at_jp}} まで有効です。
※ 期限を過ぎた場合は、運営までお気軽にご連絡ください。

みなさまとお会いできることを、運営一同楽しみにしております。

----
{{app_name}}
お問い合わせ：{{support_email}}
```

#### Resend メタ
```
from: "{{from_name}} <{{from_email}}>"
reply_to: "{{reply_to_email}}"
tags: [{ name: "category", value: "invite" }]
```

---

### 2.5 M-02：パスワードリセット要求

#### 送信タイミング
`/login` の「パスワードを忘れた方」からメール送信を要求された直後。Supabase Auth の標準フローを使う場合は Supabase 側で送信されるが、テンプレを Resend に寄せる場合は本テンプレを利用。

#### 件名
```
パスワードの再設定リンクをお送りします
```

#### プリヘッダー
```
ご本人によるリクエストの場合のみ、下のリンクから再設定をお願いいたします。
```

#### 変数一覧
| 変数 | 説明 |
|---|---|
| `{{user_name}}` | ユーザーの表示名 |
| `{{reset_url}}` | パスワードリセット URL |
| `{{expires_in_minutes}}` | 有効期限（分。例：60） |
| `{{request_ip_hint}}` | 「お住まいの地域からのアクセス」など、IP の地域ヒント（任意） |

#### HTML 本文

```html
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  パスワードの再設定
</p>

<p style="margin:0 0 16px 0;">
  {{user_name}} さん、こんにちは。
</p>

<p style="margin:0 0 16px 0;">
  パスワードの再設定リクエストを受け付けました。<br>
  下のボタンから、新しいパスワードをご設定ください。
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="{{reset_url}}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        パスワードを再設定する
      </a>
    </td>
  </tr>
</table>

<p style="margin:0 0 16px 0; font-size:14px; color:#5a5a5a;">
  ※ このリンクは <strong>{{expires_in_minutes}}分間</strong>有効です。<br>
  ※ お心当たりがない場合は、このメールを無視してください。パスワードは変わりません。
</p>

<p style="margin:24px 0 8px 0; font-size:14px; color:#5a5a5a;">
  ボタンが押せない場合は、下のリンクをコピーしてブラウザで開いてください。
</p>
<p style="margin:0; font-size:13px; color:#5a5a5a; word-break:break-all;">
  <a href="{{reset_url}}" style="color:#c05e3f;">{{reset_url}}</a>
</p>
```

#### text 本文

```
パスワードの再設定

{{user_name}} さん、こんにちは。

パスワードの再設定リクエストを受け付けました。
下のリンクから、新しいパスワードをご設定ください。

{{reset_url}}

※ このリンクは {{expires_in_minutes}}分間有効です。
※ お心当たりがない場合は、このメールを無視してください。
   パスワードは変わりません。

----
{{app_name}}
お問い合わせ：{{support_email}}
```

#### Resend メタ
```
from: "{{from_name}} <{{from_email}}>"
reply_to: "{{reply_to_email}}"
tags: [{ name: "category", value: "auth-password-reset" }]
```

---

### 2.6 M-03：パスワード変更完了通知

#### 送信タイミング
ユーザーがパスワードを変更した直後（§5.5）。本人のセキュリティ確認用。

#### 件名
```
パスワードが変更されました
```

#### プリヘッダー
```
ご本人による変更でない場合は、すぐに運営までご連絡ください。
```

#### 変数一覧
| 変数 | 説明 |
|---|---|
| `{{user_name}}` | ユーザーの表示名 |
| `{{changed_at_jp}}` | 変更日時（日本語） |

#### HTML 本文

```html
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  パスワードを変更しました
</p>

<p style="margin:0 0 16px 0;">
  {{user_name}} さん、こんにちは。
</p>

<p style="margin:0 0 16px 0;">
  {{changed_at_jp}} に、{{app_name}} のパスワードが変更されました。
</p>

<p style="margin:0 0 16px 0; padding:12px 16px; background-color:#faf5ed; border-left:4px solid #c05e3f; border-radius:8px; font-size:14px;">
  <strong>もしご本人による変更でない場合は、すぐに運営までご連絡ください。</strong><br>
  <a href="mailto:{{support_email}}" style="color:#c05e3f;">{{support_email}}</a>
</p>

<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  これまで通り {{app_name}} をご利用いただけます。
</p>
```

#### text 本文

```
パスワードを変更しました

{{user_name}} さん、こんにちは。

{{changed_at_jp}} に、{{app_name}} のパスワードが変更されました。

もしご本人による変更でない場合は、すぐに運営までご連絡ください。
{{support_email}}

これまで通り {{app_name}} をご利用いただけます。

----
{{app_name}}
```

#### Resend メタ
```
from: "{{from_name}} <{{from_email}}>"
reply_to: "{{reply_to_email}}"
tags: [{ name: "category", value: "auth-password-changed" }]
```

---

### 2.7 M-04：メールアドレス変更（旧アドレス確認）

#### 送信タイミング
ユーザーが新しいメールアドレスを入力し、変更を申請した直後。「旧アドレスに届く確認メール」（§5.6）。

#### 送信先
変更前（旧）メールアドレス。

#### 件名
```
メールアドレス変更のご確認（変更前のアドレスへ）
```

#### プリヘッダー
```
ご本人による変更でない場合は、このメールのリンクを開かないでください。
```

#### 変数一覧
| 変数 | 説明 |
|---|---|
| `{{user_name}}` | ユーザーの表示名 |
| `{{new_email_masked}}` | 新メールアドレス（マスク済、例：t****a@example.com） |
| `{{confirm_url}}` | 旧アドレス確認用 URL |
| `{{expires_in_hours}}` | 有効期限（時間） |

#### HTML 本文

```html
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  メールアドレス変更のご確認
</p>

<p style="margin:0 0 16px 0;">
  {{user_name}} さん、こんにちは。
</p>

<p style="margin:0 0 16px 0;">
  {{app_name}} のメールアドレスを以下に変更するリクエストを受け付けました。
</p>

<p style="margin:0 0 16px 0; padding:12px 16px; background-color:#faf5ed; border-radius:8px; font-size:15px;">
  変更後のアドレス：<strong>{{new_email_masked}}</strong>
</p>

<p style="margin:0 0 16px 0;">
  ご本人によるリクエストの場合は、下のボタンで承認してください。<br>
  新しいアドレスでも同様の確認メールをお送りしています。両方を承認すると変更が完了します。
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="{{confirm_url}}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        変更を承認する
      </a>
    </td>
  </tr>
</table>

<p style="margin:0 0 16px 0; font-size:14px; color:#5a5a5a;">
  ※ このリンクは <strong>{{expires_in_hours}}時間</strong>有効です。<br>
  ※ ご本人による変更でない場合は、このメールを無視してください。アドレスは変わりません。
</p>
```

#### text 本文

```
メールアドレス変更のご確認

{{user_name}} さん、こんにちは。

{{app_name}} のメールアドレスを以下に変更するリクエストを受け付けました。

変更後のアドレス：{{new_email_masked}}

ご本人によるリクエストの場合は、下のリンクで承認してください。
新しいアドレスでも同様の確認メールをお送りしています。
両方を承認すると変更が完了します。

{{confirm_url}}

※ このリンクは {{expires_in_hours}}時間有効です。
※ ご本人による変更でない場合は、このメールを無視してください。

----
{{app_name}}
お問い合わせ：{{support_email}}
```

#### Resend メタ
```
from: "{{from_name}} <{{from_email}}>"
reply_to: "{{reply_to_email}}"
tags: [{ name: "category", value: "auth-email-change-old" }]
```

---

### 2.8 M-05：メールアドレス変更（新アドレス確認）

#### 送信タイミング
M-04 と同時、新アドレス側へ。

#### 送信先
変更後（新）メールアドレス。

#### 件名
```
メールアドレス変更のご確認（新しいアドレスへ）
```

#### プリヘッダー
```
このアドレスを {{app_short_name}} のログイン用として登録しています。
```

#### 変数一覧
| 変数 | 説明 |
|---|---|
| `{{user_name}}` | ユーザーの表示名 |
| `{{old_email_masked}}` | 旧メールアドレス（マスク済） |
| `{{confirm_url}}` | 新アドレス確認用 URL |
| `{{expires_in_hours}}` | 有効期限（時間） |

#### HTML 本文

```html
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  メールアドレス変更のご確認
</p>

<p style="margin:0 0 16px 0;">
  {{user_name}} さん、こんにちは。
</p>

<p style="margin:0 0 16px 0;">
  このメールアドレスを {{app_name}} のログイン用として登録するリクエストを受け付けました。<br>
  変更前のアドレス：<strong>{{old_email_masked}}</strong>
</p>

<p style="margin:0 0 16px 0;">
  下のボタンで承認してください。<br>
  変更前のアドレスでも承認が必要です。両方が承認されると変更が完了します。
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="{{confirm_url}}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        このアドレスを登録する
      </a>
    </td>
  </tr>
</table>

<p style="margin:0 0 16px 0; font-size:14px; color:#5a5a5a;">
  ※ このリンクは <strong>{{expires_in_hours}}時間</strong>有効です。<br>
  ※ お心当たりがない場合は、このメールを無視してください。
</p>
```

#### text 本文

```
メールアドレス変更のご確認

{{user_name}} さん、こんにちは。

このメールアドレスを {{app_name}} のログイン用として
登録するリクエストを受け付けました。

変更前のアドレス：{{old_email_masked}}

下のリンクで承認してください。
変更前のアドレスでも承認が必要です。
両方が承認されると変更が完了します。

{{confirm_url}}

※ このリンクは {{expires_in_hours}}時間有効です。
※ お心当たりがない場合は、このメールを無視してください。

----
{{app_name}}
お問い合わせ：{{support_email}}
```

#### Resend メタ
```
from: "{{from_name}} <{{from_email}}>"
reply_to: "{{reply_to_email}}"
tags: [{ name: "category", value: "auth-email-change-new" }]
```

---

### 2.9 M-06：全体通知メール（admin_broadcast 並走）

#### 送信タイミング
admin が `/admin/broadcasts` から「メール並走」を選択して送信した直後。`notifications` への INSERT と並行して全 active member 宛に送信。

#### 件名
```
{{broadcast_title}}
```

#### プリヘッダー
```
{{broadcast_body_excerpt}}
```
（本文先頭 100 文字、改行は半角スペース）

#### 変数一覧
| 変数 | 説明 |
|---|---|
| `{{user_name}}` | 受信者の表示名 |
| `{{broadcast_title}}` | 全体通知のタイトル |
| `{{broadcast_body_html}}` | 本文（改行→`<br>`変換済み HTML） |
| `{{broadcast_body_text}}` | 本文（プレーンテキスト） |
| `{{cta_url}}` | アプリへの遷移先（既定：`{{app_url}}/notifications`） |

#### HTML 本文

```html
<p style="margin:0 0 16px 0; font-size:20px; font-weight:700;">
  {{broadcast_title}}
</p>

<p style="margin:0 0 16px 0;">
  {{user_name}} さん、こんにちは。
</p>

<div style="margin:0 0 24px 0; font-size:16px; line-height:1.8;">
  {{broadcast_body_html}}
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="{{cta_url}}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        {{app_short_name}} で詳しく見る
      </a>
    </td>
  </tr>
</table>

<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  {{owner_name}}（{{app_name}} 運営）
</p>
```

#### text 本文

```
{{broadcast_title}}

{{user_name}} さん、こんにちは。

{{broadcast_body_text}}

{{app_short_name}} で詳しく見る：
{{cta_url}}

----
{{owner_name}}（{{app_name}} 運営）
お問い合わせ：{{support_email}}
```

#### Resend メタ
```
from: "{{from_name}} <{{from_email}}>"
reply_to: "{{reply_to_email}}"
tags: [{ name: "category", value: "broadcast" }, { name: "broadcast_id", value: "{{broadcast_id}}" }]
```

---

### 2.10 M-07：一時停止通知

#### 送信タイミング
admin が `/admin/members/:id` で一時停止操作を実行した直後（§5.8）。本人ログイン不可のためメールが主導線。

#### 件名
```
アカウントを一時停止いたしました
```

#### プリヘッダー
```
{{suspended_until_jp}} まで利用を停止しています。
```

#### 変数一覧
| 変数 | 説明 |
|---|---|
| `{{user_name}}` | 停止対象ユーザーの表示名 |
| `{{suspended_until_jp}}` | 解除予定日時（日本語） or 「無期限」 |
| `{{suspension_reason}}` | 停止理由（admin 入力） |
| `{{form_inquiry_url}}` | お問い合わせフォーム URL |

#### HTML 本文

```html
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  アカウントを一時停止いたしました
</p>

<p style="margin:0 0 16px 0;">
  {{user_name}} さん
</p>

<p style="margin:0 0 16px 0;">
  このたびは恐れ入りますが、下記の通り {{app_name}} のアカウントを一時的に停止させていただきました。
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:16px 0; background-color:#faf5ed; border-radius:8px;">
  <tr>
    <td style="padding:16px;">
      <p style="margin:0 0 8px 0; font-size:14px; color:#5a5a5a;">停止期間</p>
      <p style="margin:0 0 16px 0; font-size:16px; font-weight:700;">{{suspended_until_jp}} まで</p>
      <p style="margin:0 0 8px 0; font-size:14px; color:#5a5a5a;">理由</p>
      <p style="margin:0; font-size:15px;">{{suspension_reason}}</p>
    </td>
  </tr>
</table>

<p style="margin:0 0 16px 0;">
  停止期間が過ぎますと、自動的にご利用いただけるようになります。
</p>

<p style="margin:0 0 16px 0;">
  ご不明な点や、誤りがあると感じられる場合は、下記からお問い合わせください。
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="{{form_inquiry_url}}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        運営に問い合わせる
      </a>
    </td>
  </tr>
</table>

<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  {{owner_name}}（{{app_name}} 運営）
</p>
```

#### text 本文

```
アカウントを一時停止いたしました

{{user_name}} さん

このたびは恐れ入りますが、下記の通り {{app_name}} のアカウントを
一時的に停止させていただきました。

停止期間：{{suspended_until_jp}} まで
理由：{{suspension_reason}}

停止期間が過ぎますと、自動的にご利用いただけるようになります。

ご不明な点や、誤りがあると感じられる場合は、
下記からお問い合わせください。

{{form_inquiry_url}}

----
{{owner_name}}（{{app_name}} 運営）
お問い合わせ：{{support_email}}
```

#### Resend メタ
```
from: "{{from_name}} <{{from_email}}>"
reply_to: "{{reply_to_email}}"
tags: [{ name: "category", value: "account-suspended" }]
```

---

### 2.11 M-08：退会処理完了通知

#### 送信タイミング
admin が `/admin/members/:id` で「退会させる」を実行した直後（§5.7）。

#### 件名
```
退会のお手続きが完了いたしました
```

#### プリヘッダー
```
これまでご利用いただきありがとうございました。
```

#### 変数一覧
| 変数 | 説明 |
|---|---|
| `{{user_name}}` | 退会対象ユーザーの表示名 |
| `{{deleted_at_jp}}` | 退会日時（日本語） |
| `{{retention_note}}` | 投稿・コメントの保管に関する文言（固定） |

#### HTML 本文

```html
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  退会のお手続きが完了いたしました
</p>

<p style="margin:0 0 16px 0;">
  {{user_name}} さん
</p>

<p style="margin:0 0 16px 0;">
  {{deleted_at_jp}} をもちまして、{{app_name}} の退会処理が完了いたしました。<br>
  これまでご利用いただき、本当にありがとうございました。
</p>

<p style="margin:0 0 16px 0; padding:12px 16px; background-color:#faf5ed; border-radius:8px; font-size:14px; color:#5a5a5a;">
  ※ これまでの投稿・コメントは、コミュニティの記録として
  「（退会したメンバー）」の表記でしばらく残ります。<br>
  ※ 個人情報の取り扱いについては、プライバシーポリシーをご確認ください。
</p>

<p style="margin:0 0 16px 0;">
  またご縁がありましたら、いつでもお気軽にお声がけください。
</p>

<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  {{owner_name}}（{{app_name}} 運営）
</p>
```

#### text 本文

```
退会のお手続きが完了いたしました

{{user_name}} さん

{{deleted_at_jp}} をもちまして、{{app_name}} の退会処理が完了いたしました。
これまでご利用いただき、本当にありがとうございました。

※ これまでの投稿・コメントは、コミュニティの記録として
   「（退会したメンバー）」の表記でしばらく残ります。
※ 個人情報の取り扱いについては、プライバシーポリシーをご確認ください。

またご縁がありましたら、いつでもお気軽にお声がけください。

----
{{owner_name}}（{{app_name}} 運営）
お問い合わせ：{{support_email}}
プライバシーポリシー：{{privacy_policy_url}}
```

#### Resend メタ
```
from: "{{from_name}} <{{from_email}}>"
reply_to: "{{reply_to_email}}"
tags: [{ name: "category", value: "account-deleted" }]
```

---

### 2.12 M-09：復活通知

#### 送信タイミング
admin が `/admin/members/deleted` または `/admin/members/:id` で「復活」を実行した直後、もしくは一時停止期間が経過してバッチで自動復帰した直後。

#### 件名
```
アカウントが再びご利用いただけるようになりました
```

#### プリヘッダー
```
{{app_short_name}} へお戻りいただき、ありがとうございます。
```

#### 変数一覧
| 変数 | 説明 |
|---|---|
| `{{user_name}}` | 復活対象ユーザーの表示名 |
| `{{restored_at_jp}}` | 復活日時（日本語） |
| `{{login_url}}` | ログイン画面 URL（既定：`{{app_url}}/login`） |
| `{{restore_reason}}` | 復活理由（任意。空なら省略） |

#### HTML 本文

```html
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  アカウントが再びご利用いただけるようになりました
</p>

<p style="margin:0 0 16px 0;">
  {{user_name}} さん
</p>

<p style="margin:0 0 16px 0;">
  {{restored_at_jp}} に、{{app_name}} のアカウントが復活いたしました。<br>
  これまで通り、ログインしてご利用いただけます。
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="{{login_url}}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        ログインする
      </a>
    </td>
  </tr>
</table>

<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  またお会いできて、運営一同とても嬉しく思います。
</p>

<p style="margin:8px 0 0 0; font-size:14px; color:#5a5a5a;">
  {{owner_name}}（{{app_name}} 運営）
</p>
```

#### text 本文

```
アカウントが再びご利用いただけるようになりました

{{user_name}} さん

{{restored_at_jp}} に、{{app_name}} のアカウントが復活いたしました。
これまで通り、ログインしてご利用いただけます。

ログインはこちらから：
{{login_url}}

またお会いできて、運営一同とても嬉しく思います。

----
{{owner_name}}（{{app_name}} 運営）
お問い合わせ：{{support_email}}
```

#### Resend メタ
```
from: "{{from_name}} <{{from_email}}>"
reply_to: "{{reply_to_email}}"
tags: [{ name: "category", value: "account-restored" }]
```

---

### 2.13 M-10：プラン変更通知（補助）

#### 送信タイミング
admin が `/admin/members/:id` でプランを変更した直後。アプリ内通知（`plan_changed`）と並走する想定で、MVP 段階では「メール並走を admin が任意で選択できる」運用。

#### 件名
```
プランを変更いたしました（{{new_plan_label}}）
```

#### プリヘッダー
```
{{old_plan_label}} から {{new_plan_label}} へ変更しました。
```

#### 変数一覧
| 変数 | 説明 |
|---|---|
| `{{user_name}}` | 対象ユーザーの表示名 |
| `{{old_plan_label}}` | 変更前プラン表示名 |
| `{{new_plan_label}}` | 変更後プラン表示名 |
| `{{new_plan_price}}` | 変更後プラン価格 |
| `{{changed_at_jp}}` | 変更日時（日本語） |
| `{{plan_settings_url}}` | `{{app_url}}/me/settings/plan` |

#### HTML 本文

```html
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  プランを変更いたしました
</p>

<p style="margin:0 0 16px 0;">
  {{user_name}} さん
</p>

<p style="margin:0 0 16px 0;">
  {{changed_at_jp}} に、ご契約プランを変更いたしました。
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:16px 0; background-color:#faf5ed; border-radius:8px;">
  <tr>
    <td style="padding:16px;">
      <p style="margin:0 0 4px 0; font-size:14px; color:#5a5a5a;">変更前</p>
      <p style="margin:0 0 12px 0; font-size:15px;">{{old_plan_label}}</p>
      <p style="margin:0 0 4px 0; font-size:14px; color:#5a5a5a;">変更後</p>
      <p style="margin:0; font-size:16px; font-weight:700; color:#c05e3f;">{{new_plan_label}}（{{new_plan_price}}）</p>
    </td>
  </tr>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="{{plan_settings_url}}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        プラン情報を確認する
      </a>
    </td>
  </tr>
</table>

<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  {{owner_name}}（{{app_name}} 運営）
</p>
```

#### text 本文

```
プランを変更いたしました

{{user_name}} さん

{{changed_at_jp}} に、ご契約プランを変更いたしました。

変更前：{{old_plan_label}}
変更後：{{new_plan_label}}（{{new_plan_price}}）

プラン情報の確認はこちらから：
{{plan_settings_url}}

----
{{owner_name}}（{{app_name}} 運営）
お問い合わせ：{{support_email}}
```

#### Resend メタ
```
from: "{{from_name}} <{{from_email}}>"
reply_to: "{{reply_to_email}}"
tags: [{ name: "category", value: "plan-changed" }]
```

---

### 2.14 参考：M-V0.2-01 月次レビュー公開通知（v0.2、MVP では送らない）

> v0.2 の `review_published` 通知にメール並走を入れる候補。MVP では実装しない。テンプレ雛形のみ残す。

#### 件名（候補）
```
{{month_jp}} のレビューが届きました
```

#### プリヘッダー（候補）
```
今月の点数と講評を、{{owner_name}} さんからお届けします。
```

#### HTML 本文（候補抜粋）

```html
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  {{month_jp}} のレビューが届きました
</p>

<p style="margin:0 0 16px 0;">
  {{user_name}} さん、お疲れさまでした。<br>
  {{owner_name}} さんから、{{month_jp}} の振り返りとアドバイスが届いています。
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="{{review_url}}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        レビューを見る
      </a>
    </td>
  </tr>
</table>
```

実装は v0.2 で確定。

---

## 3. メールデザインガイドライン

### 3.1 ブランド要素

| 要素 | 仕様 |
|---|---|
| アクセントカラー | `#c05e3f`（テラコッタ） — ボタン背景・見出しアクセント |
| 背景 | `#faf5ed`（クリーム） — メール外側の余白、強調カード |
| カード背景 | `#ffffff` — 本文を載せる中央カラム |
| 罫線 | `#e4dccc` — ヘッダー／フッターの区切り |
| 見出しフォント | `Noto Serif JP`（フォールバック：serif） |
| 本文フォント | `system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", sans-serif` |
| ロゴ画像 | `{{logo_url}}` を `<img alt="{{app_name}}" width="200" height="60" style="border:0;">` で表示する場合は HTML テンプレ冒頭に追加（採用は実装時判断） |

### 3.2 タイポグラフィ

| 用途 | サイズ | 行間 |
|---|---|---|
| 見出し（H1相当） | 20〜22px | 1.4 |
| 本文 | 16px | 1.8（50代向けに広め） |
| 補足・注釈 | 14px | 1.7 |
| フッター | 13px | 1.7 |
| 最小サイズ | 14px（本文より下げない） |

### 3.3 レイアウト

- 中央カラム幅：`max-width: 560px`
- カード角丸：14px
- 影：使わない（紙の質感を維持）
- パディング：本文 24px、フッター 16〜24px
- ボタン：高さ 48px 相当（`padding: 14px 28px; font-size: 16px;`）— タップ領域確保

### 3.4 アクセシビリティ

- すべての画像に `alt` 属性
- 装飾画像は `alt=""` を明示
- ボタンは `<a>` で記述（`<button>` はメールクライアントで動作不安定）
- リンク色 `#c05e3f` ＋下線併用（色だけに頼らない）
- ダークモード対応：CSS は最小限に抑え、`<meta name="color-scheme" content="light">` を `<head>` に追加してライト固定（実装時の判断）

### 3.5 フッター必須項目

すべてのメールのフッターに以下を含める：

1. 「このメールは {{app_name}} から自動送信されています。」
2. お問い合わせ先：`{{support_email}}`
3. 退会方法案内：「ログイン後に『設定 → 退会』からお手続きください」
4. 利用規約・プライバシーポリシーへのリンク

### 3.6 インライン CSS の徹底

- すべての装飾は `style="..."` のインラインで記述
- `<style>` タグは使わない（Gmail などで剥がされる）
- 外部 CSS は読み込まない
- `<table role="presentation">` でレイアウト（メールでは div より安定）

### 3.7 プリヘッダー（プリプレビュー）

- 受信トレイの一覧で件名の右に表示される短文
- `<body>` 直後に hidden 要素として配置：

```html
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
  {{preheader}}
</div>
```

- 長さ：40〜120文字程度
- 件名の繰り返しは避け、件名の補足になる内容にする

---

## 4. プリヘッダー一覧（早見表）

| ID | 件名 | プリヘッダー |
|---|---|---|
| M-01 | {{app_short_name}} へのご招待が届いています（7日以内にご登録ください） | {{owner_name}} さんから {{plan_label}} で招待されました。ご登録は7日以内にお願いいたします。 |
| M-02 | パスワードの再設定リンクをお送りします | ご本人によるリクエストの場合のみ、下のリンクから再設定をお願いいたします。 |
| M-03 | パスワードが変更されました | ご本人による変更でない場合は、すぐに運営までご連絡ください。 |
| M-04 | メールアドレス変更のご確認（変更前のアドレスへ） | ご本人による変更でない場合は、このメールのリンクを開かないでください。 |
| M-05 | メールアドレス変更のご確認（新しいアドレスへ） | このアドレスを {{app_short_name}} のログイン用として登録しています。 |
| M-06 | {{broadcast_title}} | {{broadcast_body_excerpt}}（本文先頭 100 文字） |
| M-07 | アカウントを一時停止いたしました | {{suspended_until_jp}} まで利用を停止しています。 |
| M-08 | 退会のお手続きが完了いたしました | これまでご利用いただきありがとうございました。 |
| M-09 | アカウントが再びご利用いただけるようになりました | {{app_short_name}} へお戻りいただき、ありがとうございます。 |
| M-10 | プランを変更いたしました（{{new_plan_label}}） | {{old_plan_label}} から {{new_plan_label}} へ変更しました。 |

---

## 5. 50代向けの配慮（執筆指針）

### 5.1 文字サイズ

- 本文：16px 以上（最小でも 14px）
- 見出し：18〜22px
- ボタン文字：16px、`font-weight: 700`
- 行間：1.7〜1.8（広め）

### 5.2 表現

- 専門用語は避ける：
  - 「ログイン」「メールアドレス」「パスワード」など、誰もが見たことのある言葉に統一
  - 「アカウント」は使ってよい（一般化済み）
  - 「サインイン」「クレデンシャル」「アクティベーション」などのカタカナは使わない
- リンクのアクション文言：
  - **NG**：「こちら」「リンク」
  - **OK**：「ご登録に進む」「パスワードを再設定する」「ログインする」「運営に問い合わせる」
- 文末表現：
  - 「〜してください」「〜いたします」「〜いただけます」など丁寧体に統一
  - 「〜だ」「〜である」は使わない
- 接続詞：
  - 「下記」「上記」より「下の」「上の」を優先
  - 「お手数ですが」「恐れ入りますが」など、相手への配慮を一言添える

### 5.3 構造

- 1段落 2〜3 文まで（長文は段落を分ける）
- 重要情報は太字＋色（テラコッタ）で強調
- 期限・金額・対象は<u>カード状の枠</u>（`background-color:#faf5ed; border-radius:8px;`）で囲んで視認性アップ
- CTA ボタンは 1 メールに 1 つを原則（迷わせない）

### 5.4 トーン

- 食品生産者・職人への敬意を表現
- 「お疲れさまです」「ありがとうございます」など、温かみのある言葉を文頭・文末に
- 過度な敬語や仰々しい表現は避ける（読みづらい）
- ビジネスメール調すぎず、手紙のような親しみを意識

---

## 6. 多言語対応の方針

- **MVP では日本語のみ**で設計・運用
- 国際化対応（i18n）は v0.2 以降に検討
- 将来的な対応を見据え、テンプレ内のハードコード文字列は **テンプレファイル単位で分離**しておく（実装時に i18n ライブラリへの差し替えが容易になるよう、変数化は徹底）
- 招待者の言語推定（Accept-Language）も MVP では行わない

---

## 7. テンプレ実装方針

### 7.1 ライブラリ候補

- 第一候補：[`react-email`](https://react.email/) + Resend SDK
  - React コンポーネントとして書ける（HTML/text 双方を自動生成）
  - プレビュー UI が公式で提供される（メールデザイン確認に有用）
  - インライン CSS 自動変換
- 代替：Resend の `<Email>` JSX サポート、または素朴に `string` 連結
- 最終決定は実装フェーズの初期に行う

### 7.2 ディレクトリ構成案

```
src/
  emails/
    layouts/
      BaseLayout.tsx           // 共通レイアウト（ヘッダー・フッター）
    templates/
      InviteEmail.tsx          // M-01
      PasswordResetEmail.tsx   // M-02
      PasswordChangedEmail.tsx // M-03
      EmailChangeOldEmail.tsx  // M-04
      EmailChangeNewEmail.tsx  // M-05
      BroadcastEmail.tsx       // M-06
      SuspendedEmail.tsx       // M-07
      DeletedEmail.tsx         // M-08
      RestoredEmail.tsx        // M-09
      PlanChangedEmail.tsx     // M-10
    utils/
      formatDate.ts            // 日本語日付整形
      formatPrice.ts           // 価格整形
      maskEmail.ts             // メールマスク
```

### 7.3 環境変数による差し替え

メール本文中のドメイン・サポートメール・運営者名などは必ず環境変数経由で参照：

```
NEXT_PUBLIC_APP_NAME=マーケティングCampコミュニティ
NEXT_PUBLIC_APP_SHORT_NAME=MCC
NEXT_PUBLIC_APP_URL=https://example.com
NEXT_PUBLIC_SUPPORT_EMAIL=support@example.com
NEXT_PUBLIC_OWNER_NAME=しのぶ
NEXT_PUBLIC_FORM_INQUIRY=https://docs.google.com/forms/d/e/xxxxx/viewform
NEXT_PUBLIC_TERMS_URL=https://example.com/terms
NEXT_PUBLIC_PRIVACY_POLICY_URL=https://example.com/privacy
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@example.com
RESEND_FROM_NAME=マーケティングCampコミュニティ
RESEND_REPLY_TO=support@example.com
```

### 7.4 送信ユーティリティ（雛形）

```typescript
// src/emails/send.ts（実装時の参考）
import { Resend } from 'resend';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail<P>(params: {
  to: string;
  subject: string;
  template: React.ComponentType<P>;
  props: P;
  category: string;
  tags?: Array<{ name: string; value: string }>;
}) {
  const html = await render(<params.template {...params.props} />);
  const text = await render(<params.template {...params.props} />, { plainText: true });

  return resend.emails.send({
    from: `${process.env.RESEND_FROM_NAME} <${process.env.RESEND_FROM_EMAIL}>`,
    replyTo: process.env.RESEND_REPLY_TO,
    to: params.to,
    subject: params.subject,
    html,
    text,
    tags: [{ name: 'category', value: params.category }, ...(params.tags ?? [])],
  });
}
```

### 7.5 テスト方針

- 単体：各テンプレが文字列を返す（HTML / text 両方）ことを Snapshot テスト
- 統合：Resend のテストモード（`re_test_xxxxx` キー）で実際の送信フローを確認
- E2E：実環境送信は admin の任意操作（招待発行・全体通知）でローンチ前に検証

### 7.6 通知配信全体のフロー（再掲・補足）

```
[イベント発生（投稿作成・コメント・admin 操作 など）]
  ↓
[notification_preferences で受信者を絞り込み]
  ↓
[notifications テーブルに INSERT（service_role）]
  ↓
[Supabase Realtime で /notifications 画面へリアルタイム配信]
  ↓
[メール並走対象タイプであれば Resend で送信]
```

- アプリ内通知のみのイベント（new_post / comment_on_my_post / like_on_my_post / new_announcement / post_*_by_admin）はメール送信なし
- メール並走するイベント：
  - `admin_broadcast`（admin がメール並走を選択した場合のみ）
  - `account_suspended` / `account_deleted` / `account_restored`
  - `plan_changed`（admin 任意）
- メール単独（アプリ内通知なし）：
  - 招待 / パスワードリセット / パスワード変更通知 / メールアドレス変更（旧・新）

---

## 付録 A：テンプレ総数

| カテゴリ | 件数 |
|---|---|
| アプリ内通知タイプ | 13 種類 |
| メール（MVP 必須） | 10 種類（M-01〜M-10） |
| メール（v0.2 参考） | 1 種類（M-V0.2-01） |
| **合計** | **24** |

## 付録 B：将来の拡張余地（v0.2 以降）

- `review_published`：月次レビュー公開通知（アプリ内＋メール）
- `award_received`：表彰通知
- `praise_received`：贈り物受領通知
- `submission_reminder`：月次データ未入力者へのリマインダー（pg_cron）
- Push 通知（iOS 16.4+ / Android）
- メール HTML の A/B テスト基盤
- 多言語化（i18n ライブラリ採用）

---

**本書の本文ここまで。**

実装時の注意：
1. すべてのテンプレ HTML は実際の Gmail / iCloud Mail / Outlook で受信確認すること
2. プリヘッダーが正しく表示されているか必ず実機確認
3. 50代向けに、実際のターゲット層に試読してもらいフィードバックを得ること
4. `{{logo_url}}` を採用する場合、画像が読み込めない環境でも `alt` で意味が伝わること
