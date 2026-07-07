'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireMember } from '@/lib/auth';
import { getChannel } from '@/lib/channels';
import { IMAGE_PURPOSES, detectImageType } from '@/lib/storage';
import { compressImageServer } from '@/lib/image-compression-server';
import { viewerRank, isStandardOrHigher, PLAN_RANK } from '@/lib/plans';
import { normalizeTagSlug } from '@/lib/tags';
import { parseYoutubeUrl } from '@/lib/youtube';
import { zodFieldErrors } from '@/lib/validation/common';
import { ok, err, getErrorMessage, type Result } from '@/lib/result';
import { writeAuditLog } from '@/lib/audit';
import {
  notifyNewPost,
  notifyComment,
  notifyLike,
  notifyPostModeratedByAdmin,
} from '@/lib/notifications/dispatch';

const uuid = z.string().uuid();

/** 投稿に添付できる画像の上限枚数（設計書 §11）。 */
const POST_IMAGE_MAX = 3;

interface ValidatedImage {
  bytes: Uint8Array;
}

/**
 * FormData の添付画像を検証して返す（枚数・サイズ・マジックバイト）。
 * 不正があれば Result のエラーを返す。
 */
async function validatePostImages(
  formData: FormData,
): Promise<Result<ValidatedImage[]>> {
  const files = formData
    .getAll('images')
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length > POST_IMAGE_MAX) {
    return err('TOO_MANY_ATTACHMENTS', `画像は${POST_IMAGE_MAX}枚までです。`);
  }

  const images: ValidatedImage[] = [];
  for (const file of files) {
    if (file.size > IMAGE_PURPOSES.post.maxBytes) return err('FILE_TOO_LARGE');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (detectImageType(bytes) === null) return err('INVALID_FILE_TYPE');
    images.push({ bytes });
  }
  return ok(images);
}

const postSchema = z.object({
  channelId: z.string().min(1),
  title: z.string().trim().min(1, 'タイトルを入力してください').max(100),
  content: z.string().trim().min(1, '本文を入力してください').max(5000),
  tagLabels: z
    .array(z.string().trim().min(1).max(50))
    .max(5, 'タグは最大5個までです'),
  youtubeUrl: z.string().trim().optional().or(z.literal('')),
});

function parseTagLabels(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  // カンマ区切りで受け取り、重複除去
  const labels = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return Array.from(new Set(labels)).slice(0, 5);
}

