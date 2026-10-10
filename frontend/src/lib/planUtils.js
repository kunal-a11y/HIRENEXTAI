export function normalizePlan(plan) {
  const rawPlan = plan?.name || plan?.slug || plan?.id || plan?.type || plan || 'free';
  const value = String(rawPlan).toLowerCase().trim();

  if (value === 'plus') return 'plus';
  if (value === 'pro') return 'pro';
  if (value === 'max') return 'max';
  if (value === 'business') return 'business';
  return 'free';
}

export function getPlanDisplay(plan) {
  const p = normalizePlan(plan);
  if (p === 'plus') return 'Plus';
  if (p === 'pro') return 'Pro ✦';
  if (p === 'max') return 'Max ✦';
  if (p === 'business') return 'Business ✦';
  return 'Free Plan';
}
