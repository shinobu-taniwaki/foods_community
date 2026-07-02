import Link from 'next/link';
import { LinkButton } from '@/components/ui/link-button';

/** 404 ページ（dev-phases §3.5.10）。 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <p aria-hidden className="text-6xl">
        🔍
      </p>
      <h1 className="text-2xl font-medium">ページが見つかりません</h1>
      <p className="max-w-sm text-base leading-relaxed text-foreground/70">
        お探しのページは移動したか、削除された可能性があります。
        アドレスに間違いがないかご確認ください。
      </p>
      <LinkButton href="/announcements" size="lg">
        ホームに戻る
      </LinkButton>
      <Link href="/login" className="text-sm text-navy underline">
        ログイン画面へ
      </Link>
    </main>
  );
}
