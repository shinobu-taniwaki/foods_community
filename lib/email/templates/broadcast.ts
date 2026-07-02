import 'server-only';
import { APP_NAME, APP_SHORT_NAME, OWNER_NAME } from '@/lib/email/config';
import {
  baseLayout,
  ctaButton,
  escapeHtml,
  nl2br,
  textFooter,
} from '@/lib/email/layout';
import type { EmailMessage } from '@/lib/email/send';

const PREHEADER_MAX = 100;

/** M-06 全体通知メール（notifications-and-emails.md §2.9）。 */
export function buildBroadcastEmail(params: {
  to: string;
  userName: string;
  title: string;
  body: string;
  appUrl: string;
}): EmailMessage {
  const ctaUrl = `${params.appUrl}/notifications`;
  const preheader = params.body
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PREHEADER_MAX);

  const contentHtml = `
<p style="margin:0 0 16px 0; font-size:20px; font-weight:700;">
  ${escapeHtml(params.title)}
</p>

<p style="margin:0 0 16px 0;">
  ${escapeHtml(params.userName)} さん、こんにちは。
</p>

<div style="margin:0 0 24px 0; font-size:16px; line-height:1.8;">
  ${nl2br(escapeHtml(params.body))}
</div>

${ctaButton(ctaUrl, `${APP_SHORT_NAME} で詳しく見る`)}

<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  ${escapeHtml(OWNER_NAME)}（${escapeHtml(APP_NAME)} 運営）
</p>`;

  const text = `${params.title}

${params.userName} さん、こんにちは。

${params.body}

${APP_SHORT_NAME} で詳しく見る：
${ctaUrl}
${textFooter()}`;

  return {
    to: params.to,
    subject: params.title,
    html: baseLayout({
      subject: params.title,
      preheader,
      contentHtml,
      appUrl: params.appUrl,
    }),
    text,
    category: 'broadcast',
  };
}
