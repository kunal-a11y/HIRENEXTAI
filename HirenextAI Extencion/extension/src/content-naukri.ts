(function() {
  if ((window as any).hasHirenextAINaukriInjected) return;
  (window as any).hasHirenextAINaukriInjected = true;

  let sidebar: any = null;
  let floatingBtn: HTMLDivElement | null = null;

  const activeTimeouts: number[] = [];
  const activeIntervals: number[] = [];

  // Exact Match Check: Only runs if URL matches naukri.com
  if (!window.location.hostname.includes('naukri.com')) {
    return;
  }

  // Guard Helper to check if extension context is alive
  function isExtensionContextValid(): boolean {
    try {
      if (!chrome.runtime || !chrome.runtime.id || !chrome.runtime.getManifest()) {
        cleanupWidgetsAndTimers();
        return false;
      }
      return true;
    } catch (err) {
      cleanupWidgetsAndTimers();
      return false;
    }
  }

  // Safe Timeout Wrapper
  function safeSetTimeout(fn: Function, delay: number): number | null {
    if (!isExtensionContextValid()) return null;
    const id = window.setTimeout(() => {
      if (!isExtensionContextValid()) return;
      try {
        fn();
      } catch (err) {
        cleanupWidgetsAndTimers();
      }
    }, delay);
    activeTimeouts.push(id);
    return id;
  }

  // Safe SendMessage Wrapper
  function safeSendMessage(message: any, callback: (response: any) => void) {
    if (!isExtensionContextValid()) return;
    try {
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) {
          cleanupWidgetsAndTimers();
          return;
        }
        callback(res);
      });
    } catch (err) {
      cleanupWidgetsAndTimers();
    }
  }

  // Monitor tab focus and visibility to detect context invalidation immediately
  const focusHandler = () => { isExtensionContextValid(); };
  const visibilityHandler = () => { isExtensionContextValid(); };

  // Cleanup Widgets and Timers upon unloading / reloading
  let isCleanedUp = false;
  function cleanupWidgetsAndTimers() {
    if (isCleanedUp) return;
    isCleanedUp = true;

    window.removeEventListener('focus', focusHandler);
    document.removeEventListener('visibilitychange', visibilityHandler);
    window.removeEventListener('pagehide', cleanupWidgetsAndTimers);

    activeTimeouts.forEach(clearTimeout);
    activeIntervals.forEach(clearInterval);
    activeTimeouts.length = 0;
    activeIntervals.length = 0;

    destroyWidget();
    floatingBtn = null;
    console.log('[HirenextAI] extension context invalid, stopping polling');
  }

  // Add cleanup pagehide listener
  window.addEventListener('pagehide', cleanupWidgetsAndTimers);

  window.addEventListener('focus', focusHandler);
  document.addEventListener('visibilitychange', visibilityHandler);

  // Check if user is logged into Naukri via navigation profile indicators
  function checkNaukriLoggedIn(): boolean {
    const loggedInSelectors = [
      '.nLogin_active',
      '.myNaukri',
      'a[href*="/nlogin/logout"]',
      'a[href*="/mnjapply/showProfile"]',
      '.njs-profile-container',
      '.profile-container',
      'a[href*="/registration/profile"]',
      'a[href*="/profile"]'
    ];
    for (const selector of loggedInSelectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    return false;
  }

  // Manage insertion/removal of widget shell based on login state
  function manageWidgetState() {
    if (!isExtensionContextValid()) return;

    const loggedIn = checkNaukriLoggedIn();
    const host = document.getElementById('hirenextai-host-naukri');

    if (loggedIn) {
      if (!host) {
        initWidget();
      } else if (sidebar) {
        const isJobPage = window.location.pathname.includes('/job-listings') || window.location.pathname.includes('/mnjapply');
        sidebar.updateAutofillCard(isJobPage);
      }
    } else {
      if (host) {
        destroyWidget();
      }
    }
  }

  function destroyWidget() {
    const host = document.getElementById('hirenextai-host-naukri');
    if (host) {
      host.remove();
    }
    sidebar = null;
  }

  console.log('HirenextAI Naukri.com Content Script Active.');

  // Set up listeners for SPA navigation changes
  window.addEventListener('popstate', () => {
    manageWidgetState();
  });

  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    manageWidgetState();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    manageWidgetState();
  };

  // Poll for URL transitions & dynamic login appearances in SPA layout
  let lastUrl = window.location.href;
  const stateCheckInterval = window.setInterval(() => {
    if (!isExtensionContextValid()) return;
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      manageWidgetState();
    } else {
      // Recheck if profile elements appeared after AJAX loads
      const host = document.getElementById('hirenextai-host-naukri');
      const loggedIn = checkNaukriLoggedIn();
      if (loggedIn && !host) {
        manageWidgetState();
      } else if (!loggedIn && host) {
        manageWidgetState();
      }
    }
  }, 1500);
  activeIntervals.push(stateCheckInterval);

  // Initial trigger delay
  safeSetTimeout(manageWidgetState, 2000);

  function initWidget() {
    if (document.getElementById('hirenextai-host-naukri')) return;

    const host = document.createElement('div');
    host.id = 'hirenextai-host-naukri';
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'closed' });
    
    // Instantiate sidebar class and append its DOM element
    const sidebarObj = new (window as any).HirenextAISidebar();
    sidebar = sidebarObj.element;
    shadow.appendChild(sidebar);

    sidebar.addEventListener('open-sidebar-state', () => {
      if (isExtensionContextValid()) checkSessionStatus();
    });

    sidebar.addEventListener('fill-requested', () => {
      if (isExtensionContextValid()) executeFormFill();
    });
    sidebar.addEventListener('confirm-logged', () => {
      if (isExtensionContextValid()) logApplicationInBackend();
    });
    sidebar.addEventListener('revert-requested', () => {
      sidebar.showState('ready-to-fill');
    });
    sidebar.addEventListener('refresh-session', () => {
      if (isExtensionContextValid()) checkSessionStatus();
    });
    sidebar.addEventListener('logout-requested', () => {
      if (isExtensionContextValid()) {
        sidebar.showState('loading');
        sidebar.setLoadingTitle('Signing out...');
        safeSendMessage({ action: 'logout' }, () => {
          checkSessionStatus();
        });
      }
    });

    sidebar.addEventListener('resume-builder-completed', (e: any) => {
      const answers = e.detail.answers;
      sidebar.showState('loading');
      sidebar.setLoadingTitle('Creating Resume profile...');

      safeSendMessage({ action: 'buildResume', payload: { answers } }, (res) => {
        if (res && res.success) {
          checkSessionStatus();
        } else {
          alert('Failed to generate resume profile: ' + (res.error || 'Unknown Error'));
          sidebar.showState('resume-required');
        }
      });
    });

    // Setup submission tracking confirmation screen detection
    setupSubmissionTracker();

    // Determine initial card state based on job vs search/home URL path
    const isJobPage = window.location.pathname.includes('/job-listings') || window.location.pathname.includes('/mnjapply');
    sidebar.updateAutofillCard(isJobPage);
  }

  function checkSessionStatus() {
    sidebar.showState('loading');
    sidebar.setLoadingTitle('Checking account session...');

    safeSendMessage({ action: 'checkSession' }, (res) => {
      if (res && res.success) {
        if (res.data && res.data.loggedIn) {
          safeSendMessage({ action: 'checkResumeStatus' }, (resumeRes) => {
            if (resumeRes && resumeRes.success) {
              if (resumeRes.data.hasResume) {
                sidebar.showState('ready-to-fill');
              } else {
                // TODO: Kunal will specify when/how this should be shown
                sidebar.showState('ready-to-fill');
              }
            } else {
              const errMsg = (resumeRes && resumeRes.data && resumeRes.data.error) || (resumeRes && resumeRes.error) || 'Failed to check resume status.';
              sidebar.showNetworkError(errMsg);
            }
          });
        } else if (res.data && res.data.error) {
          sidebar.showNetworkError(res.data.error);
        } else {
          sidebar.showState('auth-required');
        }
      } else {
        const errMsg = (res && res.error) || 'Cannot reach HirenextAI server — please check your connection or try again shortly.';
        sidebar.showNetworkError(errMsg);
      }
    });
  }

  // ----------------------------------------------------
  // EXTRACT & AUTOFILL FORM
  // ----------------------------------------------------
  function findLabelForInput(el: HTMLElement): string {
    const id = el.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label && (label as HTMLElement).innerText.trim()) return (label as HTMLElement).innerText.trim();
    }

    const parentLabel = el.closest('label');
    if (parentLabel && parentLabel.innerText.trim()) return parentLabel.innerText.trim();

    if (el.getAttribute('placeholder')) return el.getAttribute('placeholder') || '';
    if (el.getAttribute('aria-label')) return el.getAttribute('aria-label') || '';
    
    const parentContainer = el.parentElement;
    if (parentContainer) {
      const labelTextElement = parentContainer.querySelector('.label, [class*="label"], [class*="title"]');
      if (labelTextElement && (labelTextElement as HTMLElement).innerText.trim()) {
        return (labelTextElement as HTMLElement).innerText.trim();
      }
    }

    return el.getAttribute('name') || '';
  }

  function executeFormFill() {
    sidebar!.showState('loading');
    sidebar!.setLoadingTitle('Scraping Naukri form fields...');

    const formInputs: any[] = [];
    const elements = document.querySelectorAll('input, textarea, select');
    
    elements.forEach((el: any) => {
      if (el.type === 'hidden' || el.type === 'submit' || el.type === 'button' || el.type === 'file') return;
      if (el.value && el.value.trim().length > 0) return;

      const label = findLabelForInput(el);
      formInputs.push({
        id: el.id || '',
        name: el.name || '',
        type: el.type,
        labelText: label,
        selectorPath: getSelectorPath(el)
      });
    });

    if (formInputs.length === 0) {
      alert('No empty fillable fields detected on this application form.');
      sidebar!.showState('ready-to-fill');
      return;
    }

    sidebar!.setLoadingTitle('AI resolving answers...');
    safeSendMessage({
      action: 'mapFields',
      payload: { fieldsSchema: formInputs }
    }, (res) => {
      if (res && res.success && res.data) {
        const mapping = res.data.mapping;
        const lowConfidence = res.data.lowConfidenceFields || [];
        
        const reviewList: any[] = [];

        formInputs.forEach(field => {
          const resolvedValue = mapping[field.labelText] || mapping[field.name] || mapping[field.id];
          const isLowConf = lowConfidence.includes(field.labelText) || lowConfidence.includes(field.name) || !resolvedValue;

          if (resolvedValue) {
            const inputEl = document.querySelector(field.selectorPath) as HTMLInputElement;
            if (inputEl) {
              inputEl.value = resolvedValue;
              inputEl.dispatchEvent(new Event('input', { bubbles: true }));
              inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          reviewList.push({
            labelText: field.labelText,
            resolvedValue: resolvedValue || null,
            isLowConfidence: isLowConf
          });
        });

        sidebar!.showState('review-mapping');
        sidebar!.populateReviewList(reviewList);
      } else {
        alert('Autofill error: ' + (res.error || 'Failed to map fields.'));
        sidebar!.showState('ready-to-fill');
      }
    });
  }

  function getSelectorPath(el: HTMLElement): string {
    if (el.id) return `#${el.id}`;
    let path = el.tagName.toLowerCase();
    if (el.getAttribute('name')) path += `[name="${el.getAttribute('name')}"]`;
    return path;
  }

  // ----------------------------------------------------
  // LOG HISTORY ACTIONS
  // ----------------------------------------------------
  function logApplicationInBackend() {
    sidebar!.showState('loading');
    sidebar!.setLoadingTitle('Logging application history...');

    const company = document.querySelector('.jd-header-comp-name, .company-info-card a')?.textContent || 'Naukri.com Job';
    const role = document.querySelector('.jd-header-title, .job-title')?.textContent || 'Software Engineer';

    safeSendMessage({
      action: 'logApplication',
      payload: {
        company: company.replace(/\n/g, '').trim(),
        role: role.replace(/\n/g, '').trim(),
        status: 'Applied',
        notes: 'Submitted via Naukri Apply using HirenextAI Extension.'
      }
    }, (res) => {
      if (res && res.success) {
        alert('Application logged in database and email confirmation dispatched. You may submit the application form now.');
        sidebar!.showState('ready-to-fill');
      } else {
        alert('Failed to log application in history tracker.');
        sidebar!.showState('ready-to-fill');
      }
    });
  }

  // Detect confirmation success redirects
  function setupSubmissionTracker() {
    if (window.location.pathname.includes('/apply-confirmation') || window.location.pathname.includes('/success')) {
      console.log('Naukri confirmation URL detected.');
    }
  }

})();
