# MCC 事前登録フォーム — Apps Script で一発作成

**作成日**: 2026-05-27
**目的**: Google Apps Script で MCC 事前登録フォームをコード生成する

---

## 概要

下記の Apps Script コードを実行すると、以下が自動で作成・設定されます：

- ✅ フォーム本体（タイトル・説明・10問・各種設定）
- ✅ 回答記録用スプレッドシート（自動連携）
- ✅ 回答受信時のメール通知（実行者のメールアドレス宛）
- ✅ 完了画面のメッセージ
- ✅ 公開 URL の生成

---

## 実行手順

### Step 1: Apps Script プロジェクトを開く

ブラウザで以下のURLにアクセス：

```
https://script.google.com/
```

「**新しいプロジェクト**」をクリックし、プロジェクト名を **「MCC 事前登録フォーム作成」** に変更。

### Step 2: コードを貼り付け

エディタの中身（`function myFunction() {}`）を**全部削除**してから、下記のコードを貼り付けてください。

```javascript
/**
 * マーケティングCampコミュニティ(MCC) 事前登録フォーム自動生成スクリプト
 *
 * 使い方:
 *   1. このスクリプトを Apps Script エディタに貼り付け
 *   2. 関数選択メニューから「createMCCPreRegistrationForm」を選択
 *   3. 実行ボタンを押す
 *   4. 初回は権限承認のダイアログが出るので「許可」
 *   5. 実行ログ（Ctrl+Enter または「実行ログを開く」）にフォームURL等が出力される
 */

function createMCCPreRegistrationForm() {
  // ===== 1. フォーム新規作成 =====
  const form = FormApp.create('マーケティングCampコミュニティ(MCC) 事前登録');

  form.setDescription(
    '食品生産者・職人の方々が学び合うコミュニティ「マーケティングCampコミュニティ(MCC)」のリリースに先駆け、ご参加にご興味のある方を募集しております。\n' +
    '下記にご記入いただいた方には、リリース時に優先的にご案内いたします。\n\n' +
    '所要時間:3〜5分'
  );

  // ===== 2. 基本設定 =====
  form.setCollectEmail(false);                    // メール収集はQ2で行う
  form.setLimitOneResponsePerUser(false);         // 1ユーザー1回制限なし(ログイン不要)
  form.setAcceptingResponses(true);               // 回答受付ON
  form.setProgressBar(true);                      // 進捗バー表示
  form.setAllowResponseEdits(false);              // 回答編集不可
  form.setShowLinkToRespondAgain(false);          // 再回答リンク非表示

  // ===== 3. 質問項目 =====

  // Q1: お名前(必須・記述式)
  form.addTextItem()
    .setTitle('お名前')
    .setRequired(true);

  // Q2: メールアドレス(必須・記述式)
  form.addTextItem()
    .setTitle('メールアドレス(連絡用)')
    .setHelpText('リリースのご案内はこちらにお送りします。')
    .setRequired(true);

  // Q3: お電話番号(任意・記述式)
  form.addTextItem()
    .setTitle('お電話番号')
    .setHelpText('任意。緊急時のご連絡用です。')
    .setRequired(false);

  // Q4: 屋号・店名(必須・記述式)
  form.addTextItem()
    .setTitle('屋号・店名')
    .setRequired(true);

  // Q5: 都道府県(必須・プルダウン)
  const prefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
    '岐阜県', '静岡県', '愛知県', '三重県',
    '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
    '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県',
    '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'
  ];
  form.addListItem()
    .setTitle('都道府県')
    .setChoiceValues(prefectures)
    .setRequired(true);

  // Q6: 販売しているもの(必須・記述式)
  form.addTextItem()
    .setTitle('販売しているもの')
    .setHelpText('例:野菜、果物、米、海産物、加工品、お酒など。複数ある場合は読点で区切ってください。')
    .setRequired(true);

  // Q7: 主な販売チャネル(必須・チェックボックス)
  form.addCheckboxItem()
    .setTitle('主な販売チャネル(複数選択可)')
    .setChoiceValues([
      '実店舗',
      'EC(自社サイト)',
      'モール(楽天・Amazon等)',
      'SNS直販',
      '卸',
      'その他'
    ])
    .setRequired(true);

  // Q8: 興味のあるプラン(必須・ラジオ)
  form.addMultipleChoiceItem()
    .setTitle('興味のあるプラン')
    .setHelpText('リリース時の参考にさせていただきます。後から変更可能です。')
    .setChoiceValues([
      'お試しプラン(月額 980円・税込)',
      'スタンダードプラン(月額 25,000円・税込)',
      'プレミアムプラン(月額 77,000円・税込)',
      '検討中・話を聞いてから決めたい'
    ])
    .setRequired(true);

  // Q9: コミュニティに期待すること(任意・段落)
  form.addParagraphTextItem()
    .setTitle('コミュニティに期待すること')
    .setHelpText('任意。マーケティングのお悩みやコミュニティに求めるものなど、自由にお書きください。')
    .setRequired(false);

  // Q10: どこで知ったか(任意・ラジオ)
  form.addMultipleChoiceItem()
    .setTitle('MCCをどこで知りましたか')
    .setChoiceValues([
      '紹介',
      'SNS',
      '講演・セミナー',
      'その他'
    ])
    .setRequired(false);

  // ===== 4. 完了画面メッセージ =====
  form.setConfirmationMessage(
    'ご登録ありがとうございます!\n\n' +
    'リリース時に優先的にご案内をお送りいたします。\n' +
    '今しばらくお待ちください。\n\n' +
    '— マーケティングCampコミュニティ(MCC)運営'
  );

  // ===== 5. スプレッドシート連携 =====
  const spreadsheet = SpreadsheetApp.create('MCC 事前登録 回答');
  form.setDestination(
    FormApp.DestinationType.SPREADSHEET,
    spreadsheet.getId()
  );

  // ===== 6. メール通知トリガー設定 =====
  // 既存の同名トリガーがあれば削除(重複防止)
  const existingTriggers = ScriptApp.getProjectTriggers();
  existingTriggers.forEach(t => {
    if (t.getHandlerFunction() === 'onMCCFormSubmit') {
      ScriptApp.deleteTrigger(t);
    }
  });

  ScriptApp.newTrigger('onMCCFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();

  // ===== 7. 実行結果ログ =====
  const editUrl = form.getEditUrl();
  const publishedUrl = form.getPublishedUrl();
  const shortUrl = form.shortenFormUrl(publishedUrl);
  const spreadsheetUrl = spreadsheet.getUrl();

  Logger.log('===========================================');
  Logger.log('  MCC 事前登録フォーム 作成完了!');
  Logger.log('===========================================');
  Logger.log('');
  Logger.log('■ フォーム編集URL(運営用):');
  Logger.log('  ' + editUrl);
  Logger.log('');
  Logger.log('■ 公開URL(回答者用、これを配布):');
  Logger.log('  ' + publishedUrl);
  Logger.log('');
  Logger.log('■ 短縮URL:');
  Logger.log('  ' + shortUrl);
  Logger.log('');
  Logger.log('■ 回答記録スプレッドシート:');
  Logger.log('  ' + spreadsheetUrl);
  Logger.log('');
  Logger.log('■ メール通知の送信先:');
  Logger.log('  ' + Session.getActiveUser().getEmail());
  Logger.log('===========================================');

  return {
    editUrl: editUrl,
    publishedUrl: publishedUrl,
    shortUrl: shortUrl,
    spreadsheetUrl: spreadsheetUrl
  };
}


/**
 * フォーム回答送信時に運営にメール通知する
 * (createMCCPreRegistrationForm の中でトリガー登録される)
 */
function onMCCFormSubmit(e) {
  try {
    const adminEmail = Session.getActiveUser().getEmail();
    const formResponse = e.response;
    const itemResponses = formResponse.getItemResponses();

    let body = '新しい事前登録が届きました。\n\n';
    body += '日時: ' + Utilities.formatDate(formResponse.getTimestamp(), 'Asia/Tokyo', 'yyyy/MM/dd HH:mm') + '\n\n';
    body += '--- 回答内容 ---\n';

    itemResponses.forEach(itemResponse => {
      const title = itemResponse.getItem().getTitle();
      const answer = itemResponse.getResponse();
      body += '\n■ ' + title + '\n';
      body += Array.isArray(answer) ? answer.join('、') : answer;
      body += '\n';
    });

    body += '\n\n---\n';
    body += '回答一覧スプレッドシート: ' + e.source.getDestinationId();

    GmailApp.sendEmail(
      adminEmail,
      '【MCC 事前登録】新規回答がありました',
      body
    );
  } catch (err) {
    Logger.log('メール通知失敗: ' + err);
  }
}
```

