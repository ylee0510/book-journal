function determinePlanStatus(sub) {
  const { status, items } = sub;
  if (status === 'active' || status === 'trialing') {
    const interval = items?.[0]?.price?.recurring?.interval;
    return interval === 'year' ? 'annual' : 'monthly';
  }
  return null;
}

function isLifetimePayment(payment) {
  return payment.status === 'succeeded' && payment.metadata?.planType === 'lifetime';
}

module.exports = { determinePlanStatus, isLifetimePayment };
