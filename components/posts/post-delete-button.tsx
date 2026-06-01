'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deletePost } from '@/app/(app)/feed/actions';

export function PostDeleteButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm('この投稿を削除しますか？（元に戻せません）')) return;
        startTransition(async () => {
          const r = await deletePost(postId);
          if (r.ok) router.push('/feed');
          else alert(r.error.message);
        });
      }}
      className="text-sm text-terracotta underline"
    >
      削除
    </button>
  );
}
