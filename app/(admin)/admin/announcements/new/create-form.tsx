'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { createAnnouncement } from './actions';

const CATEGORIES = [
  { value: 'important', label: '⚠️ 重要なお知らせ' },
  { value: 'news', label: '📰 ニュース' },
  { value: 'column', label: '📖 コラム' },
  { value: 'seminar', label: '📅 セミナー情報' },
];

export function CreateAnnouncementForm() {
  const [state, action] = useFormState(createAnnouncement, null);

  return (
    <Card>
      <form action={action} className="space-y-4">
        {state && !state.ok && <Alert variant="error">{state.error.message}</Alert>}

        <div>
          <Label htmlFor="category" required>
            カテゴリ
          </Label>
          <select
            id="category"
            name="category"
            required
            className="min-h-[48px] w-full rounded border border-foreground/20 bg-white px-4 text-base"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="title" required>
            タイトル（100文字まで）
          </Label>
          <Input id="title" name="title" maxLength={100} required />
        </div>

        <div>
          <Label htmlFor="body" required>
            本文（10,000文字まで）
          </Label>
          <Textarea id="body" name="body" rows={10} maxLength={10000} required />
        </div>

        <div>
          <Label htmlFor="youtubeUrl">YouTube 動画 URL（任意・1本）</Label>
          <Input
            id="youtubeUrl"
            name="youtubeUrl"
            type="url"
            placeholder="https://www.youtube.com/watch?v=..."
          />
        </div>

        <div>
          <Label htmlFor="requiredPlan">公開範囲</Label>
          <select
            id="requiredPlan"
            name="requiredPlan"
            className="min-h-[48px] w-full rounded border border-foreground/20 bg-white px-4 text-base"
          >
            <option value="none">全員に公開</option>
            <option value="standard">スタンダード以上（Pro限定）</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-base">
          <input type="checkbox" name="pinned" className="h-5 w-5 accent-terracotta" />
          ピン留めする
        </label>

        <fieldset className="space-y-2">
          <legend className="mb-1 font-medium">公開状態</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="status" value="draft" defaultChecked className="accent-terracotta" />
            下書き保存
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="status" value="published" className="accent-terracotta" />
            公開する
          </label>
        </fieldset>

        <SubmitButton size="lg" className="w-full">
          保存する
        </SubmitButton>
      </form>
    </Card>
  );
}
