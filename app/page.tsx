import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { LinkButton } from '@/components/ui/link-button';

const BRAND_COLORS = [
  { name: 'クリーム', value: '#faf5ed', className: 'bg-cream' },
  { name: 'テラコッタ', value: '#c05e3f', className: 'bg-terracotta' },
  { name: 'マスタード', value: '#d9a43d', className: 'bg-mustard' },
  { name: 'オリーブ', value: '#5a6b42', className: 'bg-olive' },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen py-10">
      <Container className="space-y-6">
        <header className="space-y-2 text-center">
          <p className="text-sm text-olive">食品生産者のためのコミュニティ</p>
          <Heading level={1} className="text-terracotta">
            マーケティングCampコミュニティ
          </Heading>
          <p className="text-foreground/70">MCC — MVP v0.1（Phase 0 構築中）</p>
        </header>

        <Card className="space-y-4">
          <Heading level={2}>セットアップ確認</Heading>
          <p className="text-foreground/80">
            Next.js 14（App Router）+ Tailwind + Self-hosted Supabase
            のスキャフォールドが起動しています。
          </p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/login">ログイン</LinkButton>
            <LinkButton href="/health" variant="ghost">
              システム状態を確認
            </LinkButton>
          </div>
          <p className="text-sm text-foreground/60">
            アカウントは招待制です。招待メールのリンクからご登録ください。
          </p>
        </Card>

        <Card className="space-y-4">
          <Heading level={3}>ブランドカラー（§1.1）</Heading>
          <ul className="grid grid-cols-2 gap-3">
            {BRAND_COLORS.map((c) => (
              <li key={c.name} className="flex items-center gap-3">
                <span
                  className={`${c.className} h-10 w-10 rounded border border-foreground/10`}
                  aria-hidden
                />
                <span>
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-sm text-foreground/60">
                    {c.value}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </Container>
    </main>
  );
}
