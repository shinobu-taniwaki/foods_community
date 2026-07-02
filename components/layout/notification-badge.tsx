'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NotificationBadgeProps {
  initialCount: number;
  userId: string;
}

/**
 * 未読通知バッジ（dev-phases §3.5.3）。
 * サーバーで数えた初期値を表示しつつ、Supabase Realtime で自分宛の
 * notifications 変更（INSERT / 既読化 UPDATE）を購読して即時更新する。
 */
export function NotificationBadge({
  initialCount,
  userId,
}: NotificationBadgeProps) {
  const [count, setCount] = useState(initialCount);

  // ページ遷移などでサーバー再計算された値が届いたら同期する
  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    const supabase = createClient();

    async function refetchCount() {
      const { count: unread, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .is('read_at', null);
      if (!error && unread !== null) setCount(unread);
    }

    const channel = supabase
      .channel(`notifications-badge-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          void refetchCount();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  if (count <= 0) return null;

  return (
    <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-terracotta px-1 text-center text-xs leading-[18px] text-cream">
      {count > 99 ? '99+' : count}
    </span>
  );
}
