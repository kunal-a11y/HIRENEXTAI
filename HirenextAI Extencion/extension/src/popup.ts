// Active states
let currentScreen = 'screen-auth';
let isSignUpMode = false;
let currentProfile: any = null;
let activeProviderId: number | null = null; // For owner panel editing

// Elements
const screens: Record<string, HTMLElement | null> = {
  auth: document.getElementById('screen-auth'),
  onboarding: document.getElementById('screen-onboarding'),
  dashboard: document.getElementById('screen-dashboard'),
  docs: document.getElementById('screen-docs'),
  apps: document.getElementById('screen-apps'),
  settings: document.getElementById('screen-settings'),
  owner: document.getElementById('screen-owner')
};

const navTabs = document.getElementById('navbar-tabs') as HTMLElement;
const tabButtons = document.querySelectorAll('.tab-btn');
const globalSpinner = document.getElementById('global-spinner') as HTMLElement;

// ----------------------------------------------------
// BOOTSTRAP / ROUTING
// ----------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkSession();
});

async function checkSession() {
  showSpinner(true);
  const data = await chrome.storage.local.get(['token', 'role', 'email']);
  
  if (!data.token) {
    showScreen('screen-auth');
    showSpinner(false);
    return;
  }

  // Validate session with backend
  chrome.runtime.sendMessage({ action: 'checkSession' }, (response) => {
    showSpinner(false);
    if (response && response.success) {
      const userBadge = document.getElementById('user-badge');
      if (userBadge) userBadge.textContent = response.data.email;
      
      // Toggle Owner Tab visibility if role is owner
      const ownerTab = document.getElementById('tab-btn-owner');
      if (ownerTab) {
        if (response.data.role === 'owner') {
          ownerTab.style.display = 'flex';
        } else {
          ownerTab.style.display = 'none';
        }
      }

      // Check resume status
      chrome.runtime.sendMessage({ action: 'checkResumeStatus' }, (resumeRes) => {
        if (resumeRes && resumeRes.success && resumeRes.data.hasResume) {
          showScreen('screen-dashboard');
          if (navTabs) navTabs.style.display = 'flex';
          loadDashboardData();
          loadAnnouncements();
        } else {
          // TODO: Kunal will specify when/how this should be shown
          showScreen('screen-dashboard');
          if (navTabs) navTabs.style.display = 'flex';
          loadDashboardData();
          loadAnnouncements();
        }
      });
    } else {
      chrome.storage.local.remove(['token', 'role', 'email']);
      showScreen('screen-auth');
    }
  });
}

function showScreen(screenId: string) {
  currentScreen = screenId;
  Object.keys(screens).forEach(key => {
    const screenEl = screens[key];
    if (screenEl) {
      if (screenEl.id === screenId) {
        screenEl.classList.add('active');
      } else {
        screenEl.classList.remove('active');
      }
    }
  });

  // Keep navigation active states in sync
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-target') === screenId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function showSpinner(show: boolean) {
  if (globalSpinner) {
    globalSpinner.style.display = show ? 'inline' : 'none';
  }
}

// ----------------------------------------------------
// EVENT LISTENERS
// ----------------------------------------------------

