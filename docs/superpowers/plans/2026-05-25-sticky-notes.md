# 付箋（Sticky Notes）機能 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 各読書カードに「付箋」を貼れるようにする。カード右上からしおりタブがはみ出して付箋の存在を示し、カードポップアップで内容を読み書きできる。

**Architecture:** `books` Firestoreドキュメントの `stickyNotes` 配列フィールドに付箋を持つ。追加・削除は `updateDoc` で配列を上書き。カードポップアップとEDITモーダル双方から操作可能。

**Tech Stack:** Vanilla JS, Firestore updateDoc, CSS custom properties（既存コードベースに準拠）

---

## ファイル構成

変更ファイルは1つだけ: `index.html`

変更箇所（行番号は現時点のもの、作業中にずれる場合あり）:

| 場所 | 内容 |
|------|------|
| CSS `<style>` ブロック（~行1093付近） | sticky-tab / sticky-note CSS追加 |
| `.books-grid` CSS（行342） | padding-top を 24px に増量 |
| JS定数・ヘルパー関数（`window.openEditModal` の直前） | STICKY_COLORS / renderStickyTabsHTML / renderStickyNotesHTML / renderEditStickySection |
| `renderBooks()` 内カードテンプレート（行4849〜4917） | カード内に `.sticky-tabs` を追加 |
| `openCardPopup()` 関数（行4159〜4177） | popup に付箋セクションを追加 |
| `window.openEditModal` 関数（行6354〜） | editingStickyNotes を populate |
| `addBook()` の UPDATE パス（行6460〜） | stickyNotes を保存 |
| `closeModal()` 関数（行6405〜） | editingStickyNotes をリセット |
| フォームHTML（`#inputRecommend` の直後、行3712付近） | 付箋セクション用プレースホルダ追加 |

---

## Task 1: CSS — しおりタブ（カード右上）

**Files:**
- Modify: `index.html` — `<style>` ブロック、`.book-edit:hover` の直後（行1093付近）

- [ ] **Step 1: `.books-grid` の padding-top を増やす**

`.books-grid` の既存ルール（行342付近）を編集:

```css
/* 変更前 */
padding: 1.25rem 1rem 1.5rem;

/* 変更後 */
padding: 24px 1rem 1.5rem;
```

- [ ] **Step 2: `.sticky-tabs` と `.sticky-tab` スタイルを追加**

`.book-edit:hover { color: var(--gold); }` の直後に追加:

```css
  /* ==================== STICKY TABS (card) ==================== */
  .sticky-tabs {
    position: absolute;
    top: -1px;
    right: 18px;
    display: flex;
    align-items: flex-end;
    gap: 4px;
    transform: translateY(-100%);
    cursor: pointer;
    z-index: 2;
  }
  .books-grid.is-grid .sticky-tabs { display: none; }

  .sticky-tab {
    width: 26px;
    border-radius: 3px 3px 0 0;
    box-shadow: 1px -2px 5px rgba(0,0,0,0.13);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.5rem;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    transition: transform 0.15s ease;
  }
  .sticky-tab:hover { transform: translateY(-2px); }
  .sticky-tab--yellow { background: #fff9d0; color: #8a7a00; }
  .sticky-tab--pink   { background: #fde8e8; color: #a05050; }
  .sticky-tab--blue   { background: #e8f0ff; color: #4060a8; }
  .sticky-tab--green  { background: #e8f4e8; color: #3a7a3a; }
```

- [ ] **Step 3: ブラウザで確認（CSSエラーなし）**

```bash
open /Users/ylee/Apps/book-journal/index.html
```

コンソールにエラーがないこと。

- [ ] **Step 4: commit**

```bash
git -C /Users/ylee/Apps/book-journal add index.html
git -C /Users/ylee/Apps/book-journal commit -m "style: add sticky tab CSS for book cards"
```

---

## Task 2: CSS — 付箋メモセクション（popup / EDIT modal）

**Files:**
- Modify: `index.html` — Task 1で追加したCSS の直後に追記

- [ ] **Step 1: sticky-note セクションとフォームのスタイルを追加**

