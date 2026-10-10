import { workspaceStorage } from './workspaceStorage';
const STORAGE_KEY = 'applications';

export const APPLICATION_STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];

export function loadApplications() {
  try {
    return JSON.parse(workspaceStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveApplications(apps) {
  workspaceStorage.setItem(STORAGE_KEY, JSON.stringify(apps));
}

export function getAIApplications() {
  return loadApplications().filter(
    (a) => a.applied_via === 'ai_agent' || a.applied_via === 'ai'
  );
}

export function saveAIApplication({
  job_title,
  company,
  location = '',
  salary = '',
  match = null,
  status = 'Applied',
  job_url = '',
  form_data = {},
  screenshot = null,
}) {
  const apps = loadApplications();
  const app = {
    id: Date.now(),
    job_title,
    company,
    location,
    salary,
    match,
    status,
    job_url,
    form_data,
    screenshot,
    applied_via: 'ai_agent',
    applied_at: new Date().toISOString(),
  };
  saveApplications([app, ...apps]);
  return app;
}

export function updateApplication(id, patch) {
  const apps = loadApplications().map((a) => (a.id === id ? { ...a, ...patch } : a));
  saveApplications(apps);
  return apps;
}
