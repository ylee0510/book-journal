# 次の読者へ（Sharing Stamp）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** カードに「譲ります」「貸します」「交換します」の丸スタンプを貼る機能を追加し、ソーシャルバー右端に表示・タップでカードポップアップ内「次の読者へ」セクションを見せ、リクエスト（手を挙げる）も行える。

**Architecture:** 付箋機能と同じパターン。`books` Firestoreドキュメントに `sharingTypes`・`sharingLocation`・`sharingRequests` フィールドを追加。`index.html` の CSS→JS helpers→カードテンプレート→ポップアップ→フォームの順に実装。楽観的更新 + `updateDoc` で保存。

**Tech Stack:** Vanilla JS, Firebase Firestore (`updateDoc`, `doc`), 単一ファイル `index.html`

---

### Task 1: CSS — スタンプ・ポップアップセクション・フォームトグルのスタイル

**Files:**
- Modify: `/Users/ylee/Apps/book-journal/index.html` — `.sticky-note--green` ブロックの直後に追加（約 line 1091 付近）

- [ ] **Step 1: `.sticky-note--green` の終わり行を見つける**

```bash
grep -n "sticky-note--green" /Users/ylee/Apps/book-journal/index.html
```

Expected: `.sticky-note--green { ... }` の行番号が出る。その直後に CSS を挿入する。

- [ ] **Step 2: CSS を挿入する**

`.sticky-note--green { ... }` ブロックの閉じ `}` の直後に以下を追加:

```css

  /* ===================== SHARING STAMPS ===================== */
  /* ソーシャルバー内スタンプラッパー */
  .sharing-stamps {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  /* 1つの丸スタンプ */
  .sharing-stamp {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
  }
  .sharing-stamp--give {
    border: 2px solid #5a8a5a;
    background: #f0f8f0;
    box-shadow: inset 0 0 0 1.5px #b8d8b8;
  }
  .sharing-stamp--lend {
    border: 2px solid #5a6a9a;
    background: #f0f2f8;
    box-shadow: inset 0 0 0 1.5px #b8c4e0;
  }
  .sharing-stamp--exchange {
    border: 2px solid #9a7a3a;
    background: #faf4e8;
    box-shadow: inset 0 0 0 1.5px #ddc880;
  }
  .sharing-stamp__text {
    font-size: 0.42rem;
    font-weight: 700;
    line-height: 1.25;
    text-align: center;
    transform: rotate(-18deg);
    display: block;
    font-family: 'Noto Serif JP', serif;
  }
  .sharing-stamp--give .sharing-stamp__text     { color: #2a6a2a; }
  .sharing-stamp--lend .sharing-stamp__text     { color: #2a4a8a; }
  .sharing-stamp--exchange .sharing-stamp__text { color: #7a5a10; }

  /* ポップアップ内「次の読者へ」セクション */
  .sharing-section {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }
  .sharing-section-header {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--ink-soft);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 0.8rem;
  }
  .sharing-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  .sharing-item-text { flex: 1; }
  .sharing-item-label {
    font-size: 0.68rem;
    font-weight: 700;
    margin-bottom: 0.2rem;
  }
  .sharing-item-desc {
    font-size: 0.63rem;
    color: var(--ink-soft);
    line-height: 1.5;
  }
  .sharing-location {
    background: var(--bg-deep);
    border-radius: 4px;
    padding: 0.5rem 0.7rem;
    margin-bottom: 0.75rem;
    font-size: 0.63rem;
  }
  .sharing-location-label {
    font-size: 0.55rem;
    color: var(--ink-fade);
    margin-bottom: 0.2rem;
  }
  .sharing-location-text {
    color: var(--ink);
    font-weight: 600;
  }
  .sharing-requests-label {
    font-size: 0.63rem;
    font-weight: 700;
    color: var(--ink-soft);
    margin-bottom: 0.4rem;
  }
  .sharing-requests-list {
    font-size: 0.63rem;
    color: var(--ink-fade);
    margin-bottom: 0.7rem;
    line-height: 1.6;
  }
  .sharing-request-btn {
    width: 100%;
    background: var(--bg-deep);
    border: 1.5px solid #5a8a5a;
    border-radius: 5px;
    padding: 0.5rem;
    font-size: 0.65rem;
    color: #2a6a2a;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
  }
  .sharing-request-btn.raised {
    opacity: 0.6;
    cursor: default;
    border-color: var(--line);
    color: var(--ink-fade);
    background: transparent;
  }

  /* フォーム内「次の読者へ」セクション */
  .sharing-form-section {
    margin: 1rem 0 0;
    padding-top: 1rem;
    border-top: 1px dashed #c8b46a;
  }
  .sharing-form-label {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--ink-soft);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }
  .sharing-toggle-wrap {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-bottom: 0.6rem;
  }
  .sharing-toggle {
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 0.3rem 0.75rem;
    cursor: pointer;
    font-size: 0.62rem;
    color: var(--ink-soft);
    font-family: inherit;
    transition: all 0.15s;
  }
  .sharing-toggle--give-active {
    background: #f0f8f0;
    border-color: #5a8a5a;
    color: #2a6a2a;
    font-weight: 700;
  }
  .sharing-toggle--lend-active {
    background: #f0f2f8;
    border-color: #5a6a9a;
    color: #2a4a8a;
    font-weight: 700;
  }
  .sharing-toggle--exchange-active {
    background: #faf4e8;
    border-color: #9a7a3a;
    color: #7a5a10;
    font-weight: 700;
  }
```

