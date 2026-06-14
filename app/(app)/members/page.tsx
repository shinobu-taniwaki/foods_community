import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { requireMember } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listMembers } from '@/lib/members';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: '仲間' };

export default async function MembersPage({
  searchParams,
}: {
  searchParams: { genre?: string | string[]; q?: string };
}) {
  await requireMember();

  const genreIds = Array.isArray(searchParams.genre)
    ? searchParams.genre
    : searchParams.genre
      ? [searchParams.genre]
      : [];
  const q = (searchParams.q ?? '').trim();

  const supabase = createClient();
  const [{ data: genres }, members] = await Promise.all([
    supabase
      .from('product_genres')
      .select('id, label, icon_emoji')
      .eq('is_active', true)
      .order('sort_order'),
    listMembers({ genreIds, nameQuery: q }),
  ]);

  const toggleHref = (id: string) => {
    const next = genreIds.includes(id)
      ? genreIds.filter((g) => g !== id)
      : [...genreIds, id];
    const sp = new URLSearchParams();
    next.forEach((g) => sp.append('genre', g));
    if (q) sp.set('q', q);
    const qs = sp.toString();
    return qs ? `/members?${qs}` : '/members';
  };

  return (
    <div className="space-y-5">
      <Heading level={1}>仲間</Heading>

      <form action="/members" method="get" className="flex gap-2">
        {genreIds.map((g) => (
          <input key={g} type="hidden" name="genre" value={g} />
        ))}
        <Input
          name="q"
          defaultValue={q}
          placeholder="名前・屋号で検索"
          aria-label="名前検索"
        />
        <Button type="submit">検索</Button>
      </form>

      {/* 販売ジャンルフィルタ */}
      <nav className="-mx-1 flex flex-wrap gap-2" aria-label="販売ジャンル">
        {(genres ?? []).map((g) => {
          const active = genreIds.includes(g.id);
          return (
            <Link
              key={g.id}
              href={toggleHref(g.id)}
              aria-pressed={active}
              className={cn(
                'flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm',
                active
                  ? 'border-olive bg-olive/10 text-olive'
                  : 'border-foreground/15 text-foreground/60',
              )}
            >
              <span aria-hidden>{g.icon_emoji}</span>
              {g.label}
            </Link>
          );
        })}
      </nav>

      {members.length === 0 ? (
        <Card className="text-center text-foreground/60">
          該当する仲間が見つかりませんでした。
        </Card>
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id}>
              <Link href={`/members/${m.id}`}>
                <Card className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {m.avatar}
                    </span>
                    <div>
                      <p className="font-medium">{m.displayName}</p>
                      <p className="text-sm text-foreground/60">
                        {[m.storeName, m.region].filter(Boolean).join('・')}
                      </p>
                    </div>
                  </div>
                  {m.productGenres.length > 0 && (
                    <ul className="flex flex-wrap gap-1">
                      {m.productGenres.map((g) => (
                        <li
                          key={g.id}
                          className="flex items-center gap-1 rounded-full bg-olive/10 px-2 py-0.5 text-xs text-olive"
                        >
                          <span aria-hidden>{g.iconEmoji}</span>
                          {g.label}
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