/** 投稿作成（api-endpoints.md §5.3）。 */
export async function createPost(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const profile = await requireMember();

  // trial は投稿不可（standard 以上）
  if (!isStandardOrHigher(profile)) {
    return err(
      'FORBIDDEN',
      '投稿はスタンダードプラン以上でご利用いただけます。',
    );
  }

  const parsed = postSchema.safeParse({
    channelId: formData.get('channelId'),
    title: formData.get('title'),
    content: formData.get('content'),
    tagLabels: parseTagLabels(formData.get('tagLabels')),
    youtubeUrl: formData.get('youtubeUrl') ?? '',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const channel = await getChannel(parsed.data.channelId);
  if (!channel) return err('NOT_FOUND', 'チャンネルが見つかりません。');
  if (channel.onlyAdminCanPost && profile.role !== 'admin') {
    return err('FORBIDDEN', 'このチャンネルには運営のみ投稿できます。');
  }
  if (viewerRank(profile) < (PLAN_RANK[channel.requiredPlan] ?? 0)) {
    return err('FORBIDDEN');
  }

  // 動画は admin のみ
  let video: { videoId: string; thumbnailUrl: string } | null = null;
  if (parsed.data.youtubeUrl) {
    if (profile.role !== 'admin') {
      return err('FORBIDDEN', '動画の添付は運営のみ可能です。');
    }
    const info = parseYoutubeUrl(parsed.data.youtubeUrl);
    if (!info) return err('INVALID_YOUTUBE_URL');
    video = { videoId: info.videoId, thumbnailUrl: info.thumbnailUrl };
  }

  // 添付画像の検証は投稿 INSERT より前に行う（不正画像で中途半端な投稿を作らない）
  const validatedImages = await validatePostImages(formData);
  if (!validatedImages.ok) return validatedImages;

  const supabase = createClient();
  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      author_id: profile.id,
      channel_id: parsed.data.channelId,
      title: parsed.data.title,
      content: parsed.data.content,
    })
    .select('id')
    .single();
  if (error || !post)
    return err('INTERNAL', undefined, { cause: error?.message });

  // タグ: slug で既存照合 → 無ければ作成 → 割当
  for (const label of parsed.data.tagLabels) {
    const slug = normalizeTagSlug(label);
    const tagId = await upsertTag(label, slug, profile.id);
    if (tagId) {
      await supabase
        .from('post_tag_assignments')
        .insert({ post_id: post.id, tag_id: tagId });
    }
  }

  if (video) {
    await supabase.from('post_attachments').insert({
      post_id: post.id,
      attachment_type: 'video_embed',
      external_url: `https://www.youtube.com/watch?v=${video.videoId}`,
      external_provider: 'youtube',
      video_id: video.videoId,
      thumbnail_url: video.thumbnailUrl,
      display_order: 0,
    });
  }

  // 添付画像: サーバー側で必ず再圧縮（リサイズ・容量削減・EXIF除去）してから
  // posts バケットへアップロード → post_attachments に登録
  // （検証済み。個別の失敗は投稿全体を巻き込まずログに残す）
  const imageOffset = video ? 1 : 0;
  for (const [index, image] of validatedImages.data.entries()) {
    const storagePath = `${profile.id}/post-${post.id}-${index}.jpg`;
    let compressed: Uint8Array;
    try {
      compressed = await compressImageServer(image.bytes, 'post');
    } catch (cause: unknown) {
      console.error('[post-image] サーバー圧縮失敗', {
        postId: post.id,
        index,
        error: getErrorMessage(cause),
      });
      continue;
    }
    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(storagePath, compressed, {
        contentType: 'image/jpeg',
        upsert: false,
      });
    if (uploadError) {
      console.error('[post-image] アップロード失敗', {
        postId: post.id,
        index,
        error: uploadError.message,
      });
      continue;
    }
    const { error: attachError } = await supabase
      .from('post_attachments')
      .insert({
        post_id: post.id,
        attachment_type: 'image',
        storage_path: storagePath,
        display_order: imageOffset + index,
      });
    if (attachError) {
      console.error('[post-image] 添付登録失敗', {
        postId: post.id,
        index,
        error: attachError.message,
      });
      await supabase.storage.from('posts').remove([storagePath]);
    }
  }

  await notifyNewPost({
    postId: post.id,
    postTitle: parsed.data.title,
    authorId: profile.id,
    authorName: profile.display_name,
    channelLabel: channel.label,
    channelRequiredPlan: channel.requiredPlan,
  });

  revalidatePath('/feed');
  redirect(`/feed/${post.id}`);
}

/** slug でタグを照合し、無ければ作成して id を返す。 */
async function upsertTag(
  label: string,
  slug: string,
  createdBy: string,
): Promise<string | null> {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('post_tags')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('post_tags')
    .insert({ label, slug, created_by: createdBy })
    .select('id')
    .single();
  if (created) return created.id;

  // 競合（同時作成）時は再取得
  if (error) {
    const { data: again } = await supabase
      .from('post_tags')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    return again?.id ?? null;
  }
  return null;
}

const updateSchema = z.object({
  id: uuid,
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(1).max(5000),
  tagLabels: z.array(z.string().trim().min(1).max(50)).max(5),
});

