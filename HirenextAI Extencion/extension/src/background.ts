const BACKEND_URL = 'http://127.0.0.1:5000';

// Helper to make API requests with stored token
async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const data = await chrome.storage.local.get(['token']);
  const token = data.token;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${BACKEND_URL}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const error = new Error(errorData.error || `HTTP Error ${res.status}`) as Error & { authRequired?: boolean };
      if (res.status === 401) {
        error.authRequired = true;
      }
      throw error;
    }

    if (endpoint.includes('/pdf')) {
      return await res.arrayBuffer();
    }

    return await res.json();
  } catch (networkErr: any) {
    const error = new Error('Cannot reach HirenextAI server — please check your connection or try again shortly.') as Error & { isNetworkError?: boolean };
    error.isNetworkError = true;
    throw error;
  }
}

// Message Router
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { action, payload } = request;

  handleMessage(action, payload)
    .then(result => sendResponse({ success: true, data: result }))
    .catch((err: Error & { authRequired?: boolean; isNetworkError?: boolean }) => {
      if (err.authRequired) {
        // Expected state: user not logged in yet. Not a real error — do not log.
        sendResponse({ success: true, data: { success: false, authRequired: true } });
        return;
      }
      if (err.isNetworkError || (err.message && err.message.includes('Cannot reach HirenextAI server'))) {
        // Expected network failure state (offline/connecting). Do not write to console.error to avoid spamming extension panel.
        sendResponse({ success: true, data: { success: false, error: err.message } });
        return;
      }
      // Genuine unexpected error — log it so it's visible.
      console.error(`Error in action ${action}:`, err);
      sendResponse({ success: false, error: err.message });
    });

  return true; // Keep communication port open asynchronously
});

async function handleMessage(action: string, payload: any): Promise<any> {
  switch (action) {
    // ----------------------------------------------------
    // V1 EXTENSION API ENDPOINTS
    // ----------------------------------------------------
    case 'checkSession': {
      const data = await apiRequest('/api/extension/session', { method: 'POST' });
      if (data && data.loggedIn) {
        await chrome.storage.local.set({ id: data.id, email: data.email, role: data.role });
      }
      return data;
    }

    case 'checkResumeStatus':
      return await apiRequest('/api/user/resume-status');

    case 'getMatchScores':
      return await apiRequest('/api/match-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    case 'mapFields':
      return await apiRequest('/api/extension/map-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    case 'logApplication': {
      const data = await apiRequest('/api/extension/log-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      showNotification('Application Logged', `Submission tracker confirmed for ${payload.company}`);
      return data;
    }

    // ----------------------------------------------------
    // AUTH & SETUP BACKEND ENDPOINTS
    // ----------------------------------------------------
    case 'login': {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await chrome.storage.local.set({ token: data.token, email: data.email, role: data.role });
      return data;
    }
    case 'signup': {
      const data = await apiRequest('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      await chrome.storage.local.set({ token: data.token, email: data.email, role: data.role });
      return data;
    }
    case 'logout':
      await chrome.storage.local.remove(['token', 'email', 'role']);
      return { success: true };

    case 'getProfile':
      return await apiRequest('/api/profile');

    case 'updateProfile':
      return await apiRequest('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    case 'buildResume':
      return await apiRequest('/api/profile/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    case 'getDocs':
      return await apiRequest(`/api/documents?search=${encodeURIComponent(payload?.search || '')}`);

    case 'deleteDoc':
      return await apiRequest(`/api/documents/${payload.id}`, { method: 'DELETE' });

    case 'downloadDocPdf': {
      const arrayBuffer = await apiRequest(`/api/documents/${payload.id}/pdf`);
      const base64 = btoa(
        new Uint8Array(arrayBuffer)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      return { base64 };
    }

    case 'uploadResume': {
      const { fileName, fileType, base64 } = payload;
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: fileType });
      
      const formData = new FormData();
      formData.append('resume', blob, fileName);

      return await apiRequest('/api/profile/upload', {
        method: 'POST',
        body: formData
      });
    }

    case 'getApplications':
      return await apiRequest(`/api/applications?search=${encodeURIComponent(payload?.search || '')}`);

    case 'getLoginUrl':
      return BACKEND_URL;

    case 'openDocuments': {
      const storage = await chrome.storage.local.get(['token', 'id']);
      const token = storage.token || '';
      const userId = storage.id || 'me';
      
      try {
        const res = await apiRequest('/api/auth/handoff-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (res && res.handoffToken) {
          const url = `${BACKEND_URL}/profile/${userId}/documents?handoff_token=${res.handoffToken}`;
          chrome.tabs.create({ url });
        } else {
          throw new Error('No handoffToken in response');
        }
      } catch (err) {
        console.error('Failed to get handoff token, falling back to direct token:', err);
        const url = `${BACKEND_URL}/profile/${userId}/documents?token=${token}`;
        chrome.tabs.create({ url });
      }
      return { success: true };
    }

    case 'updateApplication':
      return await apiRequest(`/api/applications/${payload.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    case 'deleteApplication':
      return await apiRequest(`/api/applications/${payload.id}`, { method: 'DELETE' });

    case 'getAnnouncements':
      return await apiRequest('/api/announcements');

    case 'getOwnerStats':
      return await apiRequest('/api/owner/stats');

    case 'getOwnerUsers':
      return await apiRequest('/api/owner/users');

    case 'getOwnerProviders':
      return await apiRequest('/api/owner/providers');

    case 'updateProvider':
      return await apiRequest('/api/owner/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    case 'testProvider':
      return await apiRequest('/api/owner/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    case 'pushAnnouncement':
      return await apiRequest('/api/owner/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

    default:
      throw new Error(`Unhandled message action in service worker: ${action}`);
  }
}

function showNotification(title: string, message: string) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('assets/icon128.png'),
    title,
    message,
    priority: 2
  });
}
