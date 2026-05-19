# マイページ＆ログイン機能 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Firebase Google認証でログインできるようにし、ログインユーザー専用のマイページ（プロフィール・読書目標・マイ本棚・読みたいリスト）を全画面表示で追加する。

**Architecture:** 単一ファイル `index.html` に追記する形で実装。Firebase Authを既存のFirebase moduleスクリプトに追加し、マイページはメイン本棚と並列のHTML要素としてCSSの `display:none/block` で切り替える。Firestoreの `users/{uid}` コレクションにプロフィールと目標を保存。

**Tech Stack:** Firebase Auth (Google Provider), Firebase Firestore, Vanilla JS, CSS (既存変数流用)

---

## ファイル構成

修正対象は `/Users/ylee/Apps/book-journal/index.html` のみ。

| 変更箇所 | 内容 |
|---|---|
| `<head>` | faviconは設定済み（変更なし） |
| Firebase `<script type="module">` (行1532-1580) | Auth SDK追加インポート、Auth初期化、`window.firebaseAuth` 公開 |
| メインHTML `.container` (行1362) | `id="mainView"` 追加 |
| ヘッダー `.header-top` (行1365) | Googleログインボタン / アバターアイコン追加 |
| モーダル後 (行1437) | マイページ全画面HTML追加 |
| CSS `<style>` 内 | 認証UI・マイページ関連スタイル追加 |
| `<script>` ブロック (行1582-3231) | `currentUser`, `isMyBook()`, Auth UI関数, マイページrender関数群, uid付与ロジック追加 |

---

## Task 1: Firebase Auth 初期化 ＋ Googleログインボタン ＋ 認証状態管理

**Files:**
- Modify: `index.html:1532-1580` (Firebase moduleスクリプト)
- Modify: `index.html:1365-1373` (ヘッダーHTML)
- Modify: `index.html:1362` (container に id 追加)
- Modify: `index.html:<style>` (認証UIスタイル)
- Modify: `index.html:1582付近` (JS変数・関数追加)

- [ ] **Step 1: `index.html` の `<div class="container">` に `id="mainView"` を追加する**

対象行（現在行1362付近）を以下に変更：
```html
<div class="container" id="mainView">
```

- [ ] **Step 2: Firebase Auth SDK を module スクリプトに追加する**

行1533-1536の import を以下に置き換え：
```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
```

- [ ] **Step 3: Firebase Auth を初期化して `window.firebaseAuth` として公開する**

行1547（`const app = initializeApp(firebaseConfig);`）の直後に追加：
```js
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const booksCollection = collection(db, 'books');

// Auth APIをグローバルに公開
window.firebaseAuth = {
  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  },
  async signOut() {
    return signOut(auth);
  },
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  },
  async getProfile(uid) {
    const snap = await getDocs(collection(db, 'users'));
    const found = snap.docs.find(d => d.id === uid);
    return found ? found.data() : null;
  },
  async saveProfile(uid, data) {
    await setDoc(doc(db, 'users', uid), { ...data, updatedAt: Date.now() }, { merge: true });
  }
};
```

既存の `window.firebaseStorage = { ... }` ブロックと `window.firebaseReady` 行はそのまま残す。

- [ ] **Step 4: CSS に認証UIスタイルを追加する**

既存 `<style>` ブロック末尾（`</style>` の直前）に追記：
```css
/* ==================== AUTH UI ==================== */
.btn-login {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--ink);
  color: white;
  border: none;
  border-radius: 3px;
  padding: 0.45rem 1rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}
.btn-login:hover { background: var(--accent); }
.btn-login svg { width: 14px; height: 14px; flex-shrink: 0; }

.auth-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
  border: 2px solid var(--line);
  transition: border-color 0.2s;
}
.auth-avatar:hover { border-color: var(--accent); }

.auth-avatar-placeholder {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}
.auth-avatar-placeholder:hover { border-color: var(--line); }
```

- [ ] **Step 5: ヘッダーHTMLに認証ボタンエリアを追加する**

行1365の `.header-top` div を以下に置き換え：
```html
<div class="header-top">
  <div>
    <h1 class="logo">Shelf<em>.</em></h1>
    <p class="tagline">A Shared Reading Journal — みんなの読書記録</p>
  </div>
  <div style="display:flex;align-items:center;gap:1rem;">
    <div class="meta-info">
      <div class="date" id="currentDate"></div>
      <div id="storageMode">Est. 2026 — Personal Library</div>
    </div>
    <div id="authArea">
      <!-- JS で描画 -->
    </div>
  </div>
</div>
```

（既存の `<div class="meta-info">` ブロックを `authArea` と並べてラップする）

- [ ] **Step 6: JSに `currentUser` 変数と認証UI関数を追加する**

行1582の `<script>` ブロック冒頭（`let books = [];` の前）に追加：
```js
let currentUser = null;

function updateAuthUI() {
  const area = document.getElementById('authArea');
  if (!area) return;
  if (currentUser) {
    const initial = (currentUser.displayName || 'U')[0].toUpperCase();
    if (currentUser.photoURL) {
      area.innerHTML = `<img class="auth-avatar" src="${currentUser.photoURL}" alt="${initial}" onclick="showMyPage()" title="マイページ">`;
    } else {
      area.innerHTML = `<div class="auth-avatar-placeholder" onclick="showMyPage()" title="マイページ">${initial}</div>`;
    }
  } else {
    area.innerHTML = `
      <button class="btn-login" onclick="handleSignIn()">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Googleでログイン
      </button>`;
  }
}

async function handleSignIn() {
  if (!window.firebaseAuth) { showToast('認証サービス準備中...'); return; }
  try {
    await window.firebaseAuth.signInWithGoogle();
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      showToast('ログインに失敗しました: ' + (e.message || e));
    }
  }
}

async function handleSignOut() {
  if (!window.firebaseAuth) return;
  await window.firebaseAuth.signOut();
  hideMyPage();
}
```

