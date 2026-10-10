import { useEffect, useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { workspaceScope, workspaceStorage } from '../lib/workspaceStorage';
import { canUseModel } from '../lib/modelAccess';
import useAuthStore from '../store/useAuthStore';
import useUserStore from '../store/useUserStore';
import useChatStore from '../store/useChatStore';
import useFilesStore from '../store/useFilesStore';
import useInterviewStore from '../store/useInterviewStore';
import useSettingsStore from '../store/useSettingsStore';

export default function WorkspaceBoundary({ children }) {
  useLocation();
  const user = useAuthStore(s => s.user);
  const scope = workspaceScope();
  const [ready, setReady] = useState(null);
  useLayoutEffect(() => {
    useUserStore.getState().setUser(scope === 'demo' || scope === 'guest'
      ? { name: scope === 'demo' ? 'Demo User' : 'Guest', email: '', plan: 'free', demoMode: true }
      : { ...user, demoMode: false });
    useUserStore.setState({ settings: { interfaceLanguage: workspaceStorage.getItem('interfaceLanguage') || 'English', aiResponseLanguage: workspaceStorage.getItem('aiResponseLanguage') || 'English' } });
    useChatStore.getState().hydrate();
    useFilesStore.getState().hydrate();
    useInterviewStore.setState({ lastSession: null });
    useInterviewStore.getState().hydrate();
    useSettingsStore.setState({ interfaceLanguage: workspaceStorage.getItem('interfaceLanguage') || 'en', aiLanguage: workspaceStorage.getItem('aiLanguage') || 'English' });
    setReady(scope);
  }, [scope]);
  useEffect(() => {
    const profile = scope === 'demo' ? { plan: 'free' } : user;
    if (!canUseModel(useChatStore.getState().selectedModel, profile)) useChatStore.getState().setSelectedModel('hirenext-flash');
  }, [scope, user]);
  useEffect(() => {
    // A login/logout in another tab must not retain another account's in-memory data.
    const changed = e => { if (['token', 'user'].includes(e.key)) window.location.reload(); };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, []);
  return ready === scope ? children : <p role="status" className="p-8">Opening your workspace…</p>;
}
