import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { adminGetMember } from '@/lib/admin';
import { MemberActions } from './member-actions';

export const metadata: Metadata = { title: 'メンバー詳細' };

const PLAN_LABEL: Record<string, string> = {
  trial: 'お試し',
  standard: 'スタンダード',
  premium: 'プレミアム',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'アクティブ',
  suspended: '停止中',
  deleted: '退会済み',
};

export default async function AdminMemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const member = await adminGetMember(params.id);
  if (!member) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin/members" className="text-sm text-navy underline">
        ← メンバー一覧
      </Link>

      <Card className="space-y-3">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-navy/10 text-2xl">
            {member.avatar}
          </span>
          <div>
            <p className="text-xl font-medium">
              {member.displayName}
              {member.role === 'admin' && (
                <span className="ml-2 text-xs text-terracotta">運営</span>
              )}
            </p>
            <p className="text-sm text-foreground/60">{member.email ?? '—'}</p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <Row label="プラン" value={member.plan ? (PLAN_LABEL[member.plan] ?? member.plan) : '—'} />
          <Row label="ステータス" value={STATUS_LABEL[member.status] ?? member.status} />
          <Row label="屋号" value={member.storeName || '—'} />
          <Row label="地域" value={member.region || '—'} />
          <Row label="投稿数" value={String(member.stats.posts)} />
          <Row label="コメント数" value={String(member.stats.comments)} />
        </dl>
        {member.status === 'deleted' && member.deletionReason && (
          <p className="text-sm text-foreground/50">
            退会理由：{member.deletionReason}
          </p>
        )}
        {member.suspendedUntil && (
          <p className="text-sm text-foreground/50">
            停止解除予定：
            {new Date(member.suspendedUntil).toLocaleDateString('ja-JP')}
          </p>
        )}
      </Card>

      {member.role === 'admin' ? (
        <Card className="text-center text-foreground/60">
          運営アカウントには管理操作を行えません。
        </Card>
      ) : (
        <MemberActions
          userId={member.id}
          currentPlan={member.plan}
          status={member.status}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-foreground/50">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
