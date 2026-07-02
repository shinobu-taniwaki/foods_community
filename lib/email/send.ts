import 'server-only';
import { Resend } from 'resend';
import { getEmailEnv, getSupportEmail } from '@/lib/email/config';
import { getErrorMessage } from '@/lib/result';

/**
 * Resend 経由のメール送信コア（notifications-and-emails.md §7.4）。
 *
 * - RESEND_API_KEY 未設定なら送信せず false を返す（開発・キー未発行時）。
 * - 送信失敗でも throw しない best-effort（メールは主処理の並走扱い）。
 *   失敗はサーバーログに残す。
 */

/** Resend の既定レート制限（2 req/s）を超えないための送信間隔。 */
const SEND_INTERVAL_MS = 600;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  category: string;
  tags?: Array<{ name: string; value: string }>;
  /** 重複送信防止用の参照 ID（X-Entity-Ref-ID・§2.2）。 */
  refId?: string;
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
    // ヘッダー値は ASCII 前提のため件名は percent-encode（RFC 6068）
    const unsubscribeHeader = `<mailto:${getSupportEmail()}?subject=${encodeURIComponent('配信停止')}>`;
    const headers = {
      ...(message.refId ? { 'X-Entity-Ref-ID': message.refId } : {}),
      ...(message.isTransactional
        ? {}
        : { 'List-Unsubscribe': unsubscribeHeader }),
    };
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
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
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
 * Resend のレート制限（既定 2 req/s）を超えないよう送信間隔を空ける。
 * 数十名で数十秒かかるため、Server Action の応答を待たせず
 * fire-and-forget で呼ぶこと（呼び出し側参照）。
 * 失敗宛先はログに残し、送信成功数を返す。
 */
export async function sendEmailToMany(
  messages: EmailMessage[],
): Promise<number> {
  let sent = 0;
  for (const [index, message] of messages.entries()) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, SEND_INTERVAL_MS));
    }
    if (await sendEmail(message)) sent += 1;
  }
  return sent;
}
