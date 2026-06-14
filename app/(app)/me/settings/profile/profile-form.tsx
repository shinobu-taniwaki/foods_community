'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Heading } from '@/components/ui/heading';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import type { Result } from '@/lib/result';
import type { ProfileRow } from '@/lib/auth';
import {
  updatePersonalProfile,
  updateStoreProfile,
  updateCompanyProfile,
} from '../../actions';

const AVATAR_CHOICES = [
  '🍅',
  '🥬',
  '🍎',
  '🌾',
  '🐟',
  '🍖',
  '🥖',
  '🧀',
  '🍵',
  '🍯',
  '🍶',
  '🌱',
];

function SectionFeedback({ state }: { state: Result<null> | null }) {
  if (!state) return null;
  if (state.ok) return <Alert variant="success">保存しました。</Alert>;
  return <Alert variant="error">{state.error.message}</Alert>;
}

export function ProfileForm({ profile }: { profile: ProfileRow }) {
  const [personalState, personalAction] = useFormState(
    updatePersonalProfile,
    null,
  );
  const [storeState, storeAction] = useFormState(updateStoreProfile, null);
  const [companyState, companyAction] = useFormState(
    updateCompanyProfile,
    null,
  );

  const social = (profile.social_links ?? {}) as {
    instagram?: string;
    x?: string;
    tiktok?: string;
  };

  return (
    <div className="space-y-6">
      {/* 個人 */}
      <Card>
        <form action={personalAction} className="space-y-4">
          <Heading level={3}>個人</Heading>
          <SectionFeedback state={personalState} />
          <div>
            <Label required>アイコン</Label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_CHOICES.map((emoji) => (
                <label key={emoji} className="cursor-pointer">
                  <input
                    type="radio"
                    name="avatar"
                    value={emoji}
                    defaultChecked={profile.avatar === emoji}
                    className="peer sr-only"
                  />
                  <span className="flex h-12 w-12 items-center justify-center rounded border border-foreground/15 text-2xl peer-checked:border-terracotta peer-checked:bg-terracotta/10">
                    {emoji}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="displayName" required>
              表示名
            </Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={profile.display_name}
              maxLength={30}
              required
            />
          </div>
          <div>
            <Label htmlFor="bio">自己紹介</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={profile.bio ?? ''}
              maxLength={500}
              placeholder="どんな商品を作っているか、活動など"
            />
          </div>
          <SubmitButton>個人情報を保存</SubmitButton>
        </form>
      </Card>

      {/* 屋号・お店 */}
      <Card>
        <form action={storeAction} className="space-y-4">
          <Heading level={3}>屋号・お店</Heading>
          <SectionFeedback state={storeState} />
          <div>
            <Label htmlFor="storeName">屋号・店名</Label>
            <Input
              id="storeName"
              name="storeName"
              defaultValue={profile.store_name}
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="region">地域</Label>
            <Input
              id="region"
              name="region"
              defaultValue={profile.region}
              maxLength={100}
              placeholder="例: 北海道札幌市"
            />
          </div>
          <div>
            <Label htmlFor="product">扱う商品</Label>
            <Input
              id="product"
              name="product"
              defaultValue={profile.product}
              maxLength={200}
              placeholder="例: 有機トマト、トマトソース"
            />
          </div>
          <div>
            <Label htmlFor="storeDescription">お店の説明</Label>
            <Textarea
              id="storeDescription"
              name="storeDescription"
              defaultValue={profile.store_description ?? ''}
              maxLength={1000}
            />
          </div>
          <SubmitButton>お店情報を保存</SubmitButton>
        </form>
      </Card>

      {/* 会社情報 */}
      <Card>
        <form action={companyAction} className="space-y-4">
          <Heading level={3}>会社情報（任意）</Heading>
          <SectionFeedback state={companyState} />
          <div>
            <Label htmlFor="companyName">法人名</Label>
            <Input
              id="companyName"
              name="companyName"
              defaultValue={profile.company_name ?? ''}
              maxLength={100}
            />
          </div>
          <div>
            <Label htmlFor="businessType">業態</Label>
            <Input
              id="businessType"
              name="businessType"
              defaultValue={profile.business_type ?? ''}
              maxLength={50}
              placeholder="例: 株式会社 / 個人事業主"
            />
          </div>
          <div>
            <Label htmlFor="companyAddress">住所</Label>
            <Input
              id="companyAddress"
              name="companyAddress"
              defaultValue={profile.company_address ?? ''}
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="companyPhone">電話番号</Label>
            <Input
              id="companyPhone"
              name="companyPhone"
              type="tel"
              defaultValue={profile.company_phone ?? ''}
              maxLength={20}
            />
          </div>
          <div>
            <Label htmlFor="websiteUrl">公式サイト（https://）</Label>
            <Input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              defaultValue={profile.website_url ?? ''}
              placeholder="https://example.com"
            />
          </div>
          <div>
            <Label htmlFor="instagram">Instagram URL</Label>
            <Input
              id="instagram"
              name="instagram"
              type="url"
              defaultValue={social.instagram ?? ''}
              placeholder="https://instagram.com/..."
            />
          </div>
          <div>
            <Label htmlFor="x">X（旧Twitter）URL</Label>
            <Input
              id="x"
              name="x"
              type="url"
              defaultValue={social.x ?? ''}
              placeholder="https://x.com/..."
            />
          </div>
          <div>
            <Label htmlFor="tiktok">TikTok URL</Label>
            <Input
              id="tiktok"
              name="tiktok"
              type="url"
              defaultValue={social.tiktok ?? ''}
              placeholder="https://tiktok.com/@..."
            />
          </div>
          <SubmitButton>会社情報を保存</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
