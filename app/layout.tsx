import type { Metadata, Viewport } from 'next';
import { Noto_Serif_JP, Zen_Kaku_Gothic_Antique } from 'next/font/google';
import './globals.css';

// 見出し用フォント
const notoSerifJp = Noto_Serif_JP({
  weight: ['700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-serif-jp',
  preload: false,
});

// 本文用フォント
const zenKaku = Zen_Kaku_Gothic_Antique({
  weight: ['400', '500'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-zen-kaku',
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: 'マーケティングCampコミュニティ（MCC）',
    template: '%s | MCC',
  },
  description: '食品生産者・職人のためのマーケティング学習コミュニティ',
  applicationName: 'MCC',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MCC',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#c05e3f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${notoSerifJp.variable} ${zenKaku.variable}`}>
      <body>{children}</body>
    </html>
  );
}
