import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = { title: '特定商取引法に基づく表記' };

/**
 * 特定商取引法に基づく表記。雛形は .claude/plans/details/legal/sctl.md に存在。
 * 事業者情報（住所・電話番号等）の確定版を Phase 5（ローンチ準備 §3.5.14）で反映する。
 */
export default function CommercePage() {
  return (
    <article className="space-y-4">
      <Heading level={1}>特定商取引法に基づく表記</Heading>
      <Alert variant="info">
        特定商取引法に基づく表記は現在、最終確認中です。確定版を公開までに掲載します。
      </Alert>
      <p className="text-foreground/70">
        本サービスの販売事業者・料金・お支払い方法などを定めた表記です。
        ご不明な点は運営までお問い合わせください。
      </p>
    </article>
  );
}
