import { describe, test, expect } from 'vitest';
import sharp from 'sharp';
import { compressImageServer } from '@/lib/image-compression-server';

/** テスト用: 指定サイズの単色 JPEG を生成する。 */
async function makeJpeg(width: number, height: number): Promise<Uint8Array> {
  const buffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 192, g: 94, b: 63 },
    },
  })
    .jpeg({ quality: 100 })
    .toBuffer();
  return new Uint8Array(buffer);
}

describe('compressImageServer（保存前の必須圧縮）', () => {
  test('post: 長辺を 1600px 以下にリサイズする', async () => {
    // Arrange
    const input = await makeJpeg(3200, 2400);

    // Act
    const output = await compressImageServer(input, 'post');

    // Assert
    const meta = await sharp(Buffer.from(output)).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(1600);
    expect(meta.format).toBe('jpeg');
  });

  test('avatar: 長辺を 512px 以下にリサイズする', async () => {
    const input = await makeJpeg(2000, 2000);
    const output = await compressImageServer(input, 'avatar');
    const meta = await sharp(Buffer.from(output)).metadata();
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(512);
  });

  test('小さい画像は拡大しない', async () => {
    const input = await makeJpeg(400, 300);
    const output = await compressImageServer(input, 'post');
    const meta = await sharp(Buffer.from(output)).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  test('EXIF メタデータを除去する（位置情報等のプライバシー保護）', async () => {
    // Arrange: EXIF 付きの画像を生成
    const withExif = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .jpeg()
      .withMetadata({ exif: { IFD0: { Copyright: 'test-exif-data' } } })
      .toBuffer();
    const inputMeta = await sharp(withExif).metadata();
    expect(inputMeta.exif).toBeDefined();

    // Act
    const output = await compressImageServer(new Uint8Array(withExif), 'post');

    // Assert
    const outputMeta = await sharp(Buffer.from(output)).metadata();
    expect(outputMeta.exif).toBeUndefined();
  });

  test('画像でないデータは例外を投げる（呼び出し側でハンドリング）', async () => {
    const notImage = new TextEncoder().encode('not an image');
    await expect(compressImageServer(notImage, 'post')).rejects.toThrow();
  });
});
