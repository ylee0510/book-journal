# Shelf. 料金体系設計

**日付:** 2026-05-20  
**ステータス:** 承認済み

---

## 1. アーキテクチャ全体像

```
Firebase Hosting (index.html)   ← GitHub Actions で main push 時に自動デプロイ
    │
    ├─ Firebase Auth (Google Sign-in)          既存
    ├─ Firestore (books, users)                既存 + planStatus / bookCount フィールド追加
    │
    ├─ customers/{uid}/                        Extension が管理
    │    ├─ subscriptions/{subId}              月額・年額の購読状態
    │    ├─ payments/{paymentId}               永久プランの決済状態
    │    └─ checkout_sessions/{id}             Checkout セッション（client が書き込む）
    │
    ├─ Firebase Extension: "Run Payments with Stripe"
    │    ├─ Stripe Webhook 受信・署名検証
    │    ├─ checkout_sessions への書き込みを検知 → Stripe Checkout セッション自動生成
    │    ├─ 決済完了後に subscriptions / payments へ状態同期
    │    └─ createPortalLink (callable Function) — Stripe Customer Portal URL を返す
    │
    └─ カスタム Firebase Functions（2本）
         ├─ onSubscriptionWrite   customers/{uid}/subscriptions 変化 → users/{uid}.planStatus 更新
         └─ onPaymentWrite        customers/{uid}/payments 変化 → users/{uid}.planStatus 更新（永久プラン）
```

**決済フロー（3プラン共通）:**
1. フロントが `customers/{uid}/checkout_sessions/{newId}` に書き込む
2. Extension が Stripe Checkout セッションを生成し `url` を書き戻す
3. フロントが `url` を受け取り Stripe ページへリダイレクト
4. 決済完了 → Stripe Webhook → Extension 処理 → `subscriptions/` または `payments/` に書き込む
5. カスタム Function が検知 → `users/{uid}.planStatus` を更新

月額・年額は `mode: 'subscription'`、永久プランは `mode: 'payment'`（Extension が両対応）。

---

## 2. 料金プラン

| プラン | 種別 | 価格 | Stripe mode |
|--------|------|------|-------------|
| 無料 | — | 20冊まで無料 | — |
| 月額プラン | recurring | ¥300 / 月 | subscription |
| 年額プラン | recurring | ¥980 / 年（月約¥81、73%お得） | subscription |
| 永久プラン | one-time | ¥2,980（買い切り） | payment |

Stripe ダッシュボードで作成する Price ID を環境変数 `VITE_STRIPE_PRICE_MONTHLY` / `ANNUAL` / `LIFETIME` として管理する。

---

## 3. データモデル

### `users/{uid}`（既存 + 追加フィールド）

```json
{
  "displayName": "string",
  "bio": "string",
  "goalYear": 20,
  "shortId": "string",
  "planStatus": "free | monthly | annual | lifetime",
  "bookCount": 0,
  "updatedAt": 1234567890
}
```

- `planStatus`: カスタム Function が payment/subscription イベントで書き込む。フロントはここを読む。
- `bookCount`: 本の追加・削除時に Firestore トランザクションでアトミックに増減。Security Rules で参照。

### `customers/{uid}/` — Extension が自動管理

```
subscriptions/{subId}
  status: "active" | "trialing" | "past_due" | "canceled"
  items[0].price.recurring.interval: "month" | "year"
  current_period_end: timestamp

payments/{paymentId}
  status: "succeeded" | "failed"
  amount: 298000
  currency: "jpy"

checkout_sessions/{sessionId}
  price: "price_xxx"
  mode: "subscription" | "payment"
  success_url: "https://..."
  cancel_url: "https://..."
  url: "https://checkout.stripe.com/..."  ← Extension が書き戻す
  error: {...}                             ← 失敗時
```

---

