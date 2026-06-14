'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { toggleAnnouncementLike } from '@/app/(app)/announcements/actions';

interface LikeButtonProps {
  contentId: string;
  initialLiked: boolean;
  initialCount: number;
}

export function LikeButton({
  contentId,
  initialLiked,
  initialCount,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      const result = await toggleAnnouncementLike(contentId);
      if (result.ok) {
        setLiked(result.data.liked);
        setCount(result.data.likeCount);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={liked}
      className={cn(
        'flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-base',
        liked
          ? 'border-terracotta bg-terracotta/10 text-terracotta'
          : 'border-foreground/20 text-foreground/70',
      )}
    >
      <span aria-hidden>{liked ? '❤️' : '🤍'}</span>
      いいね {count}
    </button>
  );
}
