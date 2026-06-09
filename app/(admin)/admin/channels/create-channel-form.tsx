'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { adminCreateChannel } from './actions';

export function CreateChannelForm() {
  const [state, action] = useFormState(adminCreateChannel, null);

  return (
    <Card>
      <form action={action} className="space-y-4">
        {state && !state.ok && <Alert variant="error">{state.error.message}</Alert>}
        {state?.ok && <Alert variant="success">チャンネルを作成しました。</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="id" required>
              ID（半角英数）
            </Label>
            <Input id="id" name="id" placeholder="例: branding" required />
          </div>
          <div>
            <Label htmlFor="label" required>
              ラベル
            </Label>
            <Input id="label" name="label" placeholder="例: ブランディング" required />
          </div>
        </div>
        <div>
          <Label htmlFor="description">説明</Label>
          <Input id="description" name="description" maxLength={200} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="iconEmoji">アイコン絵文字</Label>
            <Input id="iconEmoji" name="iconEmoji" placeholder="🏷️" />
          </div>
          <div>
            <Label htmlFor="color">カラー（#RRGGBB）</Label>
            <Input id="color" name="color" defaultValue="#c05e3f" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="requiredPlan">必要プラン</Label>
            <select
              id="requiredPlan"
              name="requiredPlan"
              defaultValue="trial"
              className="min-h-[48px] w-full rounded border border-foreground/20 bg-white px-3 text-base"
            >
              <option value="trial">お試し以上</option>
              <option value="standard">スタンダード以上</option>
              <option value="premium">プレミアムのみ</option>
            </select>
          </div>
          <div>
            <Label htmlFor="trialPreviewCount">trial 閲覧件数</Label>
            <Input
              id="trialPreviewCount"
              name="trialPreviewCount"
              type="number"
              min={0}
              placeholder="5（空欄=非表示）"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-base">
          <input type="checkbox" name="onlyAdminCanPost" className="h-5 w-5 accent-terracotta" />
          運営のみ投稿可
        </label>
        <SubmitButton>チャンネルを作成</SubmitButton>
      </form>
    </Card>
  );
}
