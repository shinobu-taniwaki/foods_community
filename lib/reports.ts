import 'server-only';
import { createClient } from '@/lib/supabase/server';

export interface SalesReport {
  id: string;
  month: string;
  sales: number;
  salesTarget: number;
  achievementRate: number | null;
  initiativesCount: number;
  note: string | null;
}

export interface KpiReport {
  id: string;
  month: string;
  kpiName: string;
  beforeValue: number;
  afterValue: number;
  unit: string;
  changeRate: number | null;
  note: string | null;
}

export interface CpaReport {
  id: string;
  month: string;
  campaignName: string;
  cost: number;
  conversions: number;
  cpa: number | null;
  note: string | null;
}

const num = (v: string | number | null): number => Number(v ?? 0);
const numOrNull = (v: string | number | null): number | null =>
  v === null ? null : Number(v);

/** 売上報告 一覧（自分のみ・RLS）。最新月順。 */
export async function listMySalesReports(limit = 24): Promise<SalesReport[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('sales_reports')
    .select(
      'id, month, sales, sales_target, achievement_rate, initiatives_count, note',
    )
    .order('month', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    month: r.month,
    sales: num(r.sales),
    salesTarget: num(r.sales_target),
    achievementRate: numOrNull(r.achievement_rate),
    initiativesCount: r.initiatives_count,
    note: r.note,
  }));
}

/** KPI改善 一覧（自分のみ・RLS）。 */
export async function listMyKpiReports(limit = 24): Promise<KpiReport[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('kpi_reports')
    .select(
      'id, month, kpi_name, before_value, after_value, unit, change_rate, note',
    )
    .order('month', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    month: r.month,
    kpiName: r.kpi_name,
    beforeValue: num(r.before_value),
    afterValue: num(r.after_value),
    unit: r.unit,
    changeRate: numOrNull(r.change_rate),
    note: r.note,
  }));
}

/** 施策CPA 一覧（自分のみ・RLS）。 */
export async function listMyCpaReports(limit = 24): Promise<CpaReport[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('cpa_reports')
    .select('id, month, campaign_name, cost, conversions, cpa, note')
    .order('month', { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({
    id: r.id,
    month: r.month,
    campaignName: r.campaign_name,
    cost: num(r.cost),
    conversions: r.conversions,
    cpa: numOrNull(r.cpa),
    note: r.note,
  }));
}
