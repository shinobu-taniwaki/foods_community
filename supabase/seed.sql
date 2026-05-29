-- ============================================================
-- 初期 seed（マスタデータ）
-- 設計: .claude/plans/details/data-model.md §13
-- supabase db reset 時に config.toml の db.seed 設定で自動投入される。
-- ============================================================

-- ============================================================
-- §13.1 plans
-- ============================================================
INSERT INTO public.plans (id, label, price_amount, tax_included, display_price, rank, description, features, sort_order, is_active) VALUES
  ('trial',    'お試しプラン',       980,   true, '月額 980 円（税込）',     0,
   'お試しで参加できる入門プラン。掲示板の閲覧は最新5件まで。',
   '["プロフィール作成","仲間一覧の閲覧","お知らせ閲覧（基本）","掲示板の最新5件閲覧"]'::jsonb,
   10, true),
  ('standard', 'スタンダードプラン', 25000, true, '月額 25,000 円（税込）', 1,
   '掲示板への投稿・データ記録など、コミュニティのすべての基本機能が利用可能。',
   '["お試しの全機能","掲示板への投稿・コメント・いいね","運営からのアドバイス閲覧","売上/KPI/CPA データ記録","Pro 限定お知らせ"]'::jsonb,
   20, true),
  ('premium',  'プレミアムプラン',   77000, true, '月額 77,000 円（税込）', 2,
   'スタンダードの全機能に加え、アプリ外で TikTok ショップ構築・LP 制作などの個別サポートを提供。',
   '["スタンダードの全機能","TikTok ショップ構築サポート（アプリ外）","LP 制作支援（アプリ外）","個別マーケティング相談"]'::jsonb,
   30, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- §13.2 product_genres
-- ============================================================
INSERT INTO public.product_genres (id, label, icon_emoji, description, sort_order, is_active) VALUES
  ('vegetable',     '野菜',           '🥬', NULL, 10,  true),
  ('fruit',         '果物',           '🍎', NULL, 20,  true),
  ('rice_grain',    '米・穀物',       '🌾', NULL, 30,  true),
  ('seafood',       '魚介',           '🐟', NULL, 40,  true),
  ('meat',          '肉',             '🍖', NULL, 50,  true),
  ('bakery',        'パン・焼き菓子', '🥖', NULL, 60,  true),
  ('dairy',         '乳製品',         '🧀', NULL, 70,  true),
  ('tea_beverage',  'お茶・飲料',     '🍵', NULL, 80,  true),
  ('condiment',     '調味料・蜂蜜',   '🍯', NULL, 90,  true),
  ('sake',          '酒類',           '🍶', NULL, 100, true),
  ('dried_nuts',    '乾物・ナッツ',   '🌰', NULL, 110, true),
  ('other',         'その他',         '🌱', NULL, 120, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- §13.3 channels
-- admin_advice は only_admin_can_post=true / required_plan='standard' / trial 非表示
-- ============================================================
INSERT INTO public.channels (id, label, description, icon_emoji, color, required_plan, only_admin_can_post, trial_preview_count, sort_order, is_active) VALUES
  ('kpi',          'KPI改善',           '数値で測れる改善の事例を共有するチャンネル', '📈', '#5a6b42', 'trial',    false, 5,    10, true),
  ('sales',        '売上UP',            '売上が伸びた施策・工夫を共有するチャンネル', '💰', '#d9a43d', 'trial',    false, 5,    20, true),
  ('customer',     '集客',              '新規・リピート集客の知見を共有するチャンネル', '🧲', '#c05e3f', 'trial',    false, 5,    30, true),
  ('admin_advice', '運営からのアドバイス', '運営から会員へのアドバイス専用チャンネル',    '🎓', '#3f5a6b', 'standard', true,  NULL, 40, true)
ON CONFLICT (id) DO NOTHING;
