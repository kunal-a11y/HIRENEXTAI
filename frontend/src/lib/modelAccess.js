export function canUseModel(model, user) {
  const plan = user?.planExpiresAt && new Date(user.planExpiresAt) <= new Date() ? 'free' : String(user?.plan || 'free').toLowerCase();
  if (model === 'hirenext-flash' || model === 'hirenext-0.1') return true;
  return model === 'hirenext-pro' && ['pro', 'max', 'ultimate'].includes(plan);
}
