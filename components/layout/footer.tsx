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

  const linkClassName = 'inline-flex min-h-[44px] items-center underline';

  return (
    <footer className="border-t border-foreground/10 bg-cream">
      <div className="mx-auto max-w-column space-y-1 px-4 py-5 text-base text-foreground/70">
        <nav
          aria-label="フッターナビゲーション"
          className="flex flex-wrap items-center gap-x-6"
        >
          {inquiryUrl && (
            <a
              href={inquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              お問い合わせ
            </a>
          )}
          {bugReportUrl && (
            <a
              href={bugReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              不具合を報告する
            </a>
          )}
          <Link href="/legal/terms" className={linkClassName}>
            利用規約
          </Link>
          <Link href="/legal/privacy" className={linkClassName}>
            プライバシーポリシー
          </Link>
          <Link href="/legal/commerce" className={linkClassName}>
            特定商取引法に基づく表記
          </Link>
        </nav>
        <p className="text-sm text-foreground/50">
          © マーケティングCampコミュニティ
        </p>
      </div>
    </footer>
  );
}
