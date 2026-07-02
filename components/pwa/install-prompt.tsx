'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ONBOARDING_STORAGE_KEY } from '@/components/onboarding/onboarding-tour';

const DISMISS_KEY = 'mcc_install_prompt_dismissed';

/** Chrome 系の beforeinstallprompt イベント（標準型定義がないため自前定義）。 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type PromptMode = 'android' | 'ios' | null;

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari 独自プロパティ
    ('standalone' in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

/**
 * ホーム画面追加の誘導（dev-phases §3.5.7）。
 * - Android/Chrome: beforeinstallprompt を拾いカスタムボタンで prompt()
 * - iOS Safari: 「共有 → ホーム画面に追加」の手順を大きな文字で案内
 * すでにアプリとして起動している場合・一度閉じた場合は表示しない。
 * オンボーディングツアー完了前は出さない（重ならないように）。
 */
export function InstallPrompt() {
  const [mode, setMode] = useState<PromptMode>(null);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      if (isStandalone()) return;
      if (window.localStorage.getItem(DISMISS_KEY)) return;
      if (!window.localStorage.getItem(ONBOARDING_STORAGE_KEY)) return;

      if (isIos()) {
        setMode('ios');
        return;
      }

      const handler = (event: Event) => {
        event.preventDefault();
        setInstallEvent(event as BeforeInstallPromptEvent);
        setMode('android');
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    } catch {
      // localStorage 不可などの場合は誘導自体を出さない
    }
  }, []);

  if (!mode) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // 保存できなければ次回また表示されるだけ
    }
    setMode(null);
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'accepted') {
      dismiss();
    }
  }

  return (
    <section
      aria-label="ホーム画面への追加のご案内"
      className="border-b border-foreground/10 bg-mustard/10"
    >
      <div className="mx-auto max-w-column space-y-3 px-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-medium">
            📲 ホーム画面に追加すると、アプリのようにすぐ開けます
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="この案内を閉じる"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-lg text-foreground/50 hover:bg-foreground/5"
          >
            ✕
          </button>
        </div>

        {mode === 'android' ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={install}>ホーム画面に追加する</Button>
            <span className="text-sm text-foreground/60">
              ボタンを押すと追加の確認が表示されます。
            </span>
          </div>
        ) : (
          <ol className="space-y-2 text-base leading-relaxed">
            <li>
              <span className="font-medium">1.</span> 画面下の共有ボタン
              <span
                aria-label="共有アイコン"
                className="mx-1 inline-block rounded border border-foreground/20 bg-white px-2"
              >
                ↑
              </span>
              を押します
            </li>
            <li>
              <span className="font-medium">2.</span>{' '}
              「<span className="font-medium">ホーム画面に追加</span>
              」を選びます
            </li>
            <li>
              <span className="font-medium">3.</span> 右上の「
              <span className="font-medium">追加</span>」を押して完了です
            </li>
          </ol>
        )}
      </div>
    </section>
  );
}
