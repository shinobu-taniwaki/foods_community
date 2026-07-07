import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // オンプレ Docker デプロイ向けに最小ランタイムを出力する
  output: 'standalone',
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // 投稿画像（圧縮後 最大3枚 × ~1.5MB）を FormData で受けるため引き上げ
      // （Nginx 側の client_max_body_size は 10M）
      bodySizeLimit: '8mb',
    },
  },
  images: {
    // Supabase Storage / YouTube サムネイルを許可
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
};

// Sentry は DSN 設定時のみ有効（sentry.*.config.ts / instrumentation.ts 参照）。
// ソースマップのアップロードは SENTRY_AUTH_TOKEN 取得後に有効化する。
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: true },
});
