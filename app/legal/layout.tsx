import Link from 'next/link';

/** 法務ページ（規約・プライバシー）の共通レイアウト。公開・ナビなし。 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex h-14 max-w-column items-center px-4">
          <Link href="/" className="font-serif text-lg text-terracotta">
            マーケティングCampコミュニティ
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-column px-4 py-8">{children}</main>
    </div>
  );
}
