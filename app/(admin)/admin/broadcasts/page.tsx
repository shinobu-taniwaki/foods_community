import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { isEmailEnabled } from '@/lib/email/send';
import { BroadcastForm } from './broadcast-form';

export const metadata: Metadata = { title: '全体通知' };

export default function BroadcastsPage() {
  return (
    <div className="space-y-5">
      <Heading level={1}>全体通知</Heading>
      <p className="text-foreground/70">
        すべてのアクティブなメンバーに通知を送信します。
        メンバーはこの通知をオフにできません。重要な連絡にのみ使ってください。
      </p>
      <BroadcastForm emailEnabled={isEmailEnabled()} />
    </div>
  );
}
