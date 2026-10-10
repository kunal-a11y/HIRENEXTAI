import test from 'node:test';
import assert from 'node:assert/strict';
import { workspaceStorage, workspaceScope } from '../src/lib/workspaceStorage.js';
import { safeAuthRedirect } from '../src/lib/authRedirect.js';
import { canUseModel } from '../src/lib/modelAccess.js';
const memory = () => { const data = new Map(); return { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,String(v)), removeItem: k => data.delete(k) }; };
test('account workspaces, preferences, and demo are isolated without adopting legacy data', () => {
  globalThis.localStorage = memory(); globalThis.sessionStorage = memory(); globalThis.window = { location: { pathname: '/chat' } };
  localStorage.setItem('chatHistory', 'unowned legacy history');
  localStorage.setItem('token', 'test'); localStorage.setItem('user', JSON.stringify({ id: 1 }));
  assert.equal(workspaceStorage.getItem('chatHistory'), null);
  for (const key of ['chatHistory', 'hirenextai_files', 'applications', 'selectedModel', 'hirenextai_profile_memory']) workspaceStorage.setItem(key, 'account one');
  localStorage.setItem('user', JSON.stringify({ id: 2 }));
  for (const key of ['chatHistory', 'hirenextai_files', 'applications', 'selectedModel', 'hirenextai_profile_memory']) assert.equal(workspaceStorage.getItem(key), null);
  workspaceStorage.setItem('chatHistory', 'account two');
  window.location.pathname = '/demo'; workspaceStorage.setItem('chatHistory', 'temporary demo');
  assert.equal(workspaceScope(), 'demo');
  assert.equal(sessionStorage.getItem('hirenext:demo:chatHistory'), 'temporary demo');
  window.location.pathname = '/chat'; assert.equal(workspaceStorage.getItem('chatHistory'), 'account two');
  localStorage.setItem('user', JSON.stringify({ id: 1 })); assert.equal(workspaceStorage.getItem('chatHistory'), 'account one');
  localStorage.removeItem('token'); assert.equal(workspaceStorage.getItem('chatHistory'), null);
  localStorage.setItem('user', 'broken JSON'); assert.equal(workspaceScope(), 'guest');
});
test('login redirects stay on supported local pages and cannot loop through auth', () => {
  for (const path of ['https://evil.example', '//evil.example', '/login', '/admin', '/auth/callback', '/chat\\evil', '/missing']) assert.equal(safeAuthRedirect(path), '/chat');
  for (const path of ['/files', '/chat/123', '/pricing?billing=annual']) assert.equal(safeAuthRedirect(path), path);
});
test('model controls unlock Pro only for an active eligible plan', () => {
  for (const plan of ['free', 'plus', 'unknown']) assert.equal(canUseModel('hirenext-pro', { plan }), false);
  assert.equal(canUseModel('hirenext-pro', { plan: 'pro' }), true);
  assert.equal(canUseModel('hirenext-pro', { plan: 'pro', planExpiresAt: '2020-01-01' }), false);
  assert.equal(canUseModel('unknown', { plan: 'pro' }), false);
  assert.equal(canUseModel('hirenext-flash', { plan: 'free' }), true);
});
