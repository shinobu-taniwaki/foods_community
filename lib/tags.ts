/**
 * 投稿タグの slug 正規化（設計書 §7.2.4 / data-model post_tags.slug は ^[a-z0-9_-]+$）。
 * 小文字化 + 全角→半角(NFKC) + 記号をハイフン化。ASCII 英数字が残らない
 * （純粋な日本語ラベル等）場合は決定的ハッシュで 'tag-xxxx' を生成する。
 */
export function normalizeTagSlug(label: string): string {
  const base = label
    .trim()
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const slug = base.length > 0 ? base : `tag-${djb2Hex(label.trim())}`;
  return slug.slice(0, 50);
}

/** djb2 ハッシュを 16 進文字列で返す（決定的・ASCII 安全）。 */
function djb2Hex(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/** ラベルのバリデーション（1〜50文字）。 */
export function isValidTagLabel(label: string): boolean {
  const len = label.trim().length;
  return len >= 1 && len <= 50;
}
