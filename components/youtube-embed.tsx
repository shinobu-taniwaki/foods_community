'use client';

import { useState } from 'react';
import { isValidVideoId } from '@/lib/youtube';

interface YoutubeEmbedProps {
  videoId: string;
  title?: string;
}

/**
 * YouTube 埋め込み（設計書 §11.3）。
 * サムネイル表示 → タップで iframe を遅延ロード（sandbox 付き）。
 */
export function YoutubeEmbed({ videoId, title = '動画' }: YoutubeEmbedProps) {
  const [playing, setPlaying] = useState(false);
  if (!isValidVideoId(videoId)) return null;

  if (!playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="relative block w-full overflow-hidden rounded"
        aria-label={`${title}を再生`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
          alt={title}
          className="aspect-video w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-2xl text-white">
            ▶
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
        title={title}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-presentation"
      />
    </div>
  );
}
