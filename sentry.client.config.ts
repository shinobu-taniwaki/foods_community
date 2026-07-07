import * as Sentry from '@sentry/nextjs';

/**
 * Sentry クライアント初期化（dev-phases §3.5.11）。
 * DSN 未設定（アカウント未作成）の間は初期化しない = 完全無効。
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // 50名規模のためエラーは全件送信。パフォーマンス計測は控えめに。
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
