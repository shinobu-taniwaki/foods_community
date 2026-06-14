'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminSetGenreActive } from './actions';

export function GenreToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const r = await adminSetGenreActive(id, !isActive);
          if (r.ok) router.refresh();
          else alert(r.error.message);
        })
      }
      className={isActive ? 'text-sm text-terracotta underline' : 'text-sm text-olive underline'}
    >
      {isActive ? '非表示にする' : '再表示する'}
    </button>
  );
}
