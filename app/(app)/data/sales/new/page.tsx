import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { SalesForm } from '@/components/data/sales-form';
import { createSalesReport } from '../../actions';
import { currentMonthJst } from '@/lib/dates';

export const metadata: Metadata = { title: '売上報告を追加' };

export default function NewSalesPage() {
  const month = currentMonthJst();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>売上報告を追加</Heading>
        <Link href="/data" className="text-sm text-navy underline">
          データへ
        </Link>
      </div>
      <SalesForm
        action={createSalesReport}
        mode="create"
        defaults={{ month }}
      />
    </div>
  );
}
