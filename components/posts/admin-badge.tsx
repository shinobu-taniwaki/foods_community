/**
 * 運営（admin）の投稿・コメントに付ける識別バッジ。
 * 50代向けに色だけに頼らず「運営」の文字で明示する（設計書 §6 高コントラスト方針）。
 */
export function AdminBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-terracotta px-2 py-0.5 text-xs font-medium text-cream">
      運営
    </span>
  );
}
