import { describe, test, expect } from 'vitest';
import { parseYoutubeUrl, isValidVideoId } from '@/lib/youtube';

describe('parseYoutubeUrl', () => {
  test('watch URL から video_id を抽出する', () => {
    // Arrange
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    // Act
    const info = parseYoutubeUrl(url);

    // Assert
    expect(info?.videoId).toBe('dQw4w9WgXcQ');
    expect(info?.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(info?.thumbnailUrl).toContain('dQw4w9WgXcQ');
  });

  test('youtu.be 短縮 URL を受け付ける', () => {
    const info = parseYoutubeUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(info?.videoId).toBe('dQw4w9WgXcQ');
  });

  test('shorts / embed パスを受け付ける', () => {
    expect(
      parseYoutubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.videoId,
    ).toBe('dQw4w9WgXcQ');
    expect(
      parseYoutubeUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')?.videoId,
    ).toBe('dQw4w9WgXcQ');
  });

  test('http（非 https）は拒否する', () => {
    expect(parseYoutubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  test('ホワイトリスト外のホストは拒否する', () => {
    expect(
      parseYoutubeUrl('https://evil.example.com/watch?v=dQw4w9WgXcQ'),
    ).toBeNull();
    expect(
      parseYoutubeUrl('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'),
    ).toBeNull();
  });

  test('video_id が 11 文字の許可文字でなければ拒否する', () => {
    expect(parseYoutubeUrl('https://youtu.be/short')).toBeNull();
    expect(
      parseYoutubeUrl('https://www.youtube.com/watch?v=<script>bad'),
    ).toBeNull();
  });

  test('URL でない文字列は null を返す', () => {
    expect(parseYoutubeUrl('こんにちは')).toBeNull();
    expect(parseYoutubeUrl('')).toBeNull();
  });
});

describe('isValidVideoId', () => {
  test('11 文字の英数字・ハイフン・アンダースコアのみ許可する', () => {
    expect(isValidVideoId('dQw4w9WgXcQ')).toBe(true);
    expect(isValidVideoId('abc')).toBe(false);
    expect(isValidVideoId('dQw4w9WgXcQ2')).toBe(false);
    expect(isValidVideoId('dQw4w9WgXc"')).toBe(false);
  });
});