- [ ] **Step 7: Auth状態変化を監視する処理を追加する**

`window.addEventListener('firebaseReady', ...)` が呼ばれる行（行1675付近）の直下に追加：
```js
window.addEventListener('firebaseReady', () => {
  if (window.firebaseAuth) {
    window.firebaseAuth.onAuthStateChanged((user) => {
      currentUser = user;
      updateAuthUI();
    });
  }
});
```

- [ ] **Step 8: ブラウザで動作確認する**

`index.html` をブラウザで開き：
- ヘッダー右端に「Googleでログイン」ボタンが表示される
- ボタンをクリックするとGoogleポップアップが開く
- ログイン後、ボタンがアバターアイコンに切り替わる
- ページをリロードしてもログイン状態が維持される
- アバターをクリックしても（まだshowMyPage未実装なので）エラーが出ないことを確認

- [ ] **Step 9: コミットする**

```bash
git add /Users/ylee/Apps/book-journal/index.html
git commit -m "feat: Firebase Auth + Google login button + auth state management"
```

---

## Task 2: カード作成・更新時に uid を付与する

**Files:**
- Modify: `index.html:3004-3016` (UPDATE bookオブジェクト)
- Modify: `index.html:3038-3050` (CREATE bookオブジェクト)
- Modify: `index.html` (`isMyBook` 関数追加)

- [ ] **Step 1: `isMyBook` ヘルパー関数を追加する**

`getCategories` 関数定義の直後に追加：
```js
function isMyBook(book) {
  if (!currentUser) return false;
  if (book.uid && book.uid === currentUser.uid) return true;
  if (!book.uid && book.reader && book.reader === currentUser.displayName) return true;
  return false;
}
```

- [ ] **Step 2: UPDATE時のbookオブジェクトに uid を追加する**

行3004の `const updated = { ...existing, ...` ブロック内に `uid` フィールドを追加：
```js
const updated = {
  ...existing,
  title: title,
  author: author,
  reader: document.getElementById('inputReader').value.trim(),
  memo: document.getElementById('inputMemo').value.trim(),
  recommend: document.getElementById('inputRecommend').value.trim(),
  category: Array.from(document.querySelectorAll('.category-cb:checked')).map(cb => cb.value),
  uid: currentUser ? currentUser.uid : (existing.uid || null),
  status: selectedStatus,
  rating: selectedRating,
  coverUrl: coverUrl || existing.coverUrl || null,
  updatedAt: Date.now()
};
```

- [ ] **Step 3: CREATE時のbookオブジェクトに uid を追加する**

行3038の `const book = { ...` ブロック内に `uid` フィールドを追加：
```js
const book = {
  id: id,
  title: title,
  author: author,
  reader: document.getElementById('inputReader').value.trim(),
  memo: document.getElementById('inputMemo').value.trim(),
  recommend: document.getElementById('inputRecommend').value.trim(),
  category: Array.from(document.querySelectorAll('.category-cb:checked')).map(cb => cb.value),
  uid: currentUser ? currentUser.uid : null,
  status: selectedStatus,
  rating: selectedRating,
  coverUrl: coverUrl || null,
  createdAt: Date.now()
};
```

- [ ] **Step 4: ブラウザで動作確認する**

Googleログイン後に本を新規登録し、Firestore コンソール（https://console.firebase.google.com）で該当ドキュメントに `uid` フィールドが含まれていることを確認する。

- [ ] **Step 5: コミットする**

```bash
git add /Users/ylee/Apps/book-journal/index.html
git commit -m "feat: attach uid to book documents on create/update"
```

---

## Task 3: マイページ全画面レイアウト HTML/CSS（骨格）

**Files:**
- Modify: `index.html:1436` (メインコンテナ終了タグ直後にマイページHTML追加)
- Modify: `index.html:<style>` (マイページスタイル追加)
- Modify: `index.html:<script>` (`showMyPage`, `hideMyPage`, `renderMyPage` 追加)

- [ ] **Step 1: マイページCSSを追加する**

既存 `<style>` ブロック末尾（Task 1で追加した認証CSSの直後）に追記：
```css
/* ==================== MY PAGE ==================== */
.mypage-view {
  display: none;
  min-height: 100vh;
  background: var(--bg);
  position: relative;
  z-index: 2;
}

.mypage-view.active { display: block; }

.mypage-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-deep);
  border-bottom: 1px solid var(--line);
  padding: 1rem 2.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mypage-back {
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  color: var(--ink-fade);
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  transition: color 0.2s;
}
.mypage-back:hover { color: var(--ink); }

.mypage-title {
  font-family: 'Fraunces', serif;
  font-size: 1.2rem;
  font-weight: 300;
  letter-spacing: -0.01em;
  color: var(--accent);
}

.mypage-signout {
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
  padding: 0.3rem 0.7rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  color: var(--ink-fade);
  cursor: pointer;
  transition: all 0.2s;
}
.mypage-signout:hover { border-color: var(--accent); color: var(--accent); }

.mypage-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.mypage-section {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: 1.5rem;
}

.mypage-section-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: var(--ink-fade);
  margin-bottom: 1.2rem;
}

@media (max-width: 640px) {
  .mypage-header { padding: 0.8rem 1.2rem; }
  .mypage-container { padding: 1.2rem; gap: 1.2rem; }
  .mypage-section { padding: 1rem; }
}
```