## 4. Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function userPlan(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.get('planStatus', 'free');
    }
    function userBookCount(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.get('bookCount', 0);
    }
    function isPaid(uid) {
      return userPlan(uid) != 'free';
    }
    function canAddBook(uid) {
      return isPaid(uid) || userBookCount(uid) < 20;
    }

    match /books/{bookId} {
      allow read: if true;
      allow create: if request.auth != null && canAddBook(request.auth.uid);
      allow update, delete: if request.auth != null && resource.data.uid == request.auth.uid;
    }

    match /users/{uid} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == uid
                   && !request.resource.data.diff(resource.data).affectedKeys()
                        .hasAny(['planStatus']); // planStatus はカスタム Function のみ更新可
    }

    match /customers/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
    }
    match /customers/{uid}/checkout_sessions/{id} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /customers/{uid}/subscriptions/{id} {
      allow read: if request.auth != null && request.auth.uid == uid;
    }
    match /customers/{uid}/payments/{id} {
      allow read: if request.auth != null && request.auth.uid == uid;
    }

    match /shortLinks/{shortId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

**ポイント:** `planStatus` フィールドはクライアントから変更不可（カスタム Function のみ書き込める）。`bookCount` はクライアントがトランザクションで操作するが、Security Rules が 20冊上限をサーバー側で強制する。

---

## 5. カスタム Firebase Functions

### `functions/index.js`

```
onSubscriptionWrite (Firestore Trigger)
  パス: customers/{uid}/subscriptions/{subId}
  処理: status が 'active' または 'trialing' なら interval に応じて 'monthly'/'annual' を users/{uid}.planStatus に書く
        status が 'canceled' などなら他に有効な subscription がなければ 'free' に戻す

onPaymentWrite (Firestore Trigger)
  パス: customers/{uid}/payments/{paymentId}
  処理: status が 'succeeded' かつ items[0].price.id == LIFETIME_PRICE_ID (env var) なら
        users/{uid}.planStatus = 'lifetime' を書く
        （永久プランは取り消せないため 'free' への戻し処理なし）
```

両 Function は `admin.firestore()` で `users/{uid}` を更新するため、クライアントの Security Rules を迂回できる（Admin SDK は Rules を無視）。

---

## 6. フロントエンド変更

### 6-a. 本の登録フロー（既存 `addBook` の変更）

```
addBook() 呼び出し時:
  1. myBooks.length >= 20 かつ planStatus == 'free' → アップグレードモーダルを開く（登録しない）
  2. それ以外 → Firestore トランザクションで bookCount++ + book ドキュメント作成を同時実行
deleteBook() 時: bookCount-- をトランザクションで実行
```

### 6-b. 20冊到達バナー

- `myBooks.length === 20` かつ `planStatus === 'free'` のタイミングで、本棚ページ上部に固定バナーを表示
- テキスト: 「読書記録20冊に到達しました — 21冊目からは有料プランが必要です」
- ボタン: 「プランを見る」→ マイページのプランセクションへスクロール

### 6-c. アップグレードモーダル

- 21冊目登録試行時に表示
- 3プランカードを横並び（モバイルは縦積み）
- 各カードに「アップグレード」ボタン → checkout_sessions へ書き込み → url 取得 → Stripe Checkout へリダイレクト
- ローディング中はボタンをスピナー表示

### 6-d. My Page — プランセクション追加

**無料ユーザー表示:**
```
Plan
[Free]  15 / 20 冊使用中

月額プラン  ¥300/月          [アップグレード]
年額プラン  ¥980/年 73%お得  [アップグレード]
永久プラン  ¥2,980 買い切り  [購入する]
```

**有料ユーザー表示:**
```
Plan
[月額プラン]  次回更新: 2026/06/20

[請求を管理する]  → Stripe Customer Portal へ
```

**永久プランユーザー:**
```
Plan
[永久プラン]  無期限

（請求管理ボタンなし）
```

---

## 7. インフラ設定ファイル

| ファイル | 用途 |
|---------|------|
| `firebase.json` | Hosting 設定（public: `.`, ignore など） |
| `.firebaserc` | プロジェクト ID 紐付け |
| `firestore.rules` | Security Rules（上記） |
| `functions/index.js` | カスタム Function 2本 |
| `functions/package.json` | Functions 依存（firebase-admin, firebase-functions） |
| `.github/workflows/firebase-deploy.yml` | main push → Firebase Hosting + Functions 自動デプロイ |

---

## 8. セットアップ手順（実装前の手動作業）

1. Stripe ダッシュボードで3プラン（Price）を作成し、Price ID をメモ
2. Firebase コンソール → Extensions → "Run Payments with Stripe" をインストール
   - Stripe Secret Key / Webhook Secret を設定
   - Products collection: `products`
3. Firebase コンソール → Hosting を有効化
4. GitHub リポジトリに Secrets 追加: `FIREBASE_TOKEN` または `FIREBASE_SERVICE_ACCOUNT_xxx`
