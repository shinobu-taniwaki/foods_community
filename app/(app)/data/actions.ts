'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireMember } from '@/lib/auth';
import { isStandardOrHigher } from '@/lib/plans';
import { monthSchema, zodFieldErrors } from '@/lib/validation/common';
import { err, type Result } from '@/lib/result';

const uuid = z.string().uuid();
const note = z.string().trim().max(2000).optional().or(z.literal(''));

const DUPLICATE_PG_CODE = '23505';

/** standard 以上を保証し author_id を返す。未満なら err（Result）を返す。 */
async function guardStandard(): Promise<string | Result<null>> {
  const profile = await requireMember();
  if (!isStandardOrHigher(profile)) {
    return err('FORBIDDEN', 'データ記録はスタンダードプラン以上の機能です。');
  }
  return profile.id;
}

// ============================================================
// 売上報告
// ============================================================
const salesSchema = z.object({
  month: monthSchema,
  sales: z.coerce.number().min(0, '0以上で入力してください'),
  salesTarget: z.coerce.number().min(0, '0以上で入力してください'),
  initiativesCount: z.coerce.number().int().min(0).default(0),
  note,
});

export async function createSalesReport(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const authorId = await guardStandard();
  if (typeof authorId !== 'string') return authorId;

  const parsed = salesSchema.safeParse({
    month: formData.get('month'),
    sales: formData.get('sales'),
    salesTarget: formData.get('salesTarget'),
    initiativesCount: formData.get('initiativesCount') ?? 0,
    note: formData.get('note') ?? '',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { error } = await supabase.from('sales_reports').insert({
    author_id: authorId,
    month: parsed.data.month,
    sales: parsed.data.sales,
    sales_target: parsed.data.salesTarget,
    initiatives_count: parsed.data.initiativesCount,
    note: parsed.data.note || null,
  });
  if (error) {
    if (error.code === DUPLICATE_PG_CODE) return err('DUPLICATE_MONTH');
    return err('INTERNAL', undefined, { cause: error.message });
  }
  revalidatePath('/data');
  redirect('/data');
}

export async function updateSalesReport(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const authorId = await guardStandard();
  if (typeof authorId !== 'string') return authorId;

  const parsed = salesSchema.extend({ id: uuid }).safeParse({
    id: formData.get('id'),
    month: formData.get('month'),
    sales: formData.get('sales'),
    salesTarget: formData.get('salesTarget'),
    initiativesCount: formData.get('initiativesCount') ?? 0,
    note: formData.get('note') ?? '',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('sales_reports')
    .update({
      sales: parsed.data.sales,
      sales_target: parsed.data.salesTarget,
      initiatives_count: parsed.data.initiativesCount,
      note: parsed.data.note || null,
    })
    .eq('id', parsed.data.id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });
  revalidatePath('/data');
  redirect('/data');
}

// ============================================================
// KPI改善
// ============================================================
const kpiSchema = z.object({
  month: monthSchema,
  kpiName: z.string().trim().min(1, 'KPI名を入力してください').max(100),
  beforeValue: z.coerce.number(),
  afterValue: z.coerce.number(),
  unit: z.enum(['%', '件', '円', '人', '回']),
  note,
});

export async function createKpiReport(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const authorId = await guardStandard();
  if (typeof authorId !== 'string') return authorId;

  const parsed = kpiSchema.safeParse({
    month: formData.get('month'),
    kpiName: formData.get('kpiName'),
    beforeValue: formData.get('beforeValue'),
    afterValue: formData.get('afterValue'),
    unit: formData.get('unit'),
    note: formData.get('note') ?? '',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { error } = await supabase.from('kpi_reports').insert({
    author_id: authorId,
    month: parsed.data.month,
    kpi_name: parsed.data.kpiName,
    before_value: parsed.data.beforeValue,
    after_value: parsed.data.afterValue,
    unit: parsed.data.unit,
    note: parsed.data.note || null,
  });
  if (error) {
    if (error.code === DUPLICATE_PG_CODE) return err('DUPLICATE_MONTH');
    return err('INTERNAL', undefined, { cause: error.message });
  }
  revalidatePath('/data');
  redirect('/data');
}

export async function updateKpiReport(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const authorId = await guardStandard();
  if (typeof authorId !== 'string') return authorId;

  const parsed = kpiSchema.extend({ id: uuid }).safeParse({
    id: formData.get('id'),
    month: formData.get('month'),
    kpiName: formData.get('kpiName'),
    beforeValue: formData.get('beforeValue'),
    afterValue: formData.get('afterValue'),
    unit: formData.get('unit'),
    note: formData.get('note') ?? '',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('kpi_reports')
    .update({
      kpi_name: parsed.data.kpiName,
      before_value: parsed.data.beforeValue,
      after_value: parsed.data.afterValue,
      unit: parsed.data.unit,
      note: parsed.data.note || null,
    })
    .eq('id', parsed.data.id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });
  revalidatePath('/data');
  redirect('/data');
}

// ============================================================
// 施策CPA
// ============================================================
const cpaSchema = z.object({
  month: monthSchema,
  campaignName: z.string().trim().min(1, '施策名を入力してください').max(100),
  cost: z.coerce.number().min(0, '0以上で入力してください'),
  conversions: z.coerce.number().int().min(0, '0以上で入力してください'),
  note,
});

export async function createCpaReport(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const authorId = await guardStandard();
  if (typeof authorId !== 'string') return authorId;

  const parsed = cpaSchema.safeParse({
    month: formData.get('month'),
    campaignName: formData.get('campaignName'),
    cost: formData.get('cost'),
    conversions: formData.get('conversions'),
    note: formData.get('note') ?? '',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { error } = await supabase.from('cpa_reports').insert({
    author_id: authorId,
    month: parsed.data.month,
    campaign_name: parsed.data.campaignName,
    cost: parsed.data.cost,
    conversions: parsed.data.conversions,
    note: parsed.data.note || null,
  });
  if (error) {
    if (error.code === DUPLICATE_PG_CODE) return err('DUPLICATE_MONTH');
    return err('INTERNAL', undefined, { cause: error.message });
  }
  revalidatePath('/data');
  redirect('/data');
}

export async function updateCpaReport(
  _prev: Result<null> | null,
  formData: FormData,
): Promise<Result<null>> {
  const authorId = await guardStandard();
  if (typeof authorId !== 'string') return authorId;

  const parsed = cpaSchema.extend({ id: uuid }).safeParse({
    id: formData.get('id'),
    month: formData.get('month'),
    campaignName: formData.get('campaignName'),
    cost: formData.get('cost'),
    conversions: formData.get('conversions'),
    note: formData.get('note') ?? '',
  });
  if (!parsed.success) {
    return err('VALIDATION_FAILED', undefined, {
      fields: zodFieldErrors(parsed.error),
    });
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('cpa_reports')
    .update({
      campaign_name: parsed.data.campaignName,
      cost: parsed.data.cost,
      conversions: parsed.data.conversions,
      note: parsed.data.note || null,
    })
    .eq('id', parsed.data.id);
  if (error) return err('INTERNAL', undefined, { cause: error.message });
  revalidatePath('/data');
  redirect('/data');
}