- [ ] **Step 3: コミット**

```bash
git add index.html
git commit -m "style: add sharing stamp, popup section, and form toggle CSS"
```

---

### Task 2: JS — ヘルパー関数と state 変数

**Files:**
- Modify: `/Users/ylee/Apps/book-journal/index.html` — `let editingStickyNotes = [];` の直前に state 変数を、`renderStickyTabsHTML` の直前にヘルパー関数を追加

- [ ] **Step 1: `renderStickyTabsHTML` の行番号を確認**

```bash
grep -n "function renderStickyTabsHTML\|let editingStickyNotes" /Users/ylee/Apps/book-journal/index.html
```

- [ ] **Step 2: `renderStickyTabsHTML` の直前に sharing ヘルパー関数を追加**

```javascript
  // ==================== SHARING STAMPS ====================
  const SHARING_CONFIG = {
    give: {
      label: '譲ります',
      stampText: '譲り<br>ます',
      desc: '読み終わったので、大切にしてくれる方に譲ります。',
      color: '#2a6a2a',
    },
    lend: {
      label: '貸します',
      stampText: '貸し<br>ます',
      desc: '読み終わったので、しばらく貸し出せます。大切にしてください。',
      color: '#2a4a8a',
    },
    exchange: {
      label: '交換します',
      stampText: '交換<br>します',
      desc: 'あなたの持っている素敵な本と、この本を交換しませんか？',
      color: '#7a5a10',
    },
  };

  function renderSharingStampsHTML(book) {
    const types = book.sharingTypes || [];
    if (types.length === 0) return '';
    const stamps = types.map(type => {
      const cfg = SHARING_CONFIG[type];
      if (!cfg) return '';
      return `<div class="sharing-stamp sharing-stamp--${type}" onclick="openCardPopup('${book.id}',event)">
        <span class="sharing-stamp__text">${cfg.stampText}</span>
      </div>`;
    }).join('');
    return `<div class="sharing-stamps">${stamps}</div>`;
  }

  function renderSharingSectionHTML(book) {
    const types = book.sharingTypes || [];
    if (types.length === 0) return '';

    const itemsHTML = types.map(type => {
      const cfg = SHARING_CONFIG[type];
      if (!cfg) return '';
      return `<div class="sharing-item">
        <div class="sharing-stamp sharing-stamp--${type}">
          <span class="sharing-stamp__text">${cfg.stampText}</span>
        </div>
        <div class="sharing-item-text">
          <div class="sharing-item-label" style="color:${cfg.color};">${cfg.label}</div>
          <div class="sharing-item-desc">${cfg.desc}</div>
        </div>
      </div>`;
    }).join('');

    const locationHTML = book.sharingLocation ? `
      <div class="sharing-location">
        <div class="sharing-location-label">📍 受け取れる場所</div>
        <div class="sharing-location-text">${escapeHtml(book.sharingLocation)}</div>
      </div>` : '';

    const requests = book.sharingRequests || [];
    const requestsListHTML = requests.length === 0
      ? '<div class="sharing-requests-list">まだいません。あなたが最初の手を挙げてみませんか？</div>'
      : `<div class="sharing-requests-list">${requests.map(r => escapeHtml(r.name)).join('、')}</div>`;

    const isOwner = isMyBook(book);
    const alreadyRaised = currentUser && !currentUser.isAnonymous
      && requests.some(r => r.uid === currentUser.uid);

    let btnHTML = '';
    if (!isOwner) {
      if (currentUser && !currentUser.isAnonymous) {
        btnHTML = alreadyRaised
          ? `<button type="button" class="sharing-request-btn raised" disabled>手を挙げました ✓</button>`
          : `<button type="button" class="sharing-request-btn" onclick="addSharingRequest('${book.id}')">🙋 借りたいです！</button>`;
      } else {
        btnHTML = `<p style="font-size:0.62rem;color:var(--ink-fade);text-align:center;margin-top:0.5rem;">ログインして手を挙げる</p>`;
      }
    }

    return `<div class="sharing-section">
      <div class="sharing-section-header">📚 次の読者へ</div>
      ${itemsHTML}
      ${locationHTML}
      <div class="sharing-requests-label">🙋 手を挙げている人</div>
      ${requestsListHTML}
      ${btnHTML}
    </div>`;
  }

  let editingSharingTypes = [];
  let editingSharingLocation = '';

  function renderEditSharingSectionHTML() {
    const typeList = [
      { id: 'give',     label: '譲ります',  activeClass: 'sharing-toggle--give-active'     },
      { id: 'lend',     label: '貸します',  activeClass: 'sharing-toggle--lend-active'     },
      { id: 'exchange', label: '交換します', activeClass: 'sharing-toggle--exchange-active' },
    ];
    const togglesHTML = typeList.map(t => {
      const isActive = editingSharingTypes.includes(t.id);
      return `<button type="button" class="sharing-toggle${isActive ? ' ' + t.activeClass : ''}" onclick="toggleSharingType('${t.id}')">${t.label}</button>`;
    }).join('');

    const locationHTML = editingSharingTypes.length > 0 ? `
      <div>
        <div style="font-size:0.6rem;color:var(--ink-fade);margin-bottom:0.3rem;">受け取れる場所（任意）</div>
        <input type="text" class="form-input" id="sharingLocationInput" maxlength="100"
               placeholder="例: 鎌倉駅周辺、読書会の場所など"
               value="${escapeHtml(editingSharingLocation)}"
               oninput="editingSharingLocation=this.value">
      </div>` : '';

    return `<div class="sharing-form-section">
      <div class="sharing-form-label">次の読者へ（任意）</div>
      <div class="sharing-toggle-wrap">${togglesHTML}</div>
      ${locationHTML}
    </div>`;
  }

  window.toggleSharingType = function(type) {
    // 再レンダー前に場所入力値を保存
    const locInput = document.getElementById('sharingLocationInput');
    if (locInput) editingSharingLocation = locInput.value;

    if (editingSharingTypes.includes(type)) {
      editingSharingTypes = editingSharingTypes.filter(t => t !== type);
    } else {
      editingSharingTypes = [...editingSharingTypes, type];
    }
    const sharingSection = document.getElementById('editSharingSection');
    if (sharingSection) sharingSection.innerHTML = renderEditSharingSectionHTML();
  };
```

