# MCC プロジェクト エージェントチーム編成書

**最終更新**: 2026-05-26
**対象**: マーケティングCampコミュニティ（MCC）MVP 開発

---

## 0. 編成方針

MCC プロジェクトの特性を踏まえ、以下を最適化するエージェントチームを編成する。

### プロジェクト特性
- **個人開発**（しのぶさん主導 + Claude による実装支援）
- **Next.js 14 + TypeScript + Supabase** スタック
- **セキュリティ重視**（招待制・RLS・PII 取り扱い）
- **50代向けアクセシビリティ**（食品生産者ターゲット）
- **コード規模は中程度**（MVP は 6〜10 週間）
- **β期間 → 本ローンチ**の段階的展開

### チーム編成の原則
1. **小チームで深く**：1 タスク 1 エージェント、必要に応じて並行起動
2. **専門領域に強いエージェント優先**：汎用 Claude より専門エージェント
3. **段階で起用を変える**：Phase ごとに必要なエージェントを変更
4. **使わない判断もする**：単純な作業は直接実装

---

## 1. コアチーム（プロジェクト常駐）

毎 Phase で繰り返し起用する中核エージェント。

| ロール | エージェント | 役割 | 起用頻度 |
|---|---|---|---|
| **🏛️ アーキテクト** | `ecc:code-architect` | 機能設計・アーキテクチャブループリント | Phase 開始時 |
| **🗂️ プランナー** | `ecc:planner` | 実装計画の作成 | 各タスク開始時 |
| **📘 TS レビュワー** | `ecc:typescript-reviewer` | TypeScript/Next.js コードレビュー | コード変更ごと |
| **🔍 コードレビュワー** | `ecc:code-reviewer` | 品質・パターン・ベストプラクティスレビュー | コミット前 |
| **🛠️ ビルド解決** | `ecc:build-error-resolver` | ビルドエラー・型エラーの解消 | エラー発生時 |
| **📚 コード探索** | `ecc:code-explorer` | 既存コードのトレース・依存マップ | 改修時 |

---

## 2. 専門チーム（領域別）

特定領域の作業で必要に応じて起用。

### 🛡️ セキュリティチーム
| エージェント | 起用シーン |
|---|---|
| `ecc:security-reviewer` | **設計確定時の全体レビュー / 認証・招待・RLS 実装後 / コミット前** |
| `ecc:silent-failure-hunter` | エラーハンドリングの抜け漏れチェック |

### 🗄️ データベースチーム
| エージェント | 起用シーン |
|---|---|
| `ecc:database-reviewer` | **DDL 適用前 / RLS ポリシー作成時 / SQL クエリ最適化 / マイグレーション設計** |

### 🎨 UX・アクセシビリティチーム
| エージェント | 起用シーン |
|---|---|
| `ecc:a11y-architect` | **WCAG 2.2 準拠 / 50代向け配慮確認 / 画面実装時** |

### 🧪 テスト・E2Eチーム
| エージェント | 起用シーン |
|---|---|
| `ecc:tdd-guide` | 重要箇所のテスト記述（MVP では厳密TDDは適用せず、認証・課金境界・モデレーションなど重要箇所のみ） |
| `ecc:e2e-runner` | β期間前のクリティカルフロー E2E テスト |
| `ecc:pr-test-analyzer` | PR レビュー時の覆覆性確認 |

### 🚀 パフォーマンス・最適化チーム
| エージェント | 起用シーン |
|---|---|
| `ecc:performance-optimizer` | ボトルネック調査 / バンドルサイズ最適化 / Lighthouse 改善 |
| `ecc:refactor-cleaner` | 死コード除去 / 大規模リファクタ後 |

### 📝 ドキュメント・運用チーム
| エージェント | 起用シーン |
|---|---|
| `ecc:doc-updater` | 仕様変更時の `.claude/plans/` 同期 |
| `ecc:comment-analyzer` | コメントの的確性・腐敗チェック |

---

## 3. Phase 別の起用シナリオ

`details/dev-phases.md` の Phase 構成に合わせた具体的な起用パターン。

### Phase 0：環境構築・初期設定（3〜5日）

```
[CLAUDE.md 設計]
   └─ ecc:code-architect で初期アーキテクチャの妥当性レビュー

[Next.js + Supabase セットアップ]
   └─ ecc:build-error-resolver で初期セットアップエラーに即対応

[デザイントークン整備]
   └─ ecc:a11y-architect で WCAG 観点の事前確認
```

**主な起用**：code-architect / build-error-resolver / a11y-architect

### Phase 1：認証・プロフィール・お知らせ（1〜2週間）

```
[データモデル投入]
   └─ ecc:database-reviewer で DDL レビュー
   └─ ecc:security-reviewer で RLS の妥当性確認

[招待制認証フロー実装]
   └─ ecc:planner で実装計画
   └─ ecc:typescript-reviewer でコードレビュー
   └─ ecc:security-reviewer で招待トークン処理・SSO ルートのセキュリティ確認
   └─ ecc:silent-failure-hunter でエラーハンドリング確認

[プロフィール編集]
   └─ ecc:a11y-architect でフォーム実装のアクセシビリティ確認

[お知らせ機能]
   └─ ecc:code-reviewer で実装パターン確認
```

