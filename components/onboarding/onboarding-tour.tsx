'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

/** 完了フラグの localStorage キー（dev-phases §3.5.8）。 */
export const ONBOARDING_STORAGE_KEY = 'mcc_onboarding_completed';

const STEPS = [
  {
    icon: '📣',
    title: 'ようこそ！',
    body: '「お知らせ」タブには、運営からの大切な情報やコラムが届きます。まずはここから読んでみましょう。',
  },
  {
    icon: '🏠',
    title: '掲示板で仲間とつながる',
    body: '「掲示板」タブでは、仲間の取り組みを見たり、自分の近況や質問を投稿したりできます。',
  },
  {
    icon: '👤',
    title: 'プロフィールを設定しましょう',
    body: 'あなたのお店や商品のことを教えてください。仲間があなたを見つけやすくなります。',
  },
] as const;

/**
 * 初回ログイン時の 3 ステップツアー（dev-phases §3.5.8）。
 * localStorage の完了フラグで一度きり表示。スキップ可。
 */
export function OnboardingTour() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(ONBOARDING_STORAGE_KEY)) {
        setIsOpen(true);
      }
    } catch {
      // localStorage 不可（プライベートモード等）の場合は表示しない
    }
  }, []);

  if (!isOpen) return null;

  function complete() {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    } catch {
      // 保存できなくても閉じる（次回また表示されるだけ）
    }
    setIsOpen(false);
  }

  function finishAndEditProfile() {
    complete();
    router.push('/me/settings/profile');
  }

  const current = STEPS[step] ?? STEPS[0];
  const isLastStep = step === STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="はじめてのご案内"
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/60 p-4"
    >
      <div className="w-full max-w-sm space-y-5 rounded-card bg-cream p-6 text-center shadow-lg">
        <p aria-hidden className="text-5xl">
          {current.icon}
        </p>
        <h2 className="text-xl font-medium">{current.title}</h2>
        <p className="text-left text-base leading-relaxed text-foreground/80">
          {current.body}
        </p>

        <div className="flex items-center justify-center gap-2" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i === step ? 'bg-terracotta' : 'bg-foreground/20'
              }`}
            />
          ))}
        </div>

        <div className="space-y-2">
          {isLastStep ? (
            <>
              <Button size="lg" className="w-full" onClick={finishAndEditProfile}>
                プロフィールを設定する
              </Button>
              <Button variant="ghost" className="w-full" onClick={complete}>
                あとで設定する
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                className="w-full"
                onClick={() => setStep(step + 1)}
              >
                次へ（{step + 1} / {STEPS.length}）
              </Button>
              <Button variant="ghost" className="w-full" onClick={complete}>
                スキップ
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