- [ ] **Step 3: `window.addSharingRequest` を `window.toggleStickyForm` の直前に追加**

```javascript
  window.addSharingRequest = async function(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book || !currentUser || currentUser.isAnonymous) return;
    const name = (userProfile && userProfile.displayName) || currentUser.displayName || '読書家';
    const request = { uid: currentUser.uid, name, requestedAt: Date.now() };
    // 楽観的更新
    book.sharingRequests = [...(book.sharingRequests || []), request];
    openCardPopup(bookId);
    try {
      await updateDoc(doc(window._db, 'books', bookId), {
        sharingRequests: book.sharingRequests,
      });
    } catch (err) {
      book.sharingRequests = (book.sharingRequests || []).filter(r => r.uid !== currentUser.uid);
      openCardPopup(bookId);
      showToast('エラーが発生しました');
    }
  };
```

- [ ] **Step 4: コミット**

```bash
git add index.html
git commit -m "feat: add sharing stamp JS helpers and addSharingRequest handler"
```

---

### Task 3: カードテンプレート — ソーシャルバーにスタンプ追加

**Files:**
- Modify: `/Users/ylee/Apps/book-journal/index.html` — `renderBooks()` 内のカードテンプレート（`<div class="social-bar">` ブロック、約 line 5173）

- [ ] **Step 1: 対象行を確認**

```bash
grep -n "social-bar\|comment-toggle\|renderLikeAvatars" /Users/ylee/Apps/book-journal/index.html | grep -v "CSS\|css\|\.social"
```

- [ ] **Step 2: `</div>` （social-bar 閉じタグ）の直前にスタンプを挿入**

```javascript
// 変更前:
            <button class="comment-toggle" onclick="toggleComments(event, '${book.id}')">
              <span>💬</span>
              <span>${(book.comments || []).length}</span>
            </button>
          </div>

// 変更後:
            <button class="comment-toggle" onclick="toggleComments(event, '${book.id}')">
              <span>💬</span>
              <span>${(book.comments || []).length}</span>
            </button>
            ${renderSharingStampsHTML(book)}
          </div>
```

- [ ] **Step 3: コミット**

```bash
git add index.html
git commit -m "feat: render sharing stamps in card social bar"
```

---

### Task 4: カードポップアップ — 「次の読者へ」セクション追加

**Files:**
- Modify: `/Users/ylee/Apps/book-journal/index.html` — `openCardPopup()` 内の innerHTML 末尾（約 line 4342）

- [ ] **Step 1: 対象行を確認**

```bash
grep -n "renderStickyNotesHTML\|cardPopupContent\|hasStickyNotes" /Users/ylee/Apps/book-journal/index.html
```

