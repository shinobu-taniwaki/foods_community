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
    throw new Error(
      `メール環境変数の検証に失敗しました: ${parsed.error.issues
        .map((i) => i.message)
        .join(', ')}`,
    );
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
