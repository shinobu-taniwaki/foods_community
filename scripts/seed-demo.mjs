// ローカル動作確認用のデモデータ投入（冪等）。
// 実行: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-demo.mjs
//       （URL は SUPABASE_URL env、既定 http://127.0.0.1:54421）
//
// 作成物:
//   - admin@mcc.local  / Passw0rd123 （運営 admin）
//   - member@mcc.local / Passw0rd123 （standard 会員）
//   - サンプルお知らせ 2 件（全員向け / Pro限定）
import { createClient } from '@supabase/supabase-js';

const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54421';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY が必要です');
  process.exit(1);
}
const admin = createClient(URL, KEY, { auth: { persistSession: false } });

const PASSWORD = 'Passw0rd123';

async function ensureUser(email, profile) {
  // 既存検索（メール一致）
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    user = data.user;
    console.log(`✅ 作成: ${email}`);
  } else {
    console.log(`• 既存: ${email}`);
  }
  // プロフィール upsert
  const { error: pErr } = await admin
    .from('profiles')
    .upsert({ id: user.id, ...profile }, { onConflict: 'id' });
  if (pErr) throw new Error(`profile ${email}: ${pErr.message}`);
  await admin
    .from('notification_preferences')
    .upsert({ user_id: user.id }, { onConflict: 'user_id' });
  return user.id;
}

async function ensureAnnouncement(authorId, key, payload) {
  const { data: existing } = await admin
    .from('contents')
    .select('id')
    .eq('title', payload.title)
    .maybeSingle();
  if (existing) {
    console.log(`• 既存お知らせ: ${payload.title}`);
    return;
  }
  const { error } = await admin.from('contents').insert({
    author_id: authorId,
    status: 'published',
    published_at: new Date().toISOString(),
    ...payload,
  });
  if (error) throw new Error(`content ${payload.title}: ${error.message}`);
  console.log(`✅ お知らせ作成: ${payload.title}`);
}

const adminId = await ensureUser('admin@mcc.local', {
  display_name: 'しのぶ（運営）',
  avatar: '🌱',
  bio: 'マーケティングCampコミュニティの運営です。みなさんの成果が集まる場をつくっています。',
  role: 'admin',
  plan: null,
  status: 'active',
});

await ensureUser('member@mcc.local', {
  display_name: '田島 和子',
  avatar: '🍅',
  store_name: '田島農園',
  region: '北海道札幌市',
  product: '有機トマト・トマトソース',
  role: 'member',
  plan: 'standard',
  status: 'active',
});

await ensureAnnouncement(adminId, 'welcome', {
  category: 'important',
  title: 'コミュニティへようこそ！',
  body: 'マーケティングCampコミュニティへようこそ。まずはプロフィールを設定して、掲示板で自己紹介をしてみましょう。',
  pinned: true,
  required_plan: null,
});

await ensureAnnouncement(adminId, 'pro', {
  category: 'column',
  title: '【Pro限定】今月の売上アップ事例',
  body: 'スタンダード以上の会員向けに、今月の優れた施策事例を紹介します。',
  pinned: false,
  required_plan: 'standard',
});

console.log('\n🎉 デモデータ投入完了');
console.log('  admin@mcc.local  / Passw0rd123 （運営）');
console.log('  member@mcc.local / Passw0rd123 （standard 会員）');
