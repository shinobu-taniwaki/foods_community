# Google フォーム連携 設計・運用マニュアル

**対象**: マーケティングCampコミュニティ（MCC） MVP
**読者**: しのぶさん（admin・フォーム作成担当）／開発者（環境変数連携担当）
**最終更新**: 2026-05-26
**前提資料**: `/Users/hariki/work/tsutsuura/foods_community/.claude/plans/foods-community-design.plan.md` §10「プラン変更・お問い合わせ（Google フォーム連携）」

このドキュメントだけで、しのぶさんが Google フォームを 5 種類作成し、開発者が環境変数を設定し、回答が来たときの運用フローを実行できる状態を目指します。

---

## 1. Google フォーム連携の全体方針

### 1.1 なぜ Google フォーム経由か

| 観点 | 採用理由 |
|---|---|
| 実装簡素化 | アプリ内に申請フォーム UI を作らないため、初期実装スコープを大幅に削減できる |
| admin 手動運用 | しのぶさん 1 名運営前提。プラン変更・退会は振込確認や本人確認を含むため自動化リスクが高く、手動運用の方が安全 |
| コスト削減 | Google フォーム＋スプレッドシートは無料。Stripe や決済 SaaS の月額固定費を MVP 期は払わない |
| バックアップ性 | 回答は自動でスプレッドシートに蓄積されるため、アプリの DB に依存しない監査証跡が残る |
| 既存運用との親和性 | しのぶさんは既に Google アカウントを保有しており、Gmail で通知を受ける運用が自然 |

### 1.2 アプリからの導線

アプリ内では、以下の画面に **Google フォームを新規タブで開くボタン**を配置します（実装は §10.3 の `ExternalFormLink` 共通コンポーネント）。

| 起点画面 | ボタン文言 | 開くフォーム |
|---|---|---|
| `/me/settings/plan` | 「プラン変更を申し込む」 | A. プラン変更申請フォーム |
| `/upgrade`（trial がロック機能タップ時） | 「スタンダードに申し込む」 | A. プラン変更申請フォーム |
| `/me/settings/danger` | 「退会を申請する」 | B. 退会申請フォーム |
| ヘルプメニュー or 設定ハブ | 「お問い合わせ」 | C. お問い合わせフォーム |
| エラー画面のフッター or 設定ハブ | 「不具合を報告する」 | D. 不具合報告フォーム |
| お知らせ（セミナーカテゴリ）詳細 | 「セミナーに申し込む」 | E. セミナー申込フォーム |

URL は環境変数 `NEXT_PUBLIC_FORM_*` で管理し、ユーザーの氏名・メール・現在プランを **prefill** した状態で開きます（§3 参照）。

### 1.3 回答が来たときの admin 全体フロー

```
[ユーザーがフォーム送信]
    ↓
[Google フォーム → スプレッドシート 自動連携]
    ↓
[Gmail に通知メール届く（フォーム設定で ON）]
    ↓
[しのぶさんがスプレッドシートで詳細確認]
    ↓
[フォーム種別に応じた処理（§2 各フォーム参照）]
  - プラン変更：振込確認 → /admin/members/:id でプラン変更 → 通知
  - 退会申請：/admin/members/:id で退会実行 → 通知
  - お問い合わせ：Gmail で個別返信
  - 不具合報告：Claude Code で修正依頼 → 完了後返信
  - セミナー申込：参加 URL を Gmail で返信
    ↓
[スプレッドシートの「対応状況」列を更新（推奨）]
```

### 1.4 共通設計ルール

- すべてのフォームの**1問目は氏名、2問目はメールアドレス**で統一する（prefill 順序の取り違いを防ぐため）。
- すべてのフォームで「メールアドレスを収集する」設定は **OFF**（フォーム側の Google 認証メールではなく、prefill で渡したメールを使うため）。
- 「回答のコピーを回答者に送信」は **ON にする（要求された場合）**（送信完了の安心感、控えとして）。
- 「回答を編集することを許可する」は **OFF**（運用がブレるため、修正は再送依頼）。
- 「回答を 1 回に制限する（ログイン要求）」は **OFF**（Google ログインしていない閲覧者でも送信できるように）。
- フォーム言語は **日本語**、テーマカラーは **テラコッタ #c05e3f** で統一（ブランド一貫性）。

---

## 2. 各フォームの詳細設計

### A. プラン変更申請フォーム

