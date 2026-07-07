'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { fetchUnreadCount } from '@/app/(app)/notifications/actions';

/** ポーリング間隔（ms）。50名規模の負荷とバッジ鮮度のバランスで 60 秒。 */
const POLL_INTERVAL_MS = 60_000;

interface NotificationBadgeProps {
  initialCount: number;
}

/**
 * 未読通知バッジ（dev-phases §3.5.3）。
 * 単一ドメイン構成（single-domain-image-proxy.md）ではブラウザから
 * Supabase Realtime に接続できないため、アプリサーバー経由のポーリング
 * （定期 + タブ復帰時 + 画面遷移時）で即時性を近似する。
 */
export function NotificationBadge({ initialCount }: NotificationBadgeProps) {
  const [count, setCount] = useState(initialCount);
  const pathname = usePathname();

  // ページ遷移などでサーバー再計算された値が届いたら同期する
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    let isActive = true;

    async function refetchCount() {
      const result = await fetchUnreadCount().catch(() => null);
      if (isActive && result?.ok) setCount(result.data.count);
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refetchCount();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetchCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    // 画面遷移時にも取り直す（pathname 変化で effect 再実行）
    void refetchCount();

    return () => {
      isActive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [pathname]);

  if (count <= 0) return null;

  return (
    <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-terracotta px-1 text-center text-xs leading-[18px] text-cream">
      {count > 99 ? '99+' : count}
    </span>
  );
}
