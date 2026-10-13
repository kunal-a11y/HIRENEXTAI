// Self-contained container initialization
(function() {
  // Prevent duplicate execution
  if ((window as any).hasHirenextAILinkedInInjected) return;
  (window as any).hasHirenextAILinkedInInjected = true;

  let sidebar: any = null;
  let floatingBtn: HTMLDivElement | null = null;

  const activeTimeouts: number[] = [];
  const activeIntervals: number[] = [];

  const scoreCache = new Map<string, number>();
  const inFlightJobs = new Set<string>();
  let cardIntersectionObserver: IntersectionObserver | null = null;
  let cardScanIntervalId: any = null;
  let batchQueue: { id: string; title: string; company: string; snippet: string; description: string; cardElement: HTMLElement }[] = [];
  let batchTimeoutId: any = null;

  // Check if user is logged into LinkedIn via top global nav presence
  function checkLinkedInLoggedIn(): boolean {
    const loggedInSelectors = [
      '#global-nav',
      '.global-nav',
      '[data-test-global-nav]',
      '.global-nav__me-menu',
      'a[href*="/messaging"]',
      'a[href*="/notifications"]',
      'button.global-nav__primary-link[data-test-global-nav-link="me"]'
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

    const loggedIn = checkLinkedInLoggedIn();
    const host = document.getElementById('hirenextai-host-linkedin');

    if (loggedIn) {
      if (!host) {
        initWidget();
      } else if (sidebar) {
        // Re-evaluate mode if user navigates in LinkedIn SPA
        const isJobPage = window.location.pathname.includes('/jobs');
        sidebar.updateAutofillCard(isJobPage);
      }
    } else {
      if (host) {
        destroyWidget();
      }
    }
  }

  function destroyWidget() {
    const host = document.getElementById('hirenextai-host-linkedin');
    if (host) {
      host.remove();
    }
    sidebar = null;
    cleanupJobCardObservers();
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

    cleanupJobCardObservers();
    destroyWidget();
    console.log('[HirenextAI] extension context invalid, stopping polling');
  }

  // Add cleanup pagehide listener
  window.addEventListener('pagehide', cleanupWidgetsAndTimers);

  window.addEventListener('focus', focusHandler);
  document.addEventListener('visibilitychange', visibilityHandler);

  console.log('HirenextAI LinkedIn Content Script Active.');

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
      // Recheck if nav bar has hydrated/appeared or user logged in
      const host = document.getElementById('hirenextai-host-linkedin');
      const loggedIn = checkLinkedInLoggedIn();
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
    if (document.getElementById('hirenextai-host-linkedin')) return;

    const host = document.createElement('div');
    host.id = 'hirenextai-host-linkedin';
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

    // Inject matching score gauge stylesheet and initialize observers
    injectGaugeStyles();
    setupJobCardObservers();

    // Determine and set initial card view mode (job vs neutral)
    const isJobPage = window.location.pathname.includes('/jobs');
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
    
    const siblingHeader = el.previousElementSibling;
    if (siblingHeader && (siblingHeader as HTMLElement).innerText.trim()) {
      return (siblingHeader as HTMLElement).innerText.trim();
    }

    return el.getAttribute('name') || '';
  }

  function executeFormFill() {
    const modal = document.querySelector('.jobs-easy-apply-modal');
    if (!modal) {
      alert('LinkedIn Easy Apply form not found. Please click "Easy Apply" first.');
      return;
    }

    sidebar!.showState('loading');
    sidebar!.setLoadingTitle('Scraping form fields...');

    const formInputs: any[] = [];
    const elements = modal.querySelectorAll('input, textarea, select');
    
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
      alert('No empty fillable fields found on this Easy Apply screen page.');
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

    const company = document.querySelector('.jobs-unified-top-card__company-name, .job-details-jobs-unified-top-card__company-name')?.textContent || 'LinkedIn Job';
    const role = document.querySelector('.jobs-unified-top-card__job-title, .job-details-jobs-unified-top-card__job-title')?.textContent || 'Developer';

    safeSendMessage({
      action: 'logApplication',
      payload: {
        company: company.replace(/\n/g, '').trim(),
        role: role.replace(/\n/g, '').trim(),
        status: 'Applied',
        notes: 'Submitted via LinkedIn Easy Apply using HirenextAI Extension.'
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

  // Detect final submit clicks to capture successes
  function setupSubmissionTracker() {
    document.addEventListener('click', (e) => {
      if (!isExtensionContextValid()) return;
      const target = e.target as HTMLElement;
      if (!target) return;

      // Detect click on LinkedIn modal Submit button
      if (
        target.innerText && 
        (target.innerText.includes('Submit application') || target.getAttribute('aria-label')?.includes('Submit application'))
      ) {
        console.log('Submission submit click detected.');
        safeSetTimeout(() => {
          const successHeader = document.querySelector('.artdeco-modal__header, .jp-confirmation-modal');
          if (successHeader && successHeader.textContent?.includes('Application Sent')) {
            console.log('LinkedIn submission toast confirmed.');
          }
        }, 1500);
      }
    });
  }

  // ----------------------------------------------------
  // JOB MATCH SCORE GAUGE ROUTINES
  // ----------------------------------------------------
  function injectGaugeStyles() {
    if (document.getElementById('hnai-gauge-styles')) return;
    const style = document.createElement('style');
    style.id = 'hnai-gauge-styles';
    style.textContent = `
      .hnai-gauge-wrapper {
        position: absolute;
        bottom: 8px;
        right: 12px;
        z-index: 5;
        pointer-events: auto;
      }
      .hnai-gauge-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 54px;
        background: transparent;
        padding: 4px;
        box-sizing: border-box;
      }
      .hnai-gauge-svg {
        width: 48px;
        height: 28px;
        display: block;
      }
      .hnai-gauge-bg {
        fill: none;
        stroke: rgba(128, 128, 128, 0.2);
        stroke-width: 8;
        stroke-linecap: round;
      }
      .hnai-gauge-fill {
        fill: none;
        stroke-width: 8;
        stroke-linecap: round;
        stroke-dasharray: 125.6;
        stroke-dashoffset: 125.6;
        transition: stroke-dashoffset 0.6s ease-out;
      }
      .hnai-gauge-text-val {
        text-anchor: middle;
        font-size: 20px;
        font-weight: bold;
        font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .hnai-gauge-label {
        font-size: 8px;
        color: #8f9bb3;
        margin-top: 2px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      @keyframes hnaiGaugePulse {
        0% { opacity: 0.4; }
        50% { opacity: 0.8; }
        100% { opacity: 0.4; }
      }
      .hnai-gauge-loading {
        animation: hnaiGaugePulse 1.5s infinite ease-in-out;
      }
      .hnai-gauge-loading .hnai-gauge-fill {
        stroke: #8f9bb3;
        stroke-dashoffset: 80;
      }
    `;
    document.head.appendChild(style);
  }

  function getThemeTextColor(): string {
    const isDark = document.documentElement.classList.contains('theme--dark') || 
                   document.documentElement.classList.contains('dark-theme') || 
                   document.querySelector('html')?.getAttribute('data-theme') === 'dark';
    return isDark ? '#ffffff' : '#000000';
  }

  function getScoreColor(score: number): string {
    if (score < 40) return '#ff3d71'; // Red
    if (score < 70) return '#ffaa00'; // Amber/Yellow
    return '#00e096'; // Green
  }

  function createGaugeElement(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'hnai-gauge-wrapper';
    wrapper.innerHTML = `
      <div class="hnai-gauge-container hnai-gauge-loading">
        <svg viewBox="0 0 100 55" class="hnai-gauge-svg">
          <path class="hnai-gauge-bg" d="M 10 50 A 40 40 0 0 1 90 50" />
          <path class="hnai-gauge-fill" d="M 10 50 A 40 40 0 0 1 90 50" />
          <text x="50" y="48" class="hnai-gauge-text-val" fill="${getThemeTextColor()}">--</text>
        </svg>
        <div class="hnai-gauge-label">Score</div>
      </div>
    `;
    return wrapper;
  }

  function renderGauge(card: HTMLElement, score: number) {
    let wrapper = card.querySelector('.hnai-gauge-wrapper') as HTMLElement;
    if (!wrapper) {
      wrapper = createGaugeElement();
      card.appendChild(wrapper);
    }

    const container = wrapper.querySelector('.hnai-gauge-container') as HTMLElement;
    container.classList.remove('hnai-gauge-loading');

    const fill = wrapper.querySelector('.hnai-gauge-fill') as SVGPathElement;
    const color = getScoreColor(score);
    fill.style.stroke = color;
    
    const offset = 125.6 - (score / 100) * 125.6;
    fill.style.strokeDashoffset = `${offset}`;

    const textVal = wrapper.querySelector('.hnai-gauge-text-val') as SVGTextElement;
    textVal.textContent = `${score}`;
    textVal.setAttribute('fill', getThemeTextColor());

    const label = wrapper.querySelector('.hnai-gauge-label') as HTMLElement;
    label.textContent = `${score}/100`;
    label.style.color = color;
  }

  function renderLoadingGauge(card: HTMLElement) {
    let wrapper = card.querySelector('.hnai-gauge-wrapper') as HTMLElement;
    if (!wrapper) {
      wrapper = createGaugeElement();
      card.appendChild(wrapper);
    }

    const container = wrapper.querySelector('.hnai-gauge-container') as HTMLElement;
    if (!container.classList.contains('hnai-gauge-loading')) {
      container.classList.add('hnai-gauge-loading');
    }

    const fill = wrapper.querySelector('.hnai-gauge-fill') as SVGPathElement;
    fill.style.stroke = '#8f9bb3';
    fill.style.strokeDashoffset = '80';

    const textVal = wrapper.querySelector('.hnai-gauge-text-val') as SVGTextElement;
    textVal.textContent = '--';
    textVal.setAttribute('fill', getThemeTextColor());

    const label = wrapper.querySelector('.hnai-gauge-label') as HTMLElement;
    label.textContent = 'Score';
    label.style.color = '#8f9bb3';
  }

  function queueCardForScoring(card: HTMLElement) {
    const jobId = card.getAttribute('data-occludable-job-id');
    if (!jobId) return;

    if (card.querySelector('.hnai-gauge-wrapper:not(.hnai-gauge-loading)')) {
      if (scoreCache.has(jobId)) {
        renderGauge(card, scoreCache.get(jobId)!);
      }
      return;
    }

    renderLoadingGauge(card);

    const titleEl = card.querySelector('.job-card-list__title, a.job-card-list__title, .job-card-container__link') as HTMLElement;
    const companyEl = card.querySelector('.job-card-container__company-name, .job-card-list__company-name, .artdeco-entity-lockup__subtitle') as HTMLElement;
    const snippetEl = card.querySelector('.job-card-list__description-snippet, .job-card-container__snippet, .job-card-list__insight') as HTMLElement;

    const title = titleEl ? titleEl.innerText.trim() : '';
    const company = companyEl ? companyEl.innerText.trim() : '';
    const snippet = snippetEl ? snippetEl.innerText.trim() : '';

    let description = '';
    const currentJobIdInUrl = new URLSearchParams(window.location.search).get('currentJobId');
    if (currentJobIdInUrl === jobId) {
      const descEl = document.querySelector('.jobs-description__content, .jobs-search__job-details, #job-details') as HTMLElement;
      if (descEl) {
        description = descEl.innerText.trim().substring(0, 3000);
      }
    }

    if (batchQueue.some(j => j.id === jobId)) return;

    batchQueue.push({
      id: jobId,
      title,
      company,
      snippet,
      description,
      cardElement: card
    });

    if (batchTimeoutId) clearTimeout(batchTimeoutId);
    batchTimeoutId = setTimeout(processBatchQueue, 300);
  }

  function processBatchQueue() {
    if (batchQueue.length === 0) return;
    
    const currentBatch = [...batchQueue];
    batchQueue = [];

    const jobsToFetch = currentBatch.filter(j => !scoreCache.has(j.id) && !inFlightJobs.has(j.id));
    
    currentBatch.forEach(j => {
      if (scoreCache.has(j.id)) {
        renderGauge(j.cardElement, scoreCache.get(j.id)!);
      }
    });

    if (jobsToFetch.length === 0) return;

    jobsToFetch.forEach(j => inFlightJobs.add(j.id));
    jobsToFetch.forEach(j => renderLoadingGauge(j.cardElement));

    const payload = {
      jobs: jobsToFetch.map(j => ({
        id: j.id,
        title: j.title,
        company: j.company,
        description: j.description || j.snippet
      }))
    };

    safeSendMessage({ action: 'getMatchScores', payload }, (res) => {
      if (res && res.success && res.data) {
        const scores = res.data;
        jobsToFetch.forEach(j => {
          inFlightJobs.delete(j.id);
          const score = typeof scores[j.id] === 'number' ? scores[j.id] : 0;
          scoreCache.set(j.id, score);
          renderGauge(j.cardElement, score);
        });
      } else {
        console.error('Failed to fetch match scores:', res?.error);
        jobsToFetch.forEach(j => {
          inFlightJobs.delete(j.id);
          renderGauge(j.cardElement, 0);
        });
      }
    });
  }

  function setupJobCardObservers() {
    cleanupJobCardObservers();

    cardIntersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const card = entry.target as HTMLElement;
          queueCardForScoring(card);
        }
      });
    }, { threshold: 0.1 });

    function scanAndObserveCards() {
      if (!isExtensionContextValid()) return;
      const cards = document.querySelectorAll('li[data-occludable-job-id]');
      cards.forEach(card => {
        if (!(card as any).hasHnaiObserver) {
          (card as any).hasHnaiObserver = true;
          const htmlCard = card as HTMLElement;
          if (getComputedStyle(htmlCard).position === 'static') {
            htmlCard.style.position = 'relative';
          }
          cardIntersectionObserver?.observe(htmlCard);
        }
      });
    }

    scanAndObserveCards();
    cardScanIntervalId = setInterval(scanAndObserveCards, 2000);
    activeIntervals.push(cardScanIntervalId);
  }

  function cleanupJobCardObservers() {
    if (cardIntersectionObserver) {
      cardIntersectionObserver.disconnect();
      cardIntersectionObserver = null;
    }
    if (cardScanIntervalId) {
      clearInterval(cardScanIntervalId);
      cardScanIntervalId = null;
    }
    if (batchTimeoutId) {
      clearTimeout(batchTimeoutId);
      batchTimeoutId = null;
    }
    batchQueue = [];
  }

})();
