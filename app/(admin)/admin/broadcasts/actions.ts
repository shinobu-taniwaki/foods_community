'use server';

import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { writeAuditLog } from '@/lib/audit';
import { zodFieldErrors } from '@/lib/validation/common';
import { ok, err, getErrorMessage, type Result } from '@/lib/result';
import { notifyAdminBroadcast } from '@/lib/notifications/dispatch';

const broadcastSchema = z.object({
  title: z.string().trim().min(1, 'タイトルを入力してください').max(100),
  body: z.string().trim().min(1, '本文を入力してください').max(500),
});

export interface BroadcastResult {
  recipients: number;
}

/**
 * 全体通知の送信（notifications-and-emails.md §1.6 / dev-phases §3.5.2）。
 * 全 active member（送信 admin 除く）へ admin_broadcast を配信し、監査ログに記録する。
 */
export async function sendBroadcast(
  _prev: Result<BroadcastResult> | null,
  formData: FormData,
): Promise<Result<BroadcastResult>> {
  const admin = await requireAdmin();

  const parsed = broadcastSchema.safeParse({
    title: formData.get('title'),
    body: formData.get('body'),
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  let recipients = 0;
  try {
    recipients = await notifyAdminBroadcast({
      title: parsed.data.title,
      body: parsed.data.body,
      adminId: admin.id,
    });
  } catch (error: unknown) {
    return err('INTERNAL', undefined, { cause: getErrorMessage(error) });
  }

  await writeAuditLog({
    actorId: admin.id,
    actionType: 'broadcast_sent',
    targetType: 'broadcast',
    payload: { title: parsed.data.title, recipients },
  });

  return ok({ recipients });
}