- [ ] **Step 2: マイページHTMLを追加する**

行1436（`</div>` ← `.container` の閉じタグ）の直後に追加：
```html
<!-- My Page (full-screen) -->
<div class="mypage-view" id="mypageView">
  <div class="mypage-header">
    <button class="mypage-back" onclick="hideMyPage()">
      ← 本棚
    </button>
    <span class="mypage-title">My Page</span>
    <button class="mypage-signout" onclick="handleSignOut()">ログアウト</button>
  </div>
  <div class="mypage-container" id="mypageContainer">
    <!-- JS で描画 -->
  </div>
</div>
```

- [ ] **Step 3: `showMyPage` / `hideMyPage` / `renderMyPage` 関数を追加する**

`handleSignOut` 関数の直後に追加：
```js
function showMyPage() {
  if (!currentUser) { handleSignIn(); return; }
  document.getElementById('mainView').style.display = 'none';
  document.getElementById('mypageView').classList.add('active');
  renderMyPage();
}

function hideMyPage() {
  document.getElementById('mypageView').classList.remove('active');
  document.getElementById('mainView').style.display = '';
}

function renderMyPage() {
  const myBooks = books.filter(isMyBook);
  const container = document.getElementById('mypageContainer');
  container.innerHTML = `
    <div id="mpProfile" class="mypage-section"></div>
    <div id="mpGoal" class="mypage-section"></div>
    <div id="mpShelf" class="mypage-section"></div>
    <div id="mpWishlist" class="mypage-section"></div>
  `;
  renderMpProfile();
  renderMpGoal(myBooks);
  renderMpShelf(myBooks);
  renderMpWishlist(myBooks);
}

// プレースホルダー（Task 4-7 で実装）
function renderMpProfile() {
  document.getElementById('mpProfile').innerHTML =
    `<div class="mypage-section-title">Profile</div><p style="color:var(--ink-fade);font-size:0.85rem;">（Task 4で実装）</p>`;
}
function renderMpGoal(myBooks) {
  document.getElementById('mpGoal').innerHTML =
    `<div class="mypage-section-title">読書目標</div><p style="color:var(--ink-fade);font-size:0.85rem;">（Task 5で実装）</p>`;
}
function renderMpShelf(myBooks) {
  document.getElementById('mpShelf').innerHTML =
    `<div class="mypage-section-title">マイ本棚</div><p style="color:var(--ink-fade);font-size:0.85rem;">（Task 6で実装）</p>`;
}
function renderMpWishlist(myBooks) {
  document.getElementById('mpWishlist').innerHTML =
    `<div class="mypage-section-title">また読みたい</div><p style="color:var(--ink-fade);font-size:0.85rem;">（Task 7で実装）</p>`;
}
```

- [ ] **Step 4: ブラウザで動作確認する**

ログイン後にアバターアイコンをクリックし：
- 本棚が非表示になりマイページが全画面表示される
- 「← 本棚」で本棚に戻れる
- 「ログアウト」でサインアウト後に本棚に戻る
- 4つのプレースホルダーセクションが表示される

- [ ] **Step 5: コミットする**

```bash
git add /Users/ylee/Apps/book-journal/index.html
git commit -m "feat: my page full-screen layout skeleton with back navigation"
```

---

## Task 4: プロフィールセクション（表示・編集・Firestore保存）

**Files:**
- Modify: `index.html:<style>` (プロフィールCSS追加)
- Modify: `index.html:<script>` (`renderMpProfile`, `saveMpProfile`, `userProfile` 変数)

- [ ] **Step 1: プロフィールCSSを追加する**

既存 `<style>` 末尾に追記：
```css
/* ---- Profile Section ---- */
.mp-profile-wrap {
  display: flex;
  align-items: flex-start;
  gap: 1.2rem;
}

.mp-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--line);
  flex-shrink: 0;
}

.mp-avatar-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent);
  color: white;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.4rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mp-profile-info { flex: 1; }

.mp-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 0.3rem;
}

.mp-bio {
  font-size: 0.85rem;
  color: var(--ink-soft);
  margin-bottom: 0.6rem;
  line-height: 1.5;
  font-style: italic;
}

.mp-genres {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
}

.mp-genre-pill {
  background: var(--bg-deep);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.2rem 0.65rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  color: var(--ink-soft);
  letter-spacing: 0.05em;
}

.mp-sns {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.mp-sns a {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.62rem;
  color: var(--ink-fade);
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: color 0.2s;
}
.mp-sns a:hover { color: var(--accent); }

.mp-edit-btn {
  margin-top: 1rem;
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
  padding: 0.35rem 0.8rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  letter-spacing: 0.1em;
  color: var(--ink-fade);
  cursor: pointer;
  transition: all 0.2s;
}
.mp-edit-btn:hover { border-color: var(--accent); color: var(--accent); }

/* Profile edit form */
.mp-edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-top: 0.5rem;
}

.mp-edit-form input,
.mp-edit-form textarea {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 2px;
  padding: 0.5rem 0.7rem;
  font-family: 'Noto Serif JP', serif;
  font-size: 0.85rem;
  color: var(--ink);
  outline: none;
  transition: border-color 0.2s;
}
.mp-edit-form input:focus,
.mp-edit-form textarea:focus { border-color: var(--accent); }

.mp-edit-form textarea { min-height: 60px; resize: vertical; }

.mp-edit-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--ink-fade);
  display: block;
  margin-bottom: 0.3rem;
}

.mp-save-btn {
  background: var(--ink);
  color: white;
  border: none;
  border-radius: 2px;
  padding: 0.5rem 1.2rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  cursor: pointer;
  align-self: flex-start;
  transition: background 0.2s;
}
.mp-save-btn:hover { background: var(--accent); }
```

