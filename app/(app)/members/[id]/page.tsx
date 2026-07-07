import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { requireMember } from '@/lib/auth';
import { getMemberProfile } from '@/lib/members';

export const metadata: Metadata = { title: 'メンバー' };

export default async function MemberDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const me = await requireMember();
  // 自分自身は /me へ
  if (params.id === me.id) redirect('/me');

  const member = await getMemberProfile(params.id);
  if (!member) notFound();

  const social = member.socialLinks ?? {};

  return (
    <div className="space-y-5">
      <Link href="/members" className="text-sm text-navy underline">
        ← 仲間一覧
      </Link>

      <Card className="space-y-3">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-olive/10 text-3xl">
            {member.avatar}
          </span>
          <div>
            <p className="text-xl font-medium">{member.displayName}</p>
            <p className="text-sm text-foreground/60">
              {[member.storeName, member.region].filter(Boolean).join('・')}
            </p>
          </div>
        </div>
        {member.bio && (
          <p className="whitespace-pre-wrap break-words text-foreground/80">{member.bio}</p>
        )}
        {member.productGenres.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {member.productGenres.map((g) => (
              <li
                key={g.id}
                className="flex items-center gap-1 rounded-full bg-olive/10 px-3 py-1 text-sm text-olive"
              >
                <span aria-hidden>{g.iconEmoji}</span>
                {g.label}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {(member.product || member.storeDescription) && (
        <Card className="space-y-2">
          <Heading level={3}>お店</Heading>
          {member.product && (
            <p className="text-base">
              <span className="text-foreground/50">商品：</span>
              {member.product}
            </p>
          )}
          {member.storeDescription && (
            <p className="whitespace-pre-wrap break-words text-foreground/80">{member.storeDescription}</p>
          )}
        </Card>
      )}

      {(member.companyName ||
        member.websiteUrl ||
        social.instagram ||
        social.x ||
        social.tiktok) && (
        <Card className="space-y-2">
          <Heading level={3}>会社・リンク</Heading>
          {member.companyName && (
            <p className="text-base">
              <span className="text-foreground/50">法人：</span>
              {member.companyName}
              {member.businessType ? `（${member.businessType}）` : ''}
            </p>
          )}
          <ul className="flex flex-wrap gap-3 text-sm">
            {member.websiteUrl && (
              <li>
                <a
                  href={member.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy underline"
                >
                  公式サイト
                </a>
              </li>
            )}
            {social.instagram && (
              <li>
                <a
                  href={social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy underline"
                >
                  Instagram
                </a>
              </li>
            )}
            {social.x && (
              <li>
                <a
                  href={social.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy underline"
                >
                  X
                </a>
              </li>
            )}
            {social.tiktok && (
              <li>
                <a
                  href={social.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-navy underline"
                >
                  TikTok
                </a>
              </li>
            )}
          </ul>
        </Card>
      )}

      <section className="space-y-2">
        <Heading level={3}>最近の投稿</Heading>
        {member.recentPosts.length === 0 ? (
          <Card className="text-center text-foreground/60">
            投稿はまだありません。
          </Card>
        ) : (
          <ul className="space-y-2">
            {member.recentPosts.map((p) => (
              <li key={p.id}>
                <Link href={`/feed/${p.id}`}>
                  <Card className="space-y-1">
                    <p className="text-xs text-foreground/50">
                      {p.channelLabel}
                    </p>
                    <p className="font-medium">{p.title}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