#### A.1 用途
- trial → standard へのアップグレード申請
- standard → premium へのアップグレード申請
- standard / premium → trial へのダウングレード申請
- standard ⇄ premium の双方向変更

#### A.2 フォーム情報

| 項目 | 値 |
|---|---|
| フォーム名（しのぶさん管理用） | MCC プラン変更申請 |
| タイトル（回答者表示） | プラン変更のお申し込み |
| 説明文 | プラン変更をご希望の方は下記フォームよりお申し込みください。運営が確認のうえ、振込確認後に変更処理を行います。 |
| 環境変数 | `NEXT_PUBLIC_FORM_PLAN_UPGRADE` |

#### A.3 質問項目

| # | 質問文 | 種類 | 必須 | prefill | 選択肢 |
|---|---|---|:---:|:---:|---|
| Q1 | お名前 | 記述式（短文） | ◯ | ◯ | — |
| Q2 | メールアドレス | 記述式（短文）／回答の検証「メール」 | ◯ | ◯ | — |
| Q3 | 現在のプラン | プルダウン | ◯ | ◯ | お試しプラン／スタンダードプラン／プレミアムプラン |
| Q4 | 希望するプラン | プルダウン | ◯ | — | スタンダードプラン／プレミアムプラン／お試しプランに戻す |
| Q5 | 振込予定日 | 日付 | — | — | — |
| Q6 | 一言メッセージ | 記述式（段落） | — | — | — |
| Q7 | 連絡可能な電話番号 | 記述式（短文） | — | — | — |

> Q5 補足：アップグレード時のみ有用。ダウングレード時は空欄でOK。説明文に「アップグレードの場合は記入してください」と添えると親切。

#### A.4 環境変数（開発者側）

```
NEXT_PUBLIC_FORM_PLAN_UPGRADE=https://docs.google.com/forms/d/e/{form_id}/viewform
NEXT_PUBLIC_FORM_PLAN_ENTRY_NAME=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_PLAN_ENTRY_EMAIL=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_PLAN_ENTRY_CURRENT_PLAN=entry.xxxxxxxxx
```

> Q4〜Q7 は prefill しないため entry ID は不要。ただし「現在のプラン」（Q3）の選択肢ラベルは、アプリ側で渡す値と**完全一致**させること（後述 §3.3）。

#### A.5 回答到着後の admin 運用フロー

```
1. Gmail で「プラン変更申請が届きました」通知を受領
2. スプレッドシートを開く
3. 申請内容を確認（Q1 氏名、Q2 メール、Q3 現在プラン、Q4 希望プラン）
4. [アップグレードの場合]
   ├─ 振込予定日（Q5）を確認
   ├─ 振込が確認できるまで待機
   └─ 振込確認後、次のステップへ
   [ダウングレードの場合]
   └─ 即時、次のステップへ
5. /admin/members で氏名・メールから対象メンバーを検索
6. /admin/members/:id を開く
7. 「プラン変更」プルダウンから Q4 の値を選択
8. 「保存」→ 確認ダイアログで実行
   → audit_logs に user_plan_changed が記録される
9. 本人にプラン変更通知（アプリ内通知＋メール）
   ※ アプリの管理画面側で自動送信されることを確認
10. スプレッドシートの「対応状況」列に「完了 / YYYY-MM-DD」を入力
```

---

### B. 退会申請フォーム

#### B.1 用途
メンバーが退会したい時の申請受付。**メンバー本人による即時退会は不可**（設計書 §5.7）、必ずこのフォーム経由 → admin 手動処理。

#### B.2 フォーム情報

| 項目 | 値 |
|---|---|
| フォーム名（管理用） | MCC 退会申請 |
| タイトル | 退会のお申し込み |
| 説明文 | 退会をご希望の方は下記フォームよりお申し込みください。運営が確認のうえ、退会処理を行います。退会後は投稿・コメント・データへのアクセスができなくなります。 |
| 環境変数 | `NEXT_PUBLIC_FORM_WITHDRAWAL` |

#### B.3 質問項目

| # | 質問文 | 種類 | 必須 | prefill | 選択肢 |
|---|---|---|:---:|:---:|---|
| Q1 | お名前 | 記述式（短文） | ◯ | ◯ | — |
| Q2 | メールアドレス | 記述式（短文）／検証メール | ◯ | ◯ | — |
| Q3 | 現在のプラン | プルダウン | ◯ | ◯ | お試しプラン／スタンダードプラン／プレミアムプラン |
| Q4 | 退会の理由 | ラジオボタン | ◯ | — | 使わなくなった／価格が合わない／サービスに不満があった／その他 |
| Q5 | その他理由・改善要望 | 記述式（段落） | — | — | — |
| Q6 | 退会希望時期 | ラジオボタン | ◯ | — | 即時退会を希望／月末退会を希望 |