- [ ] **Step 2: `userProfile` 変数と `loadUserProfile` 関数を追加する**

`currentUser` 変数宣言の直後に追加：
```js
let userProfile = null; // Firestore users/{uid} のデータ

async function loadUserProfile(uid) {
  if (!window.firebaseAuth) return;
  userProfile = await window.firebaseAuth.getProfile(uid);
  if (!userProfile) {
    userProfile = {
      uid,
      displayName: currentUser.displayName || '',
      photoURL: currentUser.photoURL || '',
      bio: '',
      genres: [],
      snsLinks: { x: '', instagram: '', blog: '' },
      goalYear: 20,
    };
  }
}
```

- [ ] **Step 3: `renderMyPage` を更新して `loadUserProfile` を呼ぶ**

既存の `renderMyPage` 関数を以下に置き換え：
```js
async function renderMyPage() {
  const myBooks = books.filter(isMyBook);
  const container = document.getElementById('mypageContainer');
  container.innerHTML = `
    <div id="mpProfile" class="mypage-section"></div>
    <div id="mpGoal" class="mypage-section"></div>
    <div id="mpShelf" class="mypage-section"></div>
    <div id="mpWishlist" class="mypage-section"></div>
  `;
  await loadUserProfile(currentUser.uid);
  renderMpProfile();
  renderMpGoal(myBooks);
  renderMpShelf(myBooks);
  renderMpWishlist(myBooks);
}
```

- [ ] **Step 4: `renderMpProfile` を実装する**

既存のプレースホルダー `renderMpProfile` 関数を以下に置き換え：
```js
function renderMpProfile(editing = false) {
  const el = document.getElementById('mpProfile');
  const p = userProfile || {};
  const avatarHtml = currentUser.photoURL
    ? `<img class="mp-avatar" src="${escapeHtml(currentUser.photoURL)}" alt="">`
    : `<div class="mp-avatar-placeholder">${(currentUser.displayName || 'U')[0].toUpperCase()}</div>`;

  if (editing) {
    const genres = (p.genres || []).join(', ');
    const sns = p.snsLinks || {};
    el.innerHTML = `
      <div class="mypage-section-title">Profile</div>
      <div class="mp-profile-wrap">
        ${avatarHtml}
        <div class="mp-profile-info">
          <div class="mp-edit-form">
            <div>
              <label class="mp-edit-label">表示名</label>
              <input id="mpInputName" type="text" value="${escapeHtml(p.displayName || currentUser.displayName || '')}" maxlength="30">
            </div>
            <div>
              <label class="mp-edit-label">一言コメント</label>
              <textarea id="mpInputBio" maxlength="100">${escapeHtml(p.bio || '')}</textarea>
            </div>
            <div>
              <label class="mp-edit-label">好きなジャンル（カンマ区切り）</label>
              <input id="mpInputGenres" type="text" value="${escapeHtml(genres)}" placeholder="例: ビジネス, SF, 哲学">
            </div>
            <div>
              <label class="mp-edit-label">X (Twitter) URL</label>
              <input id="mpInputX" type="url" value="${escapeHtml(sns.x || '')}" placeholder="https://x.com/yourname">
            </div>
            <div>
              <label class="mp-edit-label">Instagram URL</label>
              <input id="mpInputIg" type="url" value="${escapeHtml(sns.instagram || '')}" placeholder="https://instagram.com/yourname">
            </div>
            <div>
              <label class="mp-edit-label">ブログ URL</label>
              <input id="mpInputBlog" type="url" value="${escapeHtml(sns.blog || '')}" placeholder="https://yourblog.com">
            </div>
            <div style="display:flex;gap:0.6rem;">
              <button class="mp-save-btn" onclick="saveMpProfile()">保存</button>
              <button class="mp-edit-btn" onclick="renderMpProfile(false)">キャンセル</button>
            </div>
          </div>
        </div>
      </div>`;
  } else {
    const genrePills = (p.genres || []).map(g =>
      `<span class="mp-genre-pill">${escapeHtml(g)}</span>`).join('');
    const sns = p.snsLinks || {};
    const snsLinks = [
      sns.x ? `<a href="${escapeHtml(sns.x)}" target="_blank" rel="noopener">X</a>` : '',
      sns.instagram ? `<a href="${escapeHtml(sns.instagram)}" target="_blank" rel="noopener">Instagram</a>` : '',
      sns.blog ? `<a href="${escapeHtml(sns.blog)}" target="_blank" rel="noopener">Blog</a>` : '',
    ].filter(Boolean).join('');

    el.innerHTML = `
      <div class="mypage-section-title">Profile</div>
      <div class="mp-profile-wrap">
        ${avatarHtml}
        <div class="mp-profile-info">
          <div class="mp-name">${escapeHtml(p.displayName || currentUser.displayName || '')}</div>
          ${p.bio ? `<div class="mp-bio">${escapeHtml(p.bio)}</div>` : ''}
          ${genrePills ? `<div class="mp-genres">${genrePills}</div>` : ''}
          ${snsLinks ? `<div class="mp-sns">${snsLinks}</div>` : ''}
          <button class="mp-edit-btn" onclick="renderMpProfile(true)">編集</button>
        </div>
      </div>`;
  }
}
```

