import Link from 'next/link';
import { BrandLogo } from './brand-logo';
import { NotificationBadge } from './notification-badge';

interface AppHeaderProps {
  avatar: string;
  userId: string;
  unreadCount?: number;
}

/** グローバルヘッダー（設計書 §6.3 / screens §1.2）。左:アプリ名 右:検索・通知・プロフ。 */
export function AppHeader({ avatar, userId, unreadCount = 0 }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-foreground/10 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-column items-center justify-between px-4">
        <Link
          href="/announcements"
          aria-label="マーケティングCampコミュニティ ホーム"
          className="flex items-center"
        >
          <BrandLogo width={120} priority className="h-8 w-auto" />
        </Link>
        <nav className="flex items-center gap-1" aria-label="ヘッダー操作">
          <Link
            href="/search"
            aria-label="検索"
            className="flex h-11 w-11 items-center justify-center rounded text-xl hover:bg-foreground/5"
          >
            🔍
          </Link>
          <Link
            href="/notifications"
            aria-label="通知"
            className="relative flex h-11 w-11 items-center justify-center rounded text-xl hover:bg-foreground/5"
          >
            🔔
            <NotificationBadge initialCount={unreadCount} userId={userId} />
          </Link>
          <Link
            href="/me"
            aria-label="マイページ"
            className="flex h-11 w-11 items-center justify-center rounded text-xl hover:bg-foreground/5"
          >
            {avatar}
          </Link>
        </nav>
      </div>
    </header>
  );
}
