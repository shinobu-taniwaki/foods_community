import 'server-only';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * メール宛先の解決。
 * メールアドレスは profiles に持たせていないため auth.users から引く（service_role）。
 */

export interface EmailRecipient {
  userId: string;
  email: string;
  displayName: string;
}

/** 1 ユーザーの宛先（email + 表示名）。見つからなければ null。 */
export async function getEmailRecipient(
  userId: string,
): Promise<EmailRecipient | null> {
  const admin = createAdminClient();
  const [{ data: userData }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
  ]);
  const email = userData?.user?.email;
  if (!email) return null;
  return {
    userId,
    email,
    displayName: profile?.display_name ?? 'メンバー',
  };
}

/**
 * 複数ユーザーの宛先をまとめて解決（全体通知用）。
 * auth.users は listUsers で一括取得（β規模 2,000 名まで想定・1000件/頁）。
 */
export async function getEmailRecipients(
  userIds: string[],
): Promise<EmailRecipient[]> {
  if (userIds.length === 0) return [];
  const admin = createAdminClient();

  const emailById = new Map<string, string>();
  for (let page = 1; page <= 5; page += 1) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    for (const user of data.users) {
      if (user.email) emailById.set(user.id, user.email);
    }
    if (data.users.length < 1000) break;
  }

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name')
    .in('id', userIds);
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name] as const),
  );

  return userIds.flatMap((userId) => {
    const email = emailById.get(userId);
    if (!email) return [];
    return [
      {
        userId,
        email,
        displayName: nameById.get(userId) ?? 'メンバー',
      },
    ];
  });
}
