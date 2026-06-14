import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Heading } from '@/components/ui/heading';
import { requireMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PostForm } from '@/components/posts/post-form';
import { updatePost } from '../../actions';

export const metadata: Metadata = { title: '投稿を編集' };

export default async function EditPostPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await requireMember();
  const supabase = createClient();

  const { data: post } = await supabase
    .from('posts')
    .select(
      'id, author_id, channel_id, title, content, post_tag_assignments(post_tags(label))',
    )
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (!post) notFound();
  if (post.author_id !== profile.id && profile.role !== 'admin') {
    redirect(`/feed/${params.id}`);
  }

  const tags = (post.post_tag_assignments ?? [])
    .map((a) => a.post_tags?.label)
    .filter((l): l is string => Boolean(l));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>投稿を編集</Heading>
        <Link
          href={`/feed/${params.id}`}
          className="text-sm text-navy underline"
        >
          投稿へ戻る
        </Link>
      </div>
      <PostForm
        action={updatePost}
        channels={[]}
        isAdmin={profile.role === 'admin'}
        mode="edit"
        defaultValues={{
          id: post.id,
          channelId: post.channel_id,
          title: post.title,
          content: post.content,
          tags,
        }}
      />
    </div>
  );
}
