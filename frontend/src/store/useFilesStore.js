import { workspaceStorage } from '../lib/workspaceStorage';
import { create } from 'zustand';

export const FILE_FOLDERS = [
  { id: 'cover-letters', label: 'Cover Letters', icon: '📁' },
  { id: 'resumes', label: 'Resumes', icon: '📁' },
  { id: 'job-descriptions', label: 'Job Descriptions', icon: '📁' },
  { id: 'interview-notes', label: 'Interview Notes', icon: '📁' },
  { id: 'mind-maps', label: 'Mind Maps', icon: '📁' },
  { id: 'recruiter-messages', label: 'Recruiter Messages', icon: '✉️' },
  { id: 'job-reports', label: 'Job Reports', icon: '📊' },
  { id: 'images', label: 'Images', icon: '🖼️' },
];

const STORAGE_KEY = 'hirenextai_files';

const loadFiles = () => {
  try {
    return JSON.parse(workspaceStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const persist = (files) => {
  workspaceStorage.setItem(STORAGE_KEY, JSON.stringify(files));
};

const useFilesStore = create((set, get) => ({
  files: loadFiles(),

  addFile: (file) => {
    const entry = {
      id: file.id || `file-${Date.now()}`,
      title: file.title,
      folderId: file.folderId,
      createdAt: file.createdAt || new Date().toISOString(),
      jobTitle: file.jobTitle || '',
      jobCompany: file.jobCompany || '',
      content: file.content || '',
      mimeType: file.mimeType || 'text/plain',
    };
    const files = [entry, ...get().files];
    persist(files);
    set({ files });
    return entry;
  },

  deleteFile: (id) => {
    const files = get().files.filter((f) => f.id !== id);
    persist(files);
    set({ files });
  },

  renameFile: (id, newTitle) => {
    const files = get().files.map((f) => f.id === id ? { ...f, title: newTitle } : f);
    persist(files);
    set({ files });
  },

  getByFolder: (folderId) => get().files.filter((f) => f.folderId === folderId),

  getFile: (id) => get().files.find((f) => f.id === id),

  hydrate: () => set({ files: loadFiles() }),
}));

export default useFilesStore;