### Step 3: 実行

1. エディタ上部の **関数選択メニュー** で `createMCCPreRegistrationForm` を選択
2. **「実行」ボタン**（▶︎）をクリック
3. 初回は **「権限の確認」** ダイアログが出る
   - 「権限を確認」をクリック
   - Google アカウントを選択
   - 「マーケティングCampコミュニティ(MCC) 事前登録フォーム作成 が次へのアクセスをリクエストしています」と出る
   - **「詳細」→「(プロジェクト名)に移動」→「許可」**
4. 実行が完了したら、エディタ下部に **「実行ログ」** が表示される

### Step 4: URL を確認

実行ログには以下が出力されています：

```
===========================================
  MCC 事前登録フォーム 作成完了!
===========================================

■ フォーム編集URL(運営用):
  https://docs.google.com/forms/d/.../edit

■ 公開URL(回答者用、これを配布):
  https://docs.google.com/forms/d/e/.../viewform

■ 短縮URL:
  https://forms.gle/...

■ 回答記録スプレッドシート:
  https://docs.google.com/spreadsheets/d/.../edit

■ メール通知の送信先:
  hariki@archines.co.jp
===========================================
```

このうち **公開URL（または短縮URL）** が事前登録者に渡すリンクです。

### Step 5: テスト送信

