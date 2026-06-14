import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Heading } from '@/components/ui/heading';
import { createClient } from '@/lib/supabase/server';
import { EditAnnouncementForm } from '../../edit-form';

export const metadata: Metadata = { title: 'お知らせを編集' };

export default async function EditAnnouncementPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from('contents')
    .select('id, category, title, body, pinned, required_plan, status')
    .eq('id', params.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!data) notFound();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>お知らせを編集</Heading>
        <Link href="/admin/announcements" className="text-sm text-navy underline">
          一覧へ
        </Link>
      </div>
      <EditAnnouncementForm
        defaults={{
          id: data.id,
          category: data.category,
          title: data.title,
          body: data.body,
          pinned: data.pinned,
          requiredPlan: data.required_plan === 'standard' ? 'standard' : 'none',
          status: data.status === 'published' ? 'published' : 'draft',
        }}
      />
    </div>
  );
}
