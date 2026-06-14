/**
 * Google フォーム連携（設計書 §10）。
 * NEXT_PUBLIC_FORM_* の URL に prefill（entry.xxx）を付与して返す。
 * URL 未設定の場合は null（UI 側で「準備中」を表示）。
 */
export type FormKey =
  | 'PLAN_UPGRADE'
  | 'WITHDRAWAL'
  | 'INQUIRY'
  | 'BUG_REPORT'
  | 'SEMINAR';

const FORM_URLS: Record<FormKey, string | undefined> = {
  PLAN_UPGRADE: process.env.NEXT_PUBLIC_FORM_PLAN_UPGRADE,
  WITHDRAWAL: process.env.NEXT_PUBLIC_FORM_WITHDRAWAL,
  INQUIRY: process.env.NEXT_PUBLIC_FORM_INQUIRY,
  BUG_REPORT: process.env.NEXT_PUBLIC_FORM_BUG_REPORT,
  SEMINAR: process.env.NEXT_PUBLIC_FORM_SEMINAR,
};

export function getFormUrl(
  key: FormKey,
  prefill?: Record<string, string | undefined>,
): string | null {
  const base = FORM_URLS[key];
  if (!base) return null;
  if (!prefill) return base;

  const url = new URL(base);
  for (const [entryId, value] of Object.entries(prefill)) {
    if (entryId && value) url.searchParams.set(entryId, value);
  }
  return url.toString();
}
