import { workspaceStorage } from '../lib/workspaceStorage';
import { create } from 'zustand';
import api from '../lib/api';
import useUserStore from './useUserStore';

const useSettingsStore = create((set, get) => ({
  interfaceLanguage: workspaceStorage.getItem('interfaceLanguage') || 'en',
  aiLanguage: workspaceStorage.getItem('aiLanguage') || 'English',

  setInterfaceLanguage: async (lang, skipApi = false) => {
    set({ interfaceLanguage: lang });
    workspaceStorage.setItem('interfaceLanguage', lang);

    if (lang === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = lang;
    }

    if (!skipApi) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          await api.put('/api/auth/language', {
            interfaceLanguage: lang,
            aiLanguage: get().aiLanguage
          });
        }
      } catch (err) {
        console.error('Failed to save interface language to DB', err);
      }
    }
  },

  setAiLanguage: async (lang, skipApi = false) => {
    set({ aiLanguage: lang });
    workspaceStorage.setItem('aiLanguage', lang);

    if (!skipApi) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          await api.put('/api/auth/language', {
            interfaceLanguage: get().interfaceLanguage,
            aiLanguage: lang
          });
        }
      } catch (err) {
        console.error('Failed to save AI language to DB', err);
      }
    }
  },

  fetchSettings: async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await api.get('/api/auth/me');

      if (res.data.interfaceLanguage) {
        get().setInterfaceLanguage(res.data.interfaceLanguage, true);
      }
      if (res.data.aiLanguage) {
        get().setAiLanguage(res.data.aiLanguage, true);
      }
      if (res.data) {
        useUserStore.getState().setUser({ ...res.data, demoMode: false });
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  },

  resetSettings: () => {
    set({ interfaceLanguage: 'en', aiLanguage: 'English' });
    workspaceStorage.removeItem('interfaceLanguage');
    workspaceStorage.removeItem('aiLanguage');
    document.documentElement.dir = 'ltr';
    document.documentElement.lang = 'en';
  }
}));

export { useSettingsStore };
export default useSettingsStore;
