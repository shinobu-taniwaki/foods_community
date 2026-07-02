import 'server-only';
import { Resend } from 'resend';
import { getEmailEnv } from '@/lib/email/config';
import { getErrorMessage } from '@/lib/result';

/**
 * Resend 経由のメール送信コア（notifications-and-emails.md §7.4）。
 *
 * - RESEND_API_KEY 未設定なら送信せず false を返す（開発・キー未発行時）。
 * - 送信失敗でも throw しない best-effort（メールは主処理の並走扱い）。
 *   失敗はサーバーログに残す。
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  category: string;
  tags?: Array<{ name: string; value: string }>;
  /** 認証系（取引メール）は List-Unsubscribe を付けない（§2.2）。 */
  isTransactional?: boolean;
}

/** メール送信が構成されているか（UI の文言出し分けに使う）。 */
export function isEmailEnabled(): boolean {
  return getEmailEnv() !== null;
}

/** 1 通送信。送信できたら true。 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const env = getEmailEnv();
  if (!env) {
    console.warn('[email] RESEND_API_KEY 未設定のため送信をスキップ', {
      category: message.category,
    });
    return false;
  }

  try {
    const resend = new Resend(env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`,
      ...(env.RESEND_REPLY_TO ? { replyTo: env.RESEND_REPLY_TO } : {}),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      tags: [
        { name: 'category', value: message.category },
        ...(message.tags ?? []),
      ],
      ...(message.isTransactional
        ? {}
        : {
            headers: {
              'List-Unsubscribe': `<mailto:${env.RESEND_REPLY_TO ?? env.RESEND_FROM_EMAIL}?subject=配信停止>`,
            },
          }),
    });
    if (error) {
      console.error('[email] 送信失敗', {
        category: message.category,
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (error: unknown) {
    console.error('[email] 送信例外', {
      category: message.category,
      error: getErrorMessage(error),
    });
    return false;
  }
}

/**
 * 複数宛先へ順次送信（全体通知のメール並走用）。
 * 失敗宛先はログに残し、送信成功数を返す。
 */
export async function sendEmailToMany(
  messages: EmailMessage[],
): Promise<number> {
  let sent = 0;
  for (const message of messages) {
    if (await sendEmail(message)) sent += 1;
  }
  return sent;
}
