import { z } from 'zod';

/** ZodError をフィールド単位のエラーメッセージ（{ field: message }）に変換。 */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in fields)) fields[key] = issue.message;
  }
  return fields;
}

/** メールアドレス（前後空白除去）。 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'メールアドレスを入力してください')
  .email('メールアドレスの形式が正しくありません');

/** パスワード: 8文字以上、英字と数字を含む（設計書 §16.1）。 */
export const passwordSchema = z
  .string()
  .min(8, 'パスワードは8文字以上にしてください')
  .max(72, 'パスワードが長すぎます')
  .refine((v) => /[A-Za-z]/.test(v) && /[0-9]/.test(v), {
    message: '英字と数字をそれぞれ含めてください',
  });

/** 招待トークン: 64文字の英数字。 */
export const inviteTokenSchema = z
  .string()
  .trim()
  .length(64, '招待トークンが不正です')
  .regex(/^[A-Za-z0-9]+$/, '招待トークンが不正です');

/**
 * 公開 URL。https のみ許可し javascript: などの危険スキームを拒否（設計書 §16.3）。
 * 空文字・null は許容（任意項目用）。
 */
export const httpsUrlSchema = z
  .string()
  .trim()
  .url('URL の形式が正しくありません')
  .refine((v) => v.startsWith('https://'), {
    message: 'URL は https:// で始めてください',
  });

/** 任意の https URL（空なら null に正規化）。 */
export const optionalHttpsUrlSchema = z
  .union([httpsUrlSchema, z.literal('')])
  .nullish()
  .transform((v) => (v ? v : null));

/** 'YYYY-MM' 月フォーマット。 */
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, '月の形式は YYYY-MM です');

/** 絵文字 1〜数コードポイント（アバター用の簡易チェック）。 */
export const emojiSchema = z
  .string()
  .trim()
  .min(1, '絵文字を選択してください')
  .max(8, '絵文字を1つ選択してください');
