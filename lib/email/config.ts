import 'server-only';
import { z } from 'zod';

/**
 * メール送信まわりの環境変数と固定文言（notifications-and-emails.md §0.3 / §7.3）。
 *
 * RESEND_API_KEY 未設定の環境（ローカル開発・キー未発行）ではメール送信を
 * 丸ごと無効化する。招待はリンクコピーでの手動共有にフォールバックする。
 */

export const APP_NAME = 'マーケティングCampコミュニティ';
export const APP_SHORT_NAME = 'MCC';
export const OWNER_NAME = 'しのぶ';

const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM_EMAIL: z
    .string()
    .email('RESEND_FROM_EMAIL は有効なメールアドレスである必要があります'),
  RESEND_FROM_NAME: z.string().min(1).default(APP_NAME),
  RESEND_REPLY_TO: z.string().email().optional(),
});

export type EmailEnv = z.infer<typeof emailEnvSchema>;

/**
 * メール送信が有効な場合のみ検証済み環境変数を返す。
 * RESEND_API_KEY が空なら null（= メール送信スキップ）。
 * 部分的な設定ミス（キーはあるが FROM が不正等）も throw せず null を返す。
 * メールは常に主処理の並走（best-effort）であり、設定不備で
 * 停止・退会・パスワード変更などの主処理を巻き込んで落とさないため。
 */
export function getEmailEnv(): EmailEnv | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  const parsed = emailEnvSchema.safeParse({
    RESEND_API_KEY: apiKey,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    RESEND_FROM_NAME: process.env.RESEND_FROM_NAME || undefined,
    RESEND_REPLY_TO: process.env.RESEND_REPLY_TO || undefined,
  });
  if (!parsed.success) {
    console.error('[email] 環境変数が不正なため送信を無効化します', {
      issues: parsed.error.issues.map((i) => i.message),
    });
    return null;
  }
  return parsed.data;
}

/** サポート窓口メール（フッター表記用）。REPLY_TO → FROM の順でフォールバック。 */
export function getSupportEmail(): string {
  const env = getEmailEnv();
  return (
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() ||
    env?.RESEND_REPLY_TO ||
    env?.RESEND_FROM_EMAIL ||
    'support@example.com'
  );
}