1. **公開URL**を別タブで開いてフォーム表示を確認
2. テスト用に1件回答を送信してみる
3. 以下を確認：
   - スプレッドシートに回答が記録されたか
   - 運営メールに「【MCC 事前登録】新規回答がありました」が届いたか
   - フォーム完了画面のメッセージが表示されたか

---

## トラブルシューティング

| 症状 | 対処 |
|---|---|
| 権限承認画面で「警告: このアプリは確認されていません」 | 「詳細」をクリック → 「(プロジェクト名)に移動(安全ではないページ)」をクリック。自分が書いたスクリプトなので問題なし |
| 関数選択メニューに `createMCCPreRegistrationForm` が出ない | コードが正しく貼り付けられているか確認、保存(Ctrl+S)してから再度実行 |
| 「ScriptApp.newTrigger ... permission denied」エラー | プロジェクト名が空、または保存していない可能性。プロジェクト名を入力して保存 |
| メール通知が来ない | スパムフォルダを確認、`onMCCFormSubmit` 関数が定義されているか確認 |
| スプレッドシートに回答が反映されない | 「回答」タブ → 「スプレッドシートにリンク」を再設定 |

---

## 後から変更したい場合

質問項目や選択肢を変えたい時は：

### 案A: スクリプトを編集して再実行
- 古いフォームは削除（または別名で残す）
- スクリプトを修正してから `createMCCPreRegistrationForm` を再実行
- 新しいフォームが作成される
- **注意**：URL が変わるので、配布済みリンクは無効になる

### 案B: 既存フォームを Google フォーム UI で直接編集
- 軽微な変更（文言修正、選択肢追加など）はこちらが簡単
- URL は変わらない

---

## このスクリプトの権限スコープ

| スコープ | 用途 |
|---|---|
| Forms API | フォーム作成・編集 |
| Spreadsheet API | 回答記録スプレッドシート作成 |
| Drive API | ファイル作成 |
| Gmail API | 回答時のメール通知 |
| Triggers | onFormSubmit トリガー設定 |

実行者の Google アカウント権限で動くため、外部に情報は出ません。

---

## 設計書との関係

このスクリプトで作成されるフォームは、設計書 §13「β期間運用」の前段階となる **事前登録フェーズ** で使用します。

- 事前登録 → リリース時の優先案内
- 集まった登録者から β初期メンバー候補を選定（5〜10名）
- β期間運用は `details/beta-operation.md` を参照

---

## 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-05-27 | 初版作成 |
