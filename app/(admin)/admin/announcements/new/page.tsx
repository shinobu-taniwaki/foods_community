import type { Metadata } from 'next';
import Link from 'next/link';
import { Heading } from '@/components/ui/heading';
import { CreateAnnouncementForm } from './create-form';

export const metadata: Metadata = { title: 'お知らせ作成' };

export default function NewAnnouncementPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Heading level={1}>お知らせ作成</Heading>
        <Link href="/announcements" className="text-sm text-navy underline">
          一覧へ
        </Link>
      </div>
      <CreateAnnouncementForm />
    </div>
  );
}
