'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import { sendBroadcast } from './actions';

const CONFIRM_MESSAGE =
  '全メンバーに通知を送信します。送信後は取り消せません。よろしいですか？';

/** 全体通知の送信フォーム（送信前に確認ダイアログを挟む）。 */
export function BroadcastForm() {
  const [state, action] = useFormState(sendBroadcast, null);

  return (
    <Card>
      <form
        action={action}
        onSubmit={(event) => {
          if (!window.confirm(CONFIRM_MESSAGE)) event.preventDefault();
        }}
        className="space-y-4"
      >
        {state && !state.ok && (
          <Alert variant="error">{state.error.message}</Alert>
        )}
        {state?.ok && (
          <Alert variant="success">
            {state.data.recipients} 名のメンバーに通知を送信しました。
          </Alert>
        )}

        <div>
          <Label htmlFor="title" required>
            タイトル（100文字まで）
          </Label>
          <Input id="title" name="title" maxLength={100} required />
        </div>

        <div>
          <Label htmlFor="body" required>
            本文（500文字まで）
          </Label>
          <Textarea id="body" name="body" rows={6} maxLength={500} required />
          <p className="mt-1 text-sm text-foreground/60">
            通知一覧には先頭の約120文字が表示されます。大切なことは最初に書いてください。
          </p>
        </div>

        <SubmitButton size="lg" className="w-full">
          全員に送信する
        </SubmitButton>
      </form>
    </Card>
  );
}
