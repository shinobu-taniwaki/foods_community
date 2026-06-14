# マーケティングCampコミュニティ（MCC）設計ドキュメント INDEX

**最終更新**: 2026-05-26
**ステータス**: 設計フェーズ（実装着手前）

このディレクトリには、MCC MVP の設計ドキュメント一式が格納されています。

---

## 📖 全体構造

```
.claude/plans/
├── README.md                         … 本ファイル（INDEX）
├── foods-community-design.plan.md    … 設計書本体（俯瞰用）
└── details/                          … 領域別の詳細ドキュメント
    ├── data-model.md                 … データモデル詳細
    ├── rls-policies.md               … RLS ポリシー詳細
    ├── api-endpoints.md              … API/Server Action 仕様
    ├── screens.md                    … 画面詳細仕様・ワイヤーフレーム
    ├── notifications-and-emails.md   … 通知・メールテンプレ
    ├── google-forms.md               … Google フォーム設計
    ├── beta-operation.md             … β期間運用マニュアル
    ├── dev-phases.md                 … 開発フェーズ分割計画
    ├── server-investigation.md       … サーバー実態調査依頼文
    ├── agent-team.md                 … エージェントチーム編成書
    └── legal/                        … 法務文書雛形
        ├── terms.md                  … 利用規約
        ├── privacy.md                … プライバシーポリシー
        └── sctl.md                   … 特定商取引法表示
```

---

## 📋 ドキュメント一覧

### 中核ドキュメント

| ファイル | 行数目安 | 目的 |
|---|---:|---|
| [foods-community-design.plan.md](./foods-community-design.plan.md) | 約 1,650 | 設計の俯瞰。全章を読めば全体像が掴める |

### 領域別詳細

| ファイル | サイズ | 主な内容 | 担当領域 |
|---|---:|---|---|
| [details/data-model.md](./details/data-model.md) | 52KB | 22テーブルの完全 DDL、ER 図、seed、トリガー、インデックス | DB設計 |
| [details/rls-policies.md](./details/rls-policies.md) | 78KB | 80 RLS ポリシー、10 ヘルパー関数、検証テストケース | セキュリティ |
| [details/api-endpoints.md](./details/api-endpoints.md) | 61KB | 約 78 エンドポイント、入出力スキーマ、エラーコード | API |
| [details/screens.md](./details/screens.md) | 130KB | 50画面のワイヤーフレーム、状態遷移、UX 仕様 | フロントエンド |
| [details/notifications-and-emails.md](./details/notifications-and-emails.md) | 59KB | 通知 13 種＋メール 10 種＋HTML雛形 | コミュニケーション |
| [details/google-forms.md](./details/google-forms.md) | 34KB | 5フォーム設計＋作成手順 | 運用 |
| [details/beta-operation.md](./details/beta-operation.md) | 29KB | β期間チェックリスト・運用フロー | 運用 |
| [details/dev-phases.md](./details/dev-phases.md) | 44KB | Phase 0〜5、6〜10週間想定 | 開発計画 |
| [details/server-investigation.md](./details/server-investigation.md) | 29KB | 管理会社問い合わせ文＋自己調査コマンド | インフラ |
| [details/agent-team.md](./details/agent-team.md) | — | Phase 別エージェント起用シナリオ・並行運用パターン | 開発体制 |

### 法務雛形

| ファイル | サイズ | 目的 |
|---|---:|---|
| [details/legal/terms.md](./details/legal/terms.md) | 16KB | 利用規約（第1条〜第18条＋附則） |
| [details/legal/privacy.md](./details/legal/privacy.md) | 13KB | プライバシーポリシー（11セクション＋附則） |
| [details/legal/sctl.md](./details/legal/sctl.md) | 7KB | 特定商取引法表示 |

---

## 🗺️ 推奨される読む順序

### 全体像を掴みたい
1. `foods-community-design.plan.md` を通読

### 実装に着手する
1. `foods-community-design.plan.md` §1〜§3 で前提とデータモデル把握
2. `details/dev-phases.md` で Phase 0 の作業を開始
3. `details/data-model.md` で DDL を Supabase に投入
4. `details/rls-policies.md` で RLS を適用
5. Phase ごとに `details/api-endpoints.md` と `details/screens.md` を参照しながら実装

