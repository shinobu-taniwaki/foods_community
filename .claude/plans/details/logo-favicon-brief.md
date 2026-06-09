# MCC ロゴ・favicon 制作ブリーフ

> マーケティングCampコミュニティ（MCC）のロゴ／アプリアイコン／favicon を制作（または外部デザイナー／生成AIへ発注）するために必要な情報を集約したドキュメント。
> 出典: `.claude/plans/foods-community-design.plan.md` §1.1、`tailwind.config.ts`、`app/manifest.ts`、`CLAUDE.md`。

---

## 1. プロダクトの前提（世界観）

| 項目 | 内容 |
|---|---|
| 正式名称 | マーケティングCampコミュニティ（MCC） |
| 略称 / アプリ名 | **MCC** ／ PWA short_name は **CAMP** |
| プロダクト種別 | 食品生産者・職人のための学習コミュニティ PWA（スマホファースト） |
| 運営 | admin 1名（しのぶさん）＋ member 20〜50名 → 将来 2,000名規模 |
| ターゲット | **50代中心・IT リテラシー低めの食品生産者／職人** |
| キーワード | 食・手仕事・学び合い・成長記録・仲間・キャンプ（集い／焚き火を囲む場） |

### デザインが満たすべき体験価値
- **大きめの文字・シンプル・高コントラスト**（50代でも迷わない）
- **紙の質感・あたたかさ・素朴さ**（角丸14px、影はほぼ使わない方針と整合）
- 食品／自然由来の温かみのある配色（土・実り・畑・空）

---

## 2. ブランドカラー（確定トークン）

`tailwind.config.ts` の定義がそのまま正典。**この5色以外は原則使わない**。

| 役割 | 名前 | HEX | 用途の目安 |
|---|---|---|---|
| 背景 | cream（クリーム） | `#faf5ed` | 背景・余白。アイコン背景の基調 |
| 主役 / アクセント | **terracotta（テラコッタ）** | `#c05e3f` | ロゴ主色。PWA theme_color。CTA |
| 補助アクセント | mustard（マスタード） | `#d9a43d` | 差し色・実りの黄 |
| 自然 / 落ち着き | olive（オリーブ） | `#5a6b42` | 葉・畑・安定感 |
| 引き締め | navy（ネイビー） | `#3f5a6b` | 文字・締め色（任意） |
| 文字色 | foreground | `#33312e` | 黒の代わりの濃茶（純黒は使わない） |

- **メインのロゴ色は terracotta `#c05e3f`**（PWA の `theme_color`、CTA と同一）。
- **アイコンの背景は cream `#faf5ed`**（PWA の `background_color`）。
- 純黒（#000）・純白（#fff）は避け、cream / foreground を用いる。

### 配色コントラストの注意
- cream 背景 × terracotta は十分なコントラスト。小サイズ favicon でも視認可。
- mustard は明度が高いので、文字や細線には単独で使わない（背景や面で使う）。

---

## 3. タイポグラフィ

| 用途 | フォント | ウェイト |
|---|---|---|
| 見出し / ロゴタイプ | **Noto Serif JP** | 700 |
| 本文 / UI | Zen Kaku Gothic Antique | 400 / 500 |

- ロゴに文字を入れる場合は **Noto Serif JP 700**（明朝＝紙・伝統・食の落ち着き）を基準に。
- 欧文ロゴタイプ（"MCC" / "CAMP"）を使う場合も、明朝由来のセリフ or 手書き風で温かみを。
- ゴシック過ぎる・IT/SaaS 的な無機質さは避ける（ターゲットと世界観に合わない）。

---

## 4. モチーフ案（発注時のヒント）

「マーケティング Camp（キャンプ）」＝学びの場に集う、を象徴するモチーフ候補。

