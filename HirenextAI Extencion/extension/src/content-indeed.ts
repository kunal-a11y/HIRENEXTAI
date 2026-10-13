(function() {
  if ((window as any).hasHirenextAIIndeedInjected) return;
  (window as any).hasHirenextAIIndeedInjected = true;

  let sidebar: any = null;

  const activeTimeouts: number[] = [];
  const activeIntervals: number[] = [];

  // Scoped check: Only runs on indeed.com or indeed.co.in
  if (!window.location.hostname.includes('indeed.com') && !window.location.hostname.includes('indeed.co.in')) {
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
    console.log('[HirenextAI] extension context invalid, stopping polling');
  }

  // Add cleanup pagehide listener
  window.addEventListener('pagehide', cleanupWidgetsAndTimers);
  window.addEventListener('focus', focusHandler);
  document.addEventListener('visibilitychange', visibilityHandler);

  console.log('HirenextAI Indeed Content Script Active.');

  // Check if user is logged into Indeed
  function checkIndeedLoggedIn(): boolean {
    const loggedInSelectors = [
      'a[href*="/myjobs"]',
      'a[href*="/profile"]',
      'button[id="gnav-AccountMenu-button"]',
      'a[href*="/account/logout"]',
      '[data-gnav-element-name="UserAccountMenu"]',
      '.gnav-AccountMenu-button',
      'a[href*="/logout"]'
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

    const loggedIn = checkIndeedLoggedIn();
    const host = document.getElementById('hirenextai-host-indeed');

    if (loggedIn) {
      if (!host) {
        initWidget();
      } else if (sidebar) {
        sidebar.updateAutofillCard(false, 'indeed');
      }
    } else {
      if (host) {
        destroyWidget();
      }
    }
  }

  function destroyWidget() {
    const host = document.getElementById('hirenextai-host-indeed');
    if (host) {
      host.remove();
    }
    sidebar = null;
  }

  // Poll for URL transitions & dynamic login appearances
  let lastUrl = window.location.href;
  const stateCheckInterval = window.setInterval(() => {
    if (!isExtensionContextValid()) return;
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      manageWidgetState();
    } else {
      const host = document.getElementById('hirenextai-host-indeed');
      const loggedIn = checkIndeedLoggedIn();
      if (loggedIn && !host) {
        manageWidgetState();
      } else if (!loggedIn && host) {
        manageWidgetState();
      }
    }
  }, 2000);
  activeIntervals.push(stateCheckInterval);

  // Initial trigger delay
  safeSetTimeout(manageWidgetState, 2000);

  function initWidget() {
    if (document.getElementById('hirenextai-host-indeed')) return;

    const host = document.createElement('div');
    host.id = 'hirenextai-host-indeed';
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
      alert('Form prefilling is currently not supported on Indeed.');
    });
    sidebar.addEventListener('confirm-logged', () => {
      sidebar.showState('ready-to-fill');
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

    // Determine and set initial card view mode (always indeed warning/neutral card)
    sidebar.updateAutofillCard(false, 'indeed');
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

})();
