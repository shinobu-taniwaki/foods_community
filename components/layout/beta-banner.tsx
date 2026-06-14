import { getBetaState, formatJaDate } from '@/lib/beta';

/** β期間中のみヘッダー直下に表示されるバナー（設計書 §13.3）。 */
export function BetaBanner() {
  const { active, endDate } = getBetaState();
  if (!active || !endDate) return null;

  return (
    <div className="bg-olive/10 px-4 py-2 text-center text-sm text-olive">
      🌱 βテスト期間中 〜 {formatJaDate(endDate)}まで（無料体験中）
    </div>
  );
}
