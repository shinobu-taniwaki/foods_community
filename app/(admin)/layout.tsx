import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';

/** 管理者専用レイアウト。requireAdmin で member / 未認証を弾く。 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-navy text-cream">
        <div className="mx-auto flex h-14 max-w-column items-center justify-between px-4">
          <span className="font-serif text-lg">MCC 管理</span>
          <Link href="/announcements" className="text-sm underline">
            アプリへ戻る
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-column flex-1 px-4 py-5">
        {children}
      </main>
    </div>
  );
}