- [ ] **Step 5: `saveMpProfile` 関数を追加する**

`renderMpProfile` 関数の直後に追加：
```js
async function saveMpProfile() {
  const name = document.getElementById('mpInputName').value.trim();
  const bio = document.getElementById('mpInputBio').value.trim();
  const genresRaw = document.getElementById('mpInputGenres').value;
  const genres = genresRaw.split(',').map(s => s.trim()).filter(Boolean);
  const sns = {
    x: document.getElementById('mpInputX').value.trim(),
    instagram: document.getElementById('mpInputIg').value.trim(),
    blog: document.getElementById('mpInputBlog').value.trim(),
  };
  userProfile = { ...userProfile, displayName: name, bio, genres, snsLinks: sns };
  try {
    await window.firebaseAuth.saveProfile(currentUser.uid, userProfile);
    renderMpProfile(false);
    showToast('プロフィールを保存しました ✓');
  } catch (e) {
    showToast('保存に失敗: ' + (e.message || e));
  }
}
```

- [ ] **Step 6: ブラウザで動作確認する**

マイページを開き：
- Googleアイコン・名前が表示される
- 「編集」ボタンで編集フォームが開く
- 名前・一言・ジャンル・SNSリンクを入力して保存
- 保存後に表示モードに戻り内容が反映される
- ページリロード後も保存内容が維持される（Firestoreから再取得）

- [ ] **Step 7: コミットする**

```bash
git add /Users/ylee/Apps/book-journal/index.html
git commit -m "feat: my page profile section with edit/save to Firestore"
```

---

## Task 5: 読書目標・進捗セクション（年間 ＋ 月別グラフ ＋ カテゴリ内訳）

**Files:**
- Modify: `index.html:<style>` (目標・グラフCSS)
- Modify: `index.html:<script>` (`renderMpGoal` 実装, `saveGoalYear`)

- [ ] **Step 1: 目標・グラフCSSを追加する**

既存 `<style>` 末尾に追記：
```css
/* ---- Goal Section ---- */
.mp-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.8rem;
  margin-bottom: 1.2rem;
}

.mp-stat-box {
  background: var(--bg);
  border-radius: 3px;
  padding: 0.8rem;
  text-align: center;
}

.mp-stat-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 0.2rem;
}

.mp-stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.55rem;
  letter-spacing: 0.1em;
  color: var(--ink-fade);
  text-transform: uppercase;
}

.mp-progress-wrap {
  margin-bottom: 1.4rem;
}

.mp-progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  color: var(--ink-fade);
}

.mp-progress-bar-bg {
  background: var(--line);
  border-radius: 999px;
  height: 6px;
  overflow: hidden;
}

.mp-progress-bar-fill {
  background: var(--accent);
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}

.mp-goal-edit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.4rem;
  flex-wrap: wrap;
}

.mp-goal-input {
  width: 70px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: 2px;
  padding: 0.3rem 0.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: var(--ink);
  text-align: center;
  outline: none;
}
.mp-goal-input:focus { border-color: var(--accent); }

.mp-goal-save {
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 2px;
  padding: 0.3rem 0.7rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  color: var(--ink-fade);
  cursor: pointer;
  transition: all 0.2s;
}
.mp-goal-save:hover { border-color: var(--accent); color: var(--accent); }

/* Monthly bar chart */
.mp-monthly-chart {
  margin-bottom: 1.4rem;
}

.mp-chart-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  color: var(--ink-fade);
  text-transform: uppercase;
  margin-bottom: 0.5rem;
}

.mp-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 60px;
}

.mp-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  height: 100%;
  justify-content: flex-end;
}

.mp-bar {
  width: 100%;
  background: var(--accent);
  border-radius: 2px 2px 0 0;
  min-height: 2px;
  transition: height 0.4s ease;
}

.mp-bar.empty { background: var(--line); }

.mp-bar-month {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.5rem;
  color: var(--ink-fade);
  text-align: center;
}

/* Category breakdown */
.mp-cat-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.mp-cat-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.62rem;
  color: var(--ink-soft);
  min-width: 80px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mp-cat-bar-bg {
  flex: 1;
  background: var(--line);
  border-radius: 999px;
  height: 5px;
  overflow: hidden;
}

.mp-cat-bar-fill {
  background: var(--gold);
  height: 100%;
  border-radius: 999px;
}

.mp-cat-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.6rem;
  color: var(--ink-fade);
  min-width: 20px;
  text-align: right;
}
```

- [ ] **Step 2: `renderMpGoal` を実装する**

