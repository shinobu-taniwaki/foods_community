'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminRevokeInvitation, adminResendInvitation } from './actions';

export function InviteRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await adminResendInvitation(id);
              if (r.ok) {
                setLink(r.data.inviteUrl);
                router.refresh();
              } else alert(r.error.message);
            })
          }
          className="text-sm text-navy underline"
        >
          再送（期限延長）
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm('この招待を取り消しますか？')) return;
            startTransition(async () => {
              const r = await adminRevokeInvitation(id);
              if (r.ok) router.refresh();
              else alert(r.error.message);
            });
          }}
          className="text-sm text-terracotta underline"
        >
          取消
        </button>
      </div>
      {link && (
        <code className="max-w-full break-all text-xs text-foreground/50">{link}</code>
      )}
    </div>
  );
}