#### B.4 環境変数（開発者側）

```
NEXT_PUBLIC_FORM_WITHDRAWAL=https://docs.google.com/forms/d/e/{form_id}/viewform
NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_NAME=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_EMAIL=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_CURRENT_PLAN=entry.xxxxxxxxx
```

#### B.5 回答到着後の admin 運用フロー

```
1. Gmail で「退会申請が届きました」通知を受領
2. スプレッドシートで内容確認
3. Q6 が「即時退会」なら即時処理、「月末退会」ならカレンダー登録
4. /admin/members で対象メンバーを検索
5. /admin/members/:id を開く
6. 「退会させる」ボタンをクリック
7. 確認ダイアログで実行
   ├─ profiles.status = 'deleted'
   ├─ profiles.deleted_at, deleted_by 設定
   ├─ auth.users.banned_until = 'infinity'
   ├─ audit_logs に user_deleted を記録
   └─ 既存セッション失効
8. 本人に退会完了メール通知（管理画面側で自動送信）
9. スプレッドシートの「対応状況」列を更新
10. Q4・Q5 の退会理由は β期間のフィードバックとしてしのぶさんが集計
```

---

### C. お問い合わせフォーム

#### C.1 用途
- 使い方の質問
- プランについての相談（未契約者は受けないが、契約者の事前相談はOK）
- その他、運営への問い合わせ全般

β期間中はフィードバック収集も兼用（設計書 §13.5）。

#### C.2 フォーム情報

| 項目 | 値 |
|---|---|
| フォーム名（管理用） | MCC お問い合わせ |
| タイトル | お問い合わせ |
| 説明文 | ご質問・ご要望はこちらからお寄せください。原則 3 営業日以内にメールでご返信します。 |
| 環境変数 | `NEXT_PUBLIC_FORM_INQUIRY` |

#### C.3 質問項目

| # | 質問文 | 種類 | 必須 | prefill | 選択肢 |
|---|---|---|:---:|:---:|---|
| Q1 | お名前 | 記述式（短文） | ◯ | ◯ | — |
| Q2 | メールアドレス | 記述式（短文）／検証メール | ◯ | ◯ | — |
| Q3 | お問い合わせカテゴリ | プルダウン | ◯ | — | 使い方の質問／プランについて／その他 |
| Q4 | 件名 | 記述式（短文） | ◯ | — | — |
| Q5 | 内容 | 記述式（段落） | ◯ | — | — |

#### C.4 環境変数（開発者側）

```
NEXT_PUBLIC_FORM_INQUIRY=https://docs.google.com/forms/d/e/{form_id}/viewform
NEXT_PUBLIC_FORM_INQUIRY_ENTRY_NAME=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_INQUIRY_ENTRY_EMAIL=entry.xxxxxxxxx
```

#### C.5 回答到着後の admin 運用フロー

```
1. Gmail で通知受領
2. スプレッドシートで内容確認
3. しのぶさんが Q2 のメールアドレス宛に Gmail で個別返信
4. 返信したらスプレッドシートの「対応状況」列に「返信済み / YYYY-MM-DD」を入力
5. 同一カテゴリの問い合わせが頻発する場合は、お知らせ（コラム）で
   FAQ 化することを検討
```

---

### D. 不具合報告フォーム

#### D.1 用途
- バグ・操作ができない・エラー画面が出た等の報告
- 「ボタンを押しても反応しない」「画像が表示されない」など UX 不具合

#### D.2 フォーム情報

| 項目 | 値 |
|---|---|
| フォーム名（管理用） | MCC 不具合報告 |
| タイトル | 不具合のご報告 |
| 説明文 | アプリの動作不良や表示崩れなど、お気づきの不具合をお知らせください。可能であればスクリーンショットと再現手順を添えていただけると助かります。 |
| 環境変数 | `NEXT_PUBLIC_FORM_BUG_REPORT` |

#### D.3 質問項目

