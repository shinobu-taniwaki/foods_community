import { describe, test, expect } from 'vitest';
import { ok, err, getErrorMessage } from '@/lib/result';

describe('ok / err', () => {
  test('ok は data を包んで返す', () => {
    expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } });
  });

  test('err はコードに応じた日本語メッセージを補完する', () => {
    const result = err('UNAUTHORIZED');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('UNAUTHORIZED');
      expect(result.error.message).toBe('ログインが必要です。');
    }
  });

  test('err はメッセージ・details を上書きできる', () => {
    const result = err('VALIDATION_FAILED', 'カスタム', {
      fields: { email: '不正です' },
    });
    if (!result.ok) {
      expect(result.error.message).toBe('カスタム');
      expect(result.error.details?.fields?.email).toBe('不正です');
    }
  });
});

describe('getErrorMessage', () => {
  test('Error インスタンスは message を返す', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  test('Error 以外は固定文言', () => {
    expect(getErrorMessage('string')).toBe('不明なエラー');
    expect(getErrorMessage(undefined)).toBe('不明なエラー');
  });
});
