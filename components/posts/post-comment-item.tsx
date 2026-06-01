'use client';

import { useTransition } from 'react';
import { deletePostComment } from '@/app/(app)/feed/actions';

export function PostCommentItem({
  commentId,
  postId,
  authorName,
  authorAvatar,
  body,
  createdAt,
  canDelete,
}: {
  commentId: string;
  postId: string;
  authorName: string;
  authorAvatar: string;
  body: string;
  createdAt: string;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex gap-3 border-b border-foreground/10 py-3 last:border-0">
      <span className="text-xl" aria-hidden>
        {authorAvatar}
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{authorName}</span>
          <time className="text-xs text-foreground/40">
            {new Date(createdAt).toLocaleDateString('ja-JP')}
          </time>
        </div>
        <p className="whitespace-pre-wrap text-base text-foreground/80">
          {body}
        </p>
        {canDelete && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm('このコメントを削除しますか？')) return;
              startTransition(async () => {
                await deletePostComment(commentId, postId);
              });
            }}
            className="mt-1 text-xs text-terracotta underline"
          >
            削除
          </button>
        )}
      </div>
    </li>
  );
}