Task 1のCSS末尾（`.sticky-tab--green { ... }` の直後）に追加:

```css
  /* ==================== STICKY NOTES (popup / edit) ==================== */
  .sticky-notes-section {
    margin-top: 1.2rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }
  .sticky-notes-header {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.12em;
    color: var(--ink-fade);
    margin-bottom: 0.6rem;
    text-transform: uppercase;
  }
  .sticky-note {
    border-radius: 0 3px 3px 0;
    padding: 7px 28px 7px 10px;
    margin-bottom: 6px;
    font-size: 0.72rem;
    color: var(--ink);
    line-height: 1.6;
    position: relative;
    box-shadow: 1px 1px 3px rgba(0,0,0,0.07);
  }
  .sticky-note--yellow { background: #fff9d0; border-left: 3px solid #f3d965; }
  .sticky-note--pink   { background: #fde8e8; border-left: 3px solid #e88282; }
  .sticky-note--blue   { background: #e8f0ff; border-left: 3px solid #8aabe8; }
  .sticky-note--green  { background: #e8f4e8; border-left: 3px solid #82c882; }
  .sticky-note__page {
    font-size: 0.58rem;
    color: var(--ink-fade);
    font-family: 'JetBrains Mono', monospace;
    margin-bottom: 2px;
  }
  .sticky-note__text { word-break: break-word; white-space: pre-wrap; }
  .sticky-note__delete {
    position: absolute;
    top: 5px;
    right: 6px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.7rem;
    color: var(--ink-fade);
    line-height: 1;
    padding: 2px 4px;
    opacity: 0.6;
    transition: opacity 0.15s, color 0.15s;
  }
  .sticky-note__delete:hover { opacity: 1; color: var(--accent); }

  .sticky-add-btn {
    width: 100%;
    margin-top: 6px;
    background: transparent;
    border: 1px dashed #c8b830;
    border-radius: 3px;
    padding: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.62rem;
    color: #8a7a00;
    cursor: pointer;
    transition: background 0.15s;
  }
  .sticky-add-btn:hover { background: #fffbe6; }

  .sticky-form {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sticky-form__page {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 2px;
    padding: 5px 8px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    color: var(--ink);
    outline: none;
  }
  .sticky-form__page:focus { border-color: #c8b830; }
  .sticky-form__text {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--line);
    border-radius: 2px;
    padding: 6px 8px;
    font-family: 'Noto Serif JP', serif;
    font-size: 0.78rem;
    color: var(--ink);
    outline: none;
    resize: vertical;
    min-height: 64px;
    line-height: 1.7;
  }
  .sticky-form__text:focus { border-color: #c8b830; }
  .sticky-form__actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .sticky-form__submit {
    background: #f3d965;
    border: none;
    border-radius: 2px;
    padding: 5px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.62rem;
    color: #5a4a00;
    cursor: pointer;
    transition: background 0.15s;
  }
  .sticky-form__submit:hover { background: #e8c830; }
  .sticky-form__cancel {
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 2px;
    padding: 5px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.62rem;
    color: var(--ink-fade);
    cursor: pointer;
  }
  .sticky-form__cancel:hover { border-color: var(--ink-soft); color: var(--ink); }
```

- [ ] **Step 2: commit**

```bash
git -C /Users/ylee/Apps/book-journal add index.html
git -C /Users/ylee/Apps/book-journal commit -m "style: add sticky notes section and form CSS"
```

---

## Task 3: JS — 定数・ヘルパー関数

**Files:**
- Modify: `index.html` — `window.openEditModal = function` の直前に追加

- [ ] **Step 1: STICKY_COLORS定数とヘルパーを追加**

`window.openEditModal = function(event, id) {` の直前に挿入:

