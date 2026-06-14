import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/ui/heading';
import { createClient } from '@/lib/supabase/server';
import { KpiForm } from '@/components/data/kpi-form';
import { updateKpiReport } from '../../../actions';

export const metadata: Metadata = { title: 'KPI改善を編集' };

export default async function EditKpiPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from('kpi_reports')
    .select('id, month, kpi_name, before_value, after_value, unit, note')
    .eq('id', params.id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>KPI改善を編集</Heading>
        <Link href="/data" className="text-sm text-navy underline">
          データへ
        </Link>
      </div>
      <KpiForm
        action={updateKpiReport}
        mode="edit"
        defaults={{
          id: data.id,
          month: data.month,
          kpiName: data.kpi_name,
          beforeValue: Number(data.before_value),
          afterValue: Number(data.after_value),
          unit: data.unit,
          note: data.note ?? '',
        }}
      />
    </div>
  );
}
