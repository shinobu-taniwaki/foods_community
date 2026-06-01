import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { requireMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  listAnnouncements,
  isAnnouncementCategory,
  ANNOUNCEMENT_CATEGORIES,
} from '@/lib/announcements';
import { OwnerHeader } from '@/components/announcements/owner-header';
import { AnnouncementCard } from '@/components/announcements/announcement-card';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'お知らせ' };

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: { category?: string };
}) {
  const profile = await requireMember();
  const category =
    searchParams.category && isAnnouncementCategory(searchParams.category)
      ? searchParams.category
      : undefined;

  const supabase = createClient();
  const [items, { data: owner }] = await Promise.all([
    listAnnouncements({ viewerId: profile.id, category }),
    supabase
      .from('profiles')
      .select('display_name, avatar, bio')
      .eq('role', 'admin')
      .eq('status', 'active')
      .order('created_at')
      .limit(1)
      .maybeSingle(),
  ]);

  const isAdmin = profile.role === 'admin';

  return (
    <div className="space-y-5">
      {owner && (
        <OwnerHeader
          displayName={owner.display_name}
          avatar={owner.avatar}
          bio={owner.bio}
        />
      )}

      <div className="flex items-center justify-between">
        <Heading level={1}>お知らせ</Heading>
        {isAdmin && (
          <LinkButton href="/admin/announcements/new">＋ 新規作成</LinkButton>
        )}
      </div>

      {/* カテゴリ絞り込み */}
      <nav className="-mx-1 flex flex-wrap gap-2" aria-label="カテゴリ">
        <CategoryChip active={!category} href="/announcements" label="すべて" />
        {Object.entries(ANNOUNCEMENT_CATEGORIES).map(([id, c]) => (
          <CategoryChip
            key={id}
            active={category === id}
            href={`/announcements?category=${id}`}
            label={`${c.icon} ${c.label}`}
          />
        ))}
      </nav>

      {items.length === 0 ? (
        <Card className="text-center text-foreground/60">
          まだお知らせがありません。
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <AnnouncementCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm',
        active
          ? 'border-terracotta bg-terracotta/10 text-terracotta'
          : 'border-foreground/15 text-foreground/60',
      )}
    >
      {label}
    </Link>
  );
}