**主な起用**：security-reviewer / database-reviewer / typescript-reviewer / a11y-architect

### Phase 2：掲示板・タグ・検索（1〜2週間）

```
[掲示板の閲覧・投稿]
   └─ ecc:code-architect で投稿モデルとチャンネル制御の整合性確認
   └─ ecc:typescript-reviewer
   └─ ecc:security-reviewer で trial 制限・チャンネル権限の漏れがないか

[YouTube 動画埋め込み]
   └─ ecc:security-reviewer で iframe sandbox・URL バリデーション確認

[検索機能]
   └─ ecc:database-reviewer で ILIKE クエリ最適化、インデックス検討
   └─ ecc:performance-optimizer で大量データ時のレスポンス確認
```

**主な起用**：security-reviewer / database-reviewer / performance-optimizer

### Phase 3：データ記録・仲間一覧（1週間）

```
[売上/KPI/CPA フォーム]
   └─ ecc:typescript-reviewer
   └─ ecc:a11y-architect で数値入力フィールドのモバイル UX 確認

[生成カラム検証]
   └─ ecc:database-reviewer で achievement_rate / change_rate / cpa の挙動確認
```

**主な起用**：typescript-reviewer / a11y-architect / database-reviewer

### Phase 4：管理者画面（1〜2週間）

```
[admin 専用ルーティング]
   └─ ecc:security-reviewer で admin 認可の漏れ確認
   └─ ecc:silent-failure-hunter で自己操作防止ガードの実装確認

[モデレーション機能（編集・削除）]
   └─ ecc:typescript-reviewer
   └─ ecc:code-reviewer で audit_logs 記録の網羅性確認

[マスタ管理（チャンネル・販売ジャンル・タグ）]
   └─ ecc:database-reviewer で CASCADE 削除の挙動確認
```

**主な起用**：security-reviewer / silent-failure-hunter / code-reviewer

### Phase 5：通知・PWA・最終調整（1週間）

```
[通知システム]
   └─ ecc:typescript-reviewer（Supabase Realtime 統合）
   └─ ecc:silent-failure-hunter で通知配信失敗時のリカバリ確認

[PWA セットアップ]
   └─ ecc:a11y-architect で「ホーム画面に追加」誘導の UX 確認
   └─ ecc:performance-optimizer で Lighthouse スコア改善

[Google フォーム連携]
   └─ ecc:typescript-reviewer で URL prefill ロジック確認

[β期間バナー・404/500 画面]
   └─ ecc:a11y-architect

[GitHub Actions デプロイ]
   └─ ecc:security-reviewer で Secrets スコープ・SSH 鍵運用確認
```

**主な起用**：a11y-architect / performance-optimizer / security-reviewer

### β期間直前：最終レビュー

```
[全体最終チェック]
   └─ ecc:security-reviewer：全機能の脆弱性最終確認
   └─ ecc:e2e-runner：クリティカルフローの E2E テスト
   └─ ecc:pr-test-analyzer：実装と仕様の整合性確認
   └─ ecc:performance-optimizer：Lighthouse 90 点以上を目標
```

**主な起用**：security-reviewer / e2e-runner / performance-optimizer / pr-test-analyzer

---

## 4. 並行運用パターン

Agent ツールでの並行起動を効果的に使うシーン。

### A. 設計詳細化の並行作業（過去に実施済み）
複数の独立した設計領域を同時並行で詳細化。本プロジェクトでは設計フェーズで data-model / rls / api / screens / notifications などを並行で進めた。

### B. レビューの多視点並行
1 つの実装に対して **typescript-reviewer / security-reviewer / a11y-architect** を並行起動して、観点別レビューを同時取得。

```
例：認証フォーム実装後
  ├─ Agent: typescript-reviewer（型・パターン）
  ├─ Agent: security-reviewer（脆弱性）
  └─ Agent: a11y-architect（50代向け UX）
→ 3 つの観点を独立に取得し、統合して修正
```

### C. 大規模リファクタ後の三段検証
**code-reviewer + silent-failure-hunter + pr-test-analyzer** を並行起動して品質を多角的に確認。

---

## 5. エージェントを使わない判断

以下のケースでは**エージェントを起用せず、直接 Claude（私）が実装/対応**する。

| ケース | 理由 |
|---|---|
| 単一ファイルの軽微な修正 | エージェント起動コストの方が高い |
| README・コメントの追記 | 専門性不要 |
| パッケージのバージョンアップ | 通常作業 |
| 環境変数の追加・削除 | 単純作業 |
| 既存パターンに沿った機能追加（〜30行） | コンテキスト持ち直しが不経済 |

---

## 6. エージェント呼び出しのルール

