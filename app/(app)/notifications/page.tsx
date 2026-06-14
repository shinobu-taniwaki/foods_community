import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { requireMember } from '@/lib/auth';
import { listNotifications } from '@/lib/notifications/list';
import { NotificationList } from './notification-list';

export const metadata: Metadata = { title: '通知' };

export default async function NotificationsPage() {
  await requireMember();
  const items = await listNotifications();

  return (
    <div className="space-y-5">
      <Heading level={1}>通知</Heading>
      <NotificationList items={items} />
    </div>
  );
}
