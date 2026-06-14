'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/lib/notifications/list';
import { markNotificationRead, markAllNotificationsRead } from './actions';

/** 通知種別ごとのアイコン（notifications-and-emails.md §1.1）。 */
const TYPE_ICON: Record<string, string> = {
  new_post: '📝',
  new_announcement: '📣',
  comment_on_my_post: '💬',
  like_on_my_post: '❤️',
  admin_broadcast: '📢',
  account_suspended: '⛔',
  account_deleted: '👋',
  account_restored: '🎉',
  post_edited_by_admin: '✏️',
  post_deleted_by_admin: '🗑️',
};

function formatJp(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 通知一覧（クリックで既読化＋遷移、すべて既読ボタン）。 */
export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasUnread = items.some((item) => !item.readAt);

  function open(item: NotificationItem) {
    startTransition(async () => {
      if (!item.readAt) await markNotificationRead(item.id);
      router.push(item.linkPath);
    });
  }

  function readAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  if (items.length === 0) {
    return (
      <Card className="text-center text-foreground/60">通知はまだありません。</Card>
    );
  }

  return (
    <div className="space-y-3">
      {hasUnread && (
        <div className="flex justify-end">
          <Button variant="ghost" size="md" onClick={readAll} disabled={isPending}>
            すべて既読にする
          </Button>
        </div>
      )}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => open(item)}
              disabled={isPending}
              className={cn(
                'flex w-full items-start gap-3 rounded-card border p-4 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta',
                'disabled:cursor-not-allowed disabled:opacity-60',
                item.readAt
                  ? 'border-foreground/10 bg-white/70'
                  : 'border-terracotta/30 bg-terracotta/5',
              )}
            >
              <span aria-hidden className="text-xl">
                {TYPE_ICON[item.type] ?? '🔔'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  {!item.readAt && (
                    <span
                      aria-label="未読"
                      className="h-2 w-2 shrink-0 rounded-full bg-terracotta"
                    />
                  )}
                  <span className="font-medium">{item.title}</span>
                </span>
                {item.body && (
                  <span className="mt-1 block line-clamp-2 text-sm text-foreground/70">
                    {item.body}
                  </span>
                )}
                <span className="mt-1 block text-xs text-foreground/40">
                  {formatJp(item.createdAt)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
