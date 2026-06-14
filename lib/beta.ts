/**
 * β期間バナーの表示判定（設計書 §13）。
 * NEXT_PUBLIC_BETA_MODE=true かつ 現在日 <= BETA_END_DATE の間だけ表示する。
 */
export function getBetaState(): { active: boolean; endDate: string | null } {
  const mode = process.env.NEXT_PUBLIC_BETA_MODE === 'true';
  const endDate = process.env.NEXT_PUBLIC_BETA_END_DATE ?? null;
  if (!mode || !endDate) return { active: false, endDate };

  const end = new Date(`${endDate}T23:59:59`);
  const active = !Number.isNaN(end.getTime()) && new Date() <= end;
  return { active, endDate };
}

/** 'YYYY-MM-DD' を「YYYY年M月D日」に整形。 */
export function formatJaDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return isoDate;
  return `${y}年${Number(m)}月${Number(d)}日`;
}