| # | 質問文 | 種類 | 必須 | prefill | 選択肢 |
|---|---|---|:---:|:---:|---|
| Q1 | お名前 | 記述式（短文） | — | ◯ | — |
| Q2 | メールアドレス（ご返信用） | 記述式（短文）／検証メール | ◯ | ◯ | — |
| Q3 | 不具合が発生した画面 | プルダウン | ◯ | — | お知らせ／掲示板／データ／仲間／設定／管理画面／その他 |
| Q4 | 不具合の内容 | 記述式（段落） | ◯ | — | — |
| Q5 | 再現手順 | 記述式（段落） | — | — | — |
| Q6 | スクリーンショット | ファイルアップロード | — | — | 画像（PNG/JPEG）、最大 10MB、最大 3 ファイル |
| Q7 | ご利用環境（端末） | プルダウン | — | — | iPhone／Android スマホ／PC（Mac）／PC（Windows）／その他 |
| Q8 | ご利用ブラウザ | プルダウン | — | — | Safari／Chrome／Edge／Firefox／LINE 内ブラウザ／その他 |

> Q6 ファイルアップロードを有効にするには、フォーム作成者（しのぶさん）の Google ドライブを使用する設定が必要。回答者は Google ログインが必要になるため、説明文に「画像添付には Google ログインが必要です。ログインが難しい場合は内容欄に状況をご記入いただくだけで構いません」と明記する。

#### D.4 環境変数（開発者側）

```
NEXT_PUBLIC_FORM_BUG_REPORT=https://docs.google.com/forms/d/e/{form_id}/viewform
NEXT_PUBLIC_FORM_BUG_REPORT_ENTRY_NAME=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_BUG_REPORT_ENTRY_EMAIL=entry.xxxxxxxxx
```

#### D.5 回答到着後の admin 運用フロー

```
1. Gmail で通知受領
2. スプレッドシートで内容＋スクリーンショット確認
3. しのぶさんが Claude Code 経由で修正依頼
   （例：「掲示板のいいねボタンがタップしても反応しない不具合を直して」）
4. 修正完了・デプロイ後、報告者に Gmail で返信
   「ご報告いただいた不具合は修正しましたのでお知らせします。
    ご協力ありがとうございました。」
5. スプレッドシートの「対応状況」列を更新
   （未対応 → 調査中 → 修正中 → 修正済み）
```

---

### E. セミナー申込フォーム

#### E.1 用途
お知らせ（カテゴリ：seminar）から告知されるセミナーへの参加申込。

#### E.2 フォーム情報

| 項目 | 値 |
|---|---|
| フォーム名（管理用） | MCC セミナー申込 |
| タイトル | セミナーのお申し込み |
| 説明文 | セミナーへのご参加を希望される方はこちらからお申し込みください。後日、参加 URL をメールでお送りします。 |
| 環境変数 | `NEXT_PUBLIC_FORM_SEMINAR` |

#### E.3 質問項目

| # | 質問文 | 種類 | 必須 | prefill | 選択肢 |
|---|---|---|:---:|:---:|---|
| Q1 | お名前 | 記述式（短文） | ◯ | ◯ | — |
| Q2 | メールアドレス | 記述式（短文）／検証メール | ◯ | ◯ | — |
| Q3 | 現在のプラン | プルダウン | ◯ | ◯ | お試しプラン／スタンダードプラン／プレミアムプラン |
| Q4 | 参加希望日 | プルダウン | ◯ | — | （しのぶさんがセミナーごとに更新）例：2026/06/10（水）20:00〜／2026/06/17（水）20:00〜 |
| Q5 | 質問・期待していること | 記述式（段落） | — | — | — |

> Q3 をプラン情報として収集する理由：プランによって参加費（有料／無料）を切り分けるため。MVP では admin が手動で判定。
> Q4 の選択肢はセミナー開催ごとにしのぶさんが更新する。

#### E.4 環境変数（開発者側）

```
NEXT_PUBLIC_FORM_SEMINAR=https://docs.google.com/forms/d/e/{form_id}/viewform
NEXT_PUBLIC_FORM_SEMINAR_ENTRY_NAME=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_SEMINAR_ENTRY_EMAIL=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_SEMINAR_ENTRY_CURRENT_PLAN=entry.xxxxxxxxx
```

#### E.5 回答到着後の admin 運用フロー

```
1. Gmail で通知受領
2. スプレッドシートで参加者一覧を確認
3. プランに応じた参加可否・参加費を判定
4. しのぶさんから個別に参加 URL をメール送信
   （Zoom / Google Meet などのリンク）
5. 開催日前日にリマインドメール（任意）
6. スプレッドシートの「対応状況」列を更新
```

