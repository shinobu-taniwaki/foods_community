import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/ui/heading';
import { createClient } from '@/lib/supabase/server';
import { CpaForm } from '@/components/data/cpa-form';
import { updateCpaReport } from '../../../actions';

export const metadata: Metadata = { title: '施策CPAを編集' };

export default async function EditCpaPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from('cpa_reports')
    .select('id, month, campaign_name, cost, conversions, note')
    .eq('id', params.id)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>施策CPAを編集</Heading>
        <Link href="/data" className="text-sm text-navy underline">
          データへ
        </Link>
      </div>
      <CpaForm
        action={updateCpaReport}
        mode="edit"
        defaults={{
          id: data.id,
          month: data.month,
          campaignName: data.campaign_name,
          cost: Number(data.cost),
          conversions: data.conversions,
          note: data.note ?? '',
        }}
      />
    </div>
  );
}
