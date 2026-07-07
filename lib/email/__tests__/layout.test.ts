import { describe, test, expect } from 'vitest';
import {
  escapeHtml,
  nl2br,
  formatJpDateTime,
  ctaButton,
  baseLayout,
} from '@/lib/email/layout';

describe('escapeHtml（メールへのユーザー入力埋め込み）', () => {
  test('HTML 特殊文字をすべてエスケープする', () => {
    expect(escapeHtml('<script>alert("x&y")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;',
    );
    expect(escapeHtml("It's fine")).toBe('It&#39;s fine');
  });

  test('日本語はそのまま通す', () => {
    expect(escapeHtml('こんにちは、田中さん')).toBe('こんにちは、田中さん');
  });
});

describe('nl2br', () => {
  test('改行（LF / CRLF）を <br> に変換する', () => {
    expect(nl2br('a\nb\r\nc')).toBe('a<br>b<br>c');
  });
});

describe('formatJpDateTime', () => {
  test('ISO 文字列を日本時間の日本語表記にする', () => {
    // Arrange: UTC 0時 = JST 9時
    const iso = '2026-07-07T00:00:00.000Z';

    // Act
    const formatted = formatJpDateTime(iso);

    // Assert
    expect(formatted).toContain('2026年7月7日');
    expect(formatted).toContain('09:00');
  });

  test('null は「無期限」', () => {
    expect(formatJpDateTime(null)).toBe('無期限');
  });
});

describe('ctaButton / baseLayout', () => {
  test('URL とラベルをエスケープして埋め込む', () => {
    const html = ctaButton('https://example.com/?a=1&b=2', 'ログイン<する>');
    expect(html).toContain('https://example.com/?a=1&amp;b=2');
    expect(html).toContain('ログイン&lt;する&gt;');
  });

  test('baseLayout は件名・プリヘッダー・本文を含む完全な HTML を返す', () => {
    const html = baseLayout({
      subject: '件名<テスト>',
      preheader: 'プレビュー文',
      contentHtml: '<p>本文</p>',
      appUrl: 'https://marketing-camp.jp',
    });
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('件名&lt;テスト&gt;');
    expect(html).toContain('プレビュー文');
    expect(html).toContain('<p>本文</p>');
    expect(html).toContain('https://marketing-camp.jp/legal/terms');
  });
});
