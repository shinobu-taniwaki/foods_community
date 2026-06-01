import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { requireMember } from '@/lib/auth';
import { searchAll } from '@/lib/search';

export const metadata: Metadata = { title: '検索' };

const MIN_LEN = 2;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireMember();
  const q = (searchParams.q ?? '').trim();
  const tooShort = q.length > 0 && q.length < MIN_LEN;
  const results = q.length >= MIN_LEN ? await searchAll(q) : null;

  const total = results
    ? results.posts.length +
      results.announcements.length +
      results.members.length
    : 0;

  return (
    <div className="space-y-5">
      <Heading level={1}>検索</Heading>

      <form action="/search" method="get" className="flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          placeholder="キーワード（2文字以上）"
          aria-label="検索キーワード"
          minLength={MIN_LEN}
        />
        <Button type="submit">検索</Button>
      </form>

      {tooShort && (
        <p className="text-sm text-foreground/60">
          2文字以上で検索してください。
        </p>
      )}

      {results && (
        <div className="space-y-6">
          {total === 0 && (
            <Card className="text-center text-foreground/60">
              「{q}」に一致する結果はありませんでした。
            </Card>
          )}

          {results.posts.length > 0 && (
            <section className="space-y-2">
              <Heading level={3}>掲示板（{results.posts.length}）</Heading>
              <ul className="space-y-2">
                {results.posts.map((p) => (
                  <li key={p.id}>
                    <Link href={`/feed/${p.id}`}>
                      <Card className="space-y-1">
                        <p className="text-xs text-foreground/50">
                          {p.channelLabel}
                        </p>
                        <p className="font-medium">{p.title}</p>
                        <p className="line-clamp-1 text-sm text-foreground/60">
                          {p.excerpt}
                        </p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.announcements.length > 0 && (
            <section className="space-y-2">
              <Heading level={3}>
                お知らせ（{results.announcements.length}）
              </Heading>
              <ul className="space-y-2">
                {results.announcements.map((a) => (
                  <li key={a.id}>
                    <Link href={`/announcements/${a.id}`}>
                      <Card className="space-y-1">
                        <p className="font-medium">{a.title}</p>
                        <p className="line-clamp-1 text-sm text-foreground/60">
                          {a.excerpt}
                        </p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {results.members.length > 0 && (
            <section className="space-y-2">
              <Heading level={3}>仲間（{results.members.length}）</Heading>
              <ul className="space-y-2">
                {results.members.map((m) => (
                  <li key={m.id}>
                    <Link href={`/members/${m.id}`}>
                      <Card className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden>
                          {m.avatar}
                        </span>
                        <div>
                          <p className="font-medium">{m.displayName}</p>
                          {m.storeName && (
                            <p className="text-sm text-foreground/60">
                              {m.storeName}
                            </p>
                          )}
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
