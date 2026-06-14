/**
 * YouTube URL バリデーションと video_id 抽出（api-endpoints.md §10 / 設計書 §11.4）。
 * ホスト名ホワイトリスト + video_id 厳格パターンで XSS / 不正埋め込みを防ぐ。
 */

const ALLOWED_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
]);

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export interface YoutubeInfo {
  videoId: string;
  thumbnailUrl: string;
  embedUrl: string;
}

/** URL から video_id を抽出。不正なら null。 */
export function parseYoutubeUrl(url: string): YoutubeInfo | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  if (parsed.protocol !== 'https:') return null;
  if (!ALLOWED_HOSTS.has(parsed.hostname)) return null;

  let videoId: string | null = null;
  if (parsed.hostname === 'youtu.be') {
    videoId = parsed.pathname.slice(1);
  } else if (parsed.pathname === '/watch') {
    videoId = parsed.searchParams.get('v');
  } else if (parsed.pathname.startsWith('/shorts/')) {
    videoId = parsed.pathname.split('/')[2] ?? null;
  } else if (parsed.pathname.startsWith('/embed/')) {
    videoId = parsed.pathname.split('/')[2] ?? null;
  }

  if (!videoId || !VIDEO_ID_PATTERN.test(videoId)) return null;

  return {
    videoId,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
  };
}

/** video_id（保存済み）が安全な形式か。 */
export function isValidVideoId(videoId: string): boolean {
  return VIDEO_ID_PATTERN.test(videoId);
}
