import 'server-only';
import { APP_NAME, getSupportEmail } from '@/lib/email/config';
import {
  baseLayout,
  escapeHtml,
  formatJpDateTime,
  textFooter,
} from '@/lib/email/layout';
import type { EmailMessage } from '@/lib/email/send';

/** M-03 パスワード変更完了通知（notifications-and-emails.md §2.6）。 */
export function buildPasswordChangedEmail(params: {
  to: string;
  userName: string;
  changedAt: string;
  appUrl: string;
}): EmailMessage {
  const changedJp = formatJpDateTime(params.changedAt);
  const supportEmail = escapeHtml(getSupportEmail());

  const contentHtml = `
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  パスワードを変更しました
</p>

<p style="margin:0 0 16px 0;">
  ${escapeHtml(params.userName)} さん、こんにちは。
</p>

<p style="margin:0 0 16px 0;">
  ${escapeHtml(changedJp)} に、${escapeHtml(APP_NAME)} のパスワードが変更されました。
</p>

<p style="margin:0 0 16px 0; padding:12px 16px; background-color:#faf5ed; border-left:4px solid #c05e3f; border-radius:8px; font-size:14px;">
  <strong>もしご本人による変更でない場合は、すぐに運営までご連絡ください。</strong><br>
  <a href="mailto:${supportEmail}" style="color:#c05e3f;">${supportEmail}</a>
</p>

<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  これまで通り ${escapeHtml(APP_NAME)} をご利用いただけます。
</p>`;

  const subject = 'パスワードが変更されました';
  const text = `パスワードを変更しました

${params.userName} さん、こんにちは。

${changedJp} に、${APP_NAME} のパスワードが変更されました。

もしご本人による変更でない場合は、すぐに運営までご連絡ください。
${getSupportEmail()}

これまで通り ${APP_NAME} をご利用いただけます。
${textFooter()}`;

  return {
    to: params.to,
    subject,
    html: baseLayout({
      subject,
      preheader: 'ご本人による変更でない場合は、すぐに運営までご連絡ください。',
      contentHtml,
      appUrl: params.appUrl,
    }),
    text,
    category: 'auth-password-changed',
    isTransactional: true,
  };
}
