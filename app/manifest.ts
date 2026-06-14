import type { MetadataRoute } from 'next';

/**
 * PWA マニフェスト（設計書 §14.2）
 * アイコン素材は public/icon-192.png / icon-512.png / icon-maskable.png。
 * 原本SVGと書き出し手順は public/brand/ と
 * .claude/plans/details/logo-favicon-brief.md を参照。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'マーケティングCampコミュニティ（MCC）',
    short_name: 'CAMP',
    description: '食品生産者のためのコミュニティ',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf5ed',
    theme_color: '#c05e3f',
    lang: 'ja',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
