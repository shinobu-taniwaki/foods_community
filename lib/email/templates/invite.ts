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

/** M-01 招待メール（notifications-and-emails.md §2.4）。 */
export function buildInviteEmail(params: {
  to: string;
  planLabel: string;
  planPrice: string;
  inviteUrl: string;
  expiresAt: string;
  appUrl: string;
}): EmailMessage {
  const expiresJp = formatJpDateTime(params.expiresAt);
  const planLabel = escapeHtml(params.planLabel);
  const planPrice = escapeHtml(params.planPrice);
  const inviteUrl = escapeHtml(params.inviteUrl);

  const contentHtml = `
<p style="margin:0 0 16px 0; font-size:18px; font-weight:700;">
  ${escapeHtml(APP_NAME)} へようこそ
</p>

<p style="margin:0 0 16px 0;">
  はじめまして。${escapeHtml(APP_NAME)} 運営の ${escapeHtml(OWNER_NAME)} です。
</p>

<p style="margin:0 0 16px 0;">
  食品生産者・職人のみなさまが、マーケティングの知見を共有し、励まし合える場として ${escapeHtml(APP_NAME)} を開いています。<br>
  このたび、あなたを <strong style="color:#c05e3f;">${planLabel}（${planPrice}）</strong> にてご招待いたします。
</p>

<p style="margin:0 0 8px 0;">
  下のボタンから、ご登録をお願いいたします。
</p>

${ctaButton(params.inviteUrl, 'ご登録に進む')}

<p style="margin:0 0 16px 0; font-size:14px; color:#5a5a5a;">
  ※ このリンクは <strong>${escapeHtml(expiresJp)} まで</strong>有効です。<br>
  ※ 期限を過ぎた場合は、運営までお気軽にご連絡ください。
</p>

<p style="margin:24px 0 8px 0; font-size:14px; color:#5a5a5a;">
  ボタンが押せない場合は、下のリンクをコピーしてブラウザで開いてください。
</p>
<p style="margin:0; font-size:13px; color:#5a5a5a; word-break:break-all;">
  <a href="${inviteUrl}" style="color:#c05e3f;">${inviteUrl}</a>
</p>

<p style="margin:32px 0 0 0; font-size:14px; color:#5a5a5a;">
  みなさまとお会いできることを、運営一同楽しみにしております。
</p>`;

  const subject = `${APP_SHORT_NAME} へのご招待が届いています（7日以内にご登録ください）`;
  const preheader = `${OWNER_NAME} さんから ${params.planLabel} で招待されました。ご登録は7日以内にお願いいたします。`;

  const text = `${APP_NAME} へようこそ

はじめまして。${APP_NAME} 運営の ${OWNER_NAME} です。

食品生産者・職人のみなさまが、マーケティングの知見を共有し、
励まし合える場として ${APP_NAME} を開いています。

このたび、あなたを ${params.planLabel}（${params.planPrice}）にてご招待いたします。

下のリンクから、ご登録をお願いいたします。

${params.inviteUrl}

※ このリンクは ${expiresJp} まで有効です。
※ 期限を過ぎた場合は、運営までお気軽にご連絡ください。

みなさまとお会いできることを、運営一同楽しみにしております。
${textFooter()}`;

  return {
    to: params.to,
    subject,
    html: baseLayout({ subject, preheader, contentHtml, appUrl: params.appUrl }),
    text,
    category: 'invite',
    isTransactional: true,
  };
}
