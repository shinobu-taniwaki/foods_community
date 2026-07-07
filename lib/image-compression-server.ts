import 'server-only';
import sharp from 'sharp';

/**
 * サーバー側の画像圧縮（設計書 §12.3 の最終防衛線）。
 *
 * クライアント圧縮（lib/image-compression.ts）は UX のための事前処理で、
 * 迂回可能なため保存前に必ずここを通す。効果:
 * - 長辺を用途別の上限にリサイズ（拡大はしない）
 * - JPEG 再エンコードで容量を確実に削減（目標超過時は品質を段階的に下げる）
 * - EXIF メタデータの除去（位置情報などのプライバシー保護。向きは反映済み）
 */

export type ServerImagePreset = 'avatar' | 'post';

const PRESETS: Record<
  ServerImagePreset,
  { maxDimension: number; targetBytes: number }
> = {
  avatar: { maxDimension: 512, targetBytes: 200_000 },
  post: { maxDimension: 1600, targetBytes: 1_000_000 },
};

const QUALITY_STEPS = [80, 70, 60, 50] as const;

/**
 * 画像を用途別プリセットで再エンコードして返す。
 * どの品質でも目標容量を下回らない場合は最低品質の結果を返す
 * （それでも Storage 側のハード上限が最終ガードになる）。
 */
export async function compressImageServer(
  input: Uint8Array,
  preset: ServerImagePreset,
): Promise<Uint8Array> {
  const { maxDimension, targetBytes } = PRESETS[preset];

  // rotate(): EXIF の向きをピクセルに反映してからメタデータを落とす
  const base = sharp(input).rotate().resize({
    width: maxDimension,
    height: maxDimension,
    fit: 'inside',
    withoutEnlargement: true,
  });

  let smallest: Buffer | null = null;
  for (const quality of QUALITY_STEPS) {
    const encoded = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (smallest === null || encoded.length < smallest.length) {
      smallest = encoded;
    }
    if (encoded.length <= targetBytes) break;
  }

  // QUALITY_STEPS は空でないため smallest は必ず設定される
  return new Uint8Array(smallest ?? input);
}
