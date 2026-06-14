'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/announcements', label: 'お知らせ', icon: '📣' },
  { href: '/feed', label: '掲示板', icon: '🏠' },
  { href: '/data', label: 'データ', icon: '📊' },
  { href: '/members', label: '仲間', icon: '👥' },
] as const;

/** ボトムナビ 4 タブ（設計書 §6.1 / screens §1.3）。 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="メインナビゲーション"
      className="sticky bottom-0 z-20 border-t border-foreground/10 bg-cream/95 backdrop-blur"
    >
      <ul className="mx-auto flex max-w-column">
        {TABS.map((tab) => {
          const active =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[60px] flex-col items-center justify-center gap-0.5 py-2 text-xs',
                  active ? 'text-terracotta' : 'text-foreground/60',
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {tab.icon}
                </span>
                <span className={cn(active && 'font-medium')}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