function setupEventListeners() {
  // Navigation Tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      if (target) {
        showScreen(target);
        if (target === 'screen-dashboard') loadDashboardData();
        if (target === 'screen-docs') loadDocsList();
        if (target === 'screen-apps') loadAppsList();
        if (target === 'screen-owner') loadOwnerPanel();
      }
    });
  });

  // Auth Form toggle
  const authToggleLink = document.getElementById('auth-toggle-link');
  if (authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUpMode = !isSignUpMode;
      const title = document.getElementById('auth-title');
      const subtitle = document.getElementById('auth-subtitle');
      const submitBtn = document.getElementById('auth-submit-btn');
      const toggleLink = document.getElementById('auth-toggle-link');

      if (title && subtitle && submitBtn && toggleLink) {
        if (isSignUpMode) {
          title.textContent = 'Create Account';
          subtitle.textContent = 'Get started with HirenextAI browser suite.';
          submitBtn.textContent = 'Sign Up';
          toggleLink.textContent = 'Already have an account? Sign In';
        } else {
          title.textContent = 'Welcome back';
          subtitle.textContent = 'Sign in to unlock your browser career assistant.';
          submitBtn.textContent = 'Sign In';
          toggleLink.textContent = "Don't have an account? Sign Up";
        }
      }
    });
  }

  // Auth Submit
  const authSubmitBtn = document.getElementById('auth-submit-btn');
  if (authSubmitBtn) {
    authSubmitBtn.addEventListener('click', handleAuthSubmit);
  }

  // Onboarding upload/build selectors
  const btnOnboardUpload = document.getElementById('btn-onboard-upload');
  if (btnOnboardUpload) {
    btnOnboardUpload.addEventListener('click', () => {
      const select = document.getElementById('onboard-select');
      const upload = document.getElementById('onboard-upload-flow');
      if (select) select.style.display = 'none';
      if (upload) upload.style.display = 'block';
    });
  }

  const btnOnboardBuild = document.getElementById('btn-onboard-build');
  if (btnOnboardBuild) {
    btnOnboardBuild.addEventListener('click', () => {
      const select = document.getElementById('onboard-select');
      const build = document.getElementById('onboard-build-flow');
      if (select) select.style.display = 'none';
      if (build) build.style.display = 'block';
      setupWizard();
    });
  }

  const resumeUploadBack = document.getElementById('resume-upload-back');
  if (resumeUploadBack) {
    resumeUploadBack.addEventListener('click', () => {
      const select = document.getElementById('onboard-select');
      const upload = document.getElementById('onboard-upload-flow');
      if (upload) upload.style.display = 'none';
      if (select) select.style.display = 'block';
    });
  }

  // Resume Upload execution
  const resumeUploadBtn = document.getElementById('resume-upload-btn');
  if (resumeUploadBtn) {
    resumeUploadBtn.addEventListener('click', handleResumeUpload);
  }

  // Settings
  const settingsLogoutBtn = document.getElementById('settings-logout-btn');
  if (settingsLogoutBtn) settingsLogoutBtn.addEventListener('click', handleLogout);

  const settingsDeleteBtn = document.getElementById('settings-delete-btn');
  if (settingsDeleteBtn) settingsDeleteBtn.addEventListener('click', handleDeleteAccount);

  const settingsExportBtn = document.getElementById('settings-export-btn');
  if (settingsExportBtn) settingsExportBtn.addEventListener('click', handleExportProfile);

  const settingsEditProfileBtn = document.getElementById('settings-edit-profile-btn');
  if (settingsEditProfileBtn) settingsEditProfileBtn.addEventListener('click', showEditProfileModal);

  // Profile Edit Modal
  const overlayProfileClose = document.getElementById('overlay-profile-close');
  if (overlayProfileClose) {
    overlayProfileClose.addEventListener('click', () => {
      const modal = document.getElementById('overlay-profile-edit');
      if (modal) modal.style.display = 'none';
    });
  }

  const overlayProfileSave = document.getElementById('overlay-profile-save');
  if (overlayProfileSave) {
    overlayProfileSave.addEventListener('click', saveEditedProfile);
  }

  // Documents Library
  const docsSearchInput = document.getElementById('docs-search-input');
  if (docsSearchInput) docsSearchInput.addEventListener('input', loadDocsList);

  const overlayDocClose = document.getElementById('overlay-doc-close');
  if (overlayDocClose) {
    overlayDocClose.addEventListener('click', () => {
      const modal = document.getElementById('overlay-doc');
      if (modal) modal.style.display = 'none';
    });
  }

  const overlayDocSave = document.getElementById('overlay-doc-save');
  if (overlayDocSave) overlayDocSave.addEventListener('click', saveDocChanges);

  const overlayDocDownload = document.getElementById('overlay-doc-download');
  if (overlayDocDownload) overlayDocDownload.addEventListener('click', triggerPdfDownload);

  // Applications Log
  const appsSearchInput = document.getElementById('apps-search-input');
  if (appsSearchInput) appsSearchInput.addEventListener('input', loadAppsList);

  // Owner Panel
  const ownerAnnouncementBtn = document.getElementById('owner-announcement-btn');
  if (ownerAnnouncementBtn) ownerAnnouncementBtn.addEventListener('click', pushAnnouncement);

  const overlayProviderClose = document.getElementById('overlay-provider-close');
  if (overlayProviderClose) {
    overlayProviderClose.addEventListener('click', () => {
      const modal = document.getElementById('overlay-provider-edit');
      if (modal) modal.style.display = 'none';
    });
  }

  const overlayProviderSave = document.getElementById('overlay-provider-save');
  if (overlayProviderSave) overlayProviderSave.addEventListener('click', saveProviderConfig);

  const overlayProviderTest = document.getElementById('overlay-provider-test');
  if (overlayProviderTest) overlayProviderTest.addEventListener('click', testProviderKey);
}

