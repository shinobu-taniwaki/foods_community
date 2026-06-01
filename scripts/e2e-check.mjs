// Phase 1 のデータ動線・RLS をローカル Supabase に対して検証する使い捨てスクリプト。
// 実行: node scripts/e2e-check.mjs（A/S env に anon/service キー）
import { createClient } from '@supabase/supabase-js';

const URL = 'http://127.0.0.1:54421';
const anonKey = process.env.A;
const svcKey = process.env.S;
const admin = createClient(URL, svcKey, { auth: { persistSession: false } });

const log = (ok, msg) => console.log(`${ok ? '✅' : '❌'} ${msg}`);
let pass = true;
const check = (cond, msg) => {
  if (!cond) pass = false;
  log(cond, msg);
};

const rand = (n) =>
  Array.from(
    { length: n },
    () =>
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[
        Math.floor(Math.random() * 62)
      ],
  ).join('');

const created = { users: [], contents: [] };

async function mkUser(email, password) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  created.users.push(data.user.id);
  return data.user.id;
}

async function main() {
  const sfx = rand(8).toLowerCase();
  const adminEmail = `admin_${sfx}@example.com`;
  const stdEmail = `std_${sfx}@example.com`;
  const trialEmail = `trial_${sfx}@example.com`;
  const pw = 'Passw0rd123';

  // --- admin セットアップ ---
  const adminId = await mkUser(adminEmail, pw);
  await admin.from('profiles').insert({
    id: adminId,
    display_name: '運営テスト',
    role: 'admin',
    status: 'active',
  });

  // --- 招待作成 → 検証ロジック相当 ---
  const token = rand(64);
  const expires = new Date(Date.now() + 7 * 864e5).toISOString();
  await admin.from('invitations').insert({
    email: stdEmail,
    token,
    plan: 'standard',
    invited_by: adminId,
    expires_at: expires,
  });
  const { data: inv } = await admin
    .from('invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  check(inv && !inv.accepted_at, '招待トークンが有効として取得できる');

  // --- standard / trial メンバーを作成（provision 相当）---
  const stdId = await mkUser(stdEmail, pw);
  await admin.from('profiles').insert({
    id: stdId,
    display_name: 'スタンダード会員',
    role: 'member',
    plan: 'standard',
    status: 'active',
  });
  await admin.from('notification_preferences').insert({ user_id: stdId });
  await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', inv.id);

  const trialId = await mkUser(trialEmail, pw);
  await admin.from('profiles').insert({
    id: trialId,
    display_name: 'お試し会員',
    role: 'member',
    plan: 'trial',
    status: 'active',
  });

  // --- お知らせ作成（全員向け + Pro限定）---
  const { data: open } = await admin
    .from('contents')
    .insert({
      author_id: adminId,
      category: 'news',
      title: '全員向けお知らせ',
      body: 'これは全員が読めるお知らせです。',
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  created.contents.push(open.id);

  const { data: pro } = await admin
    .from('contents')
    .insert({
      author_id: adminId,
      category: 'column',
      title: 'Pro限定お知らせ',
      body: 'standard 以上だけが読めます。',
      required_plan: 'standard',
      status: 'published',
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  created.contents.push(pro.id);

  // --- RLS: standard 会員はログインして両方見える ---
  const stdClient = createClient(URL, anonKey);
  await stdClient.auth.signInWithPassword({ email: stdEmail, password: pw });
  const { data: stdView } = await stdClient
    .from('contents')
    .select('id, required_plan')
    .eq('status', 'published');
  check(
    stdView?.length === 2,
    `standard 会員は2件閲覧可（実際: ${stdView?.length}）`,
  );

  // standard 会員がいいね・コメントできる
  const { error: likeErr } = await stdClient
    .from('content_likes')
    .insert({ content_id: open.id, user_id: stdId });
  check(!likeErr, 'standard 会員がいいねを INSERT できる（RLS 許可）');
  const { error: cmtErr } = await stdClient
    .from('content_comments')
    .insert({ content_id: open.id, author_id: stdId, body: 'テストコメント' });
  check(!cmtErr, 'standard 会員がコメントを INSERT できる（RLS 許可）');

  // --- RLS: trial 会員は Pro限定が見えない ---
  const trialClient = createClient(URL, anonKey);
  await trialClient.auth.signInWithPassword({
    email: trialEmail,
    password: pw,
  });
  const { data: trialView } = await trialClient
    .from('contents')
    .select('id, required_plan')
    .eq('status', 'published');
  check(
    trialView?.length === 1 && trialView[0].required_plan === null,
    `trial 会員は全員向け1件のみ閲覧可（実際: ${trialView?.length}）`,
  );

  // --- RLS: trial 会員は他人のプロフィールを UPDATE できない ---
  const { error: updErr } = await trialClient
    .from('profiles')
    .update({ display_name: 'のっとり' })
    .eq('id', stdId);
  const { data: stillStd } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', stdId)
    .single();
  check(
    stillStd.display_name === 'スタンダード会員',
    '他人のプロフィールは UPDATE で書き換わらない（RLS 防御）',
  );

  // --- audit_logs は誰も SELECT できない（admin のみ。member は0件）---
  const { data: auditView } = await stdClient.from('audit_logs').select('id');
  check((auditView?.length ?? 0) === 0, 'member は audit_logs を閲覧できない');
}

async function cleanup() {
  for (const id of created.contents) {
    await admin.from('content_comments').delete().eq('content_id', id);
    await admin.from('content_likes').delete().eq('content_id', id);
    await admin.from('contents').delete().eq('id', id);
  }
  for (const id of created.users) {
    await admin.auth.admin.deleteUser(id);
  }
}

try {
  await main();
} catch (e) {
  pass = false;
  console.error('ERROR:', e.message);
} finally {
  await cleanup();
  console.log(pass ? '\n🎉 すべて合格' : '\n⚠️ 失敗あり');
  process.exit(pass ? 0 : 1);
}