- [ ] **Step 2: `openCardPopup()` の innerHTML に sharing セクションを追加**

現在の末尾:
```javascript
      ${(owner || hasStickyNotes) ? renderStickyNotesHTML(book, owner) : ''}
    `;
```

変更後:
```javascript
      ${(owner || hasStickyNotes) ? renderStickyNotesHTML(book, owner) : ''}
      ${renderSharingSectionHTML(book)}
    `;
```

- [ ] **Step 3: コミット**

```bash
git add index.html
git commit -m "feat: add sharing section to card popup"
```

---

### Task 5: フォームHTML + 状態管理 — 「次の読者へ」入力欄

**Files:**
- Modify: `/Users/ylee/Apps/book-journal/index.html` — フォームHTML（`<div id="editStickySection">` 付近）と `openModal()` / `openEditModal()` / `closeModal()` / `addBook()`

- [ ] **Step 1: フォームHTMLに `editSharingSection` を追加**

現在:
```html
      <div id="editStickySection"></div>
```

変更後（`editStickySection` の直前に挿入）:
```html
      <div id="editSharingSection"></div>

      <div id="editStickySection"></div>
```

- [ ] **Step 2: `openModal()` に sharing 初期化を追加**

現在:
```javascript
    editingStickyNotes = [];
    const stickySection = document.getElementById('editStickySection');
    if (stickySection) stickySection.innerHTML = renderEditStickySection();
```

変更後:
```javascript
    editingSharingTypes = [];
    editingSharingLocation = '';
    const sharingSection = document.getElementById('editSharingSection');
    if (sharingSection) sharingSection.innerHTML = renderEditSharingSectionHTML();
    editingStickyNotes = [];
    const stickySection = document.getElementById('editStickySection');
    if (stickySection) stickySection.innerHTML = renderEditStickySection();
```

- [ ] **Step 3: `openEditModal()` に sharing 読み込みを追加**

現在（Sticky notes 読み込みの直前）:
```javascript
    // Sticky notes
    editingStickyNotes = JSON.parse(JSON.stringify(book.stickyNotes || []));
    const stickySection = document.getElementById('editStickySection');
    if (stickySection) stickySection.innerHTML = renderEditStickySection();
```

変更後:
```javascript
    // Sharing
    editingSharingTypes = [...(book.sharingTypes || [])];
    editingSharingLocation = book.sharingLocation || '';
    const sharingSection = document.getElementById('editSharingSection');
    if (sharingSection) sharingSection.innerHTML = renderEditSharingSectionHTML();

    // Sticky notes
    editingStickyNotes = JSON.parse(JSON.stringify(book.stickyNotes || []));
    const stickySection = document.getElementById('editStickySection');
    if (stickySection) stickySection.innerHTML = renderEditStickySection();
```

- [ ] **Step 4: `closeModal()` に sharing リセットを追加**

現在:
```javascript
    editingStickyNotes = [];
    const stickySection = document.getElementById('editStickySection');
    if (stickySection) stickySection.innerHTML = '';
```

変更後:
```javascript
    editingSharingTypes = [];
    editingSharingLocation = '';
    const sharingSection = document.getElementById('editSharingSection');
    if (sharingSection) sharingSection.innerHTML = '';
    editingStickyNotes = [];
    const stickySection = document.getElementById('editStickySection');
    if (stickySection) stickySection.innerHTML = '';
```

- [ ] **Step 5: `addBook()` の UPDATE パスに sharing フィールドを追加**

現在の `updated` オブジェクト:
```javascript
        stickyNotes: editingStickyNotes,
        updatedAt: Date.now()
```

変更後:
```javascript
        sharingTypes: editingSharingTypes,
        sharingLocation: editingSharingLocation,
        sharingRequests: existing.sharingRequests || [],
        stickyNotes: editingStickyNotes,
        updatedAt: Date.now()
```

- [ ] **Step 6: `addBook()` の CREATE パスに sharing フィールドを追加**

現在の `book` オブジェクト:
```javascript
        stickyNotes: editingStickyNotes,
        createdAt: Date.now()
```

変更後:
```javascript
        sharingTypes: editingSharingTypes,
        sharingLocation: editingSharingLocation,
        sharingRequests: [],
        stickyNotes: editingStickyNotes,
        createdAt: Date.now()
```

- [ ] **Step 7: コミット**

```bash
git add index.html
git commit -m "feat: add sharing form section with toggles and location input"
```

---

### Task 6: デプロイ

**Files:**
- なし（GitHub push → CI/CD が自動で Firebase deploy）

- [ ] **Step 1: push**

```bash
git push origin main
```

- [ ] **Step 2: GitHub Actions の完了を確認**

```bash
gh run list --limit 3
```

Expected: 最新の run が `completed` / `success` になっている。