// ----------------------------------------------------
// AUTHENTICATION LOGIC
// ----------------------------------------------------

async function handleAuthSubmit() {
  const email = (document.getElementById('auth-email') as HTMLInputElement).value;
  const password = (document.getElementById('auth-password') as HTMLInputElement).value;

  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  showSpinner(true);
  const action = isSignUpMode ? 'signup' : 'login';

  chrome.runtime.sendMessage({ action, payload: { email, password } }, (response) => {
    showSpinner(false);
    if (response && response.success) {
      checkSession();
    } else {
      alert(response.error || 'Authentication failed. Please verify credentials.');
    }
  });
}

async function handleLogout() {
  showSpinner(true);
  chrome.runtime.sendMessage({ action: 'logout' }, () => {
    showSpinner(false);
    if (navTabs) navTabs.style.display = 'none';
    showScreen('screen-auth');
    const userBadge = document.getElementById('user-badge');
    if (userBadge) userBadge.textContent = '';
  });
}

async function handleDeleteAccount() {
  if (!confirm('Are you absolutely sure you want to delete your account? All details will be lost.')) {
    return;
  }

  showSpinner(true);
  chrome.runtime.sendMessage({ action: 'deleteAccount' }, (res) => {
    showSpinner(false);
    if (res && res.success) {
      if (navTabs) navTabs.style.display = 'none';
      showScreen('screen-auth');
      const userBadge = document.getElementById('user-badge');
      if (userBadge) userBadge.textContent = '';
    } else {
      alert(res.error || 'Failed to delete account.');
    }
  });
}

// ----------------------------------------------------
// ONBOARDING / RESUME BUILDER WIZARD
// ----------------------------------------------------

let currentStep = 1;
const totalSteps = 4;

function setupWizard() {
  currentStep = 1;
  updateWizardUI();

  const nextBtn = document.getElementById('wizard-next-btn') as HTMLButtonElement;
  const prevBtn = document.getElementById('wizard-prev-btn') as HTMLButtonElement;

  nextBtn.onclick = async () => {
    if (currentStep < totalSteps) {
      if (validateStep(currentStep)) {
        currentStep++;
        updateWizardUI();
      }
    } else {
      if (validateStep(currentStep)) {
        await submitAIResumeBuilder();
      }
    }
  };

  prevBtn.onclick = () => {
    if (currentStep > 1) {
      currentStep--;
      updateWizardUI();
    } else {
      const build = document.getElementById('onboard-build-flow');
      const select = document.getElementById('onboard-select');
      if (build) build.style.display = 'none';
      if (select) select.style.display = 'block';
    }
  };
}

function updateWizardUI() {
  const steps = document.querySelectorAll('.wizard-step');
  steps.forEach(step => {
    const stepNum = parseInt(step.getAttribute('data-step') || '0');
    if (stepNum === currentStep) {
      step.classList.add('active');
    } else {
      step.classList.remove('active');
    }
  });

  const progressFill = document.getElementById('wizard-progress');
  if (progressFill) {
    const percent = ((currentStep - 1) / (totalSteps - 1)) * 100;
    progressFill.style.width = `${percent}%`;
  }

  const nextBtn = document.getElementById('wizard-next-btn') as HTMLButtonElement;
  if (nextBtn) {
    nextBtn.textContent = currentStep === totalSteps ? 'Build Resume ✨' : 'Continue';
  }
}

