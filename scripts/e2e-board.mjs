// Phase 2 掲示板の RLS をローカル Supabase で検証する使い捨てスクリプト。
// 実行: A=<anon> S=<service> node scripts/e2e-board.mjs
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
  // standard 会員（seed 済み）でログイン
  const std = createClient(URL, process.env.A);
  await std.auth.signInWithPassword({
    email: 'member@mcc.local',
    password: 'Passw0rd123',
  });
  const {
    data: { user: stdUser },
  } = await std.auth.getUser();
  ck(Boolean(stdUser), 'standard 会員ログイン');

  // 投稿作成（kpi）
  const ins = await std
    .from('posts')
    .insert({
      author_id: stdUser.id,
      channel_id: 'kpi',
      title: 'E2Eテスト投稿',
      content: '本文です',
    })
    .select('id')
    .single();
  ck(!ins.error && ins.data, 'standard 会員は kpi に投稿できる');
  const postId = ins.data?.id;

  if (postId) {
    const tag = await std
      .from('post_tags')
      .insert({ label: 'E2Etag', slug: 'e2etag', created_by: stdUser.id })
      .select('id')
      .single();
    ck(!tag.error, 'standard 会員はタグを作成できる');
    if (tag.data) {
      const a = await std
        .from('post_tag_assignments')
        .insert({ post_id: postId, tag_id: tag.data.id });
      ck(!a.error, 'タグを投稿に割当できる（usage_count トリガー作動）');
    }
    const like = await std
      .from('post_likes')
      .insert({ post_id: postId, user_id: stdUser.id });
    ck(!like.error, 'standard 会員はいいねできる');
    const cmt = await std
      .from('post_comments')
      .insert({ post_id: postId, author_id: stdUser.id, body: 'コメント' });
    ck(!cmt.error, 'standard 会員はコメントできる');
  }

  // trial ユーザー作成
  const sfx = Math.floor(Number(`0.${stdUser.id.replace(/\D/g, '')}`) * 1e9);
  const trialEmail = `trial_b${sfx}@example.com`;
  const { data: tu } = await admin.auth.admin.createUser({
    email: trialEmail,
    password: 'Passw0rd123',
    email_confirm: true,
  });
  await admin.from('profiles').insert({
    id: tu.user.id,
    display_name: 'お試し',
    role: 'member',
    plan: 'trial',
    status: 'active',
  });
  const trial = createClient(URL, process.env.A);
  await trial.auth.signInWithPassword({
    email: trialEmail,
    password: 'Passw0rd123',
  });

  // trial は投稿不可（RLS で拒否）
  const tIns = await trial.from('posts').insert({
    author_id: tu.user.id,
    channel_id: 'kpi',
    title: 'trial投稿',
    content: '本文',
  });
  ck(Boolean(tIns.error), 'trial 会員は投稿できない（RLS で拒否）');

  // trial はコメント不可
  if (postId) {
    const tCmt = await trial
      .from('post_comments')
      .insert({ post_id: postId, author_id: tu.user.id, body: 'x' });
    ck(Boolean(tCmt.error), 'trial 会員はコメントできない（RLS で拒否）');
  }

  // trial は admin_advice を閲覧できない
  const advView = await trial
    .from('posts')
    .select('id')
    .eq('channel_id', 'admin_advice');
  ck(
    (advView.data?.length ?? 0) === 0 && advView.error === null,
    'trial は admin_advice を閲覧できない',
  );

  // cleanup
  if (postId) {
    await admin.from('post_comments').delete().eq('post_id', postId);
    await admin.from('post_likes').delete().eq('post_id', postId);
    await admin.from('post_tag_assignments').delete().eq('post_id', postId);
    await admin.from('posts').delete().eq('id', postId);
  }
  await admin.from('post_tags').delete().eq('slug', 'e2etag');
  await admin.auth.admin.deleteUser(tu.user.id);
}

try {
  await main();
} catch (e) {
  pass = false;
  console.error('ERROR:', e.message);
}
console.log(pass ? '\n🎉 掲示板RLS 合格' : '\n⚠️ 失敗あり');
process.exit(pass ? 0 : 1);
