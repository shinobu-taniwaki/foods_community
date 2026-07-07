/**
 * 日付ユーティリティ。
 * サーバーの実行タイムゾーンに依存せず、日本時間（Asia/Tokyo）基準で扱う。
 */

/**
 * 日本時間での現在の年月を 'YYYY-MM' で返す（データ記録フォームの既定値用）。
 * new Date().toISOString() は UTC のため、JST の月初 0:00〜9:00 に
 * 前月へずれる問題があり、これを避ける。
 */
export function currentMonthJst(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
  });
  // en-CA ロケールは 'YYYY-MM' 形式を返す
  return formatter.format(new Date());
}
