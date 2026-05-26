# API エンドポイント・Server Action 仕様書

**プロダクト**: 谷脇式マーケティングCAMP コミュニティ MVP
**バージョン**: v0.1（MVP）
**最終更新**: 2026-05-26
**スコープ**: 契約（インターフェース）のみ。実装コードは含まない

---

## 目次

1. [設計方針](#1-設計方針)
2. [認証・招待](#2-認証招待)
3. [プロフィール・設定](#3-プロフィール設定)
4. [お知らせ](#4-お知らせ)
5. [掲示板](#5-掲示板)
6. [月次データ](#6-月次データ)
7. [仲間・検索](#7-仲間検索)
8. [通知](#8-通知)
9. [画像アップロード](#9-画像アップロード)
10. [動画埋め込み](#10-動画埋め込み)
11. [管理者機能](#11-管理者機能)
12. [Google フォーム連携](#12-google-フォーム連携)
13. [共通エラーコード一覧](#13-共通エラーコード一覧)
14. [レート制限](#14-レート制限)

---

## 1. 設計方針

### 1.1 Server Actions と Route Handlers の使い分け

| 種別 | 用途 | 例 |
|---|---|---|
| **Server Action** | フォーム送信、ミューテーション、Cookie ベースのセッションを使う認証後の操作 | プロフィール更新、投稿作成、いいね、コメント |
| **Route Handler** (`app/api/...`) | 外部からのコールバック、Webhook、ファイルアップロード時の Signed URL、サードパーティ連携、認証コールバック | Supabase Auth callback、Storage Signed URL 取得、招待トークン検証（GET 系） |
| **RSC（Server Component）データ取得** | 一覧・詳細などの読み取り | お知らせ一覧、投稿詳細、メンバー一覧 |

原則：
- **書き込み系は Server Action**（CSRF 保護が組込み）
- **読み取り系は RSC で直接 Supabase Client から取得**（API 化しない）。本仕様書では契約の明確化のため、ヘルパー関数（≒「Query」）として記載する
- **外部連携・Webhook のみ Route Handler**

### 1.2 認証

- **Supabase Auth の Cookie ベースセッション**
- Server Action / Route Handler 内で `createServerClient()` を呼び `auth.getUser()` で本人確認
- 未認証時は `UNAUTHORIZED` エラーを返却

### 1.3 認可

- **RLS で担保**するのが原則。クライアント側・API 側のロジックでは「最低限のチェック」のみ実施
- API 側で明示的にチェックするケース：
  - 管理者専用エンドポイント（`role = 'admin'` を `profiles` から取得して判定）
  - プラン制限（`required_plan` との比較）はクエリレベルで RLS が遮蔽
- RLS で弾かれた場合、API は `NOT_FOUND` または `FORBIDDEN` を返す（情報漏洩を避けるため `NOT_FOUND` を優先）

### 1.4 入力検証

- **zod** を採用
- すべての Server Action / Route Handler の入力スキーマを zod で定義
- 検証エラー時は `VALIDATION_FAILED` を返却、`details.fields` にフィールド単位のエラーメッセージを含める

### 1.5 レスポンス形式

成功時はデータをそのまま返却（Server Action は `Result<T>` 型でラップ）：

```typescript
// 成功
{ ok: true, data: T }

// 失敗
{
  ok: false,
  error: {
    code: ErrorCode,
    message: string,            // ユーザー向けメッセージ
    details?: {
      fields?: Record<string, string>,  // 検証エラー時
      cause?: string,                   // ログ用詳細
    }
  }
}
```

Route Handler の場合：
- 成功：HTTP 200/201/204 + JSON body
- 失敗：HTTP 400/401/403/404/409/422/429/500 + 上記 `error` 形式

### 1.6 共通型定義（参考）

```typescript
type Plan = 'trial' | 'standard' | 'premium';
type UserStatus = 'active' | 'suspended' | 'deleted' | 'hard_deleted';
type UserRole = 'admin' | 'member';
type ContentCategory = 'important' | 'news' | 'column' | 'seminar';
type ChannelId = 'kpi' | 'sales' | 'customer' | 'admin_advice' | string; // 動的追加可
type AttachmentType = 'image' | 'video_embed';
type NotificationType =
  | 'new_post'
  | 'new_announcement'
  | 'comment_on_my_post'
  | 'like_on_my_post'
  | 'admin_broadcast'
  | 'account_suspended'
  | 'account_deleted'
  | 'account_restored'
  | 'post_edited_by_admin'
  | 'post_deleted_by_admin';

type UUID = string;
type ISODateTime = string;  // ISO 8601
type Month = string;        // 'YYYY-MM'
```

---

## 2. 認証・招待

### 2.1 招待トークン検証

| 項目 | 内容 |
|---|---|
| 種別 | Route Handler |
| メソッド/パス | `GET /api/invite/verify` |
| クエリ | `?token=<string>` |

**入力**

```typescript
{ token: string }  // 64文字
```

**出力**

```typescript
{
  valid: boolean,
  invitation: {
    email: string,
    plan: Plan,
    invitedBy: { displayName: string },
    expiresAt: ISODateTime,
  } | null,
  reason: 'expired' | 'already_accepted' | 'not_found' | null,
}
```

**権限**: 公開（未認証可）

**処理**:
- `invitations` テーブルから token で検索
- `expires_at > now()` かつ `accepted_at IS NULL` をチェック
- 有効なら招待情報を返す（受諾画面のプレフィル用）

**エラー**: `VALIDATION_FAILED`（token 形式不正）, `RATE_LIMITED`

---

### 2.2 招待受諾（メール+PW）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `acceptInvitationWithPassword` |

**入力**

```typescript
{
  token: string,                  // 必須、64文字
  password: string,               // 8文字以上、英数字含む
  passwordConfirm: string,        // password と一致
  agreeToTerms: boolean,          // true 必須
}
```

**出力**

```typescript
{ userId: UUID, redirectTo: '/announcements' }
```

**権限**: 公開（未認証）

**処理**:
- トークン検証（§2.1 と同様）
- `auth.signUp({ email: invitation.email, password })` で `auth.users` 作成
- トランザクションで `profiles` INSERT（`role='member'`, `plan=invitation.plan`, `status='active'`）
- `notification_preferences` INSERT（デフォルト値）
- `invitations.accepted_at = now()` で更新
- セッション Cookie をセット
- `audit_logs` に記録（システム）

**エラー**: `VALIDATION_FAILED`, `INVITATION_INVALID`, `EMAIL_ALREADY_EXISTS`, `WEAK_PASSWORD`, `TERMS_NOT_AGREED`

---

### 2.3 招待受諾（Google SSO）

| 項目 | 内容 |
|---|---|
| 種別 | Route Handler |
| メソッド/パス | `GET /api/auth/callback` （Supabase OAuth callback）|

**入力**: Supabase Auth が処理する `code` および `state`。`state` に `invite_token` を埋め込む

**出力**: `redirectTo` にリダイレクト（成功時 `/announcements`、失敗時 `/invite?token=xxx&error=...`）

**権限**: 公開

**処理**:
- Supabase Auth のコールバックを処理し session を確立
- `state` の `invite_token` を取得し検証
- **招待メールと Google アカウントのメールが一致するか厳密チェック**
- 一致しない場合 → `EMAIL_MISMATCH` エラー → サインアウト → 招待画面に戻す
- 一致する場合 → `profiles` INSERT + `notification_preferences` INSERT + `invitations.accepted_at` 更新
- 認証済みクライアントとして `/announcements` へリダイレクト

**エラー**: `INVITATION_INVALID`, `EMAIL_MISMATCH`, `OAUTH_FAILED`

---

### 2.4 ログイン（メール+PW）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `signInWithPassword` |

**入力**

```typescript
{
  email: string,    // email 形式
  password: string,
}
```

**出力**

```typescript
{ userId: UUID, redirectTo: string }
```

**権限**: 公開

**処理**:
- `auth.signInWithPassword` を呼び出し
- ステータスチェック（`profiles.status`）：
  - `suspended` → `ACCOUNT_SUSPENDED` を返す + サインアウト
  - `deleted` / `hard_deleted` → `ACCOUNT_DELETED` を返す + サインアウト
- `last_active_at` を now() に更新
- セッション Cookie をセット

**エラー**: `INVALID_CREDENTIALS`, `ACCOUNT_SUSPENDED`, `ACCOUNT_DELETED`, `RATE_LIMITED`（5回失敗で15分ロック）

---

### 2.5 ログイン（Magic Link）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `sendMagicLink` |

**入力**

```typescript
{ email: string }
```

**出力**

```typescript
{ sent: true }   // 常に true（存在しないメールでも漏洩を防ぐため）
```

**権限**: 公開

**処理**:
- `auth.signInWithOtp({ email, options: { emailRedirectTo: '/api/auth/callback' } })`
- リンクからのコールバックは §2.3 のハンドラを再利用

**エラー**: `VALIDATION_FAILED`, `RATE_LIMITED`

---

### 2.6 ログアウト

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `signOut` |

**入力**: なし

**出力**

```typescript
{ redirectTo: '/login' }
```

**権限**: 認証済み

**処理**:
- `auth.signOut()`
- セッション Cookie 削除

**エラー**: なし（冪等）

---

### 2.7 パスワード変更

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `changePassword` |

**入力**

```typescript
{
  currentPassword: string,
  newPassword: string,           // 8文字以上、英数字含む、currentと異なる
  newPasswordConfirm: string,
}
```

**出力**

```typescript
{ ok: true }
```

**権限**: 認証済み

**処理**:
- `auth.signInWithPassword` で現パスワードを再認証
- `auth.updateUser({ password: newPassword })`
- 本人にメール通知（「パスワードが変更されました」、Resend）
- `audit_logs` に `password_changed` を記録
- 既存セッションは維持

**エラー**: `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `WEAK_PASSWORD`, `SAME_PASSWORD`

---

### 2.8 メール変更

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `changeEmail` |

**入力**

```typescript
{
  newEmail: string,           // email 形式、現在と異なる
  currentPassword: string,    // 再認証用
}
```

**出力**

```typescript
{ confirmationSent: true }
```

**権限**: 認証済み

**処理**:
- `auth.signInWithPassword` で再認証
- `auth.updateUser({ email: newEmail })`
- 新旧両方のメールに確認リンク送信（Supabase 標準）
- 両方クリックで確定後、`audit_logs` に `email_changed` を記録

**エラー**: `UNAUTHORIZED`, `INVALID_CREDENTIALS`, `EMAIL_ALREADY_EXISTS`, `VALIDATION_FAILED`

---

## 3. プロフィール・設定

### 3.1 自分のプロフィール取得

| 項目 | 内容 |
|---|---|
| 種別 | Server Query（RSC ヘルパー） |
| 関数名 | `getMyProfile` |

**入力**: なし

**出力**

```typescript
{
  id: UUID,
  role: UserRole,
  plan: Plan | null,
  status: UserStatus,
  displayName: string,
  avatar: string,                 // 絵文字
  avatarImagePath: string | null,
  avatarImageUrl: string | null,  // Signed URL
  bio: string | null,
  storeName: string,
  region: string,
  product: string,
  storeDescription: string | null,
  storeImagePath: string | null,
  storeImageUrl: string | null,
  companyName: string | null,
  businessType: string | null,
  companyAddress: string | null,
  companyPhone: string | null,
  websiteUrl: string | null,
  socialLinks: {
    instagram?: string,
    x?: string,
    tiktok?: string,
  } | null,
  productGenres: { id: string, label: string, iconEmoji: string }[],
  createdAt: ISODateTime,
}
```

**権限**: 認証済み（自分のみ）

**エラー**: `UNAUTHORIZED`

---

### 3.2 プロフィール更新（個人セクション）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `updatePersonalProfile` |

**入力**

```typescript
{
  displayName: string,        // 1〜30文字
  avatar: string,             // 絵文字 1文字（Unicode emoji 単体）
  bio?: string,               // max 500
}
```

**出力**: `{ ok: true }`

**権限**: 認証済み（自分のみ）

**エラー**: `UNAUTHORIZED`, `VALIDATION_FAILED`

---

### 3.3 プロフィール更新（屋号セクション）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `updateStoreProfile` |

**入力**

```typescript
{
  storeName: string,                 // 1〜50
  region: string,                    // 1〜50
  product: string,                   // 1〜100
  storeDescription?: string,         // max 1000
  storeImagePath?: string | null,    // 既にアップロード済みのStorageパス
}
```

**出力**: `{ ok: true }`

**権限**: 認証済み（自分のみ）

**エラー**: `UNAUTHORIZED`, `VALIDATION_FAILED`

---

### 3.4 プロフィール更新（会社セクション）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `updateCompanyProfile` |

**入力**

```typescript
{
  companyName?: string | null,            // max 100
  businessType?: string | null,           // max 50
  companyAddress?: string | null,         // max 200
  companyPhone?: string | null,           // 電話番号形式
  websiteUrl?: string | null,             // https:// 必須、javascript:禁止
  socialLinks?: {
    instagram?: string | null,            // URL
    x?: string | null,
    tiktok?: string | null,
  } | null,
}
```

**出力**: `{ ok: true }`

**権限**: 認証済み（自分のみ）

**エラー**: `UNAUTHORIZED`, `VALIDATION_FAILED`, `URL_SCHEME_FORBIDDEN`

---

### 3.5 プロフィール更新（販売ジャンル）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `updateProductGenres` |

**入力**

```typescript
{ genreIds: string[] }      // 0〜5個、product_genres.id の配列
```

**出力**: `{ ok: true }`

**権限**: 認証済み（自分のみ）

**処理**:
- `profile_product_genres` を delete-all → insert で置換
- 5個超は `TOO_MANY_GENRES`
- 存在しないジャンルや `is_active=false` は `VALIDATION_FAILED`

**エラー**: `UNAUTHORIZED`, `VALIDATION_FAILED`, `TOO_MANY_GENRES`

---

### 3.6 アバター画像アップロード

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `uploadAvatar` |

**入力**

```typescript
{
  storagePath: string,    // §9.1 で取得した Signed URL でアップロード済みのパス
}
```

**出力**: `{ avatarImageUrl: string }`

**権限**: 認証済み（自分のみ）

**処理**:
- パスが `avatars/{auth.uid()}/...` のプレフィックスを持つか検証
- マジックバイト検証（サーバー側で再ダウンロード or signed トリガー）
- `profiles.avatar_image_path` を更新
- 既存の画像があれば Storage から物理削除

**エラー**: `UNAUTHORIZED`, `INVALID_FILE_PATH`, `INVALID_FILE_TYPE`, `FILE_TOO_LARGE`

---

### 3.7 通知設定取得

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `getNotificationPreferences` |

**入力**: なし

**出力**

```typescript
{
  newPost: boolean,
  newAnnouncement: boolean,
  commentOnMyPost: boolean,
  likeOnMyPost: boolean,
  adminBroadcast: boolean,     // 常に true（UI で OFF 不可）
}
```

**権限**: 認証済み（自分のみ）

---

### 3.8 通知設定更新

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `updateNotificationPreferences` |

**入力**

```typescript
{
  newPost?: boolean,
  newAnnouncement?: boolean,
  commentOnMyPost?: boolean,
  likeOnMyPost?: boolean,
  // adminBroadcast は変更不可（OFF にできない）
}
```

**出力**: `{ ok: true }`

**権限**: 認証済み（自分のみ）

**エラー**: `UNAUTHORIZED`, `VALIDATION_FAILED`

---

### 3.9 公開設定更新

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `updatePrivacySettings` |

**入力**

```typescript
{
  // MVP では会社情報の公開フラグのみ（個別カラム or jsonb で表現）
  showCompanyInfo?: boolean,
}
```

**出力**: `{ ok: true }`

**権限**: 認証済み（自分のみ）

**注記**: MVP では `social_links` の `null` 制御で実質的にプライバシーを担保。詳細フラグは v0.2 で拡張。

---

## 4. お知らせ

### 4.1 お知らせ一覧

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `listAnnouncements` |

**入力**

```typescript
{
  category?: ContentCategory,
  pinnedOnly?: boolean,
  cursor?: ISODateTime,         // published_at の前回最後
  limit?: number,               // 1〜30, default 20
}
```

**出力**

```typescript
{
  items: {
    id: UUID,
    category: ContentCategory,
    title: string,
    bodyExcerpt: string,        // 先頭120文字
    pinned: boolean,
    requiredPlan: Plan | null,
    isLocked: boolean,          // viewer.plan.rank < required_plan.rank
    publishedAt: ISODateTime,
    lastEditedAt: ISODateTime | null,
    author: { id: UUID, displayName: string, avatar: string },
    thumbnailUrl: string | null,
    likeCount: number,
    commentCount: number,
    likedByMe: boolean,
  }[],
  nextCursor: ISODateTime | null,
}
```

**権限**: 認証済み（RLS でプラン・ステータスフィルタ適用）

**処理**:
- `pinned DESC, published_at DESC` でソート
- RLS で `required_plan` 制限は自動適用（ロックは UI 表示のためだけに別途プラン取得）
- `status='published' AND deleted_at IS NULL`

---

### 4.2 お知らせ詳細

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `getAnnouncement` |

**入力**

```typescript
{ id: UUID }
```

**出力**

```typescript
{
  id: UUID,
  category: ContentCategory,
  title: string,
  body: string,
  pinned: boolean,
  requiredPlan: Plan | null,
  publishedAt: ISODateTime,
  lastEditedAt: ISODateTime | null,
  author: { id: UUID, displayName: string, avatar: string },
  attachments: {
    id: UUID,
    type: AttachmentType,
    imageUrl: string | null,          // image時
    videoId: string | null,           // video時
    thumbnailUrl: string | null,
    caption: string | null,
    displayOrder: number,
  }[],
  likeCount: number,
  commentCount: number,
  likedByMe: boolean,
  comments: {
    id: UUID,
    body: string,
    createdAt: ISODateTime,
    lastEditedAt: ISODateTime | null,
    author: { id: UUID, displayName: string, avatar: string } | null, // 退会者はnull相当
    isMine: boolean,
  }[],
}
```

**権限**: 認証済み（RLS）

**エラー**: `NOT_FOUND`（プラン不足含む。ロックは別画面の `/upgrade` へ誘導）

---

### 4.3 お知らせいいねトグル

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `toggleAnnouncementLike` |

**入力**

```typescript
{ contentId: UUID }
```

**出力**

```typescript
{ liked: boolean, likeCount: number }
```

**権限**: 認証済み（trial 含む。閲覧できる記事には全員いいね可）

**処理**:
- `content_likes` に既に行があれば DELETE、無ければ INSERT
- 投稿者本人にいいね通知（プリファレンスONなら）

**エラー**: `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`

---

### 4.4 お知らせコメント作成

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `createAnnouncementComment` |

**入力**

```typescript
{
  contentId: UUID,
  body: string,           // 1〜1000
}
```

**出力**

```typescript
{ commentId: UUID }
```

**権限**: 認証済み

**処理**:
- `content_comments` INSERT
- お知らせ著者（admin）に通知（v0.2: admin にも通知設定）
- レート制限：30/分

**エラー**: `UNAUTHORIZED`, `VALIDATION_FAILED`, `NOT_FOUND`, `RATE_LIMITED`

---

### 4.5 お知らせコメント削除

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `deleteAnnouncementComment` |

**入力**

```typescript
{ commentId: UUID }
```

**出力**: `{ ok: true }`

**権限**: 認証済み（自分のコメント or admin）

**処理**: 論理削除（`deleted_at = now()`）

**エラー**: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

### 4.6 お知らせ作成（admin）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `createAnnouncement` |

**入力**

```typescript
{
  category: ContentCategory,
  title: string,                    // 1〜100
  body: string,                     // 1〜10000
  pinned?: boolean,
  requiredPlan: Plan | null,        // null=全員
  status: 'draft' | 'published',
  attachments?: {
    type: AttachmentType,
    storagePath?: string,           // image時
    externalUrl?: string,           // video時 (YouTube URL)
    caption?: string,
    displayOrder: number,           // 0〜2 (画像最大3枚) + video最大1
  }[],
}
```

**出力**

```typescript
{ contentId: UUID }
```

**権限**: admin のみ

**処理**:
- `contents` INSERT
- 添付の正規化：
  - image: マジックバイト検証
  - video: YouTube URL 検証 + video_id 抽出（§10.1）
- `status='published'` 時：全 active member に `new_announcement` 通知
- `audit_logs` に記録（broadcast の場合）

**エラー**: `FORBIDDEN`, `VALIDATION_FAILED`, `INVALID_YOUTUBE_URL`, `TOO_MANY_ATTACHMENTS`

---

### 4.7 お知らせ更新（admin）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `updateAnnouncement` |

**入力**

```typescript
{
  id: UUID,
  category?: ContentCategory,
  title?: string,
  body?: string,
  pinned?: boolean,
  requiredPlan?: Plan | null,
  status?: 'draft' | 'published',
  attachments?: {                       // 全置換
    type: AttachmentType,
    storagePath?: string,
    externalUrl?: string,
    caption?: string,
    displayOrder: number,
  }[],
}
```

**出力**: `{ ok: true }`

**権限**: admin のみ

**処理**:
- `last_edited_at = now()`, `last_editor_id = admin.id`
- `draft` → `published` 移行時のみ通知配信
- `audit_logs` に記録

**エラー**: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`

---

### 4.8 お知らせ削除（admin, 論理削除）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `deleteAnnouncement` |

**入力**

```typescript
{ id: UUID, reason?: string }
```

**出力**: `{ ok: true }`

**権限**: admin のみ

**処理**:
- `contents.deleted_at = now()`
- `audit_logs` に `content_deleted_by_admin` を記録

**エラー**: `FORBIDDEN`, `NOT_FOUND`

---

### 4.9 ピン留めトグル（admin）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `toggleAnnouncementPin` |

**入力**

```typescript
{ id: UUID }
```

**出力**

```typescript
{ pinned: boolean }
```

**権限**: admin のみ

**エラー**: `FORBIDDEN`, `NOT_FOUND`

---

## 5. 掲示板

### 5.1 投稿一覧

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `listPosts` |

**入力**

```typescript
{
  channelId?: ChannelId,
  tagSlugs?: string[],                 // OR 検索
  cursor?: ISODateTime,                // created_at の前回最後
  limit?: number,                      // 1〜30, default 20
}
```

**出力**

```typescript
{
  items: {
    id: UUID,
    channel: { id: ChannelId, label: string, iconEmoji: string | null, color: string },
    title: string,
    contentExcerpt: string,            // 先頭120文字
    tags: { id: UUID, label: string, slug: string }[],
    author: { id: UUID, displayName: string, avatar: string, productGenres: { iconEmoji: string }[] } | null,
    createdAt: ISODateTime,
    lastEditedAt: ISODateTime | null,
    editedByAdmin: boolean,
    thumbnailUrl: string | null,
    likeCount: number,
    commentCount: number,
    likedByMe: boolean,
    hasVideo: boolean,
  }[],
  nextCursor: ISODateTime | null,
  trialPreviewLimitReached?: boolean,  // trial が制限件数を超えてアクセスしようとした場合
}
```

**権限**: 認証済み

**処理**:
- RLS で `required_plan` フィルタが適用
- **trial ユーザー**: 各チャンネル毎に `trial_preview_count` 件まで返す
  - 一覧クエリ側でチャンネル毎にウィンドウ関数で件数制限
  - 制限超過分は `isLocked: true` 相当ではなく**返さない**、UI で「これ以上は Pro で」CTA を表示
- ソート：`created_at DESC`（ピン留めは MVP では掲示板側には無し）

**エラー**: `UNAUTHORIZED`

---

### 5.2 投稿詳細

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `getPost` |

**入力**

```typescript
{ id: UUID }
```

**出力**

```typescript
{
  id: UUID,
  channel: { id: ChannelId, label: string, iconEmoji: string | null, color: string },
  title: string,
  content: string,
  tags: { id: UUID, label: string, slug: string }[],
  author: {
    id: UUID,
    displayName: string,
    avatar: string,
    productGenres: { id: string, label: string, iconEmoji: string }[],
  } | null,                            // 退会済みは null
  createdAt: ISODateTime,
  lastEditedAt: ISODateTime | null,
  editedByAdmin: boolean,
  isMine: boolean,
  attachments: {
    id: UUID,
    type: AttachmentType,
    imageUrl: string | null,
    videoId: string | null,
    thumbnailUrl: string | null,
    caption: string | null,
    displayOrder: number,
  }[],
  likeCount: number,
  commentCount: number,
  likedByMe: boolean,
  comments: {
    id: UUID,
    body: string,
    createdAt: ISODateTime,
    lastEditedAt: ISODateTime | null,
    author: { id: UUID, displayName: string, avatar: string } | null,
    isMine: boolean,
  }[],
}
```

**権限**: 認証済み（RLS）

**エラー**: `NOT_FOUND`（プラン不足、退会者の投稿など）

---

### 5.3 投稿作成

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `createPost` |

**入力**

```typescript
{
  channelId: ChannelId,
  title: string,                       // 1〜100
  content: string,                     // 1〜5000
  tagLabels: string[],                 // 0〜5、新規作成も含む（slug は自動生成）
  attachments?: {
    type: AttachmentType,
    storagePath?: string,              // image: 既にアップロード済み Storage パス
    externalUrl?: string,              // video: YouTube URL (admin のみ)
    caption?: string,
    displayOrder: number,              // image: 0〜2, video: 0
  }[],
}
```

**出力**

```typescript
{ postId: UUID }
```

**権限**:
- `member` または `admin`
- trial は投稿不可（standard 以上）
- `only_admin_can_post = true` のチャンネルは admin のみ
- `viewer.plan.rank >= channel.required_plan.rank`
- video 添付は admin のみ

**処理**:
- タグ正規化（slug = 小文字 + 半角化 + trim + 記号除去）
- 既存タグは再利用（slug で照合）、無ければ `post_tags` INSERT
- `post_tag_assignments` INSERT
- 画像のマジックバイト検証（最大3枚）
- 動画 URL 検証（§10.1）
- 該当チャンネルの権限を持つメンバーに `new_post` 通知（プリファレンスON）

**エラー**: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_FAILED`, `TOO_MANY_TAGS`, `TOO_MANY_ATTACHMENTS`, `INVALID_YOUTUBE_URL`, `VIDEO_NOT_ALLOWED`, `CHANNEL_NOT_FOUND`, `RATE_LIMITED`

---

### 5.4 投稿更新

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `updatePost` |

**入力**

```typescript
{
  id: UUID,
  title?: string,
  content?: string,
  tagLabels?: string[],
  attachments?: {                      // 指定時は全置換
    type: AttachmentType,
    storagePath?: string,
    externalUrl?: string,
    caption?: string,
    displayOrder: number,
  }[],
}
```

**出力**: `{ ok: true }`

**権限**: 著者本人 or admin

**処理**:
- `last_edited_at = now()`, `last_editor_id = actor.id`
- admin が編集した場合 `edited_by_admin = true`、`audit_logs` 記録、著者に通知

**エラー**: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`

---

### 5.5 投稿削除

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `deletePost` |

**入力**

```typescript
{ id: UUID, reason?: string }       // reason は admin 削除時のみ
```

**出力**: `{ ok: true }`

**権限**: 著者本人 or admin

**処理**:
- 論理削除（`deleted_at = now()`, `deleted_by = actor.id`）
- admin が削除した場合：`audit_logs` 記録、著者に `post_deleted_by_admin` 通知（理由含む）

**エラー**: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

### 5.6 投稿いいねトグル

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `togglePostLike` |

**入力**

```typescript
{ postId: UUID }
```

**出力**

```typescript
{ liked: boolean, likeCount: number }
```

**権限**: 認証済み（trial は閲覧可能な5件まではいいね可、それ以外は RLS で弾かれる）

**処理**:
- `post_likes` トグル
- 投稿者に `like_on_my_post` 通知（プリファレンスON、デフォルトOFF）

**エラー**: `UNAUTHORIZED`, `NOT_FOUND`, `RATE_LIMITED`

---

### 5.7 投稿コメント作成

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `createPostComment` |

**入力**

```typescript
{
  postId: UUID,
  body: string,                  // 1〜1000
}
```

**出力**

```typescript
{ commentId: UUID }
```

**権限**: standard 以上（trial は閲覧のみ）

**処理**:
- `post_comments` INSERT
- 投稿者に `comment_on_my_post` 通知（プリファレンスON）
- レート制限：30/分

**エラー**: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_FAILED`, `NOT_FOUND`, `RATE_LIMITED`

---

### 5.8 投稿コメント削除

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `deletePostComment` |

**入力**

```typescript
{ commentId: UUID }
```

**出力**: `{ ok: true }`

**権限**: 自分のコメント or admin

**処理**: 論理削除（`deleted_at = now()`）。admin 削除時は `audit_logs`

**エラー**: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`

---

## 6. 月次データ

### 6.1 売上報告 一覧（自分のみ）

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `listMySalesReports` |

**入力**

```typescript
{
  yearFrom?: number,         // 例: 2024
  yearTo?: number,
  limit?: number,            // default 24
}
```

**出力**

```typescript
{
  items: {
    id: UUID,
    month: Month,
    sales: number,
    salesTarget: number,
    achievementRate: number,          // generated
    initiativesCount: number,
    note: string,
    imageUrl: string | null,
    createdAt: ISODateTime,
    updatedAt: ISODateTime,
  }[],
}
```

**権限**: standard 以上（自分のみ。RLS で他人は見えない）

---

### 6.2 売上報告 作成

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `createSalesReport` |

**入力**

```typescript
{
  month: Month,                  // 'YYYY-MM'、当月 or 過去
  sales: number,                 // >= 0
  salesTarget: number,           // > 0
  initiativesCount: number,      // >= 0
  note: string,                  // max 1000
  imagePath?: string | null,
}
```

**出力**

```typescript
{ id: UUID }
```

**権限**: standard 以上

**処理**:
- UNIQUE(author_id, month) で同月重複拒否 → `DUPLICATE_MONTH`
- 月末経過後の月は member 不可（admin のみ）→ `MONTH_LOCKED`

**エラー**: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_FAILED`, `DUPLICATE_MONTH`, `MONTH_LOCKED`

---

### 6.3 売上報告 更新

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `updateSalesReport` |

**入力**

```typescript
{
  id: UUID,
  sales?: number,
  salesTarget?: number,
  initiativesCount?: number,
  note?: string,
  imagePath?: string | null,
}
```

**出力**: `{ ok: true }`

**権限**: 自分のみ（month が当月内）or admin

**エラー**: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `MONTH_LOCKED`, `VALIDATION_FAILED`

---

### 6.4 売上報告 削除

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `deleteSalesReport` |

**入力**: `{ id: UUID }`

**出力**: `{ ok: true }`

**権限**: admin のみ（仕様§7.3.4）

**エラー**: `FORBIDDEN`, `NOT_FOUND`

---

### 6.5 KPI改善 一覧

| 種別 | Server Query / 関数名 | `listMyKpiReports` |
|---|---|

**入力**: 6.1 と同様

**出力**

```typescript
{
  items: {
    id: UUID,
    month: Month,
    kpiName: string,
    beforeValue: number,
    afterValue: number,
    unit: '%' | '件' | '円' | '人' | '回',
    changeRate: number,             // generated
    note: string,
    imageUrl: string | null,
    createdAt: ISODateTime,
    updatedAt: ISODateTime,
  }[],
}
```

**権限**: standard 以上（自分のみ）

---

### 6.6 KPI改善 作成

| 種別 | Server Action / 関数名 | `createKpiReport` |
|---|---|

**入力**

```typescript
{
  month: Month,
  kpiName: string,                // 1〜50
  beforeValue: number,            // >= 0
  afterValue: number,             // >= 0
  unit: '%' | '件' | '円' | '人' | '回',
  note: string,                   // max 1000
  imagePath?: string | null,
}
```

**出力**: `{ id: UUID }`

**権限**: standard 以上

**エラー**: 6.2 と同様（DUPLICATE_MONTH は kpi_name も含めた組み合わせ）

---

### 6.7 KPI改善 更新

| 種別 | Server Action / 関数名 | `updateKpiReport` |
|---|---|

**入力**

```typescript
{
  id: UUID,
  kpiName?: string,
  beforeValue?: number,
  afterValue?: number,
  unit?: '%' | '件' | '円' | '人' | '回',
  note?: string,
  imagePath?: string | null,
}
```

**出力**: `{ ok: true }`

**権限**: 自分（当月内）or admin

---

### 6.8 KPI改善 削除

| 種別 | Server Action / 関数名 | `deleteKpiReport` |
|---|---|

**入力**: `{ id: UUID }`
**出力**: `{ ok: true }`
**権限**: admin のみ

---

### 6.9 施策CPA 一覧

| 種別 | Server Query / 関数名 | `listMyCpaReports` |
|---|---|

**入力**: 6.1 と同様

**出力**

```typescript
{
  items: {
    id: UUID,
    month: Month,
    campaignName: string,
    cost: number,
    conversions: number,
    cpa: number,                     // generated
    note: string,
    imageUrl: string | null,
    createdAt: ISODateTime,
    updatedAt: ISODateTime,
  }[],
}
```

**権限**: standard 以上（自分のみ）

---

### 6.10 施策CPA 作成

| 種別 | Server Action / 関数名 | `createCpaReport` |
|---|---|

**入力**

```typescript
{
  month: Month,
  campaignName: string,            // 1〜50
  cost: number,                    // > 0
  conversions: number,             // >= 0
  note: string,
  imagePath?: string | null,
}
```

**出力**: `{ id: UUID }`

**権限**: standard 以上

---

### 6.11 施策CPA 更新

| 種別 | Server Action / 関数名 | `updateCpaReport` |
|---|---|

**入力**

```typescript
{
  id: UUID,
  campaignName?: string,
  cost?: number,
  conversions?: number,
  note?: string,
  imagePath?: string | null,
}
```

**出力**: `{ ok: true }`

**権限**: 自分（当月内）or admin

---

### 6.12 施策CPA 削除

| 種別 | Server Action / 関数名 | `deleteCpaReport` |
|---|---|

**入力**: `{ id: UUID }`
**出力**: `{ ok: true }`
**権限**: admin のみ

---

## 7. 仲間・検索

### 7.1 メンバー一覧

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `listMembers` |

**入力**

```typescript
{
  genreIds?: string[],          // 複数の販売ジャンルで OR フィルタ
  nameQuery?: string,           // displayName / storeName 部分一致（>=2文字）
  cursor?: { lastActiveAt: ISODateTime, id: UUID },
  limit?: number,               // default 30
}
```

**出力**

```typescript
{
  items: {
    id: UUID,
    displayName: string,
    avatar: string,
    avatarImageUrl: string | null,
    storeName: string,
    region: string,
    product: string,
    productGenres: { id: string, label: string, iconEmoji: string }[],
    lastActiveAt: ISODateTime,
  }[],
  nextCursor: { lastActiveAt: ISODateTime, id: UUID } | null,
}
```

**権限**: 認証済み（trial 含む）

**処理**:
- RLS により `status='active'` の member のみ
- ソート：`last_active_at DESC, id`

**エラー**: `UNAUTHORIZED`

---

### 7.2 メンバー詳細プロフィール

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `getMemberProfile` |

**入力**

```typescript
{ id: UUID }
```

**出力**

```typescript
{
  id: UUID,
  displayName: string,
  avatar: string,
  avatarImageUrl: string | null,
  bio: string | null,
  storeName: string,
  region: string,
  product: string,
  storeDescription: string | null,
  storeImageUrl: string | null,
  // 会社情報（公開設定がOFFならnull）
  companyName: string | null,
  businessType: string | null,
  companyAddress: string | null,
  companyPhone: string | null,
  websiteUrl: string | null,
  socialLinks: { instagram?: string, x?: string, tiktok?: string } | null,
  productGenres: { id: string, label: string, iconEmoji: string }[],
  recentPosts: {                              // 直近10件
    id: UUID,
    title: string,
    channel: { id: ChannelId, label: string, color: string },
    createdAt: ISODateTime,
    likeCount: number,
    commentCount: number,
  }[],
}
```

**権限**: 認証済み（status='active' のみ表示。RLS）

**エラー**: `NOT_FOUND`

---

### 7.3 検索（横断）

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `searchAll` |

**入力**

```typescript
{
  q: string,                            // >= 2文字
  scope?: ('post' | 'announcement' | 'member')[],  // default 全部
  channelIds?: ChannelId[],
  tagSlugs?: string[],
  dateFrom?: ISODateTime,
  dateTo?: ISODateTime,
  limitPerScope?: number,               // default 10
}
```

**出力**

```typescript
{
  posts: { /* listPosts.items 型 */ }[],
  announcements: { /* listAnnouncements.items 型 */ }[],
  members: { /* listMembers.items 型 */ }[],
  totalCounts: { posts: number, announcements: number, members: number },
}
```

**権限**: 認証済み

**処理**:
- ILIKE 検索（MVP は FTS なし）
- マッチ条件：
  - post: title / content / tag.label
  - announcement: title / body
  - member: display_name / store_name / product
- 検索方式：MVP は OR（`q` を空白分割で OR）
- RLS により自分が閲覧可能な範囲のみ返る
- レート制限：60/分

**エラー**: `VALIDATION_FAILED`（クエリ短すぎ）, `RATE_LIMITED`

---

## 8. 通知

### 8.1 通知一覧

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `listNotifications` |

**入力**

```typescript
{
  filter?: 'all' | 'unread',
  cursor?: ISODateTime,
  limit?: number,                    // default 30
}
```

**出力**

```typescript
{
  items: {
    id: UUID,
    type: NotificationType,
    title: string,
    body: string,
    linkPath: string,
    actor: { id: UUID, displayName: string, avatar: string } | null,
    readAt: ISODateTime | null,
    createdAt: ISODateTime,
  }[],
  nextCursor: ISODateTime | null,
  unreadCount: number,
}
```

**権限**: 認証済み（自分の通知のみ、RLS）

---

### 8.2 通知既読化（個別）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `markNotificationRead` |

**入力**

```typescript
{ id: UUID }
```

**出力**

```typescript
{ unreadCount: number }
```

**権限**: 認証済み（自分の通知のみ）

**処理**: `read_at = now()`（既に既読なら変更なし）

**エラー**: `UNAUTHORIZED`, `NOT_FOUND`

---

### 8.3 通知一括既読化

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `markAllNotificationsRead` |

**入力**: なし

**出力**

```typescript
{ markedCount: number, unreadCount: 0 }
```

**権限**: 認証済み

**処理**: 自分の `read_at IS NULL` を全て `now()` に更新

**エラー**: `UNAUTHORIZED`

---

## 9. 画像アップロード

### 9.1 アップロード前 Signed URL 取得

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `getImageUploadUrl` |

**入力**

```typescript
{
  purpose: 'avatar' | 'store' | 'post' | 'announcement' | 'data',
  filename: string,             // 元のファイル名（拡張子検出用）
  contentType: 'image/jpeg' | 'image/png' | 'image/webp',
  contentLength: number,        // bytes、purpose 別の上限内
}
```

**出力**

```typescript
{
  signedUrl: string,            // Supabase Storage の PUT 用 URL
  storagePath: string,          // {bucket}/{user_id}/{purpose}/{uuid}.{ext}
  expiresIn: number,            // 秒（例：300）
}
```

**権限**: 認証済み

**処理**:
- UUID 生成、`{bucket}/{auth.uid()}/{purpose}/{uuid}.{ext}` を組み立て
- Content-Type と Content-Length が purpose 別の許容範囲か検証
  - avatar: max 500KB
  - store / data: max 1.5MB
  - post / announcement: max 2MB（圧縮後想定の上限）
- Supabase Storage の signed upload URL を発行（有効5分）

**エラー**: `UNAUTHORIZED`, `INVALID_CONTENT_TYPE`, `FILE_TOO_LARGE`, `VALIDATION_FAILED`

---

### 9.2 アップロード完了通知（マジックバイト検証）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action |
| 関数名 | `confirmImageUpload` |

**入力**

```typescript
{
  storagePath: string,
  purpose: 'avatar' | 'store' | 'post' | 'announcement' | 'data',
}
```

**出力**

```typescript
{ verified: true, imageUrl: string }
```

**権限**: 認証済み

**処理**:
- パスが `{auth.uid()}` プレフィックスを持つことを検証（横取り防止）
- Storage からファイル先頭バイトを取得しマジックバイト検証
  - JPEG (`FF D8 FF`)、PNG (`89 50 4E 47`)、WebP (`52 49 46 46 .. .. .. .. 57 45 42 50`)
- 失敗時は Storage から物理削除して `INVALID_FILE_TYPE`
- 成功時は signed URL（read 用）を返す

**エラー**: `UNAUTHORIZED`, `INVALID_FILE_PATH`, `INVALID_FILE_TYPE`, `NOT_FOUND`

---

## 10. 動画埋め込み

### 10.1 YouTube URL バリデーション・video_id 抽出

| 項目 | 内容 |
|---|---|
| 種別 | Server Action（ユーティリティとして共有） |
| 関数名 | `validateYoutubeUrl` |

**入力**

```typescript
{ url: string }
```

**出力**

```typescript
{
  valid: true,
  videoId: string,                      // [A-Za-z0-9_-]{11}
  thumbnailUrl: string,                 // https://img.youtube.com/vi/{videoId}/maxresdefault.jpg
  embedUrl: string,                     // https://www.youtube.com/embed/{videoId}
}
```

**権限**: admin のみ（投稿時の検証用）

**処理**:
- 受け付ける URL 形式：
  - `https://www.youtube.com/watch?v=XXXXX`
  - `https://youtube.com/watch?v=XXXXX`
  - `https://youtu.be/XXXXX`
  - `https://www.youtube.com/shorts/XXXXX`
- ホスト名ホワイトリスト（`youtube.com`, `www.youtube.com`, `youtu.be`, `m.youtube.com`）
- video_id 正規表現：`^[A-Za-z0-9_-]{11}$`
- 不正な場合 `INVALID_YOUTUBE_URL`

**エラー**: `FORBIDDEN`, `INVALID_YOUTUBE_URL`

> 注：このアクションは投稿作成・お知らせ作成内部で呼ばれることが多いが、フォーム UX 上のプレビューでも単独で呼べる必要がある。

---

## 11. 管理者機能

すべて `role = 'admin'` 必須。記載省略時は `FORBIDDEN`（非 admin）が共通エラーとして返る。

### 11.1 メンバー一覧（admin）

| 項目 | 内容 |
|---|---|
| 種別 | Server Query |
| 関数名 | `adminListMembers` |

**入力**

```typescript
{
  status?: UserStatus | 'all',
  plan?: Plan | 'all',
  genreIds?: string[],
  nameQuery?: string,
  sortBy?: 'last_active_at' | 'created_at' | 'display_name',
  sortDir?: 'asc' | 'desc',
  cursor?: { sortValue: string, id: UUID },
  limit?: number,                       // default 50
}
```

**出力**

```typescript
{
  items: {
    id: UUID,
    displayName: string,
    avatar: string,
    storeName: string,
    role: UserRole,
    plan: Plan | null,
    status: UserStatus,
    suspendedUntil: ISODateTime | null,
    productGenres: { id: string, label: string, iconEmoji: string }[],
    lastActiveAt: ISODateTime,
    createdAt: ISODateTime,
    stats: { postCount: number, commentCount: number },
  }[],
  nextCursor: { sortValue: string, id: UUID } | null,
}
```

**権限**: admin のみ

---

### 11.2 メンバー詳細（admin）

| 種別 | Server Query / 関数名 | `adminGetMember` |
|---|---|

**入力**: `{ id: UUID }`

**出力**

```typescript
{
  // §3.1 と同様のプロフィール全項目 + 以下
  email: string,
  role: UserRole,
  plan: Plan | null,
  status: UserStatus,
  suspendedUntil: ISODateTime | null,
  deletedAt: ISODateTime | null,
  deletedBy: { id: UUID, displayName: string } | null,
  deletionReason: string | null,
  stats: {
    postCount: number,
    commentCount: number,
    salesReportCount: number,
    kpiReportCount: number,
    cpaReportCount: number,
  },
  recentAuditLogs: {                    // 直近10件
    id: UUID,
    actionType: string,
    actor: { id: UUID, displayName: string },
    createdAt: ISODateTime,
  }[],
}
```

**権限**: admin のみ

---

### 11.3 プラン変更

| 種別 | Server Action / 関数名 | `adminChangeMemberPlan` |
|---|---|

**入力**

```typescript
{
  userId: UUID,
  newPlan: Plan,
  reason?: string,                    // audit_logs.payload に保存
}
```

**出力**: `{ ok: true }`

**処理**:
- `profiles.plan` を更新
- `audit_logs` に `user_plan_changed` を記録（before/after）
- 本人に通知「プランが変更されました」

**エラー**: `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_FAILED`, `SELF_OPERATION_FORBIDDEN`（admin の自プラン変更は不可）

---

### 11.4 一時停止

| 種別 | Server Action / 関数名 | `adminSuspendMember` |
|---|---|

**入力**

```typescript
{
  userId: UUID,
  duration: '1_week' | '1_month' | 'indefinite',
  reason?: string,
}
```

**出力**: `{ ok: true, suspendedUntil: ISODateTime | null }`

**処理**:
- `profiles.status='suspended'`、`suspended_until` を計算（indefinite は NULL）
- `auth.users.banned_until` を設定
- 本人に `account_suspended` 通知（メール並走）
- `audit_logs` に `user_suspended`

**エラー**: `FORBIDDEN`, `NOT_FOUND`, `SELF_OPERATION_FORBIDDEN`

---

### 11.5 復活

| 種別 | Server Action / 関数名 | `adminRestoreMember` |
|---|---|

**入力**

```typescript
{ userId: UUID, reason?: string }
```

**出力**: `{ ok: true }`

**処理**:
- `profiles.status='active'`、`suspended_until=NULL`、`deleted_at=NULL`、`deleted_by=NULL`
- `auth.users.banned_until=NULL`
- 本人に `account_restored` 通知
- `audit_logs` に `user_restored`

**エラー**: `FORBIDDEN`, `NOT_FOUND`

---

### 11.6 退会処理

| 種別 | Server Action / 関数名 | `adminDeleteMember` |
|---|---|

**入力**

```typescript
{ userId: UUID, reason: string }     // reason 必須
```

**出力**: `{ ok: true }`

**処理**:
- `profiles.status='deleted'`、`deleted_at=now()`、`deleted_by=admin.id`、`deletion_reason=reason`
- `auth.users.banned_until='infinity'`
- 既存セッション失効
- 本人に `account_deleted` 通知（メール）
- `audit_logs` に `user_deleted`

**エラー**: `FORBIDDEN`, `NOT_FOUND`, `SELF_OPERATION_FORBIDDEN`, `VALIDATION_FAILED`

---

### 11.7 招待一覧

| 種別 | Server Query / 関数名 | `adminListInvitations` |
|---|---|

**入力**

```typescript
{
  status?: 'pending' | 'accepted' | 'expired' | 'all',
  cursor?: ISODateTime,
  limit?: number,                // default 30
}
```

**出力**

```typescript
{
  items: {
    id: UUID,
    email: string,
    plan: Plan,
    invitedBy: { id: UUID, displayName: string },
    expiresAt: ISODateTime,
    acceptedAt: ISODateTime | null,
    isExpired: boolean,
    createdAt: ISODateTime,
  }[],
  nextCursor: ISODateTime | null,
}
```

**権限**: admin のみ

---

### 11.8 招待作成

| 種別 | Server Action / 関数名 | `adminCreateInvitation` |
|---|---|

**入力**

```typescript
{
  email: string,
  plan: Plan,
}
```

**出力**

```typescript
{ invitationId: UUID, expiresAt: ISODateTime }
```

**処理**:
- 既存の `profiles.email`（auth.users 経由）と重複しないか確認 → `EMAIL_ALREADY_REGISTERED`
- 既存の pending invitation があれば取消（revoke）→ 新規発行
- 64文字ランダム token 生成
- `invitations` INSERT（expires_at = now() + 7days）
- Resend で招待メール送信（プラン名・有効期限を含む）
- `audit_logs` に `invitation_created`
- レート制限：admin 10/分

**エラー**: `FORBIDDEN`, `VALIDATION_FAILED`, `EMAIL_ALREADY_REGISTERED`, `RATE_LIMITED`, `EMAIL_SEND_FAILED`

---

### 11.9 招待取消

| 種別 | Server Action / 関数名 | `adminRevokeInvitation` |
|---|---|

**入力**: `{ id: UUID }`

**出力**: `{ ok: true }`

**処理**:
- `accepted_at IS NULL` の招待のみ削除可能
- `audit_logs` に `invitation_revoked`

**エラー**: `FORBIDDEN`, `NOT_FOUND`, `INVITATION_ALREADY_ACCEPTED`

---

### 11.10 招待再送

| 種別 | Server Action / 関数名 | `adminResendInvitation` |
|---|---|

**入力**: `{ id: UUID }`

**出力**: `{ ok: true, newExpiresAt: ISODateTime }`

**処理**:
- 既存招待の `expires_at` を `now() + 7days` に更新（または新規発行）
- Resend で再送
- `audit_logs` に `invitation_resent`

**エラー**: `FORBIDDEN`, `NOT_FOUND`, `INVITATION_ALREADY_ACCEPTED`, `EMAIL_SEND_FAILED`

---

### 11.11 投稿モデレーション（編集）

`updatePost`（§5.4）を admin として実行。`edited_by_admin=true` が自動セット、`audit_logs` 記録、著者通知。

### 11.12 投稿モデレーション（削除）

`deletePost`（§5.5）を admin として実行。`audit_logs` 記録、著者通知。

### 11.13 コメントモデレーション（削除）

`deletePostComment`（§5.8）/ `deleteAnnouncementComment`（§4.5）を admin として実行。

---

### 11.14 チャンネル一覧

| 種別 | Server Query / 関数名 | `adminListChannels` |
|---|---|

**入力**: `{ includeInactive?: boolean }`

**出力**

```typescript
{
  items: {
    id: ChannelId,
    label: string,
    description: string | null,
    iconEmoji: string | null,
    color: string,
    requiredPlan: Plan,
    onlyAdminCanPost: boolean,
    trialPreviewCount: number | null,
    sortOrder: number,
    isActive: boolean,
    postCount: number,
  }[],
}
```

---

### 11.15 チャンネル作成

| 種別 | Server Action / 関数名 | `adminCreateChannel` |
|---|---|

**入力**

```typescript
{
  id: string,                         // slug（半角英数記号）
  label: string,
  description?: string,
  iconEmoji?: string,
  color: string,                      // hex
  requiredPlan: Plan,
  onlyAdminCanPost: boolean,
  trialPreviewCount?: number | null,
  sortOrder: number,
}
```

**出力**: `{ channelId: ChannelId }`

**処理**: `audit_logs` に `channel_created`

**エラー**: `FORBIDDEN`, `VALIDATION_FAILED`, `CHANNEL_ID_TAKEN`

---

### 11.16 チャンネル更新

| 種別 | Server Action / 関数名 | `adminUpdateChannel` |
|---|---|

**入力**

```typescript
{
  id: ChannelId,
  label?: string,
  description?: string,
  iconEmoji?: string,
  color?: string,
  requiredPlan?: Plan,
  onlyAdminCanPost?: boolean,
  trialPreviewCount?: number | null,
  sortOrder?: number,
}
```

**出力**: `{ ok: true }`

**処理**: `audit_logs` に `channel_updated`（before/after）

---

### 11.17 チャンネル削除（論理）

| 種別 | Server Action / 関数名 | `adminDeleteChannel` |
|---|---|

**入力**: `{ id: ChannelId, reason?: string }`

**出力**: `{ ok: true, affectedPostCount: number }`

**処理**:
- 影響範囲取得（紐づく投稿数）
- `is_active=false` に更新（論理削除）
- 関連投稿は表示されなくなる（RLS）
- `audit_logs` に `channel_deleted`

**エラー**: `FORBIDDEN`, `NOT_FOUND`

---

### 11.18 販売ジャンル CRUD

3 つのエンドポイント：

| 関数名 | 入力 | 出力 |
|---|---|---|
| `adminCreateProductGenre` | `{ id: string, label: string, iconEmoji: string, description?: string, sortOrder: number }` | `{ genreId: string }` |
| `adminUpdateProductGenre` | `{ id: string, label?: string, iconEmoji?: string, description?: string, sortOrder?: number, isActive?: boolean }` | `{ ok: true }` |
| `adminDeleteProductGenre` | `{ id: string }` | `{ ok: true, affectedMemberCount: number }` |

- すべて admin のみ
- `audit_logs` に `product_genre_*` 記録
- 削除は `is_active=false`、関連メンバーには影響なし（UI 表示時はバッジが消える）

---

### 11.19 投稿タグ統合

| 種別 | Server Action / 関数名 | `adminMergePostTags` |
|---|---|

**入力**

```typescript
{
  sourceIds: UUID[],        // 統合元
  targetId: UUID,           // 統合先
}
```

**出力**: `{ ok: true, mergedCount: number }`

**処理**:
- `post_tag_assignments.tag_id` を source → target に UPDATE（重複は除去）
- source タグを `is_active=false`
- `usage_count` を再集計
- `audit_logs` に `post_tag_merged`

---

### 11.20 投稿タグ削除

| 種別 | Server Action / 関数名 | `adminDeletePostTag` |
|---|---|

**入力**: `{ id: UUID }`

**出力**: `{ ok: true, affectedPostCount: number }`

**処理**: `is_active=false`、関連 assignments は削除、`audit_logs` に `post_tag_deleted`

---

### 11.21 全体通知送信

| 種別 | Server Action / 関数名 | `adminSendBroadcast` |
|---|---|

**入力**

```typescript
{
  title: string,                    // 1〜100
  body: string,                     // 1〜2000
  linkPath?: string,                // 任意の遷移先
  sendEmail: boolean,               // メール並走の有無
}
```

**出力**

```typescript
{
  ok: true,
  notificationCount: number,
  emailSentCount: number,
}
```

**権限**: admin のみ

**処理**:
- 全 active member の `notifications` に `admin_broadcast` で INSERT（バルク）
- `sendEmail=true` なら Resend で一斉送信（バッチ・並列制御）
- `audit_logs` に `broadcast_sent`
- レート制限：admin 5/時間（誤爆防止）

**エラー**: `FORBIDDEN`, `VALIDATION_FAILED`, `RATE_LIMITED`, `EMAIL_SEND_FAILED`

---

### 11.22 監査ログ閲覧

| 種別 | Server Query / 関数名 | `adminListAuditLogs` |
|---|---|

**入力**

```typescript
{
  actorId?: UUID,
  actionType?: string,
  targetType?: string,
  targetId?: UUID,
  dateFrom?: ISODateTime,
  dateTo?: ISODateTime,
  cursor?: ISODateTime,
  limit?: number,                  // default 50
}
```

**出力**

```typescript
{
  items: {
    id: UUID,
    actor: { id: UUID, displayName: string },
    actionType: string,
    targetType: string,
    targetId: UUID | null,
    payload: object,
    ipAddress: string | null,
    userAgent: string | null,
    createdAt: ISODateTime,
  }[],
  nextCursor: ISODateTime | null,
}
```

**権限**: admin のみ

---

## 12. Google フォーム連携

### 12.1 フォーム URL 取得（プレフィル URL 生成）

| 項目 | 内容 |
|---|---|
| 種別 | Server Action（または client-side ユーティリティ） |
| 関数名 | `getExternalFormUrl` |

**入力**

```typescript
{
  formKey:
    | 'plan_upgrade'
    | 'withdrawal'
    | 'inquiry'
    | 'bug_report'
    | 'seminar',
  prefill?: {
    name?: string,
    email?: string,
    requestedPlan?: Plan,
    currentPlan?: Plan,
    additionalContext?: string,
  },
}
```

**出力**

```typescript
{ url: string }       // 完成した Google Forms URL（クエリパラメータ付き）
```

**権限**: 認証済み

**処理**:
- 環境変数からベース URL と `entry.xxx` ID を取得：
  - `NEXT_PUBLIC_FORM_PLAN_UPGRADE`, `NEXT_PUBLIC_FORM_WITHDRAWAL`, ...
  - `NEXT_PUBLIC_FORM_PLAN_ENTRY_NAME`, `NEXT_PUBLIC_FORM_PLAN_ENTRY_EMAIL`, ...
- prefill 値を URL エンコードしてクエリパラメータ化
- フォームキーが未設定（環境変数なし）の場合 `FORM_NOT_CONFIGURED`

**エラー**: `UNAUTHORIZED`, `FORM_NOT_CONFIGURED`, `VALIDATION_FAILED`

> 注：実装上はサーバーアクションでなくクライアント側のユーティリティでも可。サーバー側で生成する場合はメール等の値がサーバーで信頼できる利点がある。

---

## 13. 共通エラーコード一覧

| コード | HTTP | 用途 |
|---|:---:|---|
| `UNAUTHORIZED` | 401 | 未認証 |
| `FORBIDDEN` | 403 | 認可不足（admin 専用へのアクセス等） |
| `NOT_FOUND` | 404 | 存在しない or RLS で弾かれた |
| `VALIDATION_FAILED` | 422 | zod 検証エラー。`details.fields` にフィールド別メッセージ |
| `CONFLICT` | 409 | 楽観ロック失敗、重複制約違反など |
| `DUPLICATE_MONTH` | 409 | 月次データの同月重複 |
| `RATE_LIMITED` | 429 | レート制限超過 |
| `INVITATION_INVALID` | 400 | 招待トークン無効・期限切れ・使用済み |
| `INVITATION_ALREADY_ACCEPTED` | 409 | 招待が既に受諾されている |
| `EMAIL_ALREADY_EXISTS` | 409 | 認証側で重複 |
| `EMAIL_ALREADY_REGISTERED` | 409 | 既に登録済み（招待発行時） |
| `EMAIL_MISMATCH` | 400 | SSO 招待でメール不一致 |
| `EMAIL_SEND_FAILED` | 502 | Resend 等の送信失敗 |
| `INVALID_CREDENTIALS` | 401 | パスワード不一致 |
| `WEAK_PASSWORD` | 422 | パスワード要件未達 |
| `SAME_PASSWORD` | 422 | 新旧パスワードが同一 |
| `TERMS_NOT_AGREED` | 422 | 利用規約未同意 |
| `ACCOUNT_SUSPENDED` | 403 | アカウント停止中 |
| `ACCOUNT_DELETED` | 403 | アカウント退会済み |
| `OAUTH_FAILED` | 400 | Google OAuth 失敗 |
| `INVALID_FILE_TYPE` | 422 | マジックバイト不一致・許可外 MIME |
| `INVALID_FILE_PATH` | 400 | パス所有者不一致・横取り試行 |
| `INVALID_CONTENT_TYPE` | 422 | Content-Type が許可外 |
| `FILE_TOO_LARGE` | 413 | サイズ上限超過 |
| `INVALID_YOUTUBE_URL` | 422 | YouTube URL バリデーション失敗 |
| `VIDEO_NOT_ALLOWED` | 403 | admin 以外が動画添付 |
| `TOO_MANY_TAGS` | 422 | タグ 5個超 |
| `TOO_MANY_GENRES` | 422 | 販売ジャンル 5個超 |
| `TOO_MANY_ATTACHMENTS` | 422 | 添付ファイル数超過 |
| `MONTH_LOCKED` | 403 | 月末経過後の月次データを member が更新 |
| `URL_SCHEME_FORBIDDEN` | 422 | javascript: などの危険スキーム |
| `CHANNEL_NOT_FOUND` | 404 | 指定チャンネルが存在しない or 非アクティブ |
| `CHANNEL_ID_TAKEN` | 409 | チャンネル ID の重複 |
| `SELF_OPERATION_FORBIDDEN` | 403 | admin が自分自身の停止・退会・プラン変更を実行 |
| `FORM_NOT_CONFIGURED` | 500 | 環境変数が未設定 |
| `INTERNAL_ERROR` | 500 | その他想定外（Sentry に送信） |

エラーレスポンスのサンプル：

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "入力内容に誤りがあります",
    "details": {
      "fields": {
        "title": "1文字以上100文字以内で入力してください",
        "content": "本文は必須です"
      }
    }
  }
}
```

---

## 14. レート制限

実装方式：

- 認証済みユーザー：`user_id` + アクション種別をキーに、Supabase の関数（pg_cron + テーブル） or Upstash Redis でカウント
- 未認証：IP + アクション種別
- 超過時は `RATE_LIMITED` を返却。`details.retryAfter`（秒）を含める

### 14.1 制限値一覧

| アクション | 対象 | 上限 | ウィンドウ |
|---|---|---|---|
| 招待発行 (`adminCreateInvitation`) | admin | 10 | 1分 |
| 招待発行 | admin | 100 | 1時間 |
| 招待再送 (`adminResendInvitation`) | admin | 10 | 1時間 |
| 全体通知送信 (`adminSendBroadcast`) | admin | 5 | 1時間 |
| 投稿作成 (`createPost`) | member | 10 | 1時間 |
| お知らせコメント (`createAnnouncementComment`) | member | 30 | 1分 |
| 投稿コメント (`createPostComment`) | member | 30 | 1分 |
| いいね (`togglePostLike` / `toggleAnnouncementLike`) | member | 60 | 1分 |
| 検索 (`searchAll`) | 認証済 | 60 | 1分 |
| Magic Link 送信 (`sendMagicLink`) | 未認証 | 5 | 1時間（メール毎） |
| ログイン (`signInWithPassword`) | 未認証 | 5回失敗 | 15分ロック（メール毎） |
| 招待トークン検証 (`/api/invite/verify`) | 未認証 | 30 | 1分（IP毎） |
| 画像アップロード URL 取得 (`getImageUploadUrl`) | 認証済 | 30 | 1分 |
| プロフィール更新各種 | member | 20 | 1分 |

### 14.2 レート制限の優先度

MVP では以下を必須実装、それ以外はベストエフォート：

- ログイン失敗ロックアウト（既に Supabase Auth 機能）
- 招待発行・全体通知（admin 誤爆防止）
- コメント・いいね（スパム防止）

---

**仕様書の本文ここまで。**

この契約に従って Server Action / Route Handler を実装することで、MVP のすべての画面・機能が動作する状態を目指す。

次のアクション：
1. レビュー＆フィードバック
2. zod スキーマの実装（`lib/schemas/*.ts`）
3. Server Action / Route Handler の実装着手
4. RLS ポリシーとの整合確認（仕様書 §4 と本仕様の権限要件をマージ）
