'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const ITEMS = [
  { href: '/admin', label: 'ホーム' },
  { href: '/admin/members', label: 'メンバー' },
  { href: '/admin/invites', label: '招待' },
  { href: '/admin/announcements', label: 'お知らせ' },
  { href: '/admin/posts', label: '投稿' },
  { href: '/admin/channels', label: 'チャンネル' },
  { href: '/admin/product-genres', label: '販売ジャンル' },
  { href: '/admin/audit-log', label: '監査ログ' },
] as const;

/** 管理画面の横スクロールナビ。 */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="管理ナビゲーション"
      className="border-b border-foreground/10 bg-navy/5"
    >
      <ul className="mx-auto flex max-w-column gap-1 overflow-x-auto px-2 py-2">
        {ITEMS.map((item) => {
          const active =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded px-3 py-1.5 text-sm',
                  active
                    ? 'bg-navy text-cream'
                    : 'text-foreground/70 hover:bg-foreground/5',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