---

## 3. prefill 用 URL の構造とサンプル

### 3.1 基本形式

Google フォームの prefill URL は以下の形式：

```
https://docs.google.com/forms/d/e/{form_id}/viewform
  ?usp=pp_url
  &entry.{q1_id}={url_encoded_value_1}
  &entry.{q2_id}={url_encoded_value_2}
  &entry.{q3_id}={url_encoded_value_3}
```

- `usp=pp_url` は「事前入力された URL を取得」した際に付与されるパラメータ。残しておくと意図が明確。
- `entry.xxxxxxxxx` の数字部分が各質問の ID。フォームごと、質問ごとにユニーク。
- 値は **必ず URL エンコード**（日本語・スペース・記号対応）。

### 3.2 サンプル（プラン変更フォーム）

```
https://docs.google.com/forms/d/e/1FAIpQLSdAbCdEfG-example/viewform
  ?usp=pp_url
  &entry.123456789=%E7%94%B0%E5%B3%B6%E5%92%8C%E5%AD%90
  &entry.987654321=tajima%40example.com
  &entry.555555555=%E3%81%8A%E8%A9%A6%E3%81%97%E3%83%97%E3%83%A9%E3%83%B3
```

デコード後：
- `entry.123456789` = 田島和子
- `entry.987654321` = tajima@example.com
- `entry.555555555` = お試しプラン

### 3.3 URL エンコード必須項目と注意点

- **日本語（氏名・プラン名など）**：必ず `encodeURIComponent()` を通す。
- **メールアドレスの `@`**：`%40` にエンコードされる。
- **プラン名のラベルは Google フォーム側の選択肢と完全一致させる**：
  - アプリ側 DB の `plans.label` 値（例：「お試しプラン」「スタンダードプラン」「プレミアムプラン」）
  - フォーム側 Q3 のプルダウン選択肢のラベル
  - **両者が 1 文字でもズレるとプルダウンが選択されない**。

### 3.4 アプリ側で生成する関数の擬似コード（参考）

```typescript
// lib/forms/build-prefill-url.ts （実装時の参考）

type FormKey = 'PLAN_UPGRADE' | 'WITHDRAWAL' | 'INQUIRY' | 'BUG_REPORT' | 'SEMINAR';

type PrefillData = {
  name?: string;
  email?: string;
  currentPlanLabel?: string;
};

function buildPrefillUrl(formKey: FormKey, prefill: PrefillData): string {
  const baseUrl = process.env[`NEXT_PUBLIC_FORM_${formKey}`];
  if (!baseUrl) throw new Error(`Form URL not configured: ${formKey}`);

  const entryName = process.env[`NEXT_PUBLIC_FORM_${formKey}_ENTRY_NAME`];
  const entryEmail = process.env[`NEXT_PUBLIC_FORM_${formKey}_ENTRY_EMAIL`];
  const entryCurrentPlan = process.env[`NEXT_PUBLIC_FORM_${formKey}_ENTRY_CURRENT_PLAN`];

  const params = new URLSearchParams({ usp: 'pp_url' });
  if (entryName && prefill.name) params.set(entryName, prefill.name);
  if (entryEmail && prefill.email) params.set(entryEmail, prefill.email);
  if (entryCurrentPlan && prefill.currentPlanLabel) {
    params.set(entryCurrentPlan, prefill.currentPlanLabel);
  }

  return `${baseUrl}?${params.toString()}`;
}
```

> `URLSearchParams` は自動で URL エンコードを行うため、手動 `encodeURIComponent` は不要。
> 共通コンポーネント `ExternalFormLink`（設計書 §10.3）から呼ばれる前提。

---

## 4. 環境変数の一覧

開発者は `.env.production`（および `.env.local`）に以下を設定する。

