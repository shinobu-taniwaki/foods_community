import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import {
  listMySalesReports,
  listMyKpiReports,
  listMyCpaReports,
} from '@/lib/reports';

export const metadata: Metadata = { title: 'データ' };

const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;
const pct = (n: number | null) => (n === null ? '—' : `${n}%`);

export default async function DataPage() {
  const [sales, kpi, cpa] = await Promise.all([
    listMySalesReports(12),
    listMyKpiReports(12),
    listMyCpaReports(12),
  ]);

  return (
    <div className="space-y-6">
      <Heading level={1}>データ</Heading>
      <p className="text-sm text-foreground/60">
        月ごとの売上・KPI・施策を記録できます（自分のみ閲覧）。
      </p>

      {/* 売上 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Heading level={2}>売上報告</Heading>
          <LinkButton href="/data/sales/new" size="md">
            ＋ 追加
          </LinkButton>
        </div>
        {sales.length === 0 ? (
          <Card className="text-center text-foreground/60">
            まだ記録がありません。
          </Card>
        ) : (
          <ul className="space-y-2">
            {sales.map((r) => (
              <li key={r.id}>
                <Link href={`/data/sales/${r.id}/edit`}>
                  <Card className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{r.month}</p>
                      <p className="text-sm text-foreground/60">
                        売上 {yen(r.sales)} / 目標 {yen(r.salesTarget)}
                      </p>
                    </div>
                    <span className="text-lg font-medium text-terracotta">
                      達成 {pct(r.achievementRate)}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* KPI */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Heading level={2}>KPI改善</Heading>
          <LinkButton href="/data/kpi/new" size="md">
            ＋ 追加
          </LinkButton>
        </div>
        {kpi.length === 0 ? (
          <Card className="text-center text-foreground/60">
            まだ記録がありません。
          </Card>
        ) : (
          <ul className="space-y-2">
            {kpi.map((r) => (
              <li key={r.id}>
                <Link href={`/data/kpi/${r.id}/edit`}>
                  <Card className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {r.month}・{r.kpiName}
                      </p>
                      <p className="text-sm text-foreground/60">
                        {r.beforeValue}
                        {r.unit} → {r.afterValue}
                        {r.unit}
                      </p>
                    </div>
                    <span className="text-lg font-medium text-olive">
                      {pct(r.changeRate)}
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* CPA */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Heading level={2}>施策CPA</Heading>
          <LinkButton href="/data/cpa/new" size="md">
            ＋ 追加
          </LinkButton>
        </div>
        {cpa.length === 0 ? (
          <Card className="text-center text-foreground/60">
            まだ記録がありません。
          </Card>
        ) : (
          <ul className="space-y-2">
            {cpa.map((r) => (
              <li key={r.id}>
                <Link href={`/data/cpa/${r.id}/edit`}>
                  <Card className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {r.month}・{r.campaignName}
                      </p>
                      <p className="text-sm text-foreground/60">
                        費用 {yen(r.cost)} / 獲得 {r.conversions}件
                      </p>
                    </div>
                    <span className="text-lg font-medium text-navy">
                      CPA {r.cpa === null ? '—' : yen(r.cpa)}
                    </span>
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
