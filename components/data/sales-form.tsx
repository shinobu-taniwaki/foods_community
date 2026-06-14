'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import type { Result } from '@/lib/result';

interface SalesFormProps {
  action: (p: Result<null> | null, fd: FormData) => Promise<Result<null>>;
  mode: 'create' | 'edit';
  defaults: {
    id?: string;
    month: string;
    sales?: number;
    salesTarget?: number;
    initiativesCount?: number;
    note?: string;
  };
}

export function SalesForm({ action, mode, defaults }: SalesFormProps) {
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
          <Label htmlFor="sales" required>
            売上（円）
          </Label>
          <Input
            id="sales"
            name="sales"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={defaults.sales}
            required
          />
        </div>
        <div>
          <Label htmlFor="salesTarget" required>
            目標（円）
          </Label>
          <Input
            id="salesTarget"
            name="salesTarget"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={defaults.salesTarget}
            required
          />
        </div>
        <div>
          <Label htmlFor="initiativesCount">実施した施策数</Label>
          <Input
            id="initiativesCount"
            name="initiativesCount"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={defaults.initiativesCount ?? 0}
          />
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
