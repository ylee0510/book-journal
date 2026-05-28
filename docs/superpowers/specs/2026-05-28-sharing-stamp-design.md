# 次の読者へ（Sharing Stamp）機能 設計仕様

Date: 2026-05-28

## 概要

読書カードに「譲ります」「貸します」「交換します」の丸スタンプを貼れる機能。カードのソーシャルバー右端にスタンプが表示され、タップするとカードポップアップが開き、受け取れる場所・手を挙げた人の一覧・リクエストボタンが表示される。既存のコメント欄でリアルな受け渡し場所の調整が行われる。

## データモデル

`books` コレクションの各ドキュメントに以下のフィールドを追加する。

```json
{
  "sharingTypes": ["lend"],
  "sharingLocation": "鎌倉駅周辺・由比ヶ浜カフェなど",
  "sharingRequests": [
    {
      "uid": "abc123",
      "name": "さくら",
      "requestedAt": 1716600000000
    }
  ]
}
```

| フィールド | 型 | 必須 | 説明 |
|-----------|---|------|------|
| sharingTypes | string[] | ❌ | "give"（譲ります）/ "lend"（貸します）/ "exchange"（交換します）の組み合わせ。空配列 or フィールドなし = スタンプなし |
| sharingLocation | string | ❌ | 受け取れる場所（最大100文字）。sharingTypes が空でなければ任意で入力可 |
| sharingRequests | object[] | ❌ | 手を挙げた人のリスト |
| sharingRequests[].uid | string | ✅ | Firebase Auth UID |
| sharingRequests[].name | string | ✅ | 表示名（displayName または reader 名） |
| sharingRequests[].requestedAt | number | ✅ | Date.now() |

## UI仕様

### 1. カード上のスタンプ（ソーシャルバー右端）

- `sharingTypes` が1つ以上ある場合のみ表示
- ♡ 💬 ボタンの右端、`margin-left: auto` で右寄せ
- 複数 type がある場合は最大3つ並べる（小さいため横並びで収まる）
- 各スタンプのデザイン：
  - サイズ: 34×34px の円
  - スタイル: 二重丸（`border` + `box-shadow: inset`）
  - 文字: 2行・`font-size: 0.42rem`・`font-weight: 700`・`transform: rotate(-18deg)`
  - 色:
    - give（譲ります）: 緑系 `border: #5a8a5a` / `background: #f0f8f0` / `color: #2a6a2a` / inner ring: `#b8d8b8`
    - lend（貸します）: 青系 `border: #5a6a9a` / `background: #f0f2f8` / `color: #2a4a8a` / inner ring: `#b8c4e0`
    - exchange（交換します）: 橙系 `border: #9a7a3a` / `background: #faf4e8` / `color: #7a5a10` / inner ring: `#ddc880`
- スタンプクリック → カードポップアップを開く（既存の `openCardPopup()` を呼ぶ）
- グリッドビュー（`.books-grid.is-grid`）ではソーシャルバーごと非表示になるため、スタンプも自然に非表示になる

### 2. カードポップアップ内「次の読者へ」セクション

`sharingTypes` が1つ以上ある場合のみ表示。付箋セクション（`📌 付箋メモ`）の下に追加。

**表示内容（全ユーザー）:**

```
📚 次の読者へ

[スタンプ丸] 譲ります（または 貸します / 交換します）
             ── 一言説明文（型ごとの固定テキスト）

📍 受け取れる場所
鎌倉駅周辺・由比ヶ浜カフェなど    ← sharingLocation がある場合のみ

🙋 手を挙げている人
まだいません。あなたが最初の手を挙げてみませんか？  ← 0人の場合
（または名前リスト）

[ 🙋 借りたいです！ ]  ← 自分のカード以外 & 未ログイン者には非表示 & 既にリクエスト済みなら「手を挙げました ✓」と表示してボタン無効化
```