function validateStep(step: number): boolean {
  if (step === 1) {
    const name = (document.getElementById('w-name') as HTMLInputElement).value;
    if (!name.trim()) { alert('Name is required'); return false; }
  } else if (step === 2) {
    const degree = (document.getElementById('w-degree') as HTMLInputElement).value;
    const school = (document.getElementById('w-school') as HTMLInputElement).value;
    if (!degree.trim() || !school.trim()) { alert('Degree and School are required'); return false; }
  }
  return true;
}

async function submitAIResumeBuilder() {
  const answers = {
    name: (document.getElementById('w-name') as HTMLInputElement).value,
    phone: (document.getElementById('w-phone') as HTMLInputElement).value,
    career_goal: (document.getElementById('w-goal') as HTMLInputElement).value,
    education: {
      degree: (document.getElementById('w-degree') as HTMLInputElement).value,
      school: (document.getElementById('w-school') as HTMLInputElement).value,
      graduation_year: (document.getElementById('w-grad') as HTMLInputElement).value
    },
    experience: {
      company: (document.getElementById('w-company') as HTMLInputElement).value,
      role: (document.getElementById('w-role') as HTMLInputElement).value,
      dates: (document.getElementById('w-dates') as HTMLInputElement).value,
      description: (document.getElementById('w-desc') as HTMLTextAreaElement).value
    },
    skills: (document.getElementById('w-skills') as HTMLInputElement).value,
    project: {
      name: (document.getElementById('w-pname') as HTMLInputElement).value,
      description: (document.getElementById('w-pdesc') as HTMLTextAreaElement).value
    }
  };

  showSpinner(true);
  chrome.runtime.sendMessage({ action: 'buildResume', payload: { answers } }, (response) => {
    showSpinner(false);
    if (response && response.success) {
      checkSession();
    } else {
      alert(response.error || 'Resume generation failed. Please configure AI API keys in owner panel if you haven\'t.');
    }
  });
}

async function handleResumeUpload() {
  const fileInput = document.getElementById('resume-file-input') as HTMLInputElement;
  if (!fileInput.files || fileInput.files.length === 0) {
    alert('Please select a PDF file first.');
    return;
  }

  const file = fileInput.files[0];
  showSpinner(true);

  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = (reader.result as string).split(',')[1];
    chrome.runtime.sendMessage({
      action: 'uploadResume',
      payload: {
        filename: file.name,
        base64
      }
    }, (response) => {
      showSpinner(false);
      if (response && response.success) {
        checkSession();
      } else {
        alert(response.error || 'Failed to parse resume. Check server connection or AI keys.');
      }
    });
  };
  reader.readAsDataURL(file);
}

// ----------------------------------------------------
// DASHBOARD & TICKERS
// ----------------------------------------------------

async function loadDashboardData() {
  chrome.runtime.sendMessage({ action: 'getProfile' }, (res) => {
    if (res && res.success) {
      currentProfile = res.data;
      const dashName = document.getElementById('dash-name');
      const dashSkills = document.getElementById('dash-skills-count');
      if (dashName) dashName.textContent = currentProfile.name || '-';
      if (dashSkills) dashSkills.textContent = currentProfile.skills?.length || '0';
    }
  });
}

async function loadAnnouncements() {
  chrome.runtime.sendMessage({ action: 'getAnnouncements' }, (res) => {
    if (res && res.success && res.data.length > 0) {
      const banner = document.getElementById('announcement-banner');
      const text = document.getElementById('announcement-text');
      if (banner && text) {
        text.textContent = res.data[0].message;
        banner.style.display = 'flex';
      }
    } else {
      const banner = document.getElementById('announcement-banner');
      if (banner) banner.style.display = 'none';
    }
  });
}

