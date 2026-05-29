import imageCompression from 'browser-image-compression';

/**
 * クライアントサイド画像圧縮（設計書 §12.3）。
 * 用途別プリセットで長辺・品質・目標サイズを切り替える。HEIC は JPEG へ変換。
 */
export type ImagePreset =
  | 'avatar'
  | 'store'
  | 'post'
  | 'announcement'
  | 'data';

const PRESETS: Record<
  ImagePreset,
  { maxWidthOrHeight: number; initialQuality: number; maxSizeMB: number }
> = {
  avatar: { maxWidthOrHeight: 512, initialQuality: 0.8, maxSizeMB: 0.2 },
  store: { maxWidthOrHeight: 1280, initialQuality: 0.85, maxSizeMB: 0.8 },
  post: { maxWidthOrHeight: 1600, initialQuality: 0.85, maxSizeMB: 1.5 },
  announcement: { maxWidthOrHeight: 1600, initialQuality: 0.85, maxSizeMB: 1.5 },
  data: { maxWidthOrHeight: 1280, initialQuality: 0.85, maxSizeMB: 1.0 },
};

export async function compressImage(
  file: File,
  preset: ImagePreset,
): Promise<File> {
  const opts = {
    ...PRESETS[preset],
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  };
  return imageCompression(file, opts);
}
