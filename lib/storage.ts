import 'server-only';

/** 画像用途 → バケット・サイズ上限（api-endpoints.md §9.1）。Phase 1 は avatar/store/announcement。 */
export const IMAGE_PURPOSES = {
  avatar: { bucket: 'avatars', maxBytes: 512_000 },
  store: { bucket: 'stores', maxBytes: 1_572_864 },
  announcement: { bucket: 'contents', maxBytes: 2_097_152 },
} as const;

export type ImagePurpose = keyof typeof IMAGE_PURPOSES;

export function isImagePurpose(v: string): v is ImagePurpose {
  return v in IMAGE_PURPOSES;
}

/**
 * マジックバイト検証（api-endpoints.md §9.2）。
 * 拡張子・Content-Type の偽装に対し、先頭バイトで実体を確認する。
 */
export function detectImageType(
  bytes: Uint8Array,
): 'jpeg' | 'png' | 'webp' | null {
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'jpeg';
  }
  // PNG: 89 50 4E 47
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'png';
  }
  // WebP: 52 49 46 46 (RIFF) .. .. .. .. 57 45 42 50 (WEBP)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }
  return null;
}

/** Storage パスの先頭セグメントが指定ユーザー ID と一致するか（横取り防止）。 */
export function isOwnedPath(storagePath: string, userId: string): boolean {
  const segments = storagePath.split('/').filter(Boolean);
  return segments[0] === userId;
}

// ============================================================
// 画像配信プロキシ（single-domain-image-proxy.md §3）
// ブラウザは Supabase に直接アクセスせず、アプリの /api/img 経由で画像を取得する。
// これにより外部公開ドメインは marketing-camp.jp の1つで済む（api. サブドメイン不要）。
// ============================================================
export const IMAGE_BUCKETS = ['avatars', 'stores', 'contents'] as const;
export type ImageBucket = (typeof IMAGE_BUCKETS)[number];

export function isImageBucket(value: string): value is ImageBucket {
  return (IMAGE_BUCKETS as readonly string[]).includes(value);
}

/**
 * Storage 上の画像をアプリ経由で配信するための内部パスを返す。
 * Route Handler（app/api/img/[...path]）が受け、RLS 配下で download して返す。
 * 各セグメントを encodeURIComponent しつつ区切りの "/" は保持する。
 */
export function imageProxyPath(
  bucket: ImageBucket,
  storagePath: string,
): string {
  const encoded = storagePath.split('/').map(encodeURIComponent).join('/');
  return `/api/img/${bucket}/${encoded}`;
}
