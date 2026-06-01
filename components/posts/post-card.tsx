import Link from 'next/link';
import { Card } from '@/components/ui/card';
import type { PostListItem } from '@/lib/posts';

/** 掲示板の投稿カード。 */
export function PostCard({ post }: { post: PostListItem }) {
  return (
    <Card className="space-y-2">
      <Link href={`/feed/${post.id}`} className="block space-y-2">
        <div className="flex items-center gap-2">
          {post.author ? (
            <span className="text-xl" aria-hidden>
              {post.author.avatar}
            </span>
          ) : (
            <span className="text-xl" aria-hidden>
              👤
            </span>
          )}
          <div className="flex flex-wrap items-center gap-1 text-sm text-foreground/60">
            <span className="font-medium text-foreground/80">
              {post.author?.displayName ?? '（退会したメンバー）'}
            </span>
            {post.author?.genreEmojis.map((e, i) => (
              <span key={i} aria-hidden>
                {e}
              </span>
            ))}
          </div>
        </div>

        <h2 className="font-serif text-lg">{post.title}</h2>
        <p className="line-clamp-2 text-base text-foreground/70">
          {post.contentExcerpt}
        </p>

        {(post.tags.length > 0 || post.hasVideo) && (
          <div className="flex flex-wrap items-center gap-1">
            {post.hasVideo && (
              <span className="text-sm" aria-label="動画あり">
                🎬
              </span>
            )}
            {post.tags.map((t) => (
              <span
                key={t.id}
                className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/60"
              >
                #{t.label}
              </span>
            ))}
          </div>
        )}
      </Link>

      <div className="flex items-center gap-4 text-sm text-foreground/50">
        <span>❤️ {post.likeCount}</span>
        <span>💬 {post.commentCount}</span>
        {post.editedByAdmin && <span className="text-xs">※運営により編集</span>}
      </div>
    </Card>
  );
}
