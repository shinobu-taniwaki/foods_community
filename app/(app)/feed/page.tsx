import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import { requireMember } from '@/lib/auth';
import { listChannels } from '@/lib/channels';
import { listPosts } from '@/lib/posts';
import { viewerRank, isStandardOrHigher } from '@/lib/plans';
import { PostCard } from '@/components/posts/post-card';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: '掲示板' };

export default async function FeedPage({
  searchParams,
}: {
  searchParams: { channel?: string };
}) {
  const profile = await requireMember();
  const channels = await listChannels();

  if (channels.length === 0) {
    return (
      <div className="space-y-4">
        <Heading level={1}>掲示板</Heading>
        <Card className="text-center text-foreground/60">
          チャンネルがありません。
        </Card>
      </div>
    );
  }

  const current =
    channels.find((c) => c.id === searchParams.channel) ?? channels[0];
  if (!current) {
    return (
      <div className="space-y-4">
        <Heading level={1}>掲示板</Heading>
        <Card className="text-center text-foreground/60">
          チャンネルがありません。
        </Card>
      </div>
    );
  }

  const { items, trialLimitReached } = await listPosts({
    viewerId: profile.id,
    viewerPlanRank: viewerRank(profile),
    channelId: current.id,
    trialPreviewCount: current.trialPreviewCount,
  });

  const canPost =
    isStandardOrHigher(profile) &&
    (!current.onlyAdminCanPost || profile.role === 'admin');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>掲示板</Heading>
        {canPost && (
          <LinkButton href={`/feed/new?channel=${current.id}`}>
            ＋ 投稿する
          </LinkButton>
        )}
      </div>

      {/* チャンネルタブ */}
      <nav className="-mx-1 flex flex-wrap gap-2" aria-label="チャンネル">
        {channels.map((c) => {
          const active = c.id === current.id;
          return (
            <Link
              key={c.id}
              href={`/feed?channel=${c.id}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm',
                active
                  ? 'border-terracotta bg-terracotta/10 text-terracotta'
                  : 'border-foreground/15 text-foreground/60',
              )}
            >
              {c.iconEmoji && <span aria-hidden>{c.iconEmoji}</span>}
              {c.label}
            </Link>
          );
        })}
      </nav>

      {current.description && (
        <p className="text-sm text-foreground/60">{current.description}</p>
      )}

      {items.length === 0 ? (
        <Card className="text-center text-foreground/60">
          このチャンネルにはまだ投稿がありません。
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}

      {/* trial の閲覧制限 CTA */}
      {trialLimitReached && (
        <Card className="space-y-3 border-mustard/40 bg-mustard/5 text-center">
          <p className="font-medium">
            これ以上の投稿はスタンダードプラン以上で閲覧できます
          </p>
          <LinkButton href="/upgrade" variant="secondary">
            プランを見る
          </LinkButton>
        </Card>
      )}
    </div>
  );
}