```javascript
  // ==================== STICKY NOTES ====================
  const STICKY_COLORS = ['yellow', 'pink', 'blue', 'green'];

  function renderStickyTabsHTML(book) {
    const notes = book.stickyNotes;
    if (!notes || notes.length === 0) return '';
    // oldest first → shortest/leftmost, newest → tallest/rightmost
    const sorted = [...notes].sort((a, b) => a.createdAt - b.createdAt);
    const visible = sorted.slice(-4); // max 4 tabs
    const tabs = visible.map((note, i) => {
      const colorIdx = notes.findIndex(n => n.id === note.id) % STICKY_COLORS.length;
      const color = STICKY_COLORS[colorIdx];
      const height = 18 + i * 4; // 18, 22, 26, 30px
      const label = (note.page != null && note.page !== '') ? note.page : '…';
      return `<div class="sticky-tab sticky-tab--${color}" style="height:${height}px">${label}</div>`;
    });
    return `<div class="sticky-tabs" onclick="openCardPopup('${book.id}',event)">${tabs.join('')}</div>`;
  }

  function renderStickyNotesHTML(book, isOwner) {
    const notes = book.stickyNotes || [];
    const sorted = [...notes].sort((a, b) => ((a.page || 0) - (b.page || 0)) || (a.createdAt - b.createdAt));
    const notesHTML = sorted.map(note => {
      const colorIdx = notes.findIndex(n => n.id === note.id) % STICKY_COLORS.length;
      const color = STICKY_COLORS[colorIdx];
      return `<div class="sticky-note sticky-note--${color}">
        ${isOwner ? `<button class="sticky-note__delete" onclick="deleteStickyNote('${book.id}','${note.id}')">×</button>` : ''}
        ${(note.page != null && note.page !== '') ? `<div class="sticky-note__page">p. ${note.page}</div>` : ''}
        <div class="sticky-note__text">${escapeHtml(note.text)}</div>
      </div>`;
    }).join('');

    const addHTML = isOwner ? `
      <button class="sticky-add-btn" onclick="toggleStickyForm('${book.id}')">＋ 付箋を追加</button>
      <div class="sticky-form" id="stickyForm-${book.id}" style="display:none;">
        <input type="number" class="sticky-form__page" id="stickyPage-${book.id}" placeholder="ページ数（任意）" min="1">
        <textarea class="sticky-form__text" id="stickyText-${book.id}" placeholder="気になった一節やメモ..." maxlength="200"></textarea>
        <div class="sticky-form__actions">
          <button class="sticky-form__submit" onclick="addStickyNote('${book.id}')">貼る</button>
          <button class="sticky-form__cancel" onclick="toggleStickyForm('${book.id}')">キャンセル</button>
        </div>
      </div>` : '';

    return `<div class="sticky-notes-section">
      <div class="sticky-notes-header">📌 付箋メモ</div>
      ${notesHTML}
      ${addHTML}
    </div>`;
  }

  let editingStickyNotes = [];

  function renderEditStickySection() {
    const sorted = [...editingStickyNotes].sort((a, b) => ((a.page || 0) - (b.page || 0)) || (a.createdAt - b.createdAt));
    const notesHTML = sorted.map(note => {
      const colorIdx = editingStickyNotes.findIndex(n => n.id === note.id) % STICKY_COLORS.length;
      const color = STICKY_COLORS[colorIdx];
      return `<div class="sticky-note sticky-note--${color}">
        <button class="sticky-note__delete" onclick="deleteStickyNoteFromEdit('${note.id}')">×</button>
        ${(note.page != null && note.page !== '') ? `<div class="sticky-note__page">p. ${note.page}</div>` : ''}
        <div class="sticky-note__text">${escapeHtml(note.text)}</div>
      </div>`;
    }).join('');

    return `<div class="sticky-notes-section">
      <div class="sticky-notes-header">📌 付箋メモ</div>
      ${notesHTML}
      <button class="sticky-add-btn" onclick="toggleEditStickyForm()">＋ 付箋を追加</button>
      <div class="sticky-form" id="editStickyForm" style="display:none;">
        <input type="number" class="sticky-form__page" id="editStickyPage" placeholder="ページ数（任意）" min="1">
        <textarea class="sticky-form__text" id="editStickyText" placeholder="気になった一節やメモ..." maxlength="200"></textarea>
        <div class="sticky-form__actions">
          <button class="sticky-form__submit" onclick="addStickyNoteToEdit()">貼る</button>
          <button class="sticky-form__cancel" onclick="toggleEditStickyForm()">キャンセル</button>
        </div>
      </div>
    </div>`;
  }
```