既存のプレースホルダー `renderMpGoal` 関数を以下に置き換え：
```js
function renderMpGoal(myBooks) {
  const el = document.getElementById('mpGoal');
  const finished = myBooks.filter(b => b.status === 'finished');
  const reading = myBooks.filter(b => b.status === 'reading');
  const goal = (userProfile && userProfile.goalYear) || 20;
  const pct = Math.min(100, Math.round((finished.length / goal) * 100));

  // 月別集計（読了 createdAt の月で集計）
  const currentYear = new Date().getFullYear();
  const monthCounts = Array(12).fill(0);
  finished.forEach(b => {
    const d = new Date(b.createdAt);
    if (d.getFullYear() === currentYear) {
      monthCounts[d.getMonth()]++;
    }
  });
  const maxMonth = Math.max(...monthCounts, 1);

  const monthNames = ['1','2','3','4','5','6','7','8','9','10','11','12'];
  const barsHtml = monthCounts.map((cnt, i) => {
    const h = Math.round((cnt / maxMonth) * 100);
    return `
      <div class="mp-bar-wrap">
        <div class="mp-bar ${cnt === 0 ? 'empty' : ''}" style="height:${cnt === 0 ? 4 : h}%;" title="${cnt}冊"></div>
        <div class="mp-bar-month">${monthNames[i]}</div>
      </div>`;
  }).join('');

  // カテゴリ内訳
  const catMap = {};
  finished.forEach(b => {
    getCategories(b).forEach(c => { catMap[c] = (catMap[c] || 0) + 1; });
  });
  const catEntries = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = catEntries.length ? catEntries[0][1] : 1;
  const catHtml = catEntries.length
    ? catEntries.map(([name, cnt]) => `
        <div class="mp-cat-row">
          <div class="mp-cat-name">${escapeHtml(name)}</div>
          <div class="mp-cat-bar-bg">
            <div class="mp-cat-bar-fill" style="width:${Math.round((cnt/maxCat)*100)}%"></div>
          </div>
          <div class="mp-cat-count">${cnt}</div>
        </div>`).join('')
    : `<p style="font-size:0.8rem;color:var(--ink-fade);">まだデータがありません</p>`;

  el.innerHTML = `
    <div class="mypage-section-title">読書目標 ${currentYear}</div>
    <div class="mp-goal-edit">
      <span style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--ink-fade);">年間目標：</span>
      <input class="mp-goal-input" id="mpGoalInput" type="number" min="1" max="365" value="${goal}">
      <span style="font-family:'JetBrains Mono',monospace;font-size:0.65rem;color:var(--ink-fade);">冊</span>
      <button class="mp-goal-save" onclick="saveGoalYear()">更新</button>
    </div>
    <div class="mp-stats-row">
      <div class="mp-stat-box">
        <div class="mp-stat-val" style="color:var(--accent);">${finished.length}</div>
        <div class="mp-stat-label">読了</div>
      </div>
      <div class="mp-stat-box">
        <div class="mp-stat-val" style="color:var(--ink-soft);">${reading.length}</div>
        <div class="mp-stat-label">読書中</div>
      </div>
      <div class="mp-stat-box">
        <div class="mp-stat-val" style="color:var(--gold);">${goal}</div>
        <div class="mp-stat-label">目標</div>
      </div>
    </div>
    <div class="mp-progress-wrap">
      <div class="mp-progress-meta">
        <span>${finished.length} / ${goal}冊</span>
        <span style="color:var(--gold);">${pct}%</span>
      </div>
      <div class="mp-progress-bar-bg">
        <div class="mp-progress-bar-fill" style="width:${pct}%"></div>
      </div>
    </div>
    <div class="mp-monthly-chart">
      <div class="mp-chart-label">月別読了数 ${currentYear}</div>
      <div class="mp-bars">${barsHtml}</div>
    </div>
    <div class="mp-chart-label">カテゴリ内訳</div>
    ${catHtml}`;
}
```

- [ ] **Step 3: `saveGoalYear` 関数を追加する**

`saveMpProfile` 関数の直後に追加：
```js
async function saveGoalYear() {
  const val = parseInt(document.getElementById('mpGoalInput').value, 10);
  if (!val || val < 1) return;
  userProfile = { ...userProfile, goalYear: val };
  try {
    await window.firebaseAuth.saveProfile(currentUser.uid, { goalYear: val });
    const myBooks = books.filter(isMyBook);
    renderMpGoal(myBooks);
    showToast('目標を更新しました ✓');
  } catch (e) {
    showToast('保存に失敗: ' + (e.message || e));
  }
}
```

- [ ] **Step 4: ブラウザで動作確認する**

マイページを開き：
- 読了数・読書中数・目標冊数が正しく表示される
- プログレスバーが正しい割合で表示される
- 月別棒グラフが表示される（本がない月はグレーの小さいバー）
- カテゴリ内訳が読了冊数の多い順に表示される
- 目標冊数を変更して「更新」するとリロード後も反映される

- [ ] **Step 5: コミットする**

```bash
git add /Users/ylee/Apps/book-journal/index.html
git commit -m "feat: my page reading goal section with monthly chart and category breakdown"
```

---

## Task 6: マイ本棚サムネグリッド ＋ ミニ詳細ポップアップ

**Files:**
- Modify: `index.html:<style>` (本棚グリッド・ポップアップCSS)
- Modify: `index.html:<script>` (`renderMpShelf`, `showThumbPopup`, `hideThumbPopup`)

- [ ] **Step 1: 本棚グリッド・ポップアップCSSを追加する**

