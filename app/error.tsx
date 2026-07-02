'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * 500 エラー画面（dev-phases §3.5.10）。
 * エラー監視（Sentry）は DSN 取得後に captureException をここへ接続する。
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error('[app-error]', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
      <p aria-hidden className="text-6xl">
        ⚠️
      </p>
      <h1 className="text-2xl font-medium">エラーが発生しました</h1>
      <p className="max-w-sm text-base leading-relaxed text-foreground/70">
        申し訳ありません。うまく表示できませんでした。
        しばらく待ってから、もう一度お試しください。
      </p>
      <Button size="lg" onClick={reset}>
        もう一度試す
      </Button>
      <a href="/announcements" className="text-sm text-navy underline">
        ホームに戻る
      </a>
    </main>
  );
}
