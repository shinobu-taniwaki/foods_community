import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ANNOUNCEMENT_CATEGORIES, type AnnouncementListItem } from '@/lib/announcements';

/** お知らせ一覧のカード。 */
export function AnnouncementCard({ item }: { item: AnnouncementListItem }) {
  const cat = ANNOUNCEMENT_CATEGORIES[item.category];

  return (
    <Card className="space-y-2">
      <Link href={`/announcements/${item.id}`} className="block space-y-2">
        <div className="flex items-center gap-2 text-sm">
          {item.pinned && <span aria-label="ピン留め">📌</span>}
          <span className={`flex items-center gap-1 font-medium ${cat.color}`}>
            <span aria-hidden>{cat.icon}</span>
            {cat.label}
          </span>
          {item.requiredPlan && (
            <span className="rounded-full bg-mustard/20 px-2 text-xs text-mustard">
              Pro限定
            </span>
          )}
        </div>
        <h2 className="font-serif text-lg">{item.title}</h2>
        <p className="line-clamp-2 text-base text-foreground/70">
          {item.bodyExcerpt}
        </p>
      </Link>
      <div className="flex items-center gap-4 text-sm text-foreground/50">
        <span>❤️ {item.likeCount}</span>
        <span>💬 {item.commentCount}</span>
      </div>
    </Card>
  );
}
