'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * ルートレイアウト自体が壊れた場合の最終フォールバック（dev-phases §3.5.10）。
 * ここでは Tailwind やフォントに依存できないためインラインスタイルで表示する。
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error('[global-error]', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#faf5ed',
          color: '#2a2a2a',
          fontFamily:
            "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif",
        }}
      >
        <p aria-hidden style={{ fontSize: '56px', margin: 0 }}>
          ⚠️
        </p>
        <h1 style={{ fontSize: '22px', margin: 0 }}>エラーが発生しました</h1>
        <p style={{ fontSize: '16px', lineHeight: 1.8, maxWidth: '400px' }}>
          申し訳ありません。うまく表示できませんでした。
          しばらく待ってから、もう一度お試しください。
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: '48px',
            padding: '12px 28px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#ffffff',
            backgroundColor: '#c05e3f',
            border: 'none',
            borderRadius: '14px',
            cursor: 'pointer',
          }}
        >
          もう一度試す
        </button>
      </body>
    </html>
  );
}
