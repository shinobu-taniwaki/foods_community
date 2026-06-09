import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { adminListMembers } from '@/lib/admin';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'メンバー管理' };

const STATUS_LABEL: Record<string, string> = {
  active: 'アクティブ',
  suspended: '停止中',
  deleted: '退会済み',
};
const STATUS_CLASS: Record<string, string> = {
  active: 'bg-olive/10 text-olive',
  suspended: 'bg-mustard/20 text-mustard',
  deleted: 'bg-foreground/10 text-foreground/50',
};
const PLAN_LABEL: Record<string, string> = {
  trial: 'お試し',
  standard: 'スタンダード',
  premium: 'プレミアム',
};
const STATUS_FILTERS = ['all', 'active', 'suspended', 'deleted'] as const;

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const status = searchParams.status ?? 'all';
  const q = (searchParams.q ?? '').trim();
  const members = await adminListMembers({ status, nameQuery: q });

  return (
    <div className="space-y-5">
      <Heading level={1}>メンバー管理</Heading>

      <form action="/admin/members" method="get" className="flex gap-2">
        <input type="hidden" name="status" value={status} />
        <Input name="q" defaultValue={q} placeholder="名前・屋号で検索" aria-label="検索" />
        <Button type="submit">検索</Button>
      </form>

      <nav className="flex flex-wrap gap-2" aria-label="ステータス絞り込み">
        {STATUS_FILTERS.map((s) => {
          const sp = new URLSearchParams();
          sp.set('status', s);
          if (q) sp.set('q', q);
          return (
            <Link
              key={s}
              href={`/admin/members?${sp.toString()}`}
              aria-current={status === s ? 'page' : undefined}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm',
                status === s
                  ? 'border-navy bg-navy/10 text-navy'
                  : 'border-foreground/15 text-foreground/60',
              )}
            >
              {s === 'all' ? 'すべて' : STATUS_LABEL[s]}
            </Link>
          );
        })}
      </nav>

      {members.length === 0 ? (
        <Card className="text-center text-foreground/60">該当者がいません。</Card>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.id}>
              <Link href={`/admin/members/${m.id}`}>
                <Card className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {m.avatar}
                    </span>
                    <div>
                      <p className="font-medium">
                        {m.displayName}
                        {m.role === 'admin' && (
                          <span className="ml-2 text-xs text-terracotta">運営</span>
                        )}
                      </p>
                      <p className="text-sm text-foreground/60">
                        {m.storeName || '—'}
                        {m.plan && ` ・ ${PLAN_LABEL[m.plan] ?? m.plan}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      STATUS_CLASS[m.status] ?? '',
                    )}
                  >
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
