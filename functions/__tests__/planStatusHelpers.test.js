const { determinePlanStatus, isLifetimePayment } = require('../planStatusHelpers');

describe('determinePlanStatus', () => {
  test('active monthly subscription returns monthly', () => {
    const sub = {
      status: 'active',
      items: [{ price: { recurring: { interval: 'month' } } }],
    };
    expect(determinePlanStatus(sub)).toBe('monthly');
  });

  test('active annual subscription returns annual', () => {
    const sub = {
      status: 'active',
      items: [{ price: { recurring: { interval: 'year' } } }],
    };
    expect(determinePlanStatus(sub)).toBe('annual');
  });

  test('trialing monthly subscription returns monthly', () => {
    const sub = {
      status: 'trialing',
      items: [{ price: { recurring: { interval: 'month' } } }],
    };
    expect(determinePlanStatus(sub)).toBe('monthly');
  });

  test('canceled subscription returns null', () => {
    const sub = { status: 'canceled', items: [] };
    expect(determinePlanStatus(sub)).toBeNull();
  });

  test('past_due subscription returns null', () => {
    const sub = { status: 'past_due', items: [] };
    expect(determinePlanStatus(sub)).toBeNull();
  });
});

describe('isLifetimePayment', () => {
  test('succeeded payment with lifetime metadata returns true', () => {
    const payment = { status: 'succeeded', metadata: { planType: 'lifetime' } };
    expect(isLifetimePayment(payment)).toBe(true);
  });

  test('succeeded payment without lifetime metadata returns false', () => {
    const payment = { status: 'succeeded', metadata: {} };
    expect(isLifetimePayment(payment)).toBe(false);
  });

  test('failed payment with lifetime metadata returns false', () => {
    const payment = { status: 'failed', metadata: { planType: 'lifetime' } };
    expect(isLifetimePayment(payment)).toBe(false);
  });

  test('payment with no metadata returns false', () => {
    const payment = { status: 'succeeded' };
    expect(isLifetimePayment(payment)).toBe(false);
  });
});