既存 `<style>` 末尾に追記：
```css
/* ---- Shelf Grid ---- */
.mp-shelf-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

@media (max-width: 480px) {
  .mp-shelf-grid { grid-template-columns: repeat(4, 1fr); }
}

.mp-shelf-thumb {
  aspect-ratio: 2/3;
  border-radius: 2px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  background: var(--bg-deep);
  position: relative;
}

.mp-shelf-thumb:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.mp-shelf-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.mp-shelf-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Noto Serif JP', serif;
  font-size: 0.6rem;
  color: var(--ink-fade);
  text-align: center;
  padding: 4px;
  line-height: 1.3;
}

/* Mini detail popup */
.mp-thumb-popup-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26,23,20,0.55);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.mp-thumb-popup {
  background: var(--card);
  border-radius: 6px;
  box-shadow: 0 16px 48px rgba(0,0,0,0.3);
  max-width: 360px;
  width: 100%;
  overflow: hidden;
}

.mp-thumb-popup-header {
  display: flex;
  gap: 1rem;
  padding: 1.2rem;
  border-bottom: 1px solid var(--line);
}

.mp-thumb-popup-cover {
  width: 60px;
  height: 90px;
  border-radius: 2px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-deep);
}

.mp-thumb-popup-cover-placeholder {
  width: 60px;
  height: 90px;
  border-radius: 2px;
  background: var(--bg-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  color: var(--ink-fade);
  flex-shrink: 0;
  text-align: center;
  padding: 4px;
  line-height: 1.3;
}

.mp-thumb-popup-meta { flex: 1; }

.mp-thumb-popup-title {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--accent);
  line-height: 1.3;
  margin-bottom: 0.3rem;
}

.mp-thumb-popup-author {
  font-size: 0.8rem;
  color: var(--ink-soft);
  font-style: italic;
  margin-bottom: 0.5rem;
}

.mp-thumb-popup-stars {
  color: var(--gold);
  font-size: 0.85rem;
  margin-bottom: 0.4rem;
}

.mp-thumb-popup-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.mp-thumb-popup-body {
  padding: 1rem 1.2rem;
}

.mp-thumb-popup-memo {
  font-size: 0.82rem;
  color: var(--ink-soft);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 0.8rem;
}

.mp-thumb-popup-close {
  width: 100%;
  background: var(--bg);
  border: none;
  border-top: 1px solid var(--line);
  padding: 0.7rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  color: var(--ink-fade);
  cursor: pointer;
  transition: background 0.2s;
}
.mp-thumb-popup-close:hover { background: var(--line); }
```

- [ ] **Step 2: `renderMpShelf` を実装する**

既存のプレースホルダー `renderMpShelf` 関数を以下に置き換え：
```js
function renderMpShelf(myBooks) {
  const el = document.getElementById('mpShelf');
  const shelfBooks = myBooks.filter(b => b.status === 'finished' || b.status === 'reading');
  const count = shelfBooks.length;

  const thumbsHtml = shelfBooks.map(book => {
    const safeId = escapeHtml(book.id);
    const cover = book.coverUrl
      ? `<img src="${escapeHtml(book.coverUrl)}" alt="${escapeHtml(book.title)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="mp-shelf-thumb-placeholder" style="display:none;">${escapeHtml((book.title||'').slice(0,12))}</div>`
      : `<div class="mp-shelf-thumb-placeholder">${escapeHtml((book.title||'').slice(0,12))}</div>`;
    return `<div class="mp-shelf-thumb" onclick="showThumbPopup('${safeId}')" title="${escapeHtml(book.title)}">${cover}</div>`;
  }).join('');

  el.innerHTML = `
    <div class="mypage-section-title">マイ本棚 <span style="color:var(--accent);">${count}冊</span></div>
    ${count > 0
      ? `<div class="mp-shelf-grid">${thumbsHtml}</div>`
      : `<p style="font-size:0.85rem;color:var(--ink-fade);">まだ本が登録されていません</p>`}`;
}
```

- [ ] **Step 3: `showThumbPopup` / `hideThumbPopup` を追加する**

`renderMpShelf` の直後に追加：
```js
window.showThumbPopup = function(bookId) {
  const book = books.find(b => b.id === bookId);
  if (!book) return;

  const stars = book.rating
    ? Array(5).fill(0).map((_, i) =>
        `<span style="color:${i < book.rating ? 'var(--gold)' : 'var(--line)'}"">★</span>`
      ).join('')
    : '';

  const cats = getCategories(book)
    .map(c => `<span class="book-category-tag" style="font-size:0.58rem;">${escapeHtml(c)}</span>`)
    .join('');

  const coverHtml = book.coverUrl
    ? `<img class="mp-thumb-popup-cover" src="${escapeHtml(book.coverUrl)}" alt="">`
    : `<div class="mp-thumb-popup-cover-placeholder">${escapeHtml((book.title||'').slice(0,12))}</div>`;

  const popup = document.createElement('div');
  popup.className = 'mp-thumb-popup-overlay';
  popup.id = 'mpThumbPopup';
  popup.onclick = (e) => { if (e.target === popup) hideThumbPopup(); };
  popup.innerHTML = `
    <div class="mp-thumb-popup">
      <div class="mp-thumb-popup-header">
        ${coverHtml}
        <div class="mp-thumb-popup-meta">
          <div class="mp-thumb-popup-title">${escapeHtml(book.title)}</div>
          ${book.author ? `<div class="mp-thumb-popup-author">— ${escapeHtml(book.author)}</div>` : ''}
          ${stars ? `<div class="mp-thumb-popup-stars">${stars}</div>` : ''}
          ${cats ? `<div class="mp-thumb-popup-cats">${cats}</div>` : ''}
        </div>
      </div>
      ${book.memo ? `<div class="mp-thumb-popup-body"><div class="mp-thumb-popup-memo">${escapeHtml(book.memo)}</div></div>` : ''}
      <button class="mp-thumb-popup-close" onclick="hideThumbPopup()">閉じる</button>
    </div>`;
  document.body.appendChild(popup);
};

