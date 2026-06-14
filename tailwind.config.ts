import type { Config } from 'tailwindcss';

/**
 * MCC デザイントークン
 * 設計書 §1.1 デザイン指針に準拠。
 * - 50代向けに文字サイズは標準より大きめ、コントラスト確保
 * - 角丸 14px 基本（紙の質感）、影はほぼ使わない
 */
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ブランドカラー（§1.1）
        cream: '#faf5ed',
        terracotta: '#c05e3f',
        mustard: '#d9a43d',
        olive: '#5a6b42',
        navy: '#3f5a6b',
        // セマンティックな別名
        background: '#faf5ed',
        foreground: '#33312e',
      },
      fontFamily: {
        // 見出し: Noto Serif JP / 本文: Zen Kaku Gothic Antique
        serif: ['var(--font-noto-serif-jp)', 'serif'],
        sans: ['var(--font-zen-kaku)', 'sans-serif'],
      },
      borderRadius: {
        // 紙の質感を出す基本角丸
        DEFAULT: '14px',
        card: '14px',
      },
      fontSize: {
        // 50代向けに base を 17px に引き上げ
        base: ['1.0625rem', { lineHeight: '1.75rem' }],
        lg: ['1.1875rem', { lineHeight: '1.85rem' }],
      },
      maxWidth: {
        // デスクトップは中央 640px カラム
        column: '640px',
      },
      boxShadow: {
        // 影は極淡のみ
        soft: '0 1px 3px rgba(51, 49, 46, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
