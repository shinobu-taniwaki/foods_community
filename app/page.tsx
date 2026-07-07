import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { LinkButton } from '@/components/ui/link-button';
import { BrandLogo } from '@/components/layout/brand-logo';
import { getMyProfile } from '@/lib/auth';

/**
 * トップページ（PWA の start_url）。
 * ログイン済みの会員はお知らせへ、それ以外は簡潔なランディングを表示する。
 */
export default async function Home() {
  const profile = await getMyProfile();
  if (profile && profile.status === 'active') {
    redirect('/announcements');
  }

  return (
    <main className="flex min-h-screen items-center py-10">
      <Container className="space-y-6">
        <header className="space-y-4 text-center">
          <div className="flex justify-center">
            <BrandLogo width={200} priority className="h-14 w-auto" />
          </div>
          <p className="text-base text-foreground/70">
            食品生産者・職人のための、マーケティングを学び合うコミュニティ
          </p>
        </header>

        <Card className="space-y-4 text-center">
          <Heading level={2}>ようこそ</Heading>
          <p className="text-base leading-relaxed text-foreground/80">
            仲間の取り組みから学び、自分の挑戦を共有しながら、
            「売る力」を一緒に育てていく場所です。
          </p>
          <LinkButton href="/login" size="lg" className="w-full">
            ログイン
          </LinkButton>
          <p className="text-sm text-foreground/60">
            アカウントは招待制です。招待メールのリンクからご登録ください。
          </p>
        </Card>

        <nav
          aria-label="法的情報"
          className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-foreground/50"
        >
          <Link href="/legal/terms" className="underline">
            利用規約
          </Link>
          <Link href="/legal/privacy" className="underline">
            プライバシーポリシー
          </Link>
          <Link href="/legal/commerce" className="underline">
            特定商取引法に基づく表記
          </Link>
        </nav>
      </Container>
    </main>
  );
}
