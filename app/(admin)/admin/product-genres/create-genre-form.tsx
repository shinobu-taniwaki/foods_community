'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { adminCreateProductGenre } from './actions';

export function CreateGenreForm() {
  const [state, action] = useFormState(adminCreateProductGenre, null);

  return (
    <Card>
      <form action={action} className="space-y-4">
        {state && !state.ok && <Alert variant="error">{state.error.message}</Alert>}
        {state?.ok && <Alert variant="success">販売ジャンルを作成しました。</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="id" required>
              ID（半角英数）
            </Label>
            <Input id="id" name="id" placeholder="例: honey" required />
          </div>
          <div>
            <Label htmlFor="iconEmoji" required>
              絵文字
            </Label>
            <Input id="iconEmoji" name="iconEmoji" placeholder="🍯" required />
          </div>
        </div>
        <div>
          <Label htmlFor="label" required>
            ラベル
          </Label>
          <Input id="label" name="label" placeholder="例: 蜂蜜" required />
        </div>
        <SubmitButton>販売ジャンルを作成</SubmitButton>
      </form>
    </Card>
  );
}