- **焚き火 / キャンプファイア**（仲間が囲む火 → terracotta の炎、温かみ）
- **テント / 三角形**（CAMP の直接的象徴、シンプルで favicon 向き）
- **実り・穀物・葉**（食品生産者 → mustard の粒、olive の葉）
- **囲む輪 / 集い**（コミュニティ＝人が円を描く）
- **頭文字 "M" "C"**（モノグラム。小サイズで最も崩れにくい）

> 推奨方向性: **シンプルな幾何形 1〜2モチーフ**（例: テント＋火、または M のモノグラム）。
> 50代向け・小サイズ favicon・maskable 安全領域を考えると、要素を盛らないほうが良い。

---

## 5. 必要な成果物（ファイル一覧）

### 5.1 PWA アイコン（`app/manifest.ts` が要求 → `public/` に配置）

| ファイル | サイズ | purpose | 備考 |
|---|---|---|---|
| `public/icon-192.png` | 192×192 | any | ホーム画面・一覧 |
| `public/icon-512.png` | 512×512 | any | スプラッシュ・高解像度 |
| `public/icon-maskable.png` | 512×512 | maskable | **安全領域 = 中央 80%**（外周はトリミングされる前提でデザイン） |

> 現状 `public/` は `.gitkeep` のみで**アイコン未配置**（manifest は Phase 5 本番差し替え予定）。
> maskable は Android が円／角丸など様々な形に切り抜くため、ロゴ本体は中央の直径 ≒ 410px 以内に収める。

### 5.2 favicon（ブラウザタブ用）

| ファイル | サイズ | 備考 |
|---|---|---|
| `app/favicon.ico` または `public/favicon.ico` | 16/32/48 マルチ | Next.js App Router は `app/favicon.ico` を自動認識 |
| `app/icon.png`（任意） | 32×32 など | App Router の規約ファイルでも可 |
| `app/apple-icon.png`（任意） | 180×180 | iOS ホーム画面 |

> Next.js 14 App Router では、`app/` 直下に `favicon.ico` / `icon.(png|svg)` / `apple-icon.png` を置くだけで
> `<head>` に自動でリンクされる（`metadata` 設定不要）。PWA の `icon-*.png` は `manifest.ts` 側で参照。

### 5.3 元データ（必須で残すもの）
- **ベクター原本（SVG / AI / Figma）** … スケール劣化なしの正本。
- 横長ロゴ（ロゴマーク＋ロゴタイプ）と、正方形アイコン（マークのみ）の**2バリエーション**。
- 単色版（terracotta 1色 / cream 背景に白抜き）… 印刷・刻印・1色運用向け。

---

## 6. デザイン制約チェックリスト（納品前確認）

- [ ] 主色は terracotta `#c05e3f`、背景は cream `#faf5ed`（ブランド5色の範囲内）
- [ ] 16×16 favicon に縮小しても判別できる（要素を詰め込みすぎない）
- [ ] maskable 版はロゴ本体が中央 80% 安全領域に収まる
- [ ] 純黒／純白を使わず、foreground `#33312e` を黒の代わりに使用
- [ ] 明朝／温かみのあるトーン（無機質な IT 風でない）
- [ ] cream 背景・terracotta 背景の両方で破綻しない（背景透過版も用意）
- [ ] SVG ベクター原本を納品（PNG だけで終わらせない）

---

## 7. 生成AI に発注する場合のプロンプト雛形（参考）

```
A minimal flat logo icon for a learning community of Japanese food
artisans, called "MCC / CAMP".
Motif: a simple campfire (or tent) symbolizing people gathering to learn.
Color palette ONLY: terracotta #c05e3f (main), cream #faf5ed (background),
mustard #d9a43d and olive #5a6b42 (accents). No pure black, no pure white.
Warm, earthy, handcrafted feeling. Rounded, friendly, high contrast.
Must stay legible at 16x16 favicon size. Centered within 80% safe area.
Flat vector, no gradients, no photorealism, plain background.
```

> 生成後は必ず **SVG 化＋ブランド5色へ補正**し、§5 の各サイズへ書き出すこと。

---

## 8. 書き出し後の組み込み手順（実装メモ）

