import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { requireMember, getUser } from '@/lib/auth';
import { AccountForms } from './account-forms';

export const metadata: Metadata = { title: 'アカウント設定' };

export default async function AccountSettingsPage() {
  await requireMember();
  const user = await getUser();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading level={1}>アカウント設定</Heading>
        <Link href="/me/settings" className="text-sm text-navy underline">
          設定へ戻る
        </Link>
      </div>
      <AccountForms currentEmail={user?.email ?? ''} />
    </div>
  );
}
