import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { CpaForm } from '@/components/data/cpa-form';
import { createCpaReport } from '../../actions';
import { currentMonthJst } from '@/lib/dates';

export const metadata: Metadata = { title: '施策CPAを追加' };

export default function NewCpaPage() {
  const month = currentMonthJst();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>施策CPAを追加</Heading>
        <Link href="/data" className="text-sm text-navy underline">
          データへ
        </Link>
      </div>
      <CpaForm action={createCpaReport} mode="create" defaults={{ month }} />
    </div>
  );
}
