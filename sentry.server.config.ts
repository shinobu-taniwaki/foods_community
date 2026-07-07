import * as Sentry from '@sentry/nextjs';

/** Sentry サーバー初期化。DSN 未設定の間は初期化しない = 完全無効。 */
const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
