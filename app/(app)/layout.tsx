import { requireMember } from '@/lib/auth';
import { countUnreadNotifications } from '@/lib/notifications/list';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { BetaBanner } from '@/components/layout/beta-banner';

/**
 * 認証後アプリの共通シェル。
 * requireMember() で未認証・非アクティブを /login へ弾く（認証ゲート）。
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireMember();
  const unreadCount = await countUnreadNotifications();

  return (
    <div className="flex min-h-screen flex-col">
      <BetaBanner />
      <AppHeader
        avatar={profile.avatar}
        userId={profile.id}
        unreadCount={unreadCount}
      />
      <main className="mx-auto w-full max-w-column flex-1 px-4 py-5">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
