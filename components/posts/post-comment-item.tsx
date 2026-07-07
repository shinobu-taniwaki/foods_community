'use client';

import { useTransition } from 'react';
import { deletePostComment } from '@/app/(app)/feed/actions';
import { AdminBadge } from '@/components/posts/admin-badge';

export function PostCommentItem({
  commentId,
  postId,
  authorName,
  authorAvatar,
  isAdminAuthor = false,
  body,
  createdAt,
  canDelete,
}: {
  commentId: string;
  postId: string;
  authorName: string;
  authorAvatar: string;
  /** 運営（admin）によるコメントか。バッジ表示に使う。 */
  isAdminAuthor?: boolean;
  body: string;
  createdAt: string;
  canDelete: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex gap-3 border-b border-foreground/10 py-3 last:border-0">
      <span className="text-xl" aria-hidden>
        {isAdminAuthor ? '📢' : authorAvatar}
      </span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium">
            {authorName}
            {isAdminAuthor && <AdminBadge />}
          </span>
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
