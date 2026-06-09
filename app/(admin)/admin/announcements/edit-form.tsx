'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { updateAnnouncement } from './actions';

const CATEGORIES = [
  { value: 'important', label: '⚠️ 重要なお知らせ' },
  { value: 'news', label: '📰 ニュース' },
  { value: 'column', label: '📖 コラム' },
  { value: 'seminar', label: '📅 セミナー情報' },
];

interface EditFormProps {
  defaults: {
    id: string;
    category: string;
    title: string;
    body: string;
    pinned: boolean;
    requiredPlan: 'none' | 'standard';
    status: 'draft' | 'published';
  };
}

export function EditAnnouncementForm({ defaults }: EditFormProps) {
  const [state, action] = useFormState(updateAnnouncement, null);

  return (
    <Card>
      <form action={action} className="space-y-4">
        {state && !state.ok && <Alert variant="error">{state.error.message}</Alert>}
        <input type="hidden" name="id" value={defaults.id} />

        <div>
          <Label htmlFor="category" required>
            カテゴリ
          </Label>
          <select
            id="category"
            name="category"
            defaultValue={defaults.category}
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
            タイトル
          </Label>
          <Input id="title" name="title" defaultValue={defaults.title} maxLength={100} required />
        </div>

        <div>
          <Label htmlFor="body" required>
            本文
          </Label>
          <Textarea id="body" name="body" defaultValue={defaults.body} rows={10} maxLength={10000} required />
        </div>

        <div>
          <Label htmlFor="requiredPlan">公開範囲</Label>
          <select
            id="requiredPlan"
            name="requiredPlan"
            defaultValue={defaults.requiredPlan}
            className="min-h-[48px] w-full rounded border border-foreground/20 bg-white px-4 text-base"
          >
            <option value="none">全員に公開</option>
            <option value="standard">スタンダード以上（Pro限定）</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-base">
          <input
            type="checkbox"
            name="pinned"
            defaultChecked={defaults.pinned}
            className="h-5 w-5 accent-terracotta"
          />
          ピン留めする
        </label>

        <fieldset className="space-y-2">
          <legend className="mb-1 font-medium">公開状態</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="status" value="draft" defaultChecked={defaults.status === 'draft'} className="accent-terracotta" />
            下書き
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="status" value="published" defaultChecked={defaults.status === 'published'} className="accent-terracotta" />
            公開する
          </label>
        </fieldset>

        <SubmitButton size="lg" className="w-full">
          更新する
        </SubmitButton>
      </form>
    </Card>
  );
}
