import { Container } from '@/components/ui/container';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { createClient } from '@/lib/supabase/server';

// Cookie / Supabase へアクセスするため常に動的レンダリング
export const dynamic = 'force-dynamic';

type CheckResult = {
  label: string;
  ok: boolean;
  detail: string;
};

async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // 1. 公開環境変数の存在確認
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  results.push({
    label: '環境変数 NEXT_PUBLIC_SUPABASE_URL',
    ok: Boolean(url),
    detail: url ? url : '未設定（.env.local を確認）',
  });

  // 2. Supabase 接続 + plans マスタへの SELECT
  try {
    const supabase = createClient();
    const { error } = await supabase.from('plans').select('id').limit(1);
    if (error) {
      results.push({
        label: 'Supabase 接続（plans SELECT）',
        ok: false,
        detail: `${error.message}（マイグレーション未適用の可能性）`,
      });
    } else {
      results.push({
        label: 'Supabase 接続（plans SELECT）',
        ok: true,
        detail: '接続成功',
      });
    }
  } catch (e) {
    results.push({
      label: 'Supabase 接続',
      ok: false,
      detail: e instanceof Error ? e.message : '不明なエラー',
    });
  }

  return results;
}

export default async function HealthPage() {
  const checks = await runChecks();

  return (
    <main className="min-h-screen py-10">
      <Container className="space-y-6">
        <Heading level={1}>システム状態</Heading>
        <Card className="space-y-3">
          <ul className="space-y-3">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-3">
                <span aria-hidden className="text-lg">
                  {c.ok ? '✅' : '⚠️'}
                </span>
                <span>
                  <span className="block font-medium">{c.label}</span>
                  <span className="block break-all text-sm text-foreground/60">
                    {c.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <p className="text-sm text-foreground/60">
          Self-hosted Supabase を起動するには <code>pnpm db:start</code>、
          スキーマ適用は <code>pnpm db:reset</code> を実行してください。
        </p>
      </Container>
    </main>
  );
}
