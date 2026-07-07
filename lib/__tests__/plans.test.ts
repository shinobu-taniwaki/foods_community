import { describe, test, expect } from 'vitest';
import {
  PLAN_RANK,
  ADMIN_RANK,
  viewerRank,
  isStandardOrHigher,
} from '@/lib/plans';

describe('viewerRank', () => {
  test('admin はプランに関わらず最高 rank を返す', () => {
    expect(viewerRank({ role: 'admin', plan: null })).toBe(ADMIN_RANK);
  });

  test('member はプランの rank を返す', () => {
    expect(viewerRank({ role: 'member', plan: 'trial' })).toBe(PLAN_RANK.trial);
    expect(viewerRank({ role: 'member', plan: 'standard' })).toBe(
      PLAN_RANK.standard,
    );
    expect(viewerRank({ role: 'member', plan: 'premium' })).toBe(
      PLAN_RANK.premium,
    );
  });

  test('プラン未設定・未知のプランは -1（何も見えない側に倒す）', () => {
    expect(viewerRank({ role: 'member', plan: null })).toBe(-1);
    expect(viewerRank({ role: 'member', plan: 'unknown-plan' })).toBe(-1);
  });
});

describe('isStandardOrHigher（投稿・コメント・データ入力の境界）', () => {
  test('trial は false', () => {
    expect(isStandardOrHigher({ role: 'member', plan: 'trial' })).toBe(false);
  });

  test('standard / premium / admin は true', () => {
    expect(isStandardOrHigher({ role: 'member', plan: 'standard' })).toBe(true);
    expect(isStandardOrHigher({ role: 'member', plan: 'premium' })).toBe(true);
    expect(isStandardOrHigher({ role: 'admin', plan: null })).toBe(true);
  });
});
