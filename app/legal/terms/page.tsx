import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = { title: '利用規約' };

/**
 * 利用規約。雛形は .claude/plans/details/legal/terms.md に存在。
 * 法務確認を経た最終版を Phase 5（ローンチ準備 §3.5.14）で本ページに反映する。
 */
export default function TermsPage() {
  return (
    <article className="space-y-4">
      <Heading level={1}>利用規約</Heading>
      <Alert variant="info">
        利用規約は現在、最終確認中です。確定版を公開までに掲載します。
      </Alert>
      <p className="text-foreground/70">
        本サービスをご利用いただく際の条件を定めた利用規約です。
        ご不明な点は運営までお問い合わせください。
      </p>
    </article>
  );
}