### 6.1 起用時のチェックリスト
- [ ] このエージェントが本当に必要か？（小タスクなら直接実装）
- [ ] エージェントに渡すコンテキストは十分か？（設計書・該当ファイルパス）
- [ ] 出力先・期待形式は明確か？
- [ ] 並行起動できる独立タスクか？

### 6.2 起用後のチェックリスト
- [ ] エージェント出力をそのまま信じず、結果を検証
- [ ] 重大な変更提案は要件と照合
- [ ] エージェントが扱えなかった範囲は明示

---

## 7. リスクと回避策

| リスク | 回避策 |
|---|---|
| エージェント起動が増えコストが嵩む | 月次でレビューし、効果が薄いエージェントは外す |
| 複数エージェントの提案が矛盾 | 私（メイン Claude）が統合判断 |
| エージェントがプロジェクト文脈を持たない | 起動時に設計書パスと該当章を明示 |
| TDD ガイドに引きずられて MVP が遅延 | 重要箇所のみ TDD 適用、それ以外は機能優先 |

---

## 8. 起用しないエージェント（このプロジェクトでは不要）

ECC には他にも多くのエージェントがあるが、以下は MCC MVP では起用しない。

| エージェント | 理由 |
|---|---|
| `ecc:python-reviewer` | Python は使わない |
| `ecc:go-reviewer` | Go は使わない |
| `ecc:rust-reviewer` | Rust は使わない |
| `ecc:cpp-reviewer` | C++ は使わない |
| `ecc:csharp-reviewer` | C# は使わない |
| `ecc:swift-reviewer` | iOS ネイティブは作らない |
| `ecc:kotlin-reviewer` | Android ネイティブは作らない |
| `ecc:flutter-reviewer` | Flutter は使わない |
| `ecc:django-reviewer` | Django は使わない |
| `ecc:fastapi-reviewer` | FastAPI は使わない |
| `ecc:java-reviewer` | Java は使わない |
| `ecc:harmonyos-app-resolver` | HarmonyOS は使わない |
| `ecc:network-architect` | ネットワーク設計は不要（マネージドサービス） |
| `ecc:network-troubleshooter` | 同上 |
| `ecc:network-config-reviewer` | 同上 |
| `ecc:homelab-architect` | 自宅ラボは関係なし |
| `ecc:cpp-build-resolver` 等の言語別 build-resolver | 該当言語を使わない |
| `ecc:mle-reviewer` | 機械学習は使わない |
| `ecc:healthcare-reviewer` | 医療系ではない |

---

## 9. v0.2 以降で検討するエージェント

| エージェント | 想定起用シーン |
|---|---|
| `ecc:e2e-runner` を恒常運用 | テスト自動化（MVP では手動 OK） |
| `ecc:performance-optimizer` を定期実行 | 会員 100 人超で必要性が出る |
| `ecc:refactor-cleaner` を月次実行 | コード成熟期 |

---

## 10. 利用ガイド：私（メイン Claude）のフロー

### 実装タスクが来たとき

```
[ユーザーからタスク依頼]
   ↓
[私の判断]
  ├─ 単純タスク？ → 直接実装（エージェント起動なし）
  └─ 専門性が必要？
      ↓
[エージェント選定]
  ├─ 機能設計が必要 → ecc:code-architect
  ├─ 既存コード理解が必要 → ecc:code-explorer
  ├─ DB 関連 → ecc:database-reviewer
  ├─ セキュリティ要件あり → ecc:security-reviewer
  ├─ UI 実装 → ecc:a11y-architect
  └─ 一般実装 → 直接実装 or ecc:typescript-reviewer
   ↓
[実装]
   ↓
[実装後レビュー（並行可能）]
  ├─ ecc:code-reviewer（品質全般）
  ├─ ecc:typescript-reviewer（TS 観点）
  └─ ecc:security-reviewer（セキュリティ観点、認証・データ系のみ）
   ↓
[修正・コミット]
```

### 各 Phase の最初に行うこと

```
1. ecc:planner で Phase の実装計画を作成
2. /plan で詳細を確認
3. 私が CLAUDE.md と設計書を再読
4. タスク分割（TaskCreate）
5. 実装着手
```

---

## 11. プロジェクト固有の "禁則事項"

エージェント運用において、このプロジェクトでは絶対に避けること。

1. **`ecc:tdd-guide` の厳密 80% カバレッジ強制を全機能に適用しない**：MVP では機能優先。重要箇所（認証・課金境界・モデレーション）のみ厳密に
2. **`ecc:security-reviewer` を「設計確定前」に起動しない**：サーバー実態・インフラ設計が固まる前にレビューしても手戻り（過去に明示済み）
3. **複数の言語別レビュワーを併用しない**：このプロジェクトは TypeScript 単一言語
4. **エージェントが提案するセキュリティ「OFF」変更を鵜呑みにしない**：RLS や認証は常に厳しい側に寄せる

---

## 12. 改訂履歴

| 日付 | 内容 |
|---|---|
| 2026-05-26 | 初版作成。設計フェーズ完了時点での想定 |

実装フェーズに入ったら起用実績を踏まえて改訂する。
