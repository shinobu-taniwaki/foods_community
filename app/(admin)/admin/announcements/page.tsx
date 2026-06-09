import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { createClient } from '@/lib/supabase/server';
import { ANNOUNCEMENT_CATEGORIES, isAnnouncementCategory } from '@/lib/announcements';
import { AdminAnnouncementRow } from './admin-announcement-row';

export const metadata: Metadata = { title: 'お知らせ管理' };

export default async function AdminAnnouncementsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('contents')
    .select('id, category, title, status, pinned, published_at, created_at')
    .is('deleted_at', null)
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100);

  const items = data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>お知らせ管理</Heading>
        <LinkButton href="/admin/announcements/new">＋ 新規作成</LinkButton>
      </div>

      {items.length === 0 ? (
        <Card className="text-center text-foreground/60">お知らせがありません。</Card>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => {
            const cat = isAnnouncementCategory(c.category)
              ? ANNOUNCEMENT_CATEGORIES[c.category]
              : null;
            return (
              <li key={c.id}>
                <Card className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="flex items-center gap-1 text-xs text-foreground/50">
                        {c.pinned && <span>📌</span>}
                        {cat && (
                          <span className={cat.color}>
                            {cat.icon} {cat.label}
                          </span>
                        )}
                      </p>
                      <p className="font-medium">{c.title}</p>
                    </div>
                    <span
                      className={
                        c.status === 'published'
                          ? 'rounded-full bg-olive/10 px-2 py-0.5 text-xs text-olive'
                          : 'rounded-full bg-foreground/10 px-2 py-0.5 text-xs text-foreground/50'
                      }
                    >
                      {c.status === 'published' ? '公開' : '下書き'}
                    </span>
                  </div>
                  <AdminAnnouncementRow id={c.id} pinned={c.pinned} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
