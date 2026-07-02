import 'server-only';
import { APP_NAME, getSupportEmail } from '@/lib/email/config';

/**
 * メール共通レイアウト（notifications-and-emails.md §2.3 / §3）。
 * すべてインライン CSS・table レイアウト（Gmail 等で <style> が剥がれるため）。
 */

/** ユーザー入力値を HTML に埋め込む前のエスケープ。 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 改行を <br> に変換（エスケープ済みテキスト用）。 */
export function nl2br(escapedText: string): string {
  return escapedText.replace(/\r?\n/g, '<br>');
}

/** ISO 文字列を「2026年6月2日 23:59」形式に整形（null は「無期限」）。 */
export function formatJpDateTime(iso: string | null): string {
  if (!iso) return '無期限';
  return new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Tokyo',
  });
}

/** CTA ボタン（§2.3 共通スタイル・高さ 48px 相当）。 */
export function ctaButton(url: string, label: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#c05e3f; border-radius:14px;">
      <a href="${escapeHtml(url)}"
         style="display:inline-block; padding:14px 28px; font-size:16px; font-weight:700; color:#ffffff; text-decoration:none; line-height:1;">
        ${escapeHtml(label)}
      </a>
    </td>
  </tr>
</table>`;
}

/** 共通レイアウトで本文 HTML を包む。 */
export function baseLayout(params: {
  subject: string;
  preheader: string;
  contentHtml: string;
  appUrl: string;
}): string {
  const supportEmail = escapeHtml(getSupportEmail());
  const appUrl = escapeHtml(params.appUrl);
  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(params.subject)}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#faf5ed; font-family: system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif; color:#2a2a2a;">
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
      ${escapeHtml(params.preheader)}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#faf5ed;">
      <tr>
        <td align="center" style="padding:24px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; background-color:#ffffff; border-radius:14px; border:1px solid #e4dccc;">
            <tr>
              <td style="padding:24px 24px 12px 24px; text-align:left; border-bottom:1px solid #e4dccc;">
                <div style="font-family: 'Noto Serif JP', serif; font-size:18px; font-weight:700; color:#c05e3f;">
                  ${escapeHtml(APP_NAME)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px; font-size:16px; line-height:1.8; color:#2a2a2a;">
                ${params.contentHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px 24px 24px; border-top:1px solid #e4dccc; font-size:13px; line-height:1.7; color:#5a5a5a;">
                <p style="margin:0 0 8px 0;">
                  このメールは ${escapeHtml(APP_NAME)} から自動送信されています。
                </p>
                <p style="margin:0 0 8px 0;">
                  お問い合わせ：<a href="mailto:${supportEmail}" style="color:#c05e3f; text-decoration:underline;">${supportEmail}</a>
                </p>
                <p style="margin:0;">
                  退会をご希望の方は、ログイン後に「設定 → 退会」からお手続きください。
                </p>
              </td>
            </tr>
          </table>

          <div style="max-width:560px; padding:12px 8px 0 8px; font-size:12px; color:#7a7a7a; text-align:center;">
            <a href="${appUrl}/legal/terms" style="color:#7a7a7a; text-decoration:underline;">利用規約</a>
            &nbsp;|&nbsp;
            <a href="${appUrl}/legal/privacy" style="color:#7a7a7a; text-decoration:underline;">プライバシーポリシー</a>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** text 版メールの共通フッター。 */
export function textFooter(): string {
  return `\n----\n${APP_NAME}\nお問い合わせ：${getSupportEmail()}`;
}
