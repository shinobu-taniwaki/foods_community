'use server';

import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { zodFieldErrors } from '@/lib/validation/common';
import { ok, err, getErrorMessage, type Result } from '@/lib/result';
import { notifyAdminBroadcast } from '@/lib/notifications/dispatch';
import { getSiteOrigin } from '@/lib/site';
import { sendEmailToMany, isEmailEnabled } from '@/lib/email/send';
import { getEmailRecipients } from '@/lib/email/recipients';
import { buildBroadcastEmail } from '@/lib/email/templates/broadcast';

const broadcastSchema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください').max(100),
  body: z.string().trim().min(1, '本文を入力してください').max(500),
  emailParallel: z.boolean(),
});

export interface BroadcastResult {
  recipients: number;
  /** メール並走の対象者数（並走なし/送信不可なら null）。送信自体は非同期。 */
  emailTargets: number | null;
}

/**
 * 全体通知の送信（notifications-and-emails.md §1.6 / §2.9）。
 * 全 active member（送信 admin 除く）へ admin_broadcast を配信し、監査ログに記録。
 * 「メール並走」選択時は M-06 メールをバックグラウンドで順次送信する
 * （レート制御のため数十秒かかることがあり、応答は待たせない）。
 */
export async function sendBroadcast(
  _prev: Result<BroadcastResult> | null,
  formData: FormData,
): Promise<Result<BroadcastResult>> {
  const admin = await requireAdmin();

  const parsed = broadcastSchema.safeParse({
    title: formData.get('title'),
    body: formData.get('body'),
    emailParallel: formData.get('emailParallel') === 'on',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  let recipientIds: string[] = [];
  try {
    recipientIds = await notifyAdminBroadcast({
      title: parsed.data.title,
      body: parsed.data.body,
      adminId: admin.id,
    });
  } catch (error: unknown) {
    return err('INTERNAL', undefined, { cause: getErrorMessage(error) });
  }

  const shouldSendEmail = parsed.data.emailParallel && isEmailEnabled();
  const broadcastRefId = crypto.randomUUID();

  // 監査ログは通知 INSERT の直後に記録（メール送信の失敗・切断で失われないように）
  await writeAuditLog({
    actorId: admin.id,
    actionType: 'broadcast_sent',
    targetType: 'broadcast',
    payload: {
      title: parsed.data.title,
      recipients: recipientIds.length,
      emailParallel: shouldSendEmail,
      broadcastRefId,
    },
  });

  // メール並走（M-06）。fire-and-forget（結果はサーバーログで確認）。
  let emailTargets: number | null = null;
  if (shouldSendEmail) {
    const appUrl = getSiteOrigin();
    const targets = await getEmailRecipients(recipientIds);
    emailTargets = targets.length;
    void sendEmailToMany(
      targets.map((t) =>
        buildBroadcastEmail({
          to: t.email,
          userName: t.displayName,
          title: parsed.data.title,
          body: parsed.data.body,
          appUrl,
          refId: broadcastRefId,
        }),
      ),
    ).then((sent) => {
      console.error('[broadcast] メール並走の送信完了', {
        broadcastRefId,
        targets: targets.length,
        sent,
      });
    });
  }

  return ok({ recipients: recipientIds.length, emailTargets });
}
