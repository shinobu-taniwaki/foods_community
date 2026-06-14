'use client';

import { useTransition } from 'react';
import { deleteAnnouncementComment } from '@/app/(app)/announcements/actions';

interface CommentItemProps {
  commentId: string;
  contentId: string;
  authorName: string;
  authorAvatar: string;
  body: string;
  createdAt: string;
  canDelete: boolean;
}

export function CommentItem({
  commentId,
  contentId,
  authorName,
  authorAvatar,
  body,
  createdAt,
  canDelete,
}: CommentItemProps) {
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    if (!confirm('このコメントを削除しますか？')) return;
    startTransition(async () => {
      await deleteAnnouncementComment(commentId, contentId);
    });
  };

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
            onClick={onDelete}
            disabled={pending}
            className="mt-1 text-xs text-terracotta underline"
          >
            削除
          </button>
        )}
      </div>
    </li>
  );
}