/** 投稿更新（api-endpoints.md §5.4）。著者本人 or admin。 */
export async function updatePost(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const profile = await requireMember();
  const parsed = updateSchema.safeParse({
    id: formData.get('id'),
    title: formData.get('title'),
    content: formData.get('content'),
    tagLabels: parseTagLabels(formData.get('tagLabels')),
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', parsed.data.id)
    .is('deleted_at', null)
    .maybeSingle();
  if (!existing) return err('NOT_FOUND');

  const isAuthor = existing.author_id === profile.id;
  const isAdmin = profile.role === 'admin';
  if (!isAuthor && !isAdmin) return err('FORBIDDEN');

  const { error } = await supabase
    .from('posts')
    .update({
      title: parsed.data.title,
      content: parsed.data.content,
      last_edited_at: new Date().toISOString(),
      last_editor_id: profile.id,
      ...(isAdmin && !isAuthor ? { edited_by_admin: true } : {}),
    })
    .eq('id', parsed.data.id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  // タグ再設定（全置換）
  await supabase
    .from('post_tag_assignments')
    .delete()
    .eq('post_id', parsed.data.id);
  for (const label of parsed.data.tagLabels) {
    const slug = normalizeTagSlug(label);
    const tagId = await upsertTag(label, slug, profile.id);
    if (tagId) {
      await supabase
        .from('post_tag_assignments')
        .insert({ post_id: parsed.data.id, tag_id: tagId });
    }
  }

  if (isAdmin && !isAuthor) {
    await notifyPostModeratedByAdmin({
      recipientId: existing.author_id,
      adminId: profile.id,
      type: 'post_edited_by_admin',
      postId: parsed.data.id,
      postTitle: parsed.data.title,
    });
    await writeAuditLog({
      actorId: profile.id,
      actionType: 'post_edited_by_admin',
      targetType: 'post',
      targetId: parsed.data.id,
      payload: { title: parsed.data.title, authorId: existing.author_id },
    });
  }

  revalidatePath(`/feed/${parsed.data.id}`);
  redirect(`/feed/${parsed.data.id}`);
}

/** 投稿削除（論理削除）（api-endpoints.md §5.5）。 */
export async function deletePost(postId: string): Promise<Result<null>> {
  const profile = await requireMember();
  if (!uuid.safeParse(postId).success) return err('NOT_FOUND');

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('posts')
    .select('author_id, title')
    .eq('id', postId)
    .is('deleted_at', null)
    .maybeSingle();
  if (!existing) return err('NOT_FOUND');
  const isAdmin = profile.role === 'admin';
  if (existing.author_id !== profile.id && !isAdmin) {
    return err('FORBIDDEN');
  }

  const { error } = await supabase
    .from('posts')
    .update({ deleted_at: new Date().toISOString(), deleted_by: profile.id })
    .eq('id', postId);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  if (isAdmin && existing.author_id !== profile.id) {
    await notifyPostModeratedByAdmin({
      recipientId: existing.author_id,
      adminId: profile.id,
      type: 'post_deleted_by_admin',
      postId,
      postTitle: existing.title,
    });
    await writeAuditLog({
      actorId: profile.id,
      actionType: 'post_deleted_by_admin',
      targetType: 'post',
      targetId: postId,
      payload: { title: existing.title, authorId: existing.author_id },
    });
  }

  revalidatePath('/feed');
  return ok(null);
}

/** いいねトグル（api-endpoints.md §5.6）。 */
export async function togglePostLike(
  postId: string,
): Promise<Result<{ liked: boolean; likeCount: number }>> {
  const profile = await requireMember();
  if (!uuid.safeParse(postId).success) return err('NOT_FOUND');

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('post_likes')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', profile.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', profile.id);
  } else {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: profile.id });
    if (error) return err('NOT_FOUND');

    const { data: post } = await supabase
      .from('posts')
      .select('author_id, title')
      .eq('id', postId)
      .maybeSingle();
    if (post) {
      await notifyLike({
        postId,
        postTitle: post.title,
        postAuthorId: post.author_id,
        likerId: profile.id,
        likerName: profile.display_name,
      });
    }
  }

  const { count } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  revalidatePath(`/feed/${postId}`);
  return ok({ liked: !existing, likeCount: count ?? 0 });
}

const commentSchema = z.object({
  postId: uuid,
  body: z.string().trim().min(1, 'コメントを入力してください').max(1000),
});

/** コメント作成（api-endpoints.md §5.7）。standard 以上。 */
export async function createPostComment(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const profile = await requireMember();
  if (!isStandardOrHigher(profile)) {
    return err(
      'FORBIDDEN',
      'コメントはスタンダードプラン以上でご利用いただけます。',
    );
  }
  const parsed = commentSchema.safeParse({
    postId: formData.get('postId'),
    body: formData.get('body'),
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { error } = await supabase.from('post_comments').insert({
    post_id: parsed.data.postId,
    author_id: profile.id,
    body: parsed.data.body,
  });
  if (error) return err('NOT_FOUND');

  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', parsed.data.postId)
    .maybeSingle();
  if (post) {
    await notifyComment({
      postId: parsed.data.postId,
      postAuthorId: post.author_id,
      commenterId: profile.id,
      commenterName: profile.display_name,
      commentBody: parsed.data.body,
    });
  }

  revalidatePath(`/feed/${parsed.data.postId}`);
  return ok(null);
}

/** コメント削除（論理削除）（api-endpoints.md §5.8）。 */
export async function deletePostComment(
  commentId: string,
  postId: string,
): Promise<Result<null>> {
  await requireMember();
  if (!uuid.safeParse(commentId).success) return err('NOT_FOUND');

  const supabase = createClient();
  const { error } = await supabase
    .from('post_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId);
  if (error) return err('FORBIDDEN');

  revalidatePath(`/feed/${postId}`);
  return ok(null);
}
