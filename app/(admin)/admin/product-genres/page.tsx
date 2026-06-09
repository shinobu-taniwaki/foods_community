import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { CreateGenreForm } from './create-genre-form';
import { GenreToggle } from './genre-toggle';

export const metadata: Metadata = { title: '販売ジャンル管理' };

export default async function AdminGenresPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('product_genres')
    .select('id, label, icon_emoji, is_active, sort_order')
    .order('sort_order');

  const genres = data ?? [];

  return (
    <div className="space-y-6">
      <Heading level={1}>販売ジャンル管理</Heading>

      <section className="space-y-2">
        <Heading level={3}>既存ジャンル</Heading>
        <ul className="space-y-2">
          {genres.map((g) => (
            <li key={g.id}>
              <Card className="flex items-center justify-between">
                <p className="font-medium">
                  <span className="mr-1">{g.icon_emoji}</span>
                  {g.label}
                  {!g.is_active && (
                    <span className="ml-2 text-xs text-foreground/40">（非表示）</span>
                  )}
                </p>
                <GenreToggle id={g.id} isActive={g.is_active} />
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <Heading level={3}>新規ジャンル</Heading>
        <CreateGenreForm />
      </section>
    </div>
  );
}