// ----------------------------------------------------
// PROFILE EDIT OVERLAY
// ----------------------------------------------------

function showEditProfileModal() {
  if (!currentProfile) return;
  (document.getElementById('edit-profile-name') as HTMLInputElement).value = currentProfile.name || '';
  (document.getElementById('edit-profile-phone') as HTMLInputElement).value = currentProfile.phone || '';
  (document.getElementById('edit-profile-goal') as HTMLTextAreaElement).value = currentProfile.career_goal || '';
  (document.getElementById('edit-profile-skills') as HTMLInputElement).value = currentProfile.skills ? currentProfile.skills.join(', ') : '';

  const modal = document.getElementById('overlay-profile-edit');
  if (modal) modal.style.display = 'flex';
}

async function saveEditedProfile() {
  const updatedData = {
    ...currentProfile,
    name: (document.getElementById('edit-profile-name') as HTMLInputElement).value,
    phone: (document.getElementById('edit-profile-phone') as HTMLInputElement).value,
    career_goal: (document.getElementById('edit-profile-goal') as HTMLTextAreaElement).value,
    skills: (document.getElementById('edit-profile-skills') as HTMLInputElement).value.split(',').map(s => s.trim()).filter(s => s.length > 0)
  };

  showSpinner(true);
  chrome.runtime.sendMessage({ action: 'updateProfile', payload: updatedData }, (res) => {
    showSpinner(false);
    if (res && res.success) {
      const modal = document.getElementById('overlay-profile-edit');
      if (modal) modal.style.display = 'none';
      loadDashboardData();
    } else {
      alert(res.error || 'Failed to update profile details.');
    }
  });
}

function handleExportProfile() {
  if (!currentProfile) return;
  const jsonStr = JSON.stringify(currentProfile, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hirenext_profile_${currentProfile.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ----------------------------------------------------
// DOCUMENT LIBRARY LOGIC
// ----------------------------------------------------

let activeDoc: any = null;

async function loadDocsList() {
  const search = (document.getElementById('docs-search-input') as HTMLInputElement).value;
  chrome.runtime.sendMessage({ action: 'getDocs', payload: { search } }, (res) => {
    const list = document.getElementById('docs-list');
    if (!list) return;
    list.innerHTML = '';
    
    if (res && res.success && res.data.length > 0) {
      res.data.forEach((doc: any) => {
        const item = document.createElement('div');
        item.className = 'list-item animate-fade';
        item.innerHTML = `
          <div class="list-details">
            <span class="list-title">${escapeHTML(doc.title)}</span>
            <span class="list-subtitle">${escapeHTML(doc.type.replace('_', ' ').toUpperCase())} • ${new Date(doc.created_at).toLocaleDateString()}</span>
          </div>
          <div class="list-actions">
            <button class="btn btn-sm btn-delete" data-id="${doc.id}">❌</button>
          </div>
        `;

        item.addEventListener('click', (e) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('btn-delete')) return;
          openDocumentViewer(doc);
        });

        item.querySelector('.btn-delete')!.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteDocument(doc.id);
        });

        list.appendChild(item);
      });
    } else {
      list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No documents found.</div>';
    }
  });
}

function openDocumentViewer(doc: any) {
  activeDoc = doc;
  const overlayTitle = document.getElementById('overlay-doc-title');
  const overlayEditor = document.getElementById('overlay-doc-editor') as HTMLTextAreaElement;
  if (overlayTitle) overlayTitle.textContent = doc.title;
  if (overlayEditor) overlayEditor.value = doc.content;

  const modal = document.getElementById('overlay-doc');
  if (modal) modal.style.display = 'flex';
}

async function saveDocChanges() {
  if (!activeDoc) return;
  const content = (document.getElementById('overlay-doc-editor') as HTMLTextAreaElement).value;
  
  showSpinner(true);
  chrome.runtime.sendMessage({
    action: 'saveDoc',
    payload: {
      id: activeDoc.id,
      title: activeDoc.title,
      type: activeDoc.type,
      content
    }
  }, (res) => {
    showSpinner(false);
    if (res && res.success) {
      const modal = document.getElementById('overlay-doc');
      if (modal) modal.style.display = 'none';
      loadDocsList();
    } else {
      alert(res.error || 'Failed to save changes.');
    }
  });
}

