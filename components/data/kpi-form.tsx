'use client';

import { useFormState } from 'react-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { SubmitButton } from '@/components/ui/submit-button';
import type { Result } from '@/lib/result';

const UNITS = ['%', '件', '円', '人', '回'] as const;

interface KpiFormProps {
  action: (p: Result<null> | null, fd: FormData) => Promise<Result<null>>;
  mode: 'create' | 'edit';
  defaults: {
    id?: string;
    month: string;
    kpiName?: string;
    beforeValue?: number;
    afterValue?: number;
    unit?: string;
    note?: string;
  };
}

export function KpiForm({ action, mode, defaults }: KpiFormProps) {
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
          <Label htmlFor="kpiName" required>
            KPI 指標名
          </Label>
          <Input
            id="kpiName"
            name="kpiName"
            defaultValue={defaults.kpiName}
            maxLength={100}
            placeholder="例: LINE開封率"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="beforeValue" required>
              改善前
            </Label>
            <Input
              id="beforeValue"
              name="beforeValue"
              type="number"
              step="any"
              inputMode="decimal"
              defaultValue={defaults.beforeValue}
              required
            />
          </div>
          <div>
            <Label htmlFor="afterValue" required>
              改善後
            </Label>
            <Input
              id="afterValue"
              name="afterValue"
              type="number"
              step="any"
              inputMode="decimal"
              defaultValue={defaults.afterValue}
              required
            />
          </div>
        </div>
        <div>
          <Label htmlFor="unit" required>
            単位
          </Label>
          <select
            id="unit"
            name="unit"
            defaultValue={defaults.unit ?? '%'}
            required
            className="min-h-[48px] w-full rounded border border-foreground/20 bg-white px-4 text-base"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
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
