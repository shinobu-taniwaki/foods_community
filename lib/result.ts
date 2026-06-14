/**
 * Server Action の共通レスポンス型（api-endpoints.md §1.5）。
 * 成功は { ok: true, data }、失敗は { ok: false, error } で表現する。
 */

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'INVITATION_INVALID'
  | 'EMAIL_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'TERMS_NOT_AGREED'
  | 'EMAIL_MISMATCH'
  | 'OAUTH_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_DELETED'
  | 'SAME_PASSWORD'
  | 'URL_SCHEME_FORBIDDEN'
  | 'TOO_MANY_GENRES'
  | 'TOO_MANY_ATTACHMENTS'
  | 'INVALID_FILE_PATH'
  | 'INVALID_FILE_TYPE'
  | 'FILE_TOO_LARGE'
  | 'INVALID_CONTENT_TYPE'
  | 'INVALID_YOUTUBE_URL'
  | 'DUPLICATE_MONTH'
  | 'SELF_OPERATION_FORBIDDEN'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'INVITATION_ALREADY_ACCEPTED'
  | 'CHANNEL_ID_TAKEN'
  | 'GENRE_ID_TAKEN'
  | 'INTERNAL';

export interface ResultError {
  code: ErrorCode;
  message: string;
  details?: {
    fields?: Record<string, string>;
    cause?: string;
  };
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: ResultError };

/** 各エラーコードのユーザー向けデフォルト日本語メッセージ。 */
const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  UNAUTHORIZED: 'ログインが必要です。',
  FORBIDDEN: 'この操作を行う権限がありません。',
  NOT_FOUND: '対象が見つかりませんでした。',
  VALIDATION_FAILED: '入力内容を確認してください。',
  RATE_LIMITED: '操作が多すぎます。しばらく待ってからお試しください。',
  INVITATION_INVALID: '招待リンクが無効か、有効期限が切れています。',
  EMAIL_ALREADY_EXISTS: 'このメールアドレスは既に登録されています。',
  WEAK_PASSWORD: 'パスワードは8文字以上で、英字と数字を含めてください。',
  TERMS_NOT_AGREED: '利用規約・プライバシーポリシーへの同意が必要です。',
  EMAIL_MISMATCH: '招待されたメールアドレスと一致しません。',
  OAUTH_FAILED: 'Google での認証に失敗しました。',
  INVALID_CREDENTIALS: 'メールアドレスまたはパスワードが正しくありません。',
  ACCOUNT_SUSPENDED:
    'アカウントは現在停止されています。運営にお問い合わせください。',
  ACCOUNT_DELETED: 'このアカウントは退会済みです。',
  SAME_PASSWORD: '現在のパスワードと異なるパスワードを設定してください。',
  URL_SCHEME_FORBIDDEN: 'URL は https:// で始まる必要があります。',
  TOO_MANY_GENRES: '販売ジャンルは最大5個までです。',
  TOO_MANY_ATTACHMENTS: '添付できる数を超えています。',
  INVALID_FILE_PATH: 'ファイルの保存先が不正です。',
  INVALID_FILE_TYPE: '対応していない画像形式です（JPEG / PNG / WebP）。',
  FILE_TOO_LARGE: 'ファイルサイズが大きすぎます。',
  INVALID_CONTENT_TYPE: '対応していない形式です。',
  INVALID_YOUTUBE_URL: 'YouTube の URL を正しく入力してください。',
  DUPLICATE_MONTH: 'この月のデータはすでにあります。編集してください。',
  SELF_OPERATION_FORBIDDEN: '自分自身に対しては実行できません。',
  EMAIL_ALREADY_REGISTERED: 'このメールアドレスは既に登録されています。',
  INVITATION_ALREADY_ACCEPTED: 'この招待は既に受諾済みです。',
  CHANNEL_ID_TAKEN: 'このチャンネルIDは既に使われています。',
  GENRE_ID_TAKEN: 'このジャンルIDは既に使われています。',
  INTERNAL: '予期しないエラーが発生しました。時間をおいてお試しください。',
};

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function err(
  code: ErrorCode,
  message?: string,
  details?: ResultError['details'],
): Result<never> {
  return {
    ok: false,
    error: { code, message: message ?? DEFAULT_MESSAGES[code], details },
  };
}

/** unknown なエラーから安全にメッセージを取り出す。 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return '不明なエラー';
}