- [ ] **Step 2: commit**

```bash
git -C /Users/ylee/Apps/book-journal add index.html
git -C /Users/ylee/Apps/book-journal commit -m "feat: add sticky notes helper functions and state"
```

---

## Task 4: 読書カードテンプレートにしおりタブを追加

**Files:**
- Modify: `index.html` — `renderBooks()` 内の `<article class="book-card" ...>` テンプレート（行4849付近）

- [ ] **Step 1: `<article>` タグの直後に `renderStickyTabsHTML(book)` を挿入**

現在の `<article ...>` の直後（`<div class="book-status-row">` の前）:

```javascript
// 変更前（行4849〜4851）:
      <article class="book-card" data-status="${book.status}" data-book-id="${book.id}" onclick="if(currentView==='grid')openCardPopup('${book.id}')">
        <div class="book-status-row">

// 変更後:
      <article class="book-card" data-status="${book.status}" data-book-id="${book.id}" onclick="if(currentView==='grid')openCardPopup('${book.id}')">
        ${renderStickyTabsHTML(book)}
        <div class="book-status-row">
```

- [ ] **Step 2: ブラウザで確認**

付箋のない本にはタブが出ない。まだ付箋追加機能はないので、この時点ではタブは全カードで非表示のはず。コンソールにエラーがないことを確認。

- [ ] **Step 3: commit**

```bash
git -C /Users/ylee/Apps/book-journal add index.html
git -C /Users/ylee/Apps/book-journal commit -m "feat: render sticky tabs on book cards"
```

---

## Task 5: カードポップアップに付箋セクション＋CRUD関数

**Files:**
- Modify: `index.html` — `openCardPopup()` 関数（行4159付近）＋直後に関数追加

- [ ] **Step 1: `currentPopupBookId` 変数を宣言し `openCardPopup` を修正**

`let currentView = 'shelf';` のある行（行4138付近）の近くに変数宣言を追加し、`openCardPopup` を以下に変更:

```javascript
  let currentPopupBookId = null;

  function openCardPopup(bookId, event) {
    if (event) event.stopPropagation();
    currentPopupBookId = bookId;
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    const statusLabel = { reading: '読書中', finished: '読了', wishlist: 'また読みたい' };
    const stars = book.rating ? '★'.repeat(book.rating) + '☆'.repeat(5 - book.rating) : '';
    const cats = getCategories(book).map(c => `<span class="book-category-tag" style="font-size:0.6rem;">${escapeHtml(normalizeCategory(c))}</span>`).join('');
    const owner = isMyBook(book);
    const hasStickyNotes = book.stickyNotes && book.stickyNotes.length > 0;
    document.getElementById('cardPopupContent').innerHTML = `
      ${book.coverUrl ? `<img class="card-popup-cover" src="${escapeHtml(book.coverUrl)}" alt="${escapeHtml(book.title)}">` : ''}
      <div class="card-popup-title">${escapeHtml(book.title)}</div>
      ${book.author ? `<div class="card-popup-author">— ${escapeHtml(book.author)}</div>` : ''}
      <div class="card-popup-meta">
        ${statusLabel[book.status] || ''} ${stars ? `· ${stars}` : ''} ${cats}
      </div>
      ${book.memo ? `<div class="card-popup-memo">${linkify(book.memo)}</div>` : ''}
      ${book.recommend ? `<div class="card-popup-recommend"><strong>こんな人へ</strong> ${linkify(book.recommend)}</div>` : ''}
      ${(owner || hasStickyNotes) ? renderStickyNotesHTML(book, owner) : ''}
    `;
    document.getElementById('cardPopupOverlay').classList.add('open');
  }
```

- [ ] **Step 2: `closeCardPopup` の直後に CRUD関数と toggleStickyForm を追加**