window.hideThumbPopup = function() {
  const el = document.getElementById('mpThumbPopup');
  if (el) el.remove();
};
```

- [ ] **Step 4: ブラウザで動作確認する**

マイページを開き：
- 読了・読書中のカードが5列グリッドのサムネで表示される
- サムネをタップするとミニポップアップが開く
- ポップアップにタイトル・著者・評価・カテゴリ・メモ冒頭が表示される
- 「閉じる」またはオーバーレイタップでポップアップが閉じる
- カバー画像がない本はタイトル文字がプレースホルダーとして表示される

- [ ] **Step 5: コミットする**

```bash
git add /Users/ylee/Apps/book-journal/index.html
git commit -m "feat: my bookshelf thumbnail grid with mini detail popup"
```

---

## Task 7: また読みたいリスト

**Files:**
- Modify: `index.html:<style>` (ウィッシュリストCSS)
- Modify: `index.html:<script>` (`renderMpWishlist` 実装)

- [ ] **Step 1: ウィッシュリストCSSを追加する**

既存 `<style>` 末尾に追記：
```css
/* ---- Wishlist Section ---- */
.mp-wishlist-item {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.7rem 0;
  border-bottom: 1px solid var(--line);
}

.mp-wishlist-item:last-child { border-bottom: none; }

.mp-wishlist-cover {
  width: 36px;
  height: 54px;
  border-radius: 2px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-deep);
}

.mp-wishlist-cover-placeholder {
  width: 36px;
  height: 54px;
  border-radius: 2px;
  background: var(--bg-deep);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.55rem;
  color: var(--ink-fade);
  flex-shrink: 0;
  text-align: center;
  padding: 3px;
  line-height: 1.3;
}

.mp-wishlist-info { flex: 1; min-width: 0; }

.mp-wishlist-title {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 0.8rem;
  color: var(--accent);
  line-height: 1.3;
  margin-bottom: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mp-wishlist-author {
  font-size: 0.75rem;
  color: var(--ink-soft);
  font-style: italic;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
```

- [ ] **Step 2: `renderMpWishlist` を実装する**

既存のプレースホルダー `renderMpWishlist` 関数を以下に置き換え：
```js
function renderMpWishlist(myBooks) {
  const el = document.getElementById('mpWishlist');
  const wishlist = myBooks.filter(b => b.status === 'wishlist');

  const itemsHtml = wishlist.map(book => {
    const coverHtml = book.coverUrl
      ? `<img class="mp-wishlist-cover" src="${escapeHtml(book.coverUrl)}" alt=""
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
         <div class="mp-wishlist-cover-placeholder" style="display:none;">${escapeHtml((book.title||'').slice(0,8))}</div>`
      : `<div class="mp-wishlist-cover-placeholder">${escapeHtml((book.title||'').slice(0,8))}</div>`;
    return `
      <div class="mp-wishlist-item">
        ${coverHtml}
        <div class="mp-wishlist-info">
          <div class="mp-wishlist-title">${escapeHtml(book.title)}</div>
          ${book.author ? `<div class="mp-wishlist-author">— ${escapeHtml(book.author)}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="mypage-section-title">また読みたい <span style="color:var(--gold);">${wishlist.length}冊</span></div>
    ${wishlist.length > 0
      ? itemsHtml
      : `<p style="font-size:0.85rem;color:var(--ink-fade);">「また読みたい」に登録した本がありません</p>`}`;
}
```

- [ ] **Step 3: ブラウザで動作確認する**

マイページを開き：
- 「また読みたい」ステータスの自分のカードが一覧表示される
- サムネ・タイトル・著者が横並びで表示される
- 本が0件の場合は「登録した本がありません」と表示される
- カバー画像なしの本はタイトル文字のプレースホルダーが表示される

- [ ] **Step 4: 全体の最終確認をする**

全機能を通しで確認：
1. 未ログイン → 本棚の閲覧・カード作成が問題なくできる
2. Googleログイン → アバターが表示される
3. アバタータップ → マイページが全画面で開く
4. プロフィール編集・保存 → リロード後も維持される
5. 読書目標変更 → リロード後も維持される
6. マイ本棚にサムネが並ぶ → タップでポップアップが開く
7. また読みたいリストが正しく表示される
8. 「← 本棚」で本棚に戻れる
9. ログアウト → ヘッダーが「Googleでログイン」に戻る

- [ ] **Step 5: コミットする**

```bash
git add /Users/ylee/Apps/book-journal/index.html
git commit -m "feat: my page wishlist section + full integration verification"
```

---

## 注意事項

- Firebase Consoleで **Authentication → Sign-in method → Google** を有効にしておく必要がある
- Firestore セキュリティルールで `users` コレクションへの読み書きを許可する：
  ```
  match /users/{uid} {
    allow read, write: if request.auth != null && request.auth.uid == uid;
  }
  ```
- `authDomain` (`book-journal-community.firebaseapp.com`) がGoogleのOAuth許可リストに登録済みであること
