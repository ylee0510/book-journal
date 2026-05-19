# マイページ＆ログイン機能 設計書

**日付:** 2026-05-19  
**対象ファイル:** `/Users/ylee/Apps/book-journal/index.html`

---

## 概要

既存のbook-journalに「Googleログイン」と「マイページ」を追加する。
ログインは完全にオプション。未ログインユーザーも引き続きカードの閲覧・作成・編集・削除が可能。
ログインすることでマイページが解放される追加機能という位置づけ。

---

## 1. ログイン

### 方式
- **Firebase Authentication — Googleプロバイダー**（既存のFirebaseプロジェクト流用）
- Firebase SDK に `getAuth`, `signInWithPopup`, `GoogleAuthProvider`, `onAuthStateChanged`, `signOut` を追加インポート

### UI
- ヘッダー右端に状態依存ボタンを追加：
  - **未ログイン時:** `Googleでログイン` ボタン
  - **ログイン済み:** Googleアカウントのアイコン画像（丸形）→ タップでマイページへ遷移
- **ログイン画面は作らない。** ヘッダーボタンからGoogleポップアップ認証を直接起動する。
- 未ログインでもカード作成・閲覧は従来通り可能。

### 認証状態管理
```js
let currentUser = null; // Firebase User object or null

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthUI();
});
```

---

## 2. マイページ（全画面切り替え）

### 遷移
- ヘッダーのアイコンをタップ → メイン本棚が非表示になりマイページが全画面表示
- マイページヘッダー左端「← 本棚」でメインに戻る
- 実装はCSSの `display:none / block` 切り替え（ルーターなし）

### 構成セクション（上から順）

#### 2-1. プロフィール
| フィールド | 内容 |
|---|---|
| アイコン | Google アカウント写真（`user.photoURL`）|
| 表示名 | 編集可能（デフォルト: `user.displayName`）|
| 一言コメント | 自由記述（例: 読書で人生を豊かに📖）|
| 好きなジャンル | ピル形式で複数選択（自由入力 or 定義済みリストから）|
| SNSリンク | URL入力（X / Instagram / ブログ等）|

プロフィールデータは Firestore の `users/{uid}` ドキュメントに保存。

#### 2-2. 読書目標と進捗
- **年間目標冊数**を設定（編集可能、`users/{uid}.goalYear` に保存）
- 表示項目：
  - 読了数 / 読書中数 / 年間目標数（3カラム）
  - プログレスバー（読了 / 目標）
  - 月別棒グラフ（1〜12月、読了した月に応じて色付き）
  - カテゴリ内訳横棒グラフ（カテゴリ別読了数）

#### 2-3. マイ本棚（サムネグリッド）
- 自分の「読了」「読書中」カードの表紙サムネを5列グリッドで表示
- サムネタップ → マイページ内でミニ詳細ポップアップ（タイトル・著者・評価・カテゴリ・メモ冒頭）
- カバー画像なしの場合はタイトル冒頭文字をグレー背景で表示

#### 2-4. また読みたいリスト
- ステータス `wishlist` の自分のカード一覧
- サムネ ＋ タイトル ＋ 著者の横並びリスト形式

---

## 3. 自分のカード判定ロジック

```js
function isMyBook(book) {
  if (!currentUser) return false;
  // ログイン後に作成したカード（uid付き）
  if (book.uid && book.uid === currentUser.uid) return true;
  // 既存カード（uid なし）: reader名が一致するものも表示（移行期間対応）
  if (!book.uid && book.reader && book.reader === currentUser.displayName) return true;
  return false;
}
```

ログイン後に新規作成・更新するカードには `uid: currentUser.uid` を付与する。

---

## 4. データ構造の変更

### books コレクション（既存 + 追加フィールド）
```js
{
  // 既存フィールド（変更なし）
  id, title, author, reader, memo, recommend, category,
  status, rating, coverUrl, createdAt, likes, comments,

  // 追加
  uid: string | null,  // Firebaseユーザーの uid（未ログイン投稿は null）
}
```

### users コレクション（新規）
```js
// Firestore: users/{uid}
{
  uid: string,
  displayName: string,
  photoURL: string,
  bio: string,             // 一言コメント
  genres: string[],        // 好きなジャンル（例: ["ビジネス", "SF"]）
  snsLinks: {              // SNSリンク
    x?: string,
    instagram?: string,
    blog?: string,
  },
  goalYear: number,        // 今年の読書目標冊数
  updatedAt: number,
}
```

---

## 5. 実装スコープ外（今回やらないこと）

- カード削除の権限制御（自分のカードのみ削除可能にする等）
- 他人のマイページを見る機能
- パスワードリセット・メール認証
- プロフィール画像のカスタムアップロード（Googleアイコンのみ）

---

## 6. 実装順序（推奨）

1. Firebase Auth 初期化 ＋ Googleログインボタン ＋ 認証状態管理
2. カード作成・更新時に `uid` を付与
3. マイページ全画面レイアウト（HTML/CSS）
4. プロフィールセクション（表示・編集・Firestore保存）
5. 読書目標・進捗セクション（月別グラフ・カテゴリ内訳）
6. マイ本棚サムネグリッド ＋ ミニ詳細ポップアップ
7. また読みたいリスト

---

## 7. 技術ノート

- Firebase Auth の追加インポートは既存の `<script type="module">` ブロックに追記
- マイページのHTMLは既存の `<div class="container">` と並列に追加し、JS で表示切り替え
- 月別グラフは外部ライブラリなし、CSS flexbox の棒グラフで実装
- カテゴリ内訳は既存の `CATEGORIES` 配列を流用
