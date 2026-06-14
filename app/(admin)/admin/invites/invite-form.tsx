'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { adminCreateInvitation } from './actions';

export function InviteForm() {
  const [state, action] = useFormState(adminCreateInvitation, null);

  return (
    <Card className="space-y-4">
      <form action={action} className="space-y-4">
        {state && !state.ok && <Alert variant="error">{state.error.message}</Alert>}
        {state?.ok && (
          <Alert variant="success">
            <p className="mb-1">{state.data.email} さんの招待リンクを発行しました。</p>
            <code className="block break-all rounded bg-white/60 p-2 text-xs">
              {state.data.inviteUrl}
            </code>
            <p className="mt-1 text-xs">
              このリンクを本人に共有してください（7日間有効）。
            </p>
          </Alert>
        )}
        <div>
          <Label htmlFor="email" required>
            招待先メールアドレス
          </Label>
          <Input id="email" name="email" type="email" inputMode="email" required />
        </div>
        <div>
          <Label htmlFor="plan" required>
            プラン
          </Label>
          <select
            id="plan"
            name="plan"
            defaultValue="standard"
            required
            className="min-h-[48px] w-full rounded border border-foreground/20 bg-white px-4 text-base"
          >
            <option value="trial">お試しプラン</option>
            <option value="standard">スタンダードプラン</option>
            <option value="premium">プレミアムプラン</option>
          </select>
        </div>
        <SubmitButton>招待リンクを発行</SubmitButton>
      </form>
    </Card>
  );
}
