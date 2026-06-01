import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { KpiForm } from '@/components/data/kpi-form';
import { createKpiReport } from '../../actions';

export const metadata: Metadata = { title: 'KPI改善を追加' };

export default function NewKpiPage() {
  const month = new Date().toISOString().slice(0, 7);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>KPI改善を追加</Heading>
        <Link href="/data" className="text-sm text-navy underline">
          データへ
        </Link>
      </div>
      <KpiForm action={createKpiReport} mode="create" defaults={{ month }} />
    </div>
  );
}
