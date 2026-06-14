import type { Metadata } from 'next';
import { Heading } from '@/components/ui/heading';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = { title: 'プライバシーポリシー' };

/**
 * プライバシーポリシー。雛形は .claude/plans/details/legal/privacy.md に存在。
 * 法務確認を経た最終版を Phase 5 で本ページに反映する。
 */
export default function PrivacyPage() {
  return (
    <article className="space-y-4">
      <Heading level={1}>プライバシーポリシー</Heading>
      <Alert variant="info">
        プライバシーポリシーは現在、最終確認中です。確定版を公開までに掲載します。
      </Alert>
      <p className="text-foreground/70">
        本サービスは、取得した個人情報を適切に管理し、法令に基づき取り扱います。
      </p>
    </article>
  );
}