```javascript
  window.toggleStickyForm = function(bookId) {
    const form = document.getElementById('stickyForm-' + bookId);
    if (!form) return;
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      const textEl = document.getElementById('stickyText-' + bookId);
      if (textEl) textEl.focus();
    }
  };

  window.addStickyNote = async function(bookId) {
    const pageEl = document.getElementById('stickyPage-' + bookId);
    const textEl = document.getElementById('stickyText-' + bookId);
    const text = textEl ? textEl.value.trim() : '';
    if (!text) { showToast('メモを入力してください'); return; }

    const pageVal = pageEl && pageEl.value !== '' ? parseInt(pageEl.value, 10) : null;
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const note = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      page: pageVal,
      text: text,
      color: STICKY_COLORS[(book.stickyNotes || []).length % STICKY_COLORS.length],
      createdAt: Date.now()
    };

    const newNotes = [...(book.stickyNotes || []), note];

    // Optimistic update
    book.stickyNotes = newNotes;
    openCardPopup(bookId);

    try {
      const { doc, updateDoc } = window._fs;
      await updateDoc(doc(window._db, 'books', bookId), { stickyNotes: newNotes });
    } catch (err) {
      // Revert on failure
      book.stickyNotes = newNotes.filter(n => n.id !== note.id);
      openCardPopup(bookId);
      showToast('付箋の保存に失敗しました: ' + (err.message || err));
    }
  };

  window.deleteStickyNote = async function(bookId, noteId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const prevNotes = book.stickyNotes || [];
    const newNotes = prevNotes.filter(n => n.id !== noteId);

    // Optimistic update
    book.stickyNotes = newNotes;
    openCardPopup(bookId);

    try {
      const { doc, updateDoc } = window._fs;
      await updateDoc(doc(window._db, 'books', bookId), { stickyNotes: newNotes });
    } catch (err) {
      // Revert on failure
      book.stickyNotes = prevNotes;
      openCardPopup(bookId);
      showToast('付箋の削除に失敗しました: ' + (err.message || err));
    }
  };
```

- [ ] **Step 3: 動作確認**

1. 既存の本カードをクリックしてポップアップを開く
2. 自分の本には `📌 付箋メモ` セクションと「＋ 付箋を追加」ボタンが表示されること
3. 「＋ 付箋を追加」クリックでフォームが開くこと
4. ページ数とメモを入力して「貼る」でトーストと付箋表示が更新されること
5. カードのしおりタブも出現すること
6. `×` で削除できること

- [ ] **Step 4: commit**

```bash
git -C /Users/ylee/Apps/book-journal add index.html
git -C /Users/ylee/Apps/book-journal commit -m "feat: add sticky notes CRUD in card popup"
```

---

## Task 6: EDITモーダルに付箋セクションを追加

**Files:**
- Modify: `index.html` — フォームHTML（行3712付近）＋ `openEditModal` ＋ `addBook` ＋ `closeModal`

- [ ] **Step 1: フォームHTMLに付箋セクション用プレースホルダを追加**

`inputRecommend` の `<div class="form-group">` の直後（`カテゴリ` のform-groupの前）に追加:

```html
      <div id="editStickySection"></div>
```

つまり:
```html
<!-- 変更前 -->
      <div class="form-group">
        <label class="form-label">Category / カテゴリ ...

<!-- 変更後 -->
      <div id="editStickySection"></div>

      <div class="form-group">
        <label class="form-label">Category / カテゴリ ...
```

- [ ] **Step 2: `openEditModal` で `editingStickyNotes` を初期化してセクションを描画**

`openEditModal` 内の `document.getElementById('inputMemo').focus();` の直前に追加:

```javascript
    // Sticky notes
    editingStickyNotes = JSON.parse(JSON.stringify(book.stickyNotes || []));
    const stickySection = document.getElementById('editStickySection');
    if (stickySection) stickySection.innerHTML = renderEditStickySection();
```

- [ ] **Step 3: `addBook()` の UPDATE パスに `stickyNotes` を含める**

`addBook()` の `updated` オブジェクト（行6460付近）に `stickyNotes` を追加:

```javascript
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
        stickyNotes: editingStickyNotes,   // ← 追加
        updatedAt: Date.now()
      };
```

- [ ] **Step 4: `closeModal()` で `editingStickyNotes` をリセット**