**型ごとの固定説明文:**
- give: 「読み終わったので、大切にしてくれる方に譲ります。」
- lend: 「読み終わったので、しばらく貸し出せます。大切にしてください。」
- exchange: 「あなたの持っている素敵な本と、この本を交換しませんか？」

複数 type がある場合は各型を縦に並べる。

**「🙋 借りたいです！」ボタン押下時:**
- `sharingRequests` 配列に `{ uid, name, requestedAt }` を追加して `updateDoc`
- 楽観的更新でボタンを「手を挙げました ✓」に即時切り替え
- 匿名ユーザー（`currentUser.isAnonymous`）はボタン非表示 → 代わりに「ログインして手を挙げる」テキスト

### 3. 記録フォーム・EDITモーダルの「次の読者へ」セクション

感想・こんな人へ の下、カテゴリの上に追加（付箋セクションの直上）。

```
── （点線区切り） ──

次の読者へ（任意）

[ 譲ります ] [ 貸します ] [ 交換します ]  ← トグルチェックボックス（pill形状、複数選択可）

受け取れる場所（任意）
[___________________________]  ← 1つ以上チェックが入ったときのみ表示
例: 鎌倉駅周辺、読書会の場所など
```

- トグルはチェックがある型をアクティブスタイル（緑/青/橙の枠＋背景）で表示
- 保存時（`addBook()` の新規・更新両パス）に `sharingTypes` / `sharingLocation` を含める

## CSS設計

```css
/* ソーシャルバー内スタンプ */
.sharing-stamps          /* 複数スタンプのラッパー */
.sharing-stamp           /* 1つの丸スタンプ */
.sharing-stamp--give     /* 緑 */
.sharing-stamp--lend     /* 青 */
.sharing-stamp--exchange /* 橙 */
.sharing-stamp__text     /* 傾いた文字 */

/* ポップアップ内セクション */
.sharing-section         /* セクション全体 */
.sharing-item            /* 1型分のブロック（スタンプ＋説明） */
.sharing-location        /* 受け取れる場所ブロック */
.sharing-requests        /* 手を挙げた人リスト */
.sharing-request-btn     /* 🙋 借りたいです！ボタン */
.sharing-request-btn.raised /* 手を挙げました ✓ 状態 */

/* フォーム内 */
.sharing-form-section    /* セクション全体 */
.sharing-toggle-wrap     /* トグルチェックボックス群 */
.sharing-toggle          /* 各トグル pill */
.sharing-toggle--active  /* 選択中スタイル（色は型ごと） */
```

## 操作フロー

### スタンプ追加（オーナー）
1. 新規記録 or EDIT 画面で「次の読者へ」セクションの型をトグル
2. 必要なら「受け取れる場所」を入力
3. 「記録する」/「更新する」→ `updateDoc` で `sharingTypes`・`sharingLocation` を保存

### リクエスト（他ユーザー）
1. カード上のスタンプをタップ → カードポップアップを開く
2. 「📚 次の読者へ」セクションの「🙋 借りたいです！」をタップ
3. `sharingRequests` に追記 → ボタンが「手を挙げました ✓」になる
4. コメント欄で受け渡し場所・日時を調整

## 実装範囲・制約

- `sharingRequests` は Firestore 配列として `books` ドキュメントに同居（付箋と同様）
- `arrayRemove` はオブジェクト完全一致が必要なため不使用。削除は配列全体を上書き
- 既存の `onSnapshot` リスナーで自動反映されるため追加リスナー不要
- スタンプは任意のステータス（読書中・読了・読みたい）に設定可能
- リクエストの取り消しは実装しない（v1）
- オーナー側のリクエスト管理UI（承認・拒否・完了マーク）は実装しない（v1）。コメント欄で自由に対応

## 実装対象外（v1）

- リクエスト通知（プッシュ通知・バッジ）
- リクエスト承認・拒否フロー
- 受け渡し完了マーク
- スタンプフィルター（「譲ります一覧」表示）
