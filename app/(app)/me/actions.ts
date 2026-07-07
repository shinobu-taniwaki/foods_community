'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireMember } from '@/lib/auth';
import {
  emojiSchema,
  optionalHttpsUrlSchema,
  zodFieldErrors,
} from '@/lib/validation/common';
import {
  IMAGE_PURPOSES,
  detectImageType,
  imageProxyPath,
} from '@/lib/storage';
import { ok, err, type Result } from '@/lib/result';

function revalidateProfile() {
  revalidatePath('/me');
  revalidatePath('/me/settings/profile');
}

// ============================================================
// 個人セクション（§3.2）
// ============================================================
const personalSchema = z.object({
  displayName: z.string().trim().min(1, '表示名を入力してください').max(30),
  avatar: emojiSchema,
  bio: z.string().trim().max(500).optional().or(z.literal('')),
});

export async function updatePersonalProfile(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const profile = await requireMember();
  const parsed = personalSchema.safeParse({
    displayName: formData.get('displayName'),
    avatar: formData.get('avatar'),
    bio: formData.get('bio') ?? '',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: parsed.data.displayName,
      avatar: parsed.data.avatar,
      bio: parsed.data.bio ? parsed.data.bio : null,
    })
    .eq('id', profile.id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  revalidateProfile();
  return ok(null);
}

// ============================================================
// 屋号・お店セクション（§3.3）
// ============================================================
const storeSchema = z.object({
  storeName: z.string().trim().max(100).optional().or(z.literal('')),
  region: z.string().trim().max(100).optional().or(z.literal('')),
  product: z.string().trim().max(200).optional().or(z.literal('')),
  storeDescription: z.string().trim().max(1000).optional().or(z.literal('')),
  storeImagePath: z.string().trim().optional().or(z.literal('')),
});

export async function updateStoreProfile(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const profile = await requireMember();
  const parsed = storeSchema.safeParse({
    storeName: formData.get('storeName') ?? '',
    region: formData.get('region') ?? '',
    product: formData.get('product') ?? '',
    storeDescription: formData.get('storeDescription') ?? '',
    storeImagePath: formData.get('storeImagePath') ?? '',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      store_name: parsed.data.storeName ?? '',
      region: parsed.data.region ?? '',
      product: parsed.data.product ?? '',
      store_description: parsed.data.storeDescription
        ? parsed.data.storeDescription
        : null,
      ...(parsed.data.storeImagePath
        ? { store_image_path: parsed.data.storeImagePath }
        : {}),
    })
    .eq('id', profile.id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  revalidateProfile();
  return ok(null);
}

// ============================================================
// 会社情報セクション（§3.4）
// ============================================================
const companySchema = z.object({
  companyName: z.string().trim().max(100).optional().or(z.literal('')),
  businessType: z.string().trim().max(50).optional().or(z.literal('')),
  companyAddress: z.string().trim().max(200).optional().or(z.literal('')),
  companyPhone: z.string().trim().max(20).optional().or(z.literal('')),
  websiteUrl: optionalHttpsUrlSchema,
  instagram: optionalHttpsUrlSchema,
  x: optionalHttpsUrlSchema,
  tiktok: optionalHttpsUrlSchema,
});

export async function updateCompanyProfile(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const profile = await requireMember();
  const parsed = companySchema.safeParse({
    companyName: formData.get('companyName') ?? '',
    businessType: formData.get('businessType') ?? '',
    companyAddress: formData.get('companyAddress') ?? '',
    companyPhone: formData.get('companyPhone') ?? '',
    websiteUrl: formData.get('websiteUrl') ?? '',
    instagram: formData.get('instagram') ?? '',
    x: formData.get('x') ?? '',
    tiktok: formData.get('tiktok') ?? '',
  });
  if (!parsed.success) {
    const hasUrlError = parsed.error.issues.some(
      (i) => i.message.includes('https') || i.message.includes('URL'),
    );
    return err(
      hasUrlError ? 'URL_SCHEME_FORBIDDEN' : 'VALIDATION_FAILED',
      undefined,
      {
        fields: zodFieldErrors(parsed.error),
      },
    );
  }

  const social: Record<string, string> = {};
  if (parsed.data.instagram) social.instagram = parsed.data.instagram;
  if (parsed.data.x) social.x = parsed.data.x;
  if (parsed.data.tiktok) social.tiktok = parsed.data.tiktok;

  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      company_name: parsed.data.companyName || null,
      business_type: parsed.data.businessType || null,
      company_address: parsed.data.companyAddress || null,
      company_phone: parsed.data.companyPhone || null,
      website_url: parsed.data.websiteUrl,
      social_links: Object.keys(social).length > 0 ? social : null,
    })
    .eq('id', profile.id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  revalidateProfile();
  return ok(null);
}

// ============================================================
// 販売ジャンル（§3.5）最大5個。delete-all → insert で置換。
// ============================================================
const genresSchema = z.object({
  genreIds: z.array(z.string()).max(5),
});

export async function updateProductGenres(
  genreIds: string[],
): Promise<Result<null>> {
  const profile = await requireMember();
  const parsed = genresSchema.safeParse({ genreIds });
  if (!parsed.success) return err('TOO_MANY_GENRES');

  const supabase = createClient();

  // 有効なジャンルのみ許可
  if (parsed.data.genreIds.length > 0) {
    const { data: valid } = await supabase
      .from('product_genres')
      .select('id')
      .eq('is_active', true)
      .in('id', parsed.data.genreIds);
    const validIds = new Set((valid ?? []).map((g) => g.id));
    if (parsed.data.genreIds.some((id) => !validIds.has(id))) {
      return err('VALIDATION_FAILED');
    }
  }

  await supabase
    .from('profile_product_genres')
    .delete()
    .eq('profile_id', profile.id);
  if (parsed.data.genreIds.length > 0) {
    const { error } = await supabase.from('profile_product_genres').insert(
      parsed.data.genreIds.map((genre_id) => ({
        profile_id: profile.id,
        genre_id,
      })),
    );
    if (error) return err('INTERNAL', undefined, { cause: error.message });
  }

  revalidateProfile();
  return ok(null);
}

// ============================================================
// アバター画像アップロード（§3.6 / single-domain-image-proxy.md §4）
// ブラウザは Supabase に直接アクセスできない（単一ドメイン構成）ため、
// 圧縮済み画像を FormData で受け取り、サーバー側で検証して Storage へ置く。
// ============================================================
export async function uploadAvatarImage(
  formData: FormData,
): Promise<Result<{ imageUrl: string }>> {
  const profile = await requireMember();

  const file = formData.get('file');
  if (!(file instanceof File)) return err('VALIDATION_FAILED');
  if (file.size > IMAGE_PURPOSES.avatar.maxBytes) return err('FILE_TOO_LARGE');

  // マジックバイト検証（拡張子・Content-Type 偽装対策）
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (detectImageType(bytes) === null) return err('INVALID_FILE_TYPE');

  const storagePath = `${profile.id}/avatar-${Date.now()}.jpg`;
  const supabase = createClient();
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(storagePath, bytes, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) {
    return err('INTERNAL', undefined, { cause: uploadError.message });
  }

  const oldPath = profile.avatar_image_path;
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_image_path: storagePath })
    .eq('id', profile.id);
  if (error) {
    await supabase.storage.from('avatars').remove([storagePath]);
    return err('INTERNAL', undefined, { cause: error.message });
  }

  if (oldPath && oldPath !== storagePath) {
    await supabase.storage.from('avatars').remove([oldPath]);
  }
  revalidateProfile();
  return ok({ imageUrl: imageProxyPath('avatars', storagePath) });
}

/** アバター画像を外して絵文字アイコンに戻す。 */
export async function removeAvatarImage(): Promise<Result<null>> {
  const profile = await requireMember();
  const oldPath = profile.avatar_image_path;
  if (!oldPath) return ok(null);

  const supabase = createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_image_path: null })
    .eq('id', profile.id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });

  await supabase.storage.from('avatars').remove([oldPath]);
  revalidateProfile();
  return ok(null);
}

// ============================================================
// ログアウト（§2.6）
// ============================================================
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
