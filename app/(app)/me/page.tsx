import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { LinkButton } from '@/components/ui/link-button';
import { requireMember } from '@/lib/auth';
import { imageProxyPath } from '@/lib/storage';

export const metadata: Metadata = { title: 'マイページ' };

const PLAN_LABEL: Record<string, string> = {
  trial: 'お試しプラン',
  standard: 'スタンダードプラン',
  premium: 'プレミアムプラン',
};

export default async function MyPage() {
  const profile = await requireMember();

  const avatarUrl = profile.avatar_image_path
    ? imageProxyPath('avatars', profile.avatar_image_path)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading level={1}>マイページ</Heading>
        <Link href="/me/settings" className="text-sm text-navy underline">
          設定
        </Link>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-terracotta/10 text-3xl">
              {profile.avatar}
            </span>
          )}
          <div>
            <p className="text-xl font-medium">{profile.display_name}</p>
            {profile.plan && (
              <p className="text-sm text-foreground/60">
                {PLAN_LABEL[profile.plan] ?? profile.plan}
              </p>
            )}
          </div>
        </div>
        {profile.bio && <p className="text-foreground/80">{profile.bio}</p>}
        {profile.productGenres.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {profile.productGenres.map((g) => (
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
        <LinkButton href="/me/settings/profile">プロフィールを編集</LinkButton>
      </Card>

      {(profile.store_name || profile.region || profile.product) && (
        <Card className="space-y-2">
          <Heading level={3}>お店</Heading>
          <dl className="space-y-1 text-base">
            {profile.store_name && (
              <Row label="屋号" value={profile.store_name} />
            )}
            {profile.region && <Row label="地域" value={profile.region} />}
            {profile.product && <Row label="商品" value={profile.product} />}
          </dl>
          {profile.store_description && (
            <p className="text-foreground/80">{profile.store_description}</p>
          )}
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-foreground/50">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
