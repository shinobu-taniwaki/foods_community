import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { isStandardOrHigher } from '@/lib/plans';

/** データ記録はスタンダード以上の機能。trial は /upgrade へ誘導（設計書 §7.3.2）。 */
export default async function DataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireMember();
  if (!isStandardOrHigher(profile)) redirect('/upgrade');
  return <>{children}</>;
}
