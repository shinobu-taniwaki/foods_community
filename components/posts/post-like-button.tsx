'use client';

import { useState, useTransition } from 'react';
import { cn } from '@/lib/utils';
import { togglePostLike } from '@/app/(app)/feed/actions';

export function PostLikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={liked}
      onClick={() =>
        startTransition(async () => {
          const r = await togglePostLike(postId);
          if (r.ok) {
            setLiked(r.data.liked);
            setCount(r.data.likeCount);
          }
        })
      }
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