```bash
# === Form URLs ===
NEXT_PUBLIC_FORM_PLAN_UPGRADE=https://docs.google.com/forms/d/e/.../viewform
NEXT_PUBLIC_FORM_WITHDRAWAL=https://docs.google.com/forms/d/e/.../viewform
NEXT_PUBLIC_FORM_INQUIRY=https://docs.google.com/forms/d/e/.../viewform
NEXT_PUBLIC_FORM_BUG_REPORT=https://docs.google.com/forms/d/e/.../viewform
NEXT_PUBLIC_FORM_SEMINAR=https://docs.google.com/forms/d/e/.../viewform

# === Entry IDs: Plan Upgrade ===
NEXT_PUBLIC_FORM_PLAN_UPGRADE_ENTRY_NAME=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_PLAN_UPGRADE_ENTRY_EMAIL=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_PLAN_UPGRADE_ENTRY_CURRENT_PLAN=entry.xxxxxxxxx

# === Entry IDs: Withdrawal ===
NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_NAME=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_EMAIL=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_WITHDRAWAL_ENTRY_CURRENT_PLAN=entry.xxxxxxxxx

# === Entry IDs: Inquiry ===
NEXT_PUBLIC_FORM_INQUIRY_ENTRY_NAME=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_INQUIRY_ENTRY_EMAIL=entry.xxxxxxxxx

# === Entry IDs: Bug Report ===
NEXT_PUBLIC_FORM_BUG_REPORT_ENTRY_NAME=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_BUG_REPORT_ENTRY_EMAIL=entry.xxxxxxxxx

# === Entry IDs: Seminar ===
NEXT_PUBLIC_FORM_SEMINAR_ENTRY_NAME=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_SEMINAR_ENTRY_EMAIL=entry.xxxxxxxxx
NEXT_PUBLIC_FORM_SEMINAR_ENTRY_CURRENT_PLAN=entry.xxxxxxxxx
```

> 設計書 §15.3「環境変数（サーバー `.env.production`）」に追記が必要。

> `NEXT_PUBLIC_` プレフィックスはクライアント側に露出してよいことを意味する。Google フォーム URL はそもそも公開情報なので問題なし。

---

## 5. しのぶさん向け：Google フォーム作成手順

5 種類のフォームすべてに共通する作成手順。1 フォームあたりの所要時間は約 15〜20 分。

### ステップ 1: Google フォームへアクセス

1. ブラウザで <https://forms.google.com/> を開く
2. 普段使っている Google アカウント（しのぶさん運営用）でログイン

### ステップ 2: 新規フォーム作成

1. 「空白のフォーム」（＋アイコン）をクリック
2. 新規フォームが開く

### ステップ 3: タイトルと説明文を設定

1. 画面上部のタイトル欄をクリックし、§2 のフォームごとの「タイトル」を入力
   例：プラン変更フォームなら「プラン変更のお申し込み」
2. その下の「フォームの説明」欄に、§2 の「説明文」を入力

### ステップ 4: フォーム名（管理用）を設定

1. 画面左上のタイトル（自動的に Q1 と同じ名前になる）をクリック
2. §2 の「フォーム名（管理用）」を入力
   例：「MCC プラン変更申請」
   → これは Google ドライブ上のファイル名になる

### ステップ 5: 質問項目を仕様通りに追加

§2 の各フォームの「質問項目」テーブルに従って、上から順に質問を追加する。

**質問追加の操作**：
- 右側のフローティングメニューの「＋（質問を追加）」アイコン
- 質問種別を選択（記述式・段落・ラジオ・プルダウン・日付・ファイル添付など）
- 質問文を入力
- 「必須」トグルを ON/OFF
- プルダウン・ラジオの場合は選択肢を 1 行ずつ入力

**メールアドレス欄の検証**：
- 質問種別を「記述式（短文）」にする
- 質問右下の「︙（その他）」→「回答の検証」→「テキスト」→「メールアドレス」を選択
- カスタムエラーメッセージ（任意）：「メールアドレスを正しい形式で入力してください」

**ファイル添付欄（不具合報告 Q6）**：
- 質問種別を「ファイルのアップロード」に変更
- 警告ダイアログで「続行」
- 「特定のファイル形式のみを許可」を ON → 「画像」を選択
- 「最大ファイル数」を 3、「最大ファイルサイズ」を 10 MB に設定
- 注意：ファイル添付があるフォームは回答者の Google ログインが必須になる

### ステップ 6: 設定タブで動作を調整

画面上部の「設定」タブをクリック。

| 項目 | 推奨設定 |
|---|---|
| 回答 → メールアドレスを収集する | OFF（prefill で渡すため） |
| 回答 → 回答のコピーを回答者に送信 | リクエストされた場合のみ送信（推奨） |
| 回答 → 回答を編集できるようにする | OFF |
| 回答 → ログインの要求（1 回に制限） | OFF（不具合報告フォームのみ ON 想定だが、Google ログイン必須化との兼ね合いで運用判断） |
| プレゼンテーション → 進行状況バー | ON（回答者が安心） |
| プレゼンテーション → 確認メッセージ | 「ご送信ありがとうございました。運営より追ってご連絡いたします。」などに変更 |

