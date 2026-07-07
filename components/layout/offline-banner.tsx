'use client';

import { useEffect, useState } from 'react';

/**
 * ネットワーク切断時の「圏外」バナー（dev-phases §3.5.10）。
 * offline/online イベントの遷移時のみ表示・解除する。
 * navigator.onLine の初期値は VPN・仮想アダプタ環境で false を誤報する
 * ことがある（実機で確認）ため、マウント時のチェックは行わない。
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-30 bg-navy px-4 py-2 text-center text-sm text-cream"
    >
      📡 インターネットに接続できません。電波の届く場所でお試しください。
    </div>
  );
}
