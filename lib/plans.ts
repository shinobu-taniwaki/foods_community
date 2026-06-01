import type { CurrentProfile } from '@/lib/auth';

/** プラン rank（設計書 §2.2）。権限比較に使う。 */
export const PLAN_RANK: Record<string, number> = {
  trial: 0,
  standard: 1,
  premium: 2,
};

export const ADMIN_RANK = 999;
export const STANDARD_RANK = 1;

/** プロフィールの実効 rank（admin は最高）。 */
export function viewerRank(
  profile: Pick<CurrentProfile, 'role' | 'plan'>,
): number {
  if (profile.role === 'admin') return ADMIN_RANK;
  return profile.plan ? (PLAN_RANK[profile.plan] ?? -1) : -1;
}

/** standard 以上（投稿・コメント・データ入力の境界）。 */
export function isStandardOrHigher(
  profile: Pick<CurrentProfile, 'role' | 'plan'>,
): boolean {
  return viewerRank(profile) >= STANDARD_RANK;
}
