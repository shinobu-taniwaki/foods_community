import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { getDashboardStats } from '@/lib/admin';

export const metadata: Metadata = { title: '管理ダッシュボード' };

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="text-center">
      <p className="text-3xl font-medium text-terracotta">{value}</p>
      <p className="text-sm text-foreground/60">{label}</p>
    </Card>
  );
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <Heading level={1}>ダッシュボード</Heading>

      <section className="space-y-3">
        <Heading level={3}>会員</Heading>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="アクティブ" value={stats.activeMembers} />
          <StatCard label="停止中" value={stats.suspendedMembers} />
          <StatCard label="退会済み" value={stats.deletedMembers} />
        </div>
      </section>

      <section className="space-y-3">
        <Heading level={3}>コンテンツ</Heading>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="招待中" value={stats.pendingInvites} />
          <StatCard label="投稿数" value={stats.totalPosts} />
          <StatCard label="公開お知らせ" value={stats.publishedAnnouncements} />
        </div>
      </section>

      <section className="space-y-3">
        <Heading level={3}>よく使う操作</Heading>
        <div className="flex flex-wrap gap-3">
          <LinkButton href="/admin/invites">招待を発行</LinkButton>
          <LinkButton href="/admin/announcements/new" variant="secondary">
            お知らせ作成
          </LinkButton>
          <LinkButton href="/admin/members" variant="ghost">
            メンバー管理
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
