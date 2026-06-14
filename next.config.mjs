/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // オンプレ Docker デプロイ向けに最小ランタイムを出力する
  output: 'standalone',
  poweredByHeader: false,
  images: {
    // Supabase Storage / YouTube サムネイルを許可
    remotePatterns: [
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'i.ytimg.com' },
    ],
  },
};

export default nextConfig;
