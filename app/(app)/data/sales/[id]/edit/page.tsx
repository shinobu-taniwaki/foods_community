import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/ui/heading';
import { createClient } from '@/lib/supabase/server';
import { SalesForm } from '@/components/data/sales-form';
import { updateSalesReport } from '../../../actions';

export const metadata: Metadata = { title: '売上報告を編集' };

export default async function EditSalesPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from('sales_reports')
    .select('id, month, sales, sales_target, initiatives_count, note')
    .eq('id', params.id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>売上報告を編集</Heading>
        <Link href="/data" className="text-sm text-navy underline">
          データへ
        </Link>
      </div>
      <SalesForm
        action={updateSalesReport}
        mode="edit"
        defaults={{
          id: data.id,
          month: data.month,
          sales: Number(data.sales),
          salesTarget: Number(data.sales_target),
          initiativesCount: data.initiatives_count,
          note: data.note ?? '',
        }}
      />
    </div>
  );
}
