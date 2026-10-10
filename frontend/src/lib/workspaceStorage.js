// Separate browser workspaces by immutable account ID. Never adopt unowned legacy data.
export function workspaceScope() {
  if (['/demo', '/preview'].includes(window.location.pathname)) return 'demo';
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (localStorage.getItem('token') && Number.isInteger(user?.id)) return `account-${user.id}`;
  } catch { /* Invalid cached identity has no private workspace. */ }
  return 'guest';
}
export function storageForScope(scope) {
  const storage = scope === 'demo' || scope === 'guest' ? sessionStorage : localStorage;
  const prefix = `hirenext:${scope}:`;
  return {
    getItem: key => storage.getItem(prefix + key),
    setItem: (key, value) => storage.setItem(prefix + key, value),
    removeItem: key => storage.removeItem(prefix + key),
  };
}
export const workspaceStorage = {
  getItem: key => storageForScope(workspaceScope()).getItem(key),
  setItem: (key, value) => storageForScope(workspaceScope()).setItem(key, value),
  removeItem: key => storageForScope(workspaceScope()).removeItem(key),
};
