import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { requireMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ProfileForm } from './profile-form';
import { GenresField } from './genres-field';

export const metadata: Metadata = { title: 'プロフィール編集' };

export default async function ProfileEditPage() {
  const profile = await requireMember();

  const supabase = createClient();
  const { data: genres } = await supabase
    .from('product_genres')
    .select('id, label, icon_emoji')
    .eq('is_active', true)
    .order('sort_order');

  const allGenres = (genres ?? []).map((g) => ({
    id: g.id,
    label: g.label,
    iconEmoji: g.icon_emoji,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Heading level={1}>プロフィール編集</Heading>
        <Link href="/me" className="text-sm text-navy underline">
          マイページへ
        </Link>
      </div>

      <ProfileForm profile={profile} />

      <GenresField
        allGenres={allGenres}
        selectedIds={profile.productGenres.map((g) => g.id)}
      />
    </div>
  );
}