### ステップ 7: テーマカラーを変更

1. 画面右上のパレットアイコン「テーマをカスタマイズ」をクリック
2. ヘッダーの色を**テラコッタ #c05e3f** に近い色（赤系）に変更
3. フォントは「標準」のままで OK

### ステップ 8: 通知メール設定（admin に届くようにする）

1. 画面上部「回答」タブをクリック
2. 右上の「︙（その他）」メニュー
3. 「新しい回答についてのメール通知を受け取る」を **ON**
4. これでフォーム送信があるたびにしのぶさんの Gmail に通知が届く

### ステップ 9: スプレッドシート連携を有効化

1. 「回答」タブ → 「スプレッドシートにリンク」（緑色のアイコン）
2. 「新しいスプレッドシートを作成」を選択 → スプレッドシート名を入力
   例：「MCC プラン変更申請 回答」
3. 「作成」
4. 以降、回答はこのスプレッドシートに自動で蓄積される

**運用 Tips**：
- スプレッドシートの右側に手動で「対応状況」「対応日」「メモ」列を追加することを推奨
- スプレッドシートは Google ドライブの専用フォルダ「MCC 運営 / フォーム回答」にまとめる

### ステップ 10: 「事前入力された URL を取得」する

これが prefill 連携の心臓部です。

1. 編集画面右上の「︙（その他）」メニューをクリック
2. 「事前入力された URL を取得」を選択
3. 新しいタブでプレビュー画面が開く
4. **prefill したい項目（氏名・メール・現在プラン）にダミー値を入力**
   例：
   - 氏名：`SAMPLE_NAME`
   - メールアドレス：`sample@example.com`
   - 現在のプラン：「お試しプラン」を選択
   - **他の項目（希望プラン、振込予定日など）は空欄のまま**
5. 画面下部「リンクを取得」をクリック
6. 「リンクをコピー」をクリック
7. 取得した URL の例：
   ```
   https://docs.google.com/forms/d/e/1FAIpQLSdXXXX/viewform?usp=pp_url
     &entry.111111111=SAMPLE_NAME
     &entry.222222222=sample%40example.com
     &entry.333333333=%E3%81%8A%E8%A9%A6%E3%81%97%E3%83%97%E3%83%A9%E3%83%B3
   ```
8. この URL から **entry.xxxxxxxxx を読み取る**：
   - `entry.111111111` ← SAMPLE_NAME が入っている → 氏名の entry ID
   - `entry.222222222` ← sample@example.com → メールの entry ID
   - `entry.333333333` ← お試しプラン（URL エンコード済み） → 現在プランの entry ID
9. これらを開発者に共有（テキストファイル or メッセージで）

### ステップ 11: フォーム送信用 URL を取得

1. 編集画面右上の「送信」ボタンをクリック
2. 「リンク」アイコン（鎖マーク）を選択
3. 「URL を短縮」のチェックは OFF（短縮 URL だと prefill が効かないため）
4. 表示された URL（`https://docs.google.com/forms/d/e/{form_id}/viewform`）をコピー
5. これが `NEXT_PUBLIC_FORM_{KEY}` の値になる

### ステップ 12: 開発者へ共有

しのぶさんから開発者に共有する内容（メール or チャットで）：

```
フォーム種別：プラン変更申請（A）
送信 URL: https://docs.google.com/forms/d/e/1FAIpQLSdXXXX/viewform
entry.氏名: entry.111111111
entry.メール: entry.222222222
entry.現在のプラン: entry.333333333
```

これを 5 フォームすべてで行う。

---

## 6. 回答の蓄積・連携

### 6.1 スプレッドシート自動連携

各フォームで §5 ステップ 9 を実施することで、回答がスプレッドシートに自動蓄積される。

| フォーム | スプレッドシート名（推奨） |
|---|---|
| A. プラン変更申請 | MCC プラン変更申請 回答 |
| B. 退会申請 | MCC 退会申請 回答 |
| C. お問い合わせ | MCC お問い合わせ 回答 |
| D. 不具合報告 | MCC 不具合報告 回答 |
| E. セミナー申込 | MCC セミナー申込 回答 |

### 6.2 メール通知（重要度別）

