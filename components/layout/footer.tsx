import Link from 'next/link';
import { getFormUrl } from '@/lib/forms';

/**
 * アプリ内フッター（dev-phases §3.5.6）。
 * お問い合わせ・不具合報告（Google フォーム）と法的ページへの導線。
 * フォーム URL 未設定時はそのリンクだけ非表示にする。
 */
export function AppFooter() {
  const inquiryUrl = getFormUrl('INQUIRY');
  const bugReportUrl = getFormUrl('BUG_REPORT');

  return (
    <footer className="border-t border-foreground/10 bg-cream">
      <div className="mx-auto max-w-column space-y-3 px-4 py-6 text-sm text-foreground/60">
        <nav
          aria-label="フッターナビゲーション"
          className="flex flex-wrap gap-x-5 gap-y-2"
        >
          {inquiryUrl && (
            <a
              href={inquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              お問い合わせ
            </a>
          )}
          {bugReportUrl && (
            <a
              href={bugReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              不具合を報告する
            </a>
          )}
          <Link href="/legal/terms" className="underline">
            利用規約
          </Link>
          <Link href="/legal/privacy" className="underline">
            プライバシーポリシー
          </Link>
          <Link href="/legal/commerce" className="underline">
            特定商取引法に基づく表記
          </Link>
        </nav>
        <p className="text-xs text-foreground/40">
          © マーケティングCampコミュニティ
        </p>
      </div>
    </footer>
  );
}
