import Link from 'next/link';
import { BetaBanner } from '@/components/layout/beta-banner';

/** 未ログイン画面（ログイン・招待受諾）の共通レイアウト。ナビなし。 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <BetaBanner />
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex h-14 max-w-column items-center px-4">
          <Link href="/" className="font-serif text-lg text-terracotta">
            マーケティングCampコミュニティ
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-column flex-1 px-4 py-8">
        {children}
      </main>
    </div>
  );
}