### β期間を運用する
1. `details/beta-operation.md` の準備チェックリストを消化
2. β期間中は同ドキュメントの日次・週次・月次チェックリストを参照

### 法務確認に出す
1. `details/legal/` の3文書を弁護士に依頼

### サーバー実態を調査する
1. `details/server-investigation.md` の問い合わせ文を管理会社へ送付
2. 結果を同ドキュメントのテンプレートに記入

---

## 🎯 状態管理

### ✅ 確定済み
- データモデル
- RLS ポリシー
- API 仕様
- 画面構成
- 通知・メール仕様
- Google フォーム設計
- 開発フェーズ
- β期間運用

### 📝 雛形（最終化は法務専門家依頼）
- 利用規約
- プライバシーポリシー
- 特定商取引法表示

### ⏸ 情報待ち（受領次第更新）
| 項目 | 影響範囲 |
|---|---|
| **F-3 プレミアム特典の文言** | アップグレード案内画面・利用規約・特商法 |
| **F-5 ドメイン名** | PWA manifest・メールテンプレ・環境変数 |
| **サーバー実態調査結果** | デプロイ・インフラ設計（§15）・セキュリティレビューの境界 |

### 🚧 設計確定後に実施
- セキュリティレビュー（`ecc:security-reviewer` agent）
- 実装着手（Phase 0 から開始）

---

## 🔗 ドキュメント相互参照マップ

```
foods-community-design.plan.md
  │
  ├─→ details/data-model.md         (§3 を詳細化)
  │     └─→ details/rls-policies.md (data-model のテーブルに対する RLS)
  │
  ├─→ details/api-endpoints.md      (§5,§6,§7,§8 を詳細化)
  │     └─→ details/screens.md      (各画面が呼ぶ API)
  │
  ├─→ details/notifications-and-emails.md (§5,§7.6 を詳細化)
  │
  ├─→ details/google-forms.md       (§10 を詳細化)
  │     └─→ details/screens.md      (Google フォーム導線を持つ画面)
  │
  ├─→ details/beta-operation.md     (§13 を実践マニュアル化)
  │
  ├─→ details/dev-phases.md         (§19 をスプリント計画化)
  │
  ├─→ details/server-investigation.md (§1.2,§15,§21.2 の調査用)
  │
  └─→ details/legal/                (§16.6 を雛形化)
```

---

## 📐 ドキュメント品質基準

すべての設計ドキュメントは以下を満たします：

- ✅ 開発者がこのドキュメントだけで実装できる粒度
- ✅ admin（しのぶさん）が実運用できる粒度
- ✅ 設計書本体と矛盾しない
- ✅ プレースホルダー（`{{ }}` や「後で連携」）が明示されている
- ✅ MVP スコープから外れた v0.2 機能は混入しない

---

## 🔄 次のアクション

1. **しのぶさんによるレビュー**：気になる箇所・修正依頼を反映
2. **サーバー実態調査の依頼**：`details/server-investigation.md` の問い合わせ文を管理会社へ送付
3. **F-3, F-5 の情報共有**：受領次第、関連ドキュメントを更新
4. **インフラ設計の確定**：サーバー調査結果からデプロイ方式（Self-hosted Supabase / Supabase Cloud + バックアップ）を決定
5. **セキュリティレビューの実施**：`ecc:security-reviewer` agent で全体レビュー
6. **法務確認の依頼**：`details/legal/` の3文書を弁護士へ依頼
7. **Phase 0 の着手**：`details/dev-phases.md` に従って環境構築開始

---

## 🗒️ 設計書本体への反映候補（並行作業から得られた追加事項）

各 Agent からの指摘を反映済み：

- ✅ 通知タイプに `comment_edited_by_admin` / `comment_deleted_by_admin` / `plan_changed` を追加
- ✅ 環境変数に Google フォーム関連の entry ID（13 項目）を追記
- ✅ `NEXT_PUBLIC_FORM_SEMINAR` を環境変数に追加

詳細は `foods-community-design.plan.md` の §7.6.1 と §15.3 を参照。
