'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import type { Result } from '@/lib/result';

interface CpaFormProps {
  action: (p: Result<null> | null, fd: FormData) => Promise<Result<null>>;
  mode: 'create' | 'edit';
  defaults: {
    id?: string;
    month: string;
    campaignName?: string;
    cost?: number;
    conversions?: number;
    note?: string;
  };
}

export function CpaForm({ action, mode, defaults }: CpaFormProps) {
  const [state, formAction] = useFormState(action, null);

  return (
    <Card>
      <form action={formAction} className="space-y-4">
        {state && !state.ok && (
          <Alert variant="error">{state.error.message}</Alert>
        )}
        {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
        <div>
          <Label htmlFor="month" required>
            対象月
          </Label>
          <Input
            id="month"
            name="month"
            type="month"
            defaultValue={defaults.month}
            readOnly={mode === 'edit'}
            required
          />
        </div>
        <div>
          <Label htmlFor="campaignName" required>
            施策名
          </Label>
          <Input
            id="campaignName"
            name="campaignName"
            defaultValue={defaults.campaignName}
            maxLength={100}
            placeholder="例: LINE 友だち追加キャンペーン"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="cost" required>
              費用（円）
            </Label>
            <Input
              id="cost"
              name="cost"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={defaults.cost}
              required
            />
          </div>
          <div>
            <Label htmlFor="conversions" required>
              獲得数（件）
            </Label>
            <Input
              id="conversions"
              name="conversions"
              type="number"
              min={0}
              inputMode="numeric"
              defaultValue={defaults.conversions}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="note">所感</Label>
          <Textarea
            id="note"
            name="note"
            defaultValue={defaults.note}
            maxLength={2000}
          />
        </div>
        <SubmitButton size="lg" className="w-full">
          {mode === 'create' ? '記録する' : '更新する'}
        </SubmitButton>
      </form>
    </Card>
  );
}