| フォーム | メール通知 | 理由 |
|---|---|---|
| A. プラン変更申請 | **必須 ON** | 課金に直結するため即時把握が必要 |
| B. 退会申請 | **必須 ON** | 早期対応で離反防止の余地、月末退会希望の管理 |
| C. お問い合わせ | ON | 3 営業日以内返信を維持するため |
| D. 不具合報告 | ON | 重大バグの早期検知 |
| E. セミナー申込 | ON | 開催準備に必要 |

### 6.3 定期確認の運用

しのぶさんに推奨する運用：

- **毎日 1 回**：Gmail の MCC フォーム通知をチェック（朝・夜のルーティン）
- **週 1 回**：各スプレッドシートを開いて未対応案件がないか棚卸し
- **月 1 回**：退会理由（B.Q4）と不具合報告（D）を集計し、プロダクト改善の打ち手を検討

### 6.4 スプレッドシートのバックアップ

- Google ドライブの自動バックアップで十分（明示的なエクスポートは不要）
- ただし**監査証跡として残したい場合**、月初に前月分を CSV エクスポートして自前サーバーに保管する運用も可（任意）

---

## 7. 完了チェックリスト（しのぶさん用）

各フォームについて、以下がすべて完了したらリリース可能。

### A. プラン変更申請フォーム
- [ ] フォーム作成（タイトル・説明文・質問 7 項目）
- [ ] 必須項目設定（Q1〜Q4）
- [ ] テーマカラー（テラコッタ）設定
- [ ] メール通知 ON
- [ ] スプレッドシート連携
- [ ] 事前入力 URL から entry ID を 3 つ取得（氏名・メール・現在プラン）
- [ ] 送信 URL を開発者に共有
- [ ] 開発者が `.env` に反映済みであることを確認
- [ ] 動作確認（アプリの「プラン変更を申し込む」ボタンから開いて prefill されている）

### B. 退会申請フォーム
- [ ] フォーム作成（質問 6 項目）
- [ ] テーマカラー・メール通知・スプレッドシート連携
- [ ] entry ID 3 つ取得
- [ ] 開発者へ共有・動作確認

### C. お問い合わせフォーム
- [ ] フォーム作成（質問 5 項目）
- [ ] テーマカラー・メール通知・スプレッドシート連携
- [ ] entry ID 2 つ取得（氏名・メール）
- [ ] 開発者へ共有・動作確認

### D. 不具合報告フォーム
- [ ] フォーム作成（質問 8 項目、Q6 ファイル添付対応）
- [ ] テーマカラー・メール通知・スプレッドシート連携
- [ ] entry ID 2 つ取得
- [ ] 開発者へ共有・動作確認

### E. セミナー申込フォーム
- [ ] フォーム作成（質問 5 項目、Q4 はセミナーごとに更新前提）
- [ ] テーマカラー・メール通知・スプレッドシート連携
- [ ] entry ID 3 つ取得
- [ ] 開発者へ共有・動作確認

---

## 8. トラブルシューティング

### Q. prefill が効かない（フォームを開いても空欄になる）

| 原因 | 対処 |
|---|---|
| entry ID が間違っている | §5 ステップ 10 を再実施し、ダミー値が反映された URL から正確な entry ID を取り直す |
| プラン名のラベルがフォーム側と一致していない | フォームのプルダウン選択肢ラベルとアプリ側 DB の `plans.label` を完全一致させる |
| URL エンコードが二重になっている | `URLSearchParams` を使うか、手動エンコードなら 1 回だけ実行する |
| 短縮 URL（`forms.gle/xxx`）を使っている | 必ず長い `docs.google.com/forms/d/e/...` の URL を使う |

### Q. メール通知が届かない

- Google フォームの「回答」タブ → 「︙」→「新しい回答についてのメール通知を受け取る」が ON か確認
- Gmail のスパムフォルダ確認
- フォーム作成アカウントとしのぶさん運営アカウントが一致しているか確認

### Q. スプレッドシートに反映されない

- 「回答」タブ → スプレッドシートアイコンを再クリックして再連携
- 既存のスプレッドシートが移動・削除されていないか確認

### Q. 不具合報告のファイル添付が動かない

- 回答者が Google アカウントにログインしていない可能性大
- フォーム説明文に「画像添付には Google ログインが必要です」と明記
- ログインが困難な場合は「内容欄に文字で状況を記述する」運用に切り替える

---

## 9. 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-05-26 | 初版作成（MVP β リリース向け） |
