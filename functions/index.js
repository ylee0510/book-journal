const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { determinePlanStatus, isLifetimePayment } = require('./planStatusHelpers');

setGlobalOptions({ region: 'asia-northeast1' });

admin.initializeApp();

const db = admin.firestore();

exports.onSubscriptionWrite = onDocumentWritten(
  'customers/{uid}/subscriptions/{subId}',
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after;
    if (!after?.exists) return;

    const sub = after.data();
    const userRef = db.doc(`users/${uid}`);
    const newStatus = determinePlanStatus(sub);

    if (newStatus) {
      await userRef.set({ planStatus: newStatus }, { merge: true });
      return;
    }

    // Subscription ended — check if user still has any valid plan
    const [activeSubs, payments] = await Promise.all([
      db.collection(`customers/${uid}/subscriptions`)
        .where('status', 'in', ['active', 'trialing'])
        .get(),
      db.collection(`customers/${uid}/payments`)
        .where('status', '==', 'succeeded')
        .get(),
    ]);

    const hasLifetime = payments.docs.some((d) => isLifetimePayment(d.data()));

    if (!activeSubs.empty || hasLifetime) return;

    await userRef.set({ planStatus: 'free' }, { merge: true });
  }
);

exports.onPaymentWrite = onDocumentWritten(
  'customers/{uid}/payments/{paymentId}',
  async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after;
    if (!after?.exists) return;

    const payment = after.data();

    if (isLifetimePayment(payment)) {
      await db.doc(`users/${uid}`).set(
        { planStatus: 'lifetime' },
        { merge: true }
      );
    }
  }
);

exports.onBookWrite = onDocumentWritten(
  'books/{bookId}',
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;
    const beforeUid = before?.exists ? before.data()?.uid : null;
    const afterUid = after?.exists ? after.data()?.uid : null;

    const increment = admin.firestore.FieldValue.increment;

    if (!before?.exists && after?.exists && afterUid) {
      // Book created
      await db.doc(`users/${afterUid}`).set(
        { bookCount: increment(1) },
        { merge: true }
      );
    } else if (before?.exists && !after?.exists && beforeUid) {
      // Book deleted
      await db.doc(`users/${beforeUid}`).set(
        { bookCount: increment(-1) },
        { merge: true }
      );
    } else if (before?.exists && after?.exists && beforeUid !== afterUid) {
      // uid changed on update (edge case)
      const batch = db.batch();
      if (beforeUid) batch.set(db.doc(`users/${beforeUid}`), { bookCount: increment(-1) }, { merge: true });
      if (afterUid) batch.set(db.doc(`users/${afterUid}`), { bookCount: increment(1) }, { merge: true });
      await batch.commit();
    }
  }
);
