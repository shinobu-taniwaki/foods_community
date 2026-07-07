import { describe, test, expect, beforeEach, vi } from 'vitest';

/**
 * lib/forms.ts は module 読み込み時に NEXT_PUBLIC_FORM_* を評価するため、
 * 各テストで vi.stubEnv → vi.resetModules → dynamic import の順で読み直す。
 */
async function loadGetFormUrl() {
  vi.resetModules();
  const mod = await import('@/lib/forms');
  return mod.getFormUrl;
}

describe('getFormUrl', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  test('URL 未設定なら null（UI は準備中表示）', async () => {
    vi.stubEnv('NEXT_PUBLIC_FORM_INQUIRY', '');
    const getFormUrl = await loadGetFormUrl();
    expect(getFormUrl('INQUIRY')).toBeNull();
  });

  test('不正な URL は未設定と同じく null', async () => {
    vi.stubEnv('NEXT_PUBLIC_FORM_INQUIRY', 'not-a-url');
    const getFormUrl = await loadGetFormUrl();
    expect(getFormUrl('INQUIRY')).toBeNull();
  });

  test('設定済みならその URL を返す', async () => {
    vi.stubEnv(
      'NEXT_PUBLIC_FORM_INQUIRY',
      'https://docs.google.com/forms/d/e/xxx/viewform',
    );
    const getFormUrl = await loadGetFormUrl();
    expect(getFormUrl('INQUIRY')).toBe(
      'https://docs.google.com/forms/d/e/xxx/viewform',
    );
  });

  test('prefill の entry ID をクエリに付与する（空の値・キーはスキップ）', async () => {
    vi.stubEnv(
      'NEXT_PUBLIC_FORM_PLAN_UPGRADE',
      'https://docs.google.com/forms/d/e/yyy/viewform',
    );
    const getFormUrl = await loadGetFormUrl();

    const url = getFormUrl('PLAN_UPGRADE', {
      'entry.111': '田中 久子',
      'entry.222': undefined,
      '': 'ignored',
    });

    const parsed = new URL(url ?? '');
    expect(parsed.searchParams.get('entry.111')).toBe('田中 久子');
    expect(parsed.searchParams.has('entry.222')).toBe(false);
    expect(Array.from(parsed.searchParams.keys())).toEqual(['entry.111']);
  });
});
