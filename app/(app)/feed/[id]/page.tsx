import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { requireMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { imageProxyPath } from '@/lib/storage';
import { isStandardOrHigher } from '@/lib/plans';
import { YoutubeEmbed } from '@/components/youtube-embed';
import { AdminBadge } from '@/components/posts/admin-badge';
import { PostLikeButton } from '@/components/posts/post-like-button';
import { PostCommentForm } from '@/components/posts/post-comment-form';
import { PostCommentItem } from '@/components/posts/post-comment-item';
import { PostDeleteButton } from '@/components/posts/post-delete-button';

export const metadata: Metadata = { title: '投稿' };

type AuthorEmbed = {
  id: string;
  display_name: string;
  avatar: string;
  status: string;
  role: string;
} | null;
type ChannelEmbed = { id: string; label: string; color: string } | null;

export default async function PostDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await requireMember();
  const supabase = createClient();

  const { data: post } = await supabase
    .from('posts')
    .select(
      `id, title, content, created_at, last_edited_at, edited_by_admin, author_id,
       channel:channels!posts_channel_id_fkey(id, label, color),
       author:profiles!posts_author_id_fkey(id, display_name, avatar, status, role),
       post_tag_assignments(post_tags(id, label, slug)),
       post_attachments(id, attachment_type, storage_path, video_id, caption, display_order)`,
    )
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!post) notFound();

  const author = post.author as AuthorEmbed;
  const channel = post.channel as ChannelEmbed;
  const isMine = post.author_id === profile.id;
  const isAdmin = profile.role === 'admin';
  const authorActive = author?.status === 'active';
  const authorIsAdmin = authorActive && author?.role === 'admin';

  const tags = (post.post_tag_assignments ?? [])
    .map((a) => a.post_tags)
    .filter((t): t is { id: string; label: string; slug: string } =>
      Boolean(t),
    );

  const [{ count: likeCount }, { data: myLike }, { data: comments }] =
    await Promise.all([
      supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id),
      supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', post.id)
        .eq('user_id', profile.id)
        .maybeSingle(),
      supabase
        .from('post_comments')
        .select(
          `id, body, created_at,
           author:profiles!post_comments_author_id_fkey(id, display_name, avatar, status, role)`,
        )
        .eq('post_id', post.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
    ]);

  // 添付を表示順にソート（画像はアプリ経由 /api/img で配信。投稿画像は将来 posts バケットへ）
  const attachments = [...(post.post_attachments ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );

  return (
    <article className="space-y-5">
      <Link href="/feed" className="text-sm text-navy underline">
        ← 掲示板
      </Link>

      <div className="space-y-2">
        {channel && (
          <Link
            href={`/feed?channel=${channel.id}`}
            className="text-sm font-medium"
            style={{ color: channel.color }}
          >
            {channel.label}
          </Link>
        )}
        <Heading level={1}>{post.title}</Heading>
        <div className="flex items-center gap-2 text-sm text-foreground/50">
          <span>
            {authorActive ? (authorIsAdmin ? '📢' : author?.avatar) : '👤'}{' '}
            {authorActive ? author?.display_name : '（退会したメンバー）'}
          </span>
          {authorIsAdmin && <AdminBadge />}
          <time>{new Date(post.created_at).toLocaleDateString('ja-JP')}</time>
          {post.edited_by_admin && <span>※運営により編集</span>}
          {!post.edited_by_admin && post.last_edited_at && (
            <span>（編集済み）</span>
          )}
        </div>
      </div>

      <div className="whitespace-pre-wrap break-words text-base leading-relaxed text-foreground/90">
        {post.content}
      </div>

      {attachments.length > 0 && (
        <div className="space-y-3">
          {attachments.map((a) => {
            if (a.attachment_type === 'video_embed' && a.video_id) {
              return (
                <YoutubeEmbed
                  key={a.id}
                  videoId={a.video_id}
                  title={post.title}
                />
              );
            }
            const url = a.storage_path
              ? imageProxyPath('contents', a.storage_path)
              : null;
            if (!url) return null;
            return (
              <Image
                key={a.id}
                src={url}
                alt={a.caption ?? ''}
                width={1280}
                height={960}
                className="w-full rounded"
                unoptimized
              />
            );
          })}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <Link
              key={t.id}
              href={`/search?q=${encodeURIComponent(t.label)}`}
              className="rounded-full bg-foreground/5 px-3 py-1 text-sm text-foreground/60"
            >
              #{t.label}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <PostLikeButton
          postId={post.id}
          initialLiked={Boolean(myLike)}
          initialCount={likeCount ?? 0}
        />
        {(isMine || isAdmin) && (
          <>
            <Link
              href={`/feed/${post.id}/edit`}
              className="text-sm text-navy underline"
            >
              編集
            </Link>
            <PostDeleteButton postId={post.id} />
          </>
        )}
      </div>

      <section className="space-y-4">
        <Heading level={3}>コメント（{comments?.length ?? 0}）</Heading>
        <PostCommentForm
          postId={post.id}
          canComment={isStandardOrHigher(profile)}
        />
        {comments && comments.length > 0 && (
          <Card className="p-0 px-5">
            <ul>
              {comments.map((c) => {
                const ca = c.author as AuthorEmbed;
                const deleted = ca?.status !== 'active';
                return (
                  <PostCommentItem
                    key={c.id}
                    commentId={c.id}
                    postId={post.id}
                    authorName={
                      deleted
                        ? '（退会したメンバー）'
                        : (ca?.display_name ?? 'メンバー')
                    }
                    authorAvatar={deleted ? '👤' : (ca?.avatar ?? '👤')}
                    isAdminAuthor={!deleted && ca?.role === 'admin'}
                    body={c.body}
                    createdAt={c.created_at}
                    canDelete={ca?.id === profile.id || isAdmin}
                  />
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </article>
  );
}
