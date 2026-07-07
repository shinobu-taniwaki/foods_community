import 'server-only';
import { APP_NAME, APP_SHORT_NAME, OWNER_NAME } from '@/lib/email/config';
import {
  baseLayout,
  ctaButton,
  escapeHtml,
  formatJpDateTime,
  textFooter,
} from '@/lib/email/layout';
import type { EmailMessage } from '@/lib/email/send';

/**
 * M-07 一時停止 / M-08 退会完了 / M-09 復活（notifications-and-emails.md §2.10〜2.12）。
 * 停止・退会中はログイン不可のため、メールが本人への主導線になる。
 */

/** M-07 一時停止通知。 */
export function buildSuspendedEmail(params: {
  to: string;
  userName: string;
  suspendedUntil: string | null;
  reason: string;
  appUrl: string;
  inquiryUrl?: string;
}): EmailMessage {
  const untilJp = formatJpDateTime(params.suspendedUntil);
  const reason = params.reason.trim() || '運営判断のため';
  const inquiry = params.inquiryUrl?.trim();

  const contentHtml = `
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  アカウントを一時停止いたしました
</p>

<p style="margin:0 0 16px 0;">
  ${escapeHtml(params.userName)} さん
</p>

<p style="margin:0 0 16px 0;">
  このたびは恐れ入りますが、下記の通り ${escapeHtml(APP_NAME)} のアカウントを一時的に停止させていただきました。
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin:16px 0; background-color:#faf5ed; border-radius:8px;">
  <tr>
    <td style="padding:16px;">
      <p style="margin:0 0 8px 0; font-size:14px; color:#5a5a5a;">停止期間</p>
      <p style="margin:0 0 16px 0; font-size:16px; font-weight:700;">${escapeHtml(untilJp)} まで</p>
      <p style="margin:0 0 8px 0; font-size:14px; color:#5a5a5a;">理由</p>
      <p style="margin:0; font-size:15px;">${escapeHtml(reason)}</p>
    </td>
  </tr>
</table>

<p style="margin:0 0 16px 0;">
  停止期間が過ぎますと、自動的にご利用いただけるようになります。
</p>

<p style="margin:0 0 16px 0;">
  ご不明な点や、誤りがあると感じられる場合は、運営までお問い合わせください。
</p>
${inquiry ? ctaButton(inquiry, '運営に問い合わせる') : ''}
<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  ${escapeHtml(OWNER_NAME)}（${escapeHtml(APP_NAME)} 運営）
</p>`;

  const subject = 'アカウントを一時停止いたしました';
  const text = `アカウントを一時停止いたしました

${params.userName} さん

このたびは恐れ入りますが、下記の通り ${APP_NAME} のアカウントを
一時的に停止させていただきました。

停止期間：${untilJp} まで
理由：${reason}

停止期間が過ぎますと、自動的にご利用いただけるようになります。

ご不明な点や、誤りがあると感じられる場合は、運営までお問い合わせください。
${inquiry ? `\n${inquiry}\n` : ''}${textFooter()}`;

  return {
    to: params.to,
    subject,
    html: baseLayout({
      subject,
      preheader: `${untilJp} まで利用を停止しています。`,
      contentHtml,
      appUrl: params.appUrl,
    }),
    text,
    category: 'account-suspended',
  };
}

/** M-08 退会処理完了通知。 */
export function buildDeletedEmail(params: {
  to: string;
  userName: string;
  deletedAt: string;
  appUrl: string;
}): EmailMessage {
  const deletedJp = formatJpDateTime(params.deletedAt);

  const contentHtml = `
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  退会のお手続きが完了いたしました
</p>

<p style="margin:0 0 16px 0;">
  ${escapeHtml(params.userName)} さん
</p>

<p style="margin:0 0 16px 0;">
  ${escapeHtml(deletedJp)} をもちまして、${escapeHtml(APP_NAME)} の退会処理が完了いたしました。<br>
  これまでご利用いただき、本当にありがとうございました。
</p>

<p style="margin:0 0 16px 0; padding:12px 16px; background-color:#faf5ed; border-radius:8px; font-size:14px; color:#5a5a5a;">
  ※ これまでの投稿・コメントは、コミュニティの記録として
  「（退会したメンバー）」の表記でしばらく残ります。<br>
  ※ 個人情報の取り扱いについては、プライバシーポリシーをご確認ください。
</p>

<p style="margin:0 0 16px 0;">
  またご縁がありましたら、いつでもお気軽にお声がけください。
</p>

<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  ${escapeHtml(OWNER_NAME)}（${escapeHtml(APP_NAME)} 運営）
</p>`;

  const subject = '退会のお手続きが完了いたしました';
  const text = `退会のお手続きが完了いたしました

${params.userName} さん

${deletedJp} をもちまして、${APP_NAME} の退会処理が完了いたしました。
これまでご利用いただき、本当にありがとうございました。

※ これまでの投稿・コメントは、コミュニティの記録として
   「（退会したメンバー）」の表記でしばらく残ります。
※ 個人情報の取り扱いについては、プライバシーポリシーをご確認ください。

またご縁がありましたら、いつでもお気軽にお声がけください。
${textFooter()}`;

  return {
    to: params.to,
    subject,
    html: baseLayout({
      subject,
      preheader: 'これまでご利用いただきありがとうございました。',
      contentHtml,
      appUrl: params.appUrl,
    }),
    text,
    category: 'account-deleted',
  };
}

/** M-09 復活通知。 */
export function buildRestoredEmail(params: {
  to: string;
  userName: string;
  restoredAt: string;
  appUrl: string;
}): EmailMessage {
  const restoredJp = formatJpDateTime(params.restoredAt);
  const loginUrl = `${params.appUrl}/login`;

  const contentHtml = `
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  アカウントが再びご利用いただけるようになりました
</p>

<p style="margin:0 0 16px 0;">
  ${escapeHtml(params.userName)} さん
</p>

<p style="margin:0 0 16px 0;">
  ${escapeHtml(restoredJp)} に、${escapeHtml(APP_NAME)} のアカウントが復活いたしました。<br>
  これまで通り、ログインしてご利用いただけます。
</p>

${ctaButton(loginUrl, 'ログインする')}

<p style="margin:24px 0 0 0; font-size:14px; color:#5a5a5a;">
  またお会いできて、運営一同とても嬉しく思います。
</p>

<p style="margin:8px 0 0 0; font-size:14px; color:#5a5a5a;">
  ${escapeHtml(OWNER_NAME)}（${escapeHtml(APP_NAME)} 運営）
</p>`;

  const subject = 'アカウントが再びご利用いただけるようになりました';
  const text = `アカウントが再びご利用いただけるようになりました

${params.userName} さん

${restoredJp} に、${APP_NAME} のアカウントが復活いたしました。
これまで通り、ログインしてご利用いただけます。

ログインはこちらから：
${loginUrl}

またお会いできて、運営一同とても嬉しく思います。
${textFooter()}`;

  return {
    to: params.to,
    subject,
    html: baseLayout({
      subject,
      preheader: `${APP_SHORT_NAME} へお戻りいただき、ありがとうございます。`,
      contentHtml,
      appUrl: params.appUrl,
    }),
    text,
    category: 'account-restored',
  };
}
