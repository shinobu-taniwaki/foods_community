-- ============================================================
-- ローンチ用 初期コンテンツ seed（dev-phases §3.5.14 / 設計書 §18）
--
-- ⚠️ 自動実行されない（config.toml の db.seed 対象外）。
-- 最初の admin（しのぶさん）を作成した後に一度だけ手動で流す:
--   psql "$DATABASE_URL" -f supabase/seed_initial_content.sql
--
-- - admin プロフィールが未作成なら何もせず NOTICE を出して終了
-- - 同タイトルの既存データがあればスキップ（再実行安全）
-- - 文面はドラフト。公開前にしのぶさんの確認・編集を推奨
--   （アプリの admin 画面からいつでも編集できます）
-- ============================================================

DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id
  FROM public.profiles
  WHERE role = 'admin' AND status = 'active'
  ORDER BY created_at
  LIMIT 1;

  IF admin_id IS NULL THEN
    RAISE NOTICE '初期コンテンツ seed: admin プロフィールが見つからないためスキップしました。admin 作成後に再実行してください。';
    RETURN;
  END IF;

  -- ----------------------------------------------------------
  -- ウェルカム投稿（掲示板・集客チャンネル）1 件
  -- ----------------------------------------------------------
  INSERT INTO public.posts (author_id, channel_id, title, content)
  SELECT admin_id, 'customer',
    'ようこそ！まずはこちらをお読みください',
    'マーケティングCampコミュニティ（MCC）へようこそ！運営のしのぶです。' || E'\n\n'
    || 'ここは、食品づくりに励むみなさんが「売る力」を一緒に育てていく場所です。' || E'\n\n'
    || '掲示板は次の 3 つのチャンネルに分かれています。' || E'\n'
    || '・📈 KPI改善：数値で測れる改善の事例' || E'\n'
    || '・💰 売上UP：売上が伸びた施策・工夫' || E'\n'
    || '・🧲 集客：新規・リピート集客の知見' || E'\n\n'
    || '最初の一歩として、この投稿に「いいね」を押してみてください。'
    || 'そして、自己紹介やいま取り組んでいることを、お気軽に投稿してくださいね。' || E'\n\n'
    || 'みなさんの挑戦を、心から応援しています！'
  WHERE NOT EXISTS (
    SELECT 1 FROM public.posts WHERE title = 'ようこそ！まずはこちらをお読みください'
  );

  -- ----------------------------------------------------------
  -- 利用ガイド（お知らせ・コラム）3 件
  -- ----------------------------------------------------------
  INSERT INTO public.contents (author_id, category, title, body, pinned, status, published_at)
  SELECT admin_id, 'column',
    '【使い方ガイド①】プロフィールを設定しましょう',
    'まずはあなたのことを教えてください。' || E'\n\n'
    || '1. 画面右上の顔アイコンから「マイページ」を開きます' || E'\n'
    || '2. 「設定」→「プロフィール編集」を選びます' || E'\n'
    || '3. お名前・アイコン・お店のこと・扱う商品を入力して保存します' || E'\n\n'
    || 'プロフィール写真も設定できます。「写真を選ぶ」を押して、スマホの中の写真を選ぶだけで OK です。' || E'\n\n'
    || 'プロフィールが充実していると、仲間があなたを見つけやすくなり、交流も生まれやすくなります。',
    true, 'published', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.contents WHERE title = '【使い方ガイド①】プロフィールを設定しましょう'
  );

  INSERT INTO public.contents (author_id, category, title, body, pinned, status, published_at)
  SELECT admin_id, 'column',
    '【使い方ガイド②】掲示板で仲間とつながりましょう',
    '掲示板は、仲間の取り組みから学び、自分の挑戦を共有する場所です。' || E'\n\n'
    || '■ 読む' || E'\n'
    || '画面下の「掲示板」タブから、みんなの投稿を読めます。参考になった投稿には「いいね」を押しましょう。' || E'\n\n'
    || '■ 投稿する' || E'\n'
    || '「＋投稿する」ボタンから、チャンネルを選んで書き込めます。うまくいったことも、うまくいかなかったことも、共有すること自体に価値があります。' || E'\n\n'
    || '■ コメントする' || E'\n'
    || '気になる投稿には、感想や質問をコメントしてみましょう。あたたかい交流をお願いします。',
    false, 'published', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.contents WHERE title = '【使い方ガイド②】掲示板で仲間とつながりましょう'
  );

  INSERT INTO public.contents (author_id, category, title, body, pinned, status, published_at)
  SELECT admin_id, 'column',
    '【使い方ガイド③】売上・KPI を記録しましょう',
    '「データ」タブでは、毎月の売上・KPI・広告の成果（CPA）を記録できます。' || E'\n\n'
    || '記録を続けると、こんな良いことがあります。' || E'\n'
    || '・数字の変化から、施策の効果が見えるようになります' || E'\n'
    || '・振り返りがかんたんになります' || E'\n'
    || '・運営からのアドバイスも、より具体的になります' || E'\n\n'
    || '毎月の記録は 5 分ほどで終わります。月はじめに前月分を入力する習慣がおすすめです。',
    false, 'published', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.contents WHERE title = '【使い方ガイド③】売上・KPI を記録しましょう'
  );

  -- ----------------------------------------------------------
  -- よくある質問（お知らせ・コラム）5 件
  -- ----------------------------------------------------------
  INSERT INTO public.contents (author_id, category, title, body, pinned, status, published_at)
  SELECT admin_id, 'column',
    '【よくある質問】パスワードを忘れてしまいました',
    'ログイン画面の「パスワードなしでログイン（メールでリンクを受け取る）」をお使いください。' || E'\n\n'
    || '登録したメールアドレスを入力すると、ログイン用のリンクがメールで届きます。リンクを押すだけでログインできます。' || E'\n\n'
    || 'メールが届かない場合は、迷惑メールフォルダもご確認ください。新しいパスワードを設定し直したいときは、お問い合わせフォームからご連絡ください。',
    false, 'published', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.contents WHERE title = '【よくある質問】パスワードを忘れてしまいました'
  );

  INSERT INTO public.contents (author_id, category, title, body, pinned, status, published_at)
  SELECT admin_id, 'column',
    '【よくある質問】プランを変更したいです',
    '「マイページ」→「設定」→「プラン」から、プラン変更の申し込みができます。' || E'\n\n'
    || '申し込みフォームを送信いただくと、運営が確認のうえ変更のお手続きをします。変更が完了すると、通知（🔔）でご連絡します。' || E'\n\n'
    || '各プランの内容と料金は「プランのご案内」ページでご確認いただけます。',
    false, 'published', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.contents WHERE title = '【よくある質問】プランを変更したいです'
  );

  INSERT INTO public.contents (author_id, category, title, body, pinned, status, published_at)
  SELECT admin_id, 'column',
    '【よくある質問】投稿を編集・削除したいです',
    '自分の投稿は、投稿ページを開くと「編集」「削除」ができます。' || E'\n\n'
    || '・編集：内容やタグを変更して保存できます' || E'\n'
    || '・削除：投稿が一覧から見えなくなります' || E'\n\n'
    || '操作に迷ったときは、不具合報告フォームやお問い合わせフォームからお気軽にご相談ください。',
    false, 'published', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.contents WHERE title = '【よくある質問】投稿を編集・削除したいです'
  );

  INSERT INTO public.contents (author_id, category, title, body, pinned, status, published_at)
  SELECT admin_id, 'column',
    '【よくある質問】通知を減らしたい（増やしたい）です',
    '「マイページ」→「設定」→「通知設定」から、通知の種類ごとにオン・オフを切り替えられます。' || E'\n\n'
    || '・新しい投稿のお知らせ' || E'\n'
    || '・運営からのお知らせ' || E'\n'
    || '・自分の投稿へのコメント' || E'\n'
    || '・自分の投稿への「いいね」（はじめはオフになっています）' || E'\n\n'
    || 'なお、運営からの重要なお知らせは、大切な連絡のためオフにできません。ご了承ください。',
    false, 'published', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.contents WHERE title = '【よくある質問】通知を減らしたい（増やしたい）です'
  );

  INSERT INTO public.contents (author_id, category, title, body, pinned, status, published_at)
  SELECT admin_id, 'column',
    '【よくある質問】退会したいときはどうすればいいですか',
    '「マイページ」→「設定」→「退会」から、退会の申し込みができます。' || E'\n\n'
    || '申し込みフォームを送信いただくと、運営が確認のうえ退会のお手続きをします。' || E'\n\n'
    || '※ 退会後はログインできなくなります。' || E'\n'
    || '※ これまでの投稿・コメントは「（退会したメンバー）」の表記でしばらく残ります。' || E'\n\n'
    || 'ご不明な点があれば、お問い合わせフォームからご相談ください。',
    false, 'published', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.contents WHERE title = '【よくある質問】退会したいときはどうすればいいですか'
  );

  RAISE NOTICE '初期コンテンツ seed: 完了しました（既存タイトルはスキップ）。';
END $$;
