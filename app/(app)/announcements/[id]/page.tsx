import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { requireMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ANNOUNCEMENT_CATEGORIES, isAnnouncementCategory } from '@/lib/announcements';
import { YoutubeEmbed } from '@/components/youtube-embed';
import { LikeButton } from '@/components/announcements/like-button';
import { CommentForm } from '@/components/announcements/comment-form';
import { CommentItem } from '@/components/announcements/comment-item';

export const metadata: Metadata = { title: 'お知らせ' };

type AuthorEmbed = { id: string; display_name: string; avatar: string } | null;

export default async function AnnouncementDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await requireMember();
  const supabase = createClient();

  const { data: content } = await supabase
    .from('contents')
    .select(
      `id, category, title, body, pinned, required_plan, published_at, last_edited_at,
       author:profiles!contents_author_id_fkey(id, display_name, avatar),
       content_attachments(id, attachment_type, storage_path, video_id, caption, display_order)`,
    )
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  // RLS で見えない / 非公開 / 削除済みは notFound
  if (!content) notFound();

  const author = content.author as AuthorEmbed;
  const cat = isAnnouncementCategory(content.category)
    ? ANNOUNCEMENT_CATEGORIES[content.category]
    : null;

  // いいね（件数 + 自分の状態）
  const [{ count: likeCount }, { data: myLike }] = await Promise.all([
    supabase
      .from('content_likes')
      .select('*', { count: 'exact', head: true })
      .eq('content_id', content.id),
    supabase
      .from('content_likes')
      .select('content_id')
      .eq('content_id', content.id)
      .eq('user_id', profile.id)
      .maybeSingle(),
  ]);

  // コメント（未削除のみ・古い順）
  const { data: comments } = await supabase
    .from('content_comments')
    .select(
      `id, body, created_at,
       author:profiles!content_comments_author_id_fkey(id, display_name, avatar, status)`,
    )
    .eq('content_id', content.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  // 画像添付の署名付き URL を生成
  const attachments = [...(content.content_attachments ?? [])].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const imagePaths = attachments
    .filter((a) => a.attachment_type === 'image' && a.storage_path)
    .map((a) => a.storage_path as string);
  const signedUrls = new Map<string, string>();
  for (const path of imagePaths) {
    const { data } = await supabase.storage
      .from('contents')
      .createSignedUrl(path, 60 * 60);
    if (data?.signedUrl) signedUrls.set(path, data.signedUrl);
  }

  return (
    <article className="space-y-5">
      <Link href="/announcements" className="text-sm text-navy underline">
        ← お知らせ一覧
      </Link>

      <div className="space-y-2">
        {cat && (
          <span className={`flex items-center gap-1 text-sm font-medium ${cat.color}`}>
            <span aria-hidden>{cat.icon}</span>
            {cat.label}
          </span>
        )}
        <Heading level={1}>{content.title}</Heading>
        <div className="flex items-center gap-2 text-sm text-foreground/50">
          {author && (
            <span>
              {author.avatar} {author.display_name}
            </span>
          )}
          {content.published_at && (
            <time>
              {new Date(content.published_at).toLocaleDateString('ja-JP')}
            </time>
          )}
          {content.last_edited_at && <span>（編集済み）</span>}
        </div>
      </div>

      <div className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
        {content.body}
      </div>

      {/* 添付（画像・動画） */}
      {attachments.length > 0 && (
        <div className="space-y-3">
          {attachments.map((a) => {
            if (a.attachment_type === 'video_embed' && a.video_id) {
              return (
                <YoutubeEmbed key={a.id} videoId={a.video_id} title={content.title} />
              );
            }
            const url = a.storage_path ? signedUrls.get(a.storage_path) : null;
            if (!url) return null;
            return (
              <figure key={a.id}>
                <Image
                  src={url}
                  alt={a.caption ?? ''}
                  width={1280}
                  height={960}
                  className="w-full rounded"
                  unoptimized
                />
                {a.caption && (
                  <figcaption className="mt-1 text-sm text-foreground/50">
                    {a.caption}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      )}

      <LikeButton
        contentId={content.id}
        initialLiked={Boolean(myLike)}
        initialCount={likeCount ?? 0}
      />

      {/* コメント */}
      <section className="space-y-4">
        <Heading level={3}>コメント（{comments?.length ?? 0}）</Heading>
        <CommentForm contentId={content.id} />
        {comments && comments.length > 0 && (
          <Card className="p-0 px-5">
            <ul>
              {comments.map((c) => {
                const cAuthor = c.author as
                  | (AuthorEmbed & { status?: string })
                  | null;
                const deleted = cAuthor?.status && cAuthor.status !== 'active';
                return (
                  <CommentItem
                    key={c.id}
                    commentId={c.id}
                    contentId={content.id}
                    authorName={
                      deleted
                        ? '（退会したメンバー）'
                        : (cAuthor?.display_name ?? 'メンバー')
                    }
                    authorAvatar={deleted ? '👤' : (cAuthor?.avatar ?? '👤')}
                    body={c.body}
                    createdAt={c.created_at}
                    canDelete={
                      cAuthor?.id === profile.id || profile.role === 'admin'
                    }
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
