import { workspaceStorage } from '../lib/workspaceStorage';
import { create } from 'zustand';

const STORAGE_KEY = 'hirenextai_interview_sessions';

const loadSessions = () => {
  try {
    return JSON.parse(workspaceStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const useInterviewStore = create((set, get) => ({
  sessions: loadSessions(),
  lastSession: null,

  saveSession: (session) => {
    const entry = {
      ...session,
      id: session.id || `int-${Date.now()}`,
      completedAt: new Date().toISOString(),
    };
    const sessions = [entry, ...get().sessions].slice(0, 20);
    workspaceStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    set({ sessions, lastSession: entry });
    return entry;
  },

  hydrate: () => set({ sessions: loadSessions() }),
}));

export default useInterviewStore;