`closeModal()` 内（`editingBookId = null;` の直後）に追加:

```javascript
    editingStickyNotes = [];
    const stickySection = document.getElementById('editStickySection');
    if (stickySection) stickySection.innerHTML = '';
```

- [ ] **Step 5: `addStickyNoteToEdit` / `deleteStickyNoteFromEdit` / `toggleEditStickyForm` を追加**

Task 5 で追加した `window.deleteStickyNote` の直後に追加:

```javascript
  window.toggleEditStickyForm = function() {
    const form = document.getElementById('editStickyForm');
    if (!form) return;
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'flex' : 'none';
    if (isHidden) {
      const textEl = document.getElementById('editStickyText');
      if (textEl) textEl.focus();
    }
  };

  window.addStickyNoteToEdit = function() {
    const pageEl = document.getElementById('editStickyPage');
    const textEl = document.getElementById('editStickyText');
    const text = textEl ? textEl.value.trim() : '';
    if (!text) { showToast('メモを入力してください'); return; }

    const pageVal = pageEl && pageEl.value !== '' ? parseInt(pageEl.value, 10) : null;
    const note = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      page: pageVal,
      text: text,
      color: STICKY_COLORS[editingStickyNotes.length % STICKY_COLORS.length],
      createdAt: Date.now()
    };

    editingStickyNotes.push(note);
    const stickySection = document.getElementById('editStickySection');
    if (stickySection) stickySection.innerHTML = renderEditStickySection();
  };

  window.deleteStickyNoteFromEdit = function(noteId) {
    editingStickyNotes = editingStickyNotes.filter(n => n.id !== noteId);
    const stickySection = document.getElementById('editStickySection');
    if (stickySection) stickySection.innerHTML = renderEditStickySection();
  };
```

- [ ] **Step 6: EDITモーダルの動作確認**

1. 既存の本の EDIT ボタンをクリック
2. フォーム最下部（カテゴリの上）に `📌 付箋メモ` セクションが表示されること
3. 「＋ 付箋を追加」でフォームが開くこと
4. 付箋を追加して「更新する」→ 付箋が保存されてカードのしおりタブが出ること
5. 再度 EDIT を開くと付箋が引き継がれていること
6. `×` で削除して「更新する」→ 削除されること

- [ ] **Step 7: commit**

```bash
git -C /Users/ylee/Apps/book-journal add index.html
git -C /Users/ylee/Apps/book-journal commit -m "feat: add sticky notes to edit modal"
```

---

## Task 7: デプロイ

- [ ] **Step 1: push して Firebase へデプロイ**

```bash
git -C /Users/ylee/Apps/book-journal push origin main
```

GitHub Actions が自動的に Firebase Hosting / Functions / Firestore Rules をデプロイ。

- [ ] **Step 2: 本番確認**

https://book-journal-community.web.app を開き:
1. 読書カードに付箋タブが表示されないこと（まだ付箋0件）
2. 自分の本のポップアップに `📌 付箋メモ` セクションが表示されること
3. 付箋を追加するとしおりタブがカード右上に出ること
4. 他人のカードでは付箋の閲覧のみ可能なこと（追加ボタンなし）

---

## 自己レビュー

- **スペックカバレッジ:** 全要件（タブ表示・ポップアップ統合・popup/edit双方からCRUD・他人は閲覧のみ）を全タスクでカバー。✅
- **プレースホルダなし:** TBD/TODO なし。✅
- **型一貫性:** `STICKY_COLORS`・`renderStickyTabsHTML`・`renderStickyNotesHTML`・`renderEditStickySection`・`editingStickyNotes` は全タスクで同名使用。✅
- **注意点:** `window._db` と `window._fs` は既存の Firebase 初期化後に設定される（行3931付近）。popup の CRUD はその後に呼ばれるため問題なし。localStorage fallbackは `addBook` の `storage.set` 経由で処理されるが、ポップアップからの直接 `updateDoc` は Firebase が有効な場合のみ機能する。localStorage 環境では付箋は保存されない（対象ユーザーはほぼ全員 Firebase 使用のため許容）。
