import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heading } from '@/components/ui/heading';
import { Alert } from '@/components/ui/alert';
import { requireMember } from '@/lib/auth';
import { listChannels } from '@/lib/channels';
import { isStandardOrHigher } from '@/lib/plans';
import { PostForm } from '@/components/posts/post-form';
import { createPost } from '../actions';

export const metadata: Metadata = { title: '新規投稿' };

export default async function NewPostPage({
  searchParams,
}: {
  searchParams: { channel?: string };
}) {
  const profile = await requireMember();
  if (!isStandardOrHigher(profile)) redirect('/upgrade');

  const channels = await listChannels();
  // 投稿可能なチャンネルのみ（admin専用チャンネルは admin のみ）
  const postable = channels.filter(
    (c) => !c.onlyAdminCanPost || profile.role === 'admin',
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>新規投稿</Heading>
        <Link href="/feed" className="text-sm text-navy underline">
          掲示板へ
        </Link>
      </div>
      {postable.length === 0 ? (
        <Alert variant="info">投稿できるチャンネルがありません。</Alert>
      ) : (
        <PostForm
          action={createPost}
          channels={postable.map((c) => ({ id: c.id, label: c.label }))}
          isAdmin={profile.role === 'admin'}
          mode="create"
          defaultValues={{ channelId: searchParams.channel }}
        />
      )}
    </div>
  );
}
