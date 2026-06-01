import 'server-only';
import { headers } from 'next/headers';

/**
 * 現在のリクエストからアプリのオリジン（https://host）を組み立てる。
 * OAuth / Magic Link の emailRedirectTo に使用する。
 */
export function getSiteOrigin(): string {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto =
    h.get('x-forwarded-proto') ??
    (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}
