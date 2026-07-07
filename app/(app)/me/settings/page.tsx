import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { requireMember } from '@/lib/auth';
import { signOut } from '../actions';

export const metadata: Metadata = { title: '設定' };

const ITEMS: { href: string; label: string; ready: boolean }[] = [
  { href: '/me/settings/profile', label: 'プロフィール編集', ready: true },
  {
    href: '/me/settings/account',
    label: 'アカウント（メール・パスワード）',
    ready: true,
  },
  { href: '/me/settings/notifications', label: '通知設定', ready: true },
  { href: '/me/settings/plan', label: 'プラン', ready: true },
  { href: '/me/settings/danger', label: '退会', ready: true },
];

export default async function SettingsPage() {
  await requireMember();

  return (
    <div className="space-y-6">
      <Heading level={1}>設定</Heading>

      <Card className="divide-y divide-foreground/10 p-0">
        {ITEMS.map((item) =>
          item.ready ? (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-[56px] items-center justify-between px-5 py-3 hover:bg-foreground/5"
            >
              <span>{item.label}</span>
              <span aria-hidden className="text-foreground/40">
                ›
              </span>
            </Link>
          ) : (
            <div
              key={item.href}
              className="flex min-h-[56px] items-center justify-between px-5 py-3 text-foreground/40"
            >
              <span>{item.label}</span>
              <span className="text-xs">準備中</span>
            </div>
          ),
        )}
      </Card>

      <form action={signOut}>
        <Button variant="ghost" type="submit" className="w-full">
          ログアウト
        </Button>
      </form>
    </div>
  );
}
