'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminSetChannelActive } from './actions';

export function ChannelToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const next = !isActive;
        if (!next && !confirm('このチャンネルを非表示にしますか？関連投稿は閲覧できなくなります。')) return;
        startTransition(async () => {
          const r = await adminSetChannelActive(id, next);
          if (r.ok) router.refresh();
          else alert(r.error.message);
        });
      }}
      className={isActive ? 'text-sm text-terracotta underline' : 'text-sm text-olive underline'}
    >
      {isActive ? '非表示にする' : '再表示する'}
    </button>
  );
}