function deleteDocument(id: number) {
  if (!confirm('Are you sure you want to delete this document?')) return;
  showSpinner(true);
  chrome.runtime.sendMessage({ action: 'deleteDoc', payload: { id } }, () => {
    showSpinner(false);
    loadDocsList();
  });
}

async function triggerPdfDownload() {
  if (!activeDoc) return;
  showSpinner(true);
  chrome.runtime.sendMessage({ action: 'downloadDocPdf', payload: { id: activeDoc.id } }, (res) => {
    showSpinner(false);
    if (res && res.success && res.data.base64) {
      const byteCharacters = atob(res.data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeDoc.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      alert(res.error || 'PDF compilation failed.');
    }
  });
}

// ----------------------------------------------------
// APPLICATIONS LOG TRACKER
// ----------------------------------------------------

async function loadAppsList() {
  const search = (document.getElementById('apps-search-input') as HTMLInputElement).value;
  chrome.runtime.sendMessage({ action: 'getApplications', payload: { search } }, (res) => {
    const list = document.getElementById('apps-list');
    if (!list) return;
    list.innerHTML = '';

    if (res && res.success && res.data.length > 0) {
      res.data.forEach((app: any) => {
        const item = document.createElement('div');
        item.className = 'list-item animate-fade';
        
        let badgeClass = 'badge-success';
        if (app.status === 'Offered') badgeClass = 'badge-success';
        else if (app.status === 'Rejected') badgeClass = 'badge-danger';
        else if (app.status === 'Interviewing') badgeClass = 'badge-warning';

        item.innerHTML = `
          <div class="list-details">
            <span class="list-title">${escapeHTML(app.role)}</span>
            <span class="list-subtitle">${escapeHTML(app.company)} • ${new Date(app.date_applied).toLocaleDateString()}</span>
            <span class="list-subtitle" style="margin-top:4px; font-style:italic;">Notes: ${escapeHTML(app.application_notes || 'None')}</span>
          </div>
          <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
            <select class="btn btn-sm select-app-status" data-id="${app.id}" style="padding: 2px 6px; font-size:11px;">
              <option value="Applied" ${app.status === 'Applied' ? 'selected' : ''}>Applied</option>
              <option value="Interviewing" ${app.status === 'Interviewing' ? 'selected' : ''}>Interviewing</option>
              <option value="Offered" ${app.status === 'Offered' ? 'selected' : ''}>Offered</option>
              <option value="Rejected" ${app.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            </select>
            <span class="badge ${badgeClass}">${escapeHTML(app.status)}</span>
          </div>
        `;

        item.querySelector('.select-app-status')!.addEventListener('change', (e) => {
          const target = e.target as HTMLSelectElement;
          updateApplicationStatus(app.id, target.value, app.application_notes);
        });

        list.appendChild(item);
      });
    } else {
      list.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">No applications logged.</div>';
    }
  });
}

async function updateApplicationStatus(id: number, status: string, notes: string) {
  showSpinner(true);
  chrome.runtime.sendMessage({
    action: 'updateApplication',
    payload: { id, status, notes }
  }, () => {
    showSpinner(false);
    loadAppsList();
  });
}

// ----------------------------------------------------
// OWNER COMMAND PANEL
// ----------------------------------------------------

async function loadOwnerPanel() {
  showSpinner(true);
  chrome.runtime.sendMessage({ action: 'getOwnerStats' }, (res) => {
    showSpinner(false);
    if (res && res.success) {
      const totalUsers = document.getElementById('owner-total-users');
      const totalReqs = document.getElementById('owner-total-requests');
      if (totalUsers) totalUsers.textContent = res.data.totalUsers;
      if (totalReqs) totalReqs.textContent = res.data.totalRequests;
      
      const providersList = document.getElementById('owner-providers-list');
      if (!providersList) return;
      providersList.innerHTML = '';

      res.data.providers.forEach((prov: any) => {
        const item = document.createElement('div');
        item.className = 'provider-editor-card';

        const healthBadge = prov.health === 'healthy' 
          ? `<span class="badge badge-success">Healthy</span>` 
          : `<span class="badge badge-danger">Unhealthy</span>`;

        const keyBadge = prov.status === 'active' 
          ? `<span class="badge badge-success" style="opacity:0.8;">Active</span>` 
          : `<span class="badge badge-danger" style="opacity:0.8;">Inactive</span>`;

        item.innerHTML = `
          <div class="provider-header">
            <span class="provider-name">${prov.name}</span>
            <div>
              ${keyBadge}
              ${healthBadge}
            </div>
          </div>
          <div class="provider-stats-line">
            Priority: <strong>${prov.priority}</strong> | Latency: <strong>${prov.latency}ms</strong> | Total Requests: <strong>${prov.requests}</strong>
          </div>
          <button class="btn btn-sm btn-edit-provider" data-id="${prov.id}" style="margin-top:6px; font-size:11px; padding:2px 6px;">Configure Key</button>
        `;

        item.querySelector('.btn-edit-provider')!.addEventListener('click', () => {
          openProviderEditOverlay(prov);
        });

        providersList.appendChild(item);
      });
    }
  });
}

function openProviderEditOverlay(provider: any) {
  activeProviderId = provider.id;
  const overlayTitle = document.getElementById('provider-edit-title');
  if (overlayTitle) overlayTitle.textContent = `Configure ${provider.name.toUpperCase()}`;
  
  (document.getElementById('provider-edit-key') as HTMLInputElement).value = '';
  (document.getElementById('provider-edit-priority') as HTMLInputElement).value = provider.priority;
  (document.getElementById('provider-edit-status') as HTMLSelectElement).value = provider.status;

  const modal = document.getElementById('overlay-provider-edit');
  if (modal) modal.style.display = 'flex';
}

async function saveProviderConfig() {
  if (!activeProviderId) return;
  const rawKey = (document.getElementById('provider-edit-key') as HTMLInputElement).value;
  const priority = parseInt((document.getElementById('provider-edit-priority') as HTMLInputElement).value);
  const status = (document.getElementById('provider-edit-status') as HTMLSelectElement).value;

  const payload: any = {
    id: activeProviderId,
    priority,
    status
  };

  if (rawKey.trim().length > 0) {
    payload.api_key = rawKey.trim();
  }

  showSpinner(true);
  chrome.runtime.sendMessage({ action: 'updateProvider', payload }, (res) => {
    showSpinner(false);
    if (res && res.success) {
      const modal = document.getElementById('overlay-provider-edit');
      if (modal) modal.style.display = 'none';
      loadOwnerPanel();
    } else {
      alert(res.error || 'Failed to save configuration.');
    }
  });
}

async function testProviderKey() {
  if (!activeProviderId) return;
  showSpinner(true);
  chrome.runtime.sendMessage({ action: 'testProvider', payload: { id: activeProviderId } }, (res) => {
    showSpinner(false);
    if (res && res.success) {
      alert(`Test successful! Key is valid and healthy. Latency: ${res.data.latency}ms`);
      loadOwnerPanel();
    } else {
      alert(`Test failed: ${res.error}`);
    }
  });
}

async function pushAnnouncement() {
  const message = (document.getElementById('owner-announcement-input') as HTMLInputElement).value;
  if (!message.trim()) return;

  showSpinner(true);
  chrome.runtime.sendMessage({ action: 'pushAnnouncement', payload: { message } }, (res) => {
    showSpinner(false);
    if (res && res.success) {
      alert('Announcement published successfully.');
      (document.getElementById('owner-announcement-input') as HTMLInputElement).value = '';
    } else {
      alert(res.error || 'Failed to publish announcement.');
    }
  });
}

// ----------------------------------------------------
// UTILITIES
// ----------------------------------------------------

function escapeHTML(str: string): string {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
