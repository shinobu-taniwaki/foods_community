'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toggleAnnouncementPin, deleteAnnouncement } from './actions';

export function AdminAnnouncementRow({
  id,
  pinned: initialPinned,
}: {
  id: string;
  pinned: boolean;
}) {
  const router = useRouter();
  const [pinned, setPinned] = useState(initialPinned);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await toggleAnnouncementPin(id);
            if (r.ok) setPinned(r.data.pinned);
          })
        }
        className="text-sm text-navy underline"
      >
        {pinned ? '📌 解除' : '📌 ピン'}
      </button>
      <Link href={`/admin/announcements/${id}/edit`} className="text-sm text-navy underline">
        編集
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm('このお知らせを削除しますか？')) return;
          startTransition(async () => {
            const r = await deleteAnnouncement(id);
            if (r.ok) router.refresh();
            else alert(r.error.message);
          });
        }}
        className="text-sm text-terracotta underline"
      >
        削除
      </button>
    </div>
  );
}
