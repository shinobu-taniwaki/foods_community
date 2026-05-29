import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';

interface ComingSoonProps {
  title: string;
  phase: string;
}

/** Phase 未実装画面の「準備中」表示。 */
export function ComingSoon({ title, phase }: ComingSoonProps) {
  return (
    <div className="space-y-4">
      <Heading level={1}>{title}</Heading>
      <Card className="space-y-2 text-center">
        <p className="text-3xl" aria-hidden>
          🛠️
        </p>
        <p className="text-foreground/70">この機能は現在準備中です。</p>
        <p className="text-sm text-foreground/50">{phase} で提供予定</p>
      </Card>
    </div>
  );
}
