'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { zodFieldErrors } from '@/lib/validation/common';
import { parseYoutubeUrl } from '@/lib/youtube';
import { err, type Result } from '@/lib/result';

const createSchema = z.object({
  category: z.enum(['important', 'news', 'column', 'seminar']),
  title: z.string().trim().min(1, 'タイトルを入力してください').max(100),
  body: z.string().trim().min(1, '本文を入力してください').max(10000),
  pinned: z.boolean(),
  requiredPlan: z.enum(['none', 'standard']),
  status: z.enum(['draft', 'published']),
  youtubeUrl: z.string().trim().optional().or(z.literal('')),
});

/**
 * お知らせ作成（admin 最小版）（api-endpoints.md §4.6 / dev-phases §3.1.7）。
 * 画像添付は Phase 4 で本格化。ここではテキスト + YouTube 1本まで。
 */
export async function createAnnouncement(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const admin = await requireAdmin();

  const parsed = createSchema.safeParse({
    category: formData.get('category'),
    title: formData.get('title'),
    body: formData.get('body'),
    pinned: formData.get('pinned') === 'on',
    requiredPlan: formData.get('requiredPlan') ?? 'none',
    status: formData.get('status') ?? 'draft',
    youtubeUrl: formData.get('youtubeUrl') ?? '',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  // YouTube URL を検証して video_id 抽出
  let video: { videoId: string; thumbnailUrl: string } | null = null;
  if (parsed.data.youtubeUrl) {
    const info = parseYoutubeUrl(parsed.data.youtubeUrl);
    if (!info) return err('INVALID_YOUTUBE_URL');
    video = { videoId: info.videoId, thumbnailUrl: info.thumbnailUrl };
  }

  const supabase = createClient();
  const publishedAt =
    parsed.data.status === 'published' ? new Date().toISOString() : null;

  const { data: content, error } = await supabase
    .from('contents')
    .insert({
      author_id: admin.id,
      category: parsed.data.category,
      title: parsed.data.title,
      body: parsed.data.body,
      pinned: parsed.data.pinned,
      required_plan:
        parsed.data.requiredPlan === 'standard' ? 'standard' : null,
      status: parsed.data.status,
      published_at: publishedAt,
    })
    .select('id')
    .single();
  if (error || !content) {
    return err('INTERNAL', undefined, { cause: error?.message });
  }

  if (video) {
    await supabase.from('content_attachments').insert({
      content_id: content.id,
      attachment_type: 'video_embed',
      external_url: `https://www.youtube.com/watch?v=${video.videoId}`,
      external_provider: 'youtube',
      video_id: video.videoId,
      thumbnail_url: video.thumbnailUrl,
      display_order: 0,
    });
  }

  // TODO(Phase5): status=published 時に全 active member へ new_announcement 通知 + メール
  redirect('/announcements');
}
