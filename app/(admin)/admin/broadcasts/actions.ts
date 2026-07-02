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
  emailsSent: number | null;
}

/**
 * 全体通知の送信（notifications-and-emails.md §1.6 / §2.9）。
 * 全 active member（送信 admin 除く）へ admin_broadcast を配信し、
 * 「メール並走」選択時は M-06 メールも送信。監査ログに記録する。
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

  // メール並走（M-06）。送信失敗は sendEmailToMany 内でログ済み・通知自体は成功扱い。
  let emailsSent: number | null = null;
  if (parsed.data.emailParallel && isEmailEnabled()) {
    const appUrl = getSiteOrigin();
    const targets = await getEmailRecipients(recipientIds);
    emailsSent = await sendEmailToMany(
      targets.map((t) =>
        buildBroadcastEmail({
          to: t.email,
          userName: t.displayName,
          title: parsed.data.title,
          body: parsed.data.body,
          appUrl,
        }),
      ),
    );
  }

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'broadcast_sent',
    targetType: 'broadcast',
    payload: {
      title: parsed.data.title,
      recipients: recipientIds.length,
      emailParallel: parsed.data.emailParallel,
      emailsSent,
    },
  });

  return ok({ recipients: recipientIds.length, emailsSent });
}
