import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: '投稿モデレーション' };

type AuthorEmbed = { display_name: string; status: string } | null;
type ChannelEmbed = { label: string } | null;

export default async function AdminPostsPage() {
  const supabase = createClient();
  // admin は RLS で削除済みも含め全件閲覧可
  const { data } = await supabase
    .from('posts')
    .select(
      `id, title, created_at, deleted_at,
       author:profiles!posts_author_id_fkey(display_name, status),
       channel:channels!posts_channel_id_fkey(label)`,
    )
    .order('created_at', { ascending: false })
    .limit(100);

  const posts = data ?? [];

  return (
    <div className="space-y-5">
      <Heading level={1}>投稿モデレーション</Heading>
      <p className="text-sm text-foreground/60">
        投稿を開いて編集・削除できます（削除は論理削除）。
      </p>

      {posts.length === 0 ? (
        <Card className="text-center text-foreground/60">投稿がありません。</Card>
      ) : (
        <ul className="space-y-2">
          {posts.map((p) => {
            const author = p.author as AuthorEmbed;
            const channel = p.channel as ChannelEmbed;
            const deleted = Boolean(p.deleted_at);
            const inner = (
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {p.title}
                    {deleted && (
                      <span className="ml-2 text-xs text-terracotta">（削除済み）</span>
                    )}
                  </p>
                  <p className="text-sm text-foreground/60">
                    {channel?.label} ・{' '}
                    {author?.status === 'active'
                      ? author?.display_name
                      : '（退会したメンバー）'}{' '}
                    ・ {new Date(p.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                {!deleted && <span className="text-foreground/40">›</span>}
              </Card>
            );
            return (
              <li key={p.id}>
                {deleted ? inner : <Link href={`/feed/${p.id}`}>{inner}</Link>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
