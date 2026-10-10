const destinations = new Set(['/chat', '/chats', '/applications', '/interview', '/mock-interview', '/files', '/connect-accounts', '/pricing']);
export function safeAuthRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/chat';
  const path = value.split(/[?#]/)[0];
  return destinations.has(path) || /^\/chat\/[a-zA-Z0-9_-]+$/.test(path) ? value : '/chat';
}
