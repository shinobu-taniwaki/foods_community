// Phase 3 データ記録・仲間一覧の RLS / generated 列を検証する使い捨てスクリプト。
import { createClient } from '@supabase/supabase-js';

const URL = 'http://127.0.0.1:54421';
const admin = createClient(URL, process.env.S, {
  auth: { persistSession: false },
});
let pass = true;
const ck = (c, m) => {
  if (!c) pass = false;
  console.log(`${c ? '✅' : '❌'} ${m}`);
};

async function main() {
  const std = createClient(URL, process.env.A);
  await std.auth.signInWithPassword({
    email: 'member@mcc.local',
    password: 'Passw0rd123',
  });
  const {
    data: { user },
  } = await std.auth.getUser();

  const month = '2099-01';
  // 既存クリーンアップ
  await admin
    .from('sales_reports')
    .delete()
    .eq('author_id', user.id)
    .eq('month', month);

  // 売上報告 作成 → achievement_rate 自動計算
  const ins = await std
    .from('sales_reports')
    .insert({
      author_id: user.id,
      month,
      sales: 60000,
      sales_target: 50000,
      initiatives_count: 2,
      note: 'テスト',
    })
    .select('achievement_rate')
    .single();
  ck(!ins.error, 'standard 会員は売上報告を作成できる');
  ck(
    Number(ins.data?.achievement_rate) === 120,
    `achievement_rate が自動計算される（120 期待 / 実際 ${ins.data?.achievement_rate}）`,
  );

  // 同月重複 → UNIQUE 違反
  const dup = await std
    .from('sales_reports')
    .insert({
      author_id: user.id,
      month,
      sales: 1,
      sales_target: 1,
      initiatives_count: 0,
    });
  ck(dup.error?.code === '23505', '同月重複は UNIQUE 制約で拒否される');

  // 別の standard 会員から他人の売上は見えない（RLS）
  const sfx = Math.floor(Number(`0.${user.id.replace(/\D/g, '')}`) * 1e9);
  const otherEmail = `other_d${sfx}@example.com`;
  const { data: ou } = await admin.auth.admin.createUser({
    email: otherEmail,
    password: 'Passw0rd123',
    email_confirm: true,
  });
  await admin
    .from('profiles')
    .insert({
      id: ou.user.id,
      display_name: '別会員',
      role: 'member',
      plan: 'standard',
      status: 'active',
    });
  const other = createClient(URL, process.env.A);
  await other.auth.signInWithPassword({
    email: otherEmail,
    password: 'Passw0rd123',
  });
  const otherView = await other
    .from('sales_reports')
    .select('id')
    .eq('author_id', user.id);
  ck(
    (otherView.data?.length ?? 0) === 0,
    '他人の売上報告は閲覧できない（RLS）',
  );

  // 仲間一覧: 別会員から member@mcc.local が見える
  const memberList = await other
    .from('profiles')
    .select('id, display_name')
    .eq('role', 'member')
    .eq('status', 'active');
  ck(
    (memberList.data?.length ?? 0) >= 2,
    `active member 一覧が取得できる（${memberList.data?.length}名）`,
  );

  // cleanup
  await admin
    .from('sales_reports')
    .delete()
    .eq('author_id', user.id)
    .eq('month', month);
  await admin.auth.admin.deleteUser(ou.user.id);
}

try {
  await main();
} catch (e) {
  pass = false;
  console.error('ERROR:', e.message);
}
console.log(pass ? '\n🎉 データ/仲間 検証 合格' : '\n⚠️ 失敗あり');
process.exit(pass ? 0 : 1);