1. デザイナー／生成AI から **SVG 原本**を受領。
2. 192 / 512 / maskable(512) の PNG を書き出し、`public/` に配置。
3. `app/favicon.ico`（マルチサイズ）を配置（App Router が自動リンク）。
4. iOS 用に `app/apple-icon.png`（180×180）を任意で配置。
5. `app/manifest.ts` の `icons` パスは既に `/icon-192.png` 等を参照済み → ファイル名を合わせるだけ。
6. `pnpm build` 後、PWA インストール／タブ favicon／iOS ホーム追加を実機確認（Phase 5）。

> 参考: PNG 一括書き出しは `sharp` などで自動化可能。例（SVG → 各PNG）:
> ```bash
> npx sharp-cli -i logo.svg -o public/icon-512.png resize 512 512
> ```

---

## 9. 制作済みアセット（2026-06 確定）

参考デザイン（テント＋旗＋三人の仲間＋稲穂・葉・トマト）を **SVG 原本**として起こし、
ブランド5色（terracotta / cream / mustard / olive / navy）の範囲内で制作済み。

### 9.1 原本（`public/brand/`）
| ファイル | 内容 |
|---|---|
| `mcc-mark.svg` | アイコン専用マーク（テント＋旗＋三人＋地面）。favicon / PWA の元 |
| `mcc-logomark.svg` | フルロゴマーク（マーク＋稲穂・葉・トマト） |
| `mcc-logo-horizontal.svg` / `.png` | 横組みロゴタイプ（マーク＋「MCC」＋サブタイトル） |

### 9.2 本番配置（生成済み）
| パス | 用途 | 由来 |
|---|---|---|
| `public/icon-192.png` (192) | PWA any | `mcc-mark` をcream背景に縮尺0.86 |
| `public/icon-512.png` (512) | PWA any | 同上 |
| `public/icon-maskable.png` (512) | PWA maskable | cream全面＋縮尺0.74（中央80%安全領域内を確認済み） |
| `app/favicon.ico` (16/32/48) | ブラウザタブ | 透過背景マルチサイズ。App Router が自動リンク |
| `app/apple-icon.png` (180) | iOS ホーム | cream背景。App Router が自動リンク |

### 9.3 再生成手順（ツール: `rsvg-convert` + Python PIL）
```bash
cd public/brand
# PWA / apple（cream背景・任意縮尺で mcc-mark.svg をラップして書き出し）
rsvg-convert -w 512 -h 512 icon-512.svg -o icon-512.png   # ラッパSVGは brief §5 の手順で生成
# favicon.ico（16/32/48 を PIL で結合）
python3 -c "from PIL import Image; Image.open('favicon-48.png').save('favicon.ico', sizes=[(16,16),(32,32),(48,48)])"
```

### 9.4 ロゴタイプ（横組み）2種
| ファイル | テキスト方式 | 用途 |
|---|---|---|
| `mcc-logo-horizontal.svg` | **live text**（Noto Serif JP 700 / Zen Kaku 500 をフォント指定）| Web 表示用。`next/font` で正フォント適用 |
| `mcc-logo-horizontal-outlined.svg` | **アウトライン化（パス）**／フォント非依存 | 印刷・外部配布・フォント未読込環境 |
| `mcc-logo-horizontal.png` / `@2x.png` | アウトライン版を書き出した忠実ラスター | 資料・SNS・サムネ等 |

> アウトライン化は実フォント（Google Fonts の Noto Serif JP 700 / Zen Kaku Gothic Antique 500 TTF）を
> matplotlib `TextPath` でパス化して生成。文字修正が必要な場合は live text 版を編集 → 再アウトライン。

### 9.5 既知の調整余地
- favicon 16px はテント輪郭が主役（三人は潰れる）。これは小サイズの想定内。
- ロゴタイプの欧文「Camp」は現状サブタイトル内に同一フォントで含む（参考デザイン準拠）。
</content>
</invoke>
