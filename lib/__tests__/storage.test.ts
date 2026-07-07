import { describe, test, expect } from 'vitest';
import {
  detectImageType,
  isOwnedPath,
  imageProxyPath,
  isImageBucket,
} from '@/lib/storage';

describe('detectImageType（マジックバイト検証）', () => {
  test('JPEG（FF D8 FF）を判定する', () => {
    expect(detectImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(
      'jpeg',
    );
  });

  test('PNG（89 50 4E 47）を判定する', () => {
    expect(
      detectImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])),
    ).toBe('png');
  });

  test('WebP（RIFF....WEBP）を判定する', () => {
    const bytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(detectImageType(bytes)).toBe('webp');
  });

  test('拡張子偽装（テキスト等）は null', () => {
    const text = new TextEncoder().encode('<script>alert(1)</script>');
    expect(detectImageType(text)).toBeNull();
    expect(detectImageType(new Uint8Array([]))).toBeNull();
  });
});

describe('isOwnedPath（Storage パスの横取り防止）', () => {
  const userId = '9de408c9-a959-490d-a96d-d8aeed6ec39f';

  test('先頭セグメントが自分の userId なら true', () => {
    expect(isOwnedPath(`${userId}/avatar-1.jpg`, userId)).toBe(true);
  });

  test('他人の userId・偽装パスは false', () => {
    expect(isOwnedPath('other-user/avatar.jpg', userId)).toBe(false);
    expect(isOwnedPath(`prefix/${userId}/avatar.jpg`, userId)).toBe(false);
    expect(isOwnedPath('', userId)).toBe(false);
  });
});

describe('imageProxyPath（単一ドメイン配信パス）', () => {
  test('/api/img/<bucket>/<path> 形式を返す', () => {
    expect(imageProxyPath('avatars', 'uid/avatar-1.jpg')).toBe(
      '/api/img/avatars/uid/avatar-1.jpg',
    );
  });

  test('各セグメントをエンコードしつつ区切りの / は保持する', () => {
    const path = imageProxyPath('avatars', 'uid/日本語 名前.jpg');
    expect(path).toContain('/api/img/avatars/uid/');
    expect(path).not.toContain(' ');
    expect(decodeURIComponent(path)).toBe('/api/img/avatars/uid/日本語 名前.jpg');
  });
});

describe('isImageBucket', () => {
  test('許可バケットのみ true', () => {
    expect(isImageBucket('avatars')).toBe(true);
    expect(isImageBucket('stores')).toBe(true);
    expect(isImageBucket('contents')).toBe(true);
    expect(isImageBucket('secrets')).toBe(false);
  });
});
