const PLATFORM_SEARCH_MAP: Record<string, (query: string, location: string) => string> = {
  'linkedin.com': (query) => `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}`,
  'naukri.com': (query) => `https://www.naukri.com/jobs-in-india?k=${encodeURIComponent(query)}`,
  'indeed.com': (query, location) => `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`,
  'indeed.co.in': (query, location) => `https://www.indeed.co.in/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`
};

class HirenextAISidebar {
  public element: HTMLDivElement;
  private shadow: ShadowRoot;
  
  // State elements
  private screenAuth: HTMLElement | null = null;
  private screenProfile: HTMLElement | null = null;
  private screenResume: HTMLElement | null = null;
  private screenResumeUpload: HTMLElement | null = null;
  private screenFindJob: HTMLElement | null = null;
  private screenReady: HTMLElement | null = null;
  private screenLoading: HTMLElement | null = null;
  private screenReview: HTMLElement | null = null;
  private screenConnection: HTMLElement | null = null;

  // Toolbar & Dropdown elements
  private toolbar: HTMLElement | null = null;
  private contentPanel: HTMLElement | null = null;
  private btnClosePanel: HTMLElement | null = null;
  private panelTitle: HTMLElement | null = null;
  private activeTab: 'profile' | 'resume' | 'find-job' | 'tracking' | null = null;
  private currentSessionState: 'auth-required' | 'resume-required' | 'ready-to-fill' | 'loading' | 'review-mapping' | 'connection-error' = 'ready-to-fill';
  
  // Wizard Stepper State
  private currentStep = 1;
  private totalSteps = 4;
  private wizardAnswers: Record<string, any> = {};

  // Profile elements
  private sidebarLogoRefresh: HTMLElement | null = null;
  private profileAvatarToggle: HTMLElement | null = null;
  private profileDropdownPanel: HTMLElement | null = null;
  private dropdownUserEmail: HTMLElement | null = null;
  private btnLogout: HTMLElement | null = null;

  // Upload elements
  private resumeUploadSection: HTMLElement | null = null;
  private resumeDropzone: HTMLElement | null = null;
  private resumeFileInput: HTMLInputElement | null = null;
  private browseResumeTrigger: HTMLElement | null = null;
  private resumeFilePreview: HTMLElement | null = null;
  private previewFileName: HTMLElement | null = null;
  private previewFileMeta: HTMLElement | null = null;
  private btnRemoveResume: HTMLElement | null = null;
  private resumeUploadProgress: HTMLElement | null = null;
  private progressFillElement: HTMLElement | null = null;
  private progressPercentStats: HTMLElement | null = null;
  private btnCancelUpload: HTMLElement | null = null;
  private resumeSuccessState: HTMLElement | null = null;
  private btnUploadResume: HTMLButtonElement | null = null;
  private dragArrowLeft: HTMLElement | null = null;
  private dragArrowRight: HTMLElement | null = null;

  private dragCounter = 0;
  private uploadedFile: File | null = null;
  private uploadIntervalId: any = null;
  private uploadErrorMsg: HTMLElement | null = null;

  // Pointer drag gesture states
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private currentTranslate = 80; // Starts closed (translateX(80px))
  private isOpen = false;

  constructor() {
    this.element = document.createElement('div');
    this.element.id = 'hirenextai-sidebar-root';
    
    // Bind public methods directly to the element so that content scripts
    // can continue using the DOM node seamlessly.
    (this.element as any).showState = this.showState.bind(this);
    (this.element as any).setLoadingTitle = this.setLoadingTitle.bind(this);
    (this.element as any).populateReviewList = this.populateReviewList.bind(this);
    (this.element as any).updateAutofillCard = this.updateAutofillCard.bind(this);
    (this.element as any).openSidebar = this.openSidebar.bind(this);
    (this.element as any).closeSidebar = this.closeSidebar.bind(this);
    (this.element as any).showNetworkError = this.showNetworkError.bind(this);

    this.shadow = this.element.attachShadow({ mode: 'closed' });
    this.render();
    this.setupElements();
    this.setupEventListeners();
    this.updateProfileUI();
    this.updateLoginUrl();
  }

  private render() {
    this.shadow.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          pointer-events: none;
          z-index: 99999999;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #f5f6fa;
          box-sizing: border-box;
        }

        #hirenextai-toolbar {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 64px;
          height: 324px;
          background: #0a0a0a;
          border: 1px solid #23273a;
          border-radius: 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 8px 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
          z-index: 99999999;
          pointer-events: auto;
          box-sizing: border-box;
          transform: translateX(80px);
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        #hirenextai-pull-tab {
          position: absolute;
          left: -36px;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #0a0a0a;
          border: 1px solid #23273a;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          cursor: grab;
          display: flex;
          align-items: center;
          justify-content: center;
          user-select: none;
          z-index: 99999998;
          pointer-events: auto;
          box-sizing: border-box;
          transition: background-color 0.2s;
        }
        #hirenextai-pull-tab:hover {
          background: #161822;
        }
        #hirenextai-pull-tab:active {
          cursor: grabbing;
        }
        #hirenextai-pull-tab svg {
          width: 16px;
          height: 16px;
          stroke: #f5f6fa;
          pointer-events: none;
        }

        .toolbar-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a0a5c0;
          transition: all 0.2s;
          box-sizing: border-box;
          margin-bottom: 8px;
        }
        .toolbar-btn:hover {
          color: #f5f6fa;
          background: #161822;
        }
        .toolbar-btn.active {
          color: #ffffff;
          background: #23273a;
        }
        .toolbar-btn svg {
          width: 20px;
          height: 20px;
          stroke-width: 1.5;
        }

        .toolbar-logo-btn {
          width: 54px;
          height: 54px;
          border-radius: 14px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          box-sizing: border-box;
          margin-top: 6px;
          padding: 0;
         }
         .toolbar-logo-btn:hover {
           transform: scale(1.05);
         }
         .hnai-logo-mark {
           width: 100%;
           aspect-ratio: 1 / 1;
           display: flex;
           align-items: center;
           justify-content: center;
           cursor: pointer;
         }
         .hnai-logo-svg {
           width: 50px;
           height: 50px;
         }

        @keyframes centerPop {
          0%, 5% { transform: scale(0); opacity: 0; }
          10%, 90% { transform: scale(1); opacity: 1; }
          95%, 100% { transform: scale(0); opacity: 0; }
        }
        @keyframes lineFlow {
          0%, 15% { stroke-dashoffset: 50; opacity: 0; }
          20% { opacity: 1; }
          40%, 65% { stroke-dashoffset: 0; opacity: 1; }
          85% { stroke-dashoffset: 50; opacity: 1; }
          90%, 100% { opacity: 0; }
        }
        @keyframes smallDotPop {
          0%, 40% { transform: scale(0); opacity: 0; }
          45%, 60% { transform: scale(1); opacity: 1; }
          65%, 100% { transform: scale(0); opacity: 0; }
        }

        /* Only apply animation when .hnai-animating-once class is present */
        .hnai-logo-svg.hnai-animating-once .center-dot { animation: centerPop 2s ease-in-out 1; }
        .hnai-logo-svg.hnai-animating-once .line { animation: lineFlow 2s ease-in-out 1; }
        .hnai-logo-svg.hnai-animating-once .dot { animation: smallDotPop 2s ease-in-out 1; }

        .hnai-logo-svg .center-dot {
          fill: white;
          transform: scale(1);
          opacity: 1;
          transform-origin: 50px 50px;
        }
        .hnai-logo-svg .line {
          stroke: white; stroke-width: 2.8; fill: none; stroke-linecap: round;
          stroke-dasharray: 50; stroke-dashoffset: 0;
          opacity: 1;
        }
        .hnai-logo-svg .dot {
          fill: white;
          transform: scale(1);
          opacity: 1;
        }

        .hnai-logo-svg .sd1 { transform-origin: 63px 38px; } .hnai-logo-svg .ed1 { transform-origin: 35px 25px; }
        .hnai-logo-svg .sd2 { transform-origin: 62px 63px; } .hnai-logo-svg .ed2 { transform-origin: 75px 35px; }
        .hnai-logo-svg .sd3 { transform-origin: 37px 62px; } .hnai-logo-svg .ed3 { transform-origin: 65px 75px; }
        .hnai-logo-svg .sd4 { transform-origin: 38px 37px; } .hnai-logo-svg .ed4 { transform-origin: 25px 65px; }

        .toolbar-divider {
          width: 28px;
          height: 1px;
          background: #23273a;
          margin: 10px 0 12px 0;
        }

        #hirenextai-content-panel {
          position: absolute;
          top: 16px;
          right: 80px;
          width: 340px;
          height: 500px;
          background: #0a0a0a;
          border: 1px solid #23273a;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.6);
          display: none;
          flex-direction: column;
          z-index: 99999999;
          pointer-events: auto;
          box-sizing: border-box;
          overflow: hidden;
          animation: slide-down-panel 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slide-down-panel {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .panel-header {
          padding: 12px 16px;
          background: #0e1017;
          border-bottom: 1px solid #23273a;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .panel-title {
          font-weight: 700;
          font-size: 11.5px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #8f85f3;
        }
        .panel-close {
          background: none;
          border: none;
          color: #a0a5c0;
          font-size: 18px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .panel-close:hover {
          color: #f5f6fa;
        }

        .tooltip {
          position: relative;
        }
        .tooltip::after {
          content: attr(data-tooltip);
          position: absolute;
          top: 50%;
          right: 52px;
          transform: translateY(-50%) scale(0.9);
          background: #0a0a0a;
          border: 1px solid #23273a;
          color: #f5f6fa;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: all 0.15s ease;
          box-shadow: -4px 4px 12px rgba(0,0,0,0.5);
          z-index: 9999999999;
        }
        .tooltip:hover::after {
          opacity: 1;
          transform: translateY(-50%) scale(1);
        }

        .container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
        }

        .screen {
          display: none;
          flex-direction: column;
          height: 100%;
        }
        .screen.active {
          display: flex;
        }

        .card {
          background: #12141c;
          border: 1px solid #23273a;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .btn {
          background: #6c5ce7;
          color: white;
          border: none;
          padding: 10px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-decoration: none;
        }
        .btn:hover { background: #8f85f3; }
        .btn-secondary {
          background: #23273a;
          color: #f5f6fa;
          border: 1px solid #363d5a;
        }
        .btn-secondary:hover { background: #363d5a; }
        .btn-danger { background: #d63031; }
        .btn-danger:hover { background: #ff7675; }

        .form-group {
          margin-bottom: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-group label {
          font-size: 11.5px;
          color: #a0a5c0;
          font-weight: 600;
          text-align: left;
        }
        .input-ctrl {
          background: #12141c;
          border: 1px solid #23273a;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12.5px;
        }
        .input-ctrl:focus {
          outline: none;
          border-color: #6c5ce7;
        }

        /* Stepper progress */
        .progress-bar {
          height: 4px;
          background: #23273a;
          border-radius: 2px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: #6c5ce7;
          width: 0%;
          transition: width 0.3s;
        }
        .wizard-step {
          display: none;
          flex-direction: column;
          gap: 10px;
        }
        .wizard-step.active {
          display: flex;
        }

        /* Mapping list */
        .mapping-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 14px;
          max-height: 250px;
          overflow-y: auto;
        }
        .mapping-item {
          padding: 8px 12px;
          background: #12141c;
          border: 1px solid #23273a;
          border-radius: 6px;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        /* Spinner */
        .spinner {
          border: 3px solid rgba(255,255,255,0.1);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border-left-color: #6c5ce7;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        /* Resume Upload Styles */
        .upload-dropzone {
          border: 2px dashed #23273a;
          border-radius: 12px;
          padding: 24px 16px;
          text-align: center;
          position: relative;
          background: #12141c;
          transition: border-color 0.2s, background-color 0.2s;
        }
        .upload-dropzone.active {
          border-color: #6c5ce7;
          background-color: rgba(108, 92, 231, 0.05);
        }
        .upload-icons-group {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-bottom: 12px;
        }
        .icon-doc {
          width: 32px;
          height: 32px;
          background: #1c1f2e;
          border: 1px solid #2c324e;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .video-doc { transform: rotate(-12deg) translateY(4px); }
        .image-doc { transform: scale(1.15); z-index: 2; }
        .music-doc { transform: rotate(12deg) translateY(4px); }
        .upload-dropzone.active .video-doc { transform: rotate(-25deg) translate(-10px, -6px) scale(0.9); }
        .upload-dropzone.active .music-doc { transform: rotate(25deg) translate(10px, -6px) scale(0.9); }
        .upload-dropzone.active .image-doc { transform: scale(1.3) translateY(-8px); }

        .browse-link {
          color: #8f85f3;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
        }
        .browse-link:hover { color: #a29bfe; }

        /* Drag Directional Arrows */
        .drag-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 10;
        }
        .arrow-path {
          stroke-dasharray: 80;
          stroke-dashoffset: 80;
          animation: arrow-draw 1.2s ease-in-out infinite;
        }
        @keyframes arrow-draw {
          0% { stroke-dashoffset: 80; opacity: 0; }
          40% { stroke-dashoffset: 0; opacity: 1; }
          80% { stroke-dashoffset: -80; opacity: 0; }
          100% { stroke-dashoffset: -80; opacity: 0; }
        }

        /* File Preview */
        .file-preview-box {
          display: flex;
          align-items: center;
          background: #12141c;
          border: 1px solid #23273a;
          border-radius: 8px;
          padding: 10px 14px;
          animation: slide-in-preview 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slide-in-preview {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .file-icon-wrapper { margin-right: 12px; }
        .file-info { flex-grow: 1; min-width: 0; text-align: left; }
        .file-name { font-size: 12px; font-weight: 600; color: #f5f6fa; }

        /* Upload Progress */
        .upload-progress-box {
          border: 1px solid #23273a;
          border-radius: 8px;
          margin-bottom: 12px;
          background-color: #12141c;
          position: relative;
          overflow: hidden;
        }
        .full-box-progress-fill {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          background-color: rgba(108, 92, 231, 0.15);
          border-bottom: 2px solid #8f85f3;
          z-index: 1;
        }
        .progress-content-wrapper { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; }

        /* Success State */
        .success-state-container { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px 0; }
        .burst-line { stroke-dasharray: 20; stroke-dashoffset: 20; opacity: 0; }
        .success-state-container.active .burst-line { animation: burst-fire 0.6s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; }
        @keyframes burst-fire { 0% { stroke-dashoffset: 20; opacity: 0; } 40% { stroke-dashoffset: 0; opacity: 1; } 100% { stroke-dashoffset: -20; opacity: 0; } }

        /* Upload Button */
        .upload-button { background-color: #6c5ce7; color: #FFFFFF; border: none; font-weight: 600; cursor: pointer; }
        .upload-button.disabled { background-color: #23273a; color: #a0a5c0; cursor: not-allowed; }
        
        .flying-file {
          position: fixed;
          left: 0;
          top: 0;
          pointer-events: none;
          z-index: 999999999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #FFFFFF;
          padding: 10px;
          border-radius: 12px;
          box-shadow: 0 20px 50px rgba(122, 102, 254, 0.4);
          border: 2px solid #7a66fe;
          animation: fly-file-anim 0.7s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        @keyframes fly-file-anim {
          0% { transform: translate(var(--start-x), var(--start-y)) scale(0.5) rotate(-15deg); opacity: 0; }
          30% { transform: translate(var(--start-x), calc(var(--start-y) - 60px)) scale(1.1) rotate(15deg); opacity: 1; }
          100% { transform: translate(var(--target-x), var(--target-y)) scale(0.3) rotate(0deg); opacity: 1; }
        }
      </style>

      <div id="hirenextai-toolbar">
        <div id="hirenextai-pull-tab">
          <svg id="pull-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.3s; transform: rotate(0deg);">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </div>
        
        <button class="toolbar-logo-btn tooltip" id="toolbar-btn-logo" data-tooltip="Reset Assistant">
          <div class="hnai-logo-mark" title="HirenextAI">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="hnai-logo-svg">
              <circle class="center-dot" cx="50" cy="50" r="7" />
              <path class="line" d="M 50 50 V 25 H 35" />
              <path class="line" d="M 50 38 H 63" />
              <circle class="dot sd1" cx="63" cy="38" r="3.5" />
              <circle class="dot ed1" cx="35" cy="25" r="3.5" />
              <path class="line" d="M 50 50 H 75 V 35" />
              <path class="line" d="M 62 50 V 63" />
              <circle class="dot sd2" cx="62" cy="63" r="3.5" />
              <circle class="dot ed2" cx="75" cy="35" r="3.5" />
              <path class="line" d="M 50 50 V 75 H 65" />
              <path class="line" d="M 50 62 H 37" />
              <circle class="dot sd3" cx="37" cy="62" r="3.5" />
              <circle class="dot ed3" cx="65" cy="75" r="3.5" />
              <path class="line" d="M 50 50 H 25 V 65" />
              <path class="line" d="M 38 50 V 37" />
              <circle class="dot sd4" cx="38" cy="37" r="3.5" />
              <circle class="dot ed4" cx="25" cy="65" r="3.5" />
            </svg>
          </div>
        </button>

        <div class="toolbar-divider"></div>
        
        <button class="toolbar-btn tooltip" id="toolbar-btn-find-job" data-tooltip="Find Jobs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        </button>
        <button class="toolbar-btn tooltip" id="toolbar-btn-resume" data-tooltip="Resume Profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </button>
        <button class="toolbar-btn tooltip" id="toolbar-btn-tracking" data-tooltip="Tracking & Autofill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        </button>
        <button class="toolbar-btn tooltip" id="toolbar-btn-documents" data-tooltip="Documents">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button class="toolbar-btn tooltip" id="toolbar-btn-profile" data-tooltip="User Profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </button>
      </div>

      <div id="hirenextai-content-panel">
        <div class="panel-header">
          <span class="panel-title" id="panel-title-text">Assistant</span>
          <button class="panel-close" id="btn-close-panel">×</button>
        </div>
        
        <div class="container">
          <div class="screen" id="screen-auth-required">
            <h3 style="margin-top:20px; font-size:18px;">Account Login Required</h3>
            <p style="color:#a0a5c0; font-size:13px; line-height:1.6; margin-bottom:24px;">Please sign in to your HirenextAI profile to enable automatic job form mapping.</p>
            <a href="#" id="btn-login-link" target="_blank" class="btn">Login to HirenextAI</a>
          </div>

          <div class="screen" id="screen-profile">
            <h3 style="margin-top:0;">Your Profile</h3>
            <p style="color:#a0a5c0; font-size:12px; margin-bottom:20px;">You are currently signed into HirenextAI Career Assistant.</p>
            <div style="background:#12141c; border:1px solid #23273a; border-radius:8px; padding:16px; margin-bottom:24px;">
              <div style="font-size:10px; color:#a0a5c0; text-transform:uppercase; margin-bottom:4px; font-weight:700;">Active Account</div>
              <div id="dropdown-user-email" style="font-size:13px; font-weight:600; color:#f5f6fa; word-break:break-all;">user@hirenext.ai</div>
            </div>
            <button class="btn btn-danger" id="btn-logout" style="width:100%;">Sign Out of Account</button>
          </div>

          <div class="screen" id="screen-resume-required">
            <h3 style="margin-top:0;">Build Profile Resume</h3>
            <p style="color:#a0a5c0; font-size:12px; margin-bottom:12px;">Answer these steps to generate your ATS resume credentials with AI.</p>
            <div class="progress-bar"><div id="wizard-progress" class="progress-fill"></div></div>
            <div class="wizard-step active" data-step="1">
              <div class="form-group"><label>Full Name</label><input type="text" id="w-name" class="input-ctrl" placeholder="Your name"></div>
              <div class="form-group"><label>Phone Number</label><input type="text" id="w-phone" class="input-ctrl" placeholder="+1 (555) 123-4567"></div>
              <div class="form-group"><label>Career Goal</label><input type="text" id="w-goal" class="input-ctrl" placeholder="Role goal"></div>
            </div>
            <div class="wizard-step" data-step="2">
              <div class="form-group"><label>Degree</label><input type="text" id="w-degree" class="input-ctrl" placeholder="B.S. Computer Science"></div>
              <div class="form-group"><label>University</label><input type="text" id="w-school" class="input-ctrl" placeholder="School name"></div>
              <div class="form-group"><label>Graduation Year</label><input type="text" id="w-grad" class="input-ctrl" placeholder="2024"></div>
            </div>
            <div class="wizard-step" data-step="3">
              <div class="form-group"><label>Company</label><input type="text" id="w-company" class="input-ctrl" placeholder="Company name"></div>
              <div class="form-group"><label>Job Title</label><input type="text" id="w-role" class="input-ctrl" placeholder="Software Engineer"></div>
              <div class="form-group"><label>Description</label><textarea id="w-desc" class="input-ctrl" style="height:60px; resize:none;" placeholder="Key achievements..."></textarea></div>
            </div>
            <div class="wizard-step" data-step="4">
              <div class="form-group"><label>Technical Skills</label><input type="text" id="w-skills" class="input-ctrl" placeholder="NodeJS, React, Git"></div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:20px; gap:10px;">
              <button id="w-prev" class="btn btn-secondary" style="flex:1;">Back</button>
              <button id="w-next" class="btn" style="flex:1;">Next</button>
            </div>
          </div>

          <div class="screen" id="screen-resume-upload">
            <h3 style="margin-top:0;">Resume Profile</h3>
            <p style="color:#a0a5c0; font-size:12px; margin-bottom:16px;">Upload or update your ATS resume to map fields automatically.</p>
            <div class="upload-dropzone" id="resume-dropzone" style="margin-bottom:12px;">
              <div id="dropzone-drag-overlay" style="position:absolute; top:0; left:0; right:0; bottom:0; z-index:99; border-radius:12px;"></div>
              <div class="drag-arrow left-arrow" id="drag-arrow-left" style="display:none; left: 16px;"><svg width="36" height="36" viewBox="0 0 60 60" fill="none"><path class="arrow-path" d="M15 15C15 35 25 45 45 45 M30 30L45 45L30 60" stroke="#7A66FE" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" /></svg></div>
              <div class="drag-arrow right-arrow" id="drag-arrow-right" style="display:none; right: 16px; transform: scaleX(-1);"><svg width="36" height="36" viewBox="0 0 60 60" fill="none"><path class="arrow-path" d="M15 15C15 35 25 45 45 45 M30 30L45 45L30 60" stroke="#7A66FE" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" /></svg></div>
              <div class="upload-icons-group">
                <div class="icon-doc video-doc" id="icon-video"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A66FE" stroke-width="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg></div>
                <div class="icon-doc image-doc" id="icon-image"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A66FE" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                <div class="icon-doc music-doc" id="icon-music"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A66FE" stroke-width="2.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>
              </div>
              <div class="upload-title" style="font-size: 13px; margin-bottom: 6px;">Drag & drop your resume here</div>
              <div class="upload-subtitle" style="font-size: 11px;">or <span class="browse-link" id="browse-resume-trigger">browse files</span></div>
              <input type="file" id="resume-file-input" style="display:none;" accept=".pdf" />
            </div>
            <div id="upload-error-msg" style="display:none; color:#FF6B6B; font-size:11.5px; margin-bottom:12px; font-weight:500;"></div>
            <div class="file-preview-box" id="resume-file-preview" style="display:none; margin-bottom: 12px;">
              <div class="file-icon-wrapper"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7A66FE" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
              <div class="file-info"><div class="file-name" id="preview-file-name" style="font-size: 12px; color: #f5f6fa; font-weight: 600;">resume.pdf</div><div class="file-meta" id="preview-file-meta" style="font-size: 10px; color: #a0a5c0;">PDF • 1.2 Mb</div></div>
              <button class="file-remove-btn" id="btn-remove-resume"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6B6B" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div class="upload-progress-box" id="resume-upload-progress" style="display:none;"><div class="full-box-progress-fill" id="progress-fill-element" style="width: 0%;"></div><div class="progress-content-wrapper" style="padding: 8px 12px;"><div class="progress-left"><div class="progress-title" style="font-size:11px; color:#f5f6fa;">Uploading...</div><div class="progress-stats" id="progress-percent-stats" style="font-size:10px;">0%</div></div></div></div>
            <div class="success-state-container" id="resume-success-state" style="display:none; min-height: 120px; padding: 10px 0;"><div class="success-icon-wrapper"><svg width="48" height="48" viewBox="0 0 100 100" fill="none"><path class="success-circle" d="M 50 20 A 30 30 0 1 0 75 34" stroke="#7A66FE" stroke-width="3.5" stroke-linecap="round" /><path class="success-check" d="M 38 50 L 48 60 L 70 32" stroke="#7A66FE" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" /></svg></div><div class="success-text" style="font-size: 13px; color: #f5f6fa;">File successfully uploaded!</div></div>
            <div class="upload-button-container" id="resume-btn-container" style="margin-top: 10px;"><button class="upload-button disabled" id="btn-upload-resume" style="width:100%; border-radius: 6px; padding: 10px; font-size: 13px;" disabled>Upload Resume</button></div>
          </div>

          <div class="screen" id="screen-find-job">
            <h3 style="margin-top:0;">Matched Jobs</h3>
            <p style="color:#a0a5c0; font-size:12px; margin-bottom:16px;">AI-recommended opportunities matched against your resume profile.</p>
            <div style="display:flex; flex-direction:column; gap:10px;" id="matched-jobs-list"></div>
          </div>

          <div class="screen" id="screen-ready">
            <div class="card" id="autofill-card" style="text-align:center; padding:20px 16px; margin-bottom: 16px;">
              <div id="autofill-card-emoji" style="font-size:32px; margin-bottom:8px;">⚡</div>
              <h3 id="autofill-card-title" style="margin:0 0 6px 0; font-size:15px;">Application Autocompleter</h3>
              <p id="autofill-card-text" style="color:#a0a5c0; font-size:12px; line-height:1.5; margin:0 0 12px 0;">Our AI agent will match the form questions to your profile. You review before submitting.</p>
              <button class="btn" id="btn-fill-action" style="width: 100%;">Fill this application</button>
            </div>
            <div class="tracking-section" style="margin-top: 10px; display: flex; flex-direction: column; flex: 1;">
              <h4 style="margin: 0 0 10px 0; font-size: 11px; color: #a0a5c0; text-transform: uppercase; letter-spacing: 0.5px; font-weight:700;">Recent Applications</h4>
              <div class="tracking-list" id="recent-applications-list" style="display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 200px;"></div>
            </div>
          </div>

          <div class="screen" id="screen-loading" style="justify-content:center; align-items:center; text-align:center; padding: 20px;">
            <div class="spinner"></div>
            <h3 id="loading-title">Mapping fields...</h3>
            <p style="color:#a0a5c0; font-size:12px;">This takes a few seconds.</p>
          </div>

          <div class="screen" id="screen-review">
            <h3 style="margin-top:0;">Autofill Completed</h3>
            <p style="color:#a0a5c0; font-size:12px; margin-bottom:12px;">Review all fields on the page. Yellow-marked fields require manual correction.</p>
            <div class="mapping-list" id="review-mapping-container"></div>
            <div style="display:flex; flex-direction:column; gap:8px; margin-top:20px;">
              <button class="btn" id="btn-review-submit-confirm" style="background:#00b894;">Submit & Log Application</button>
              <button class="btn btn-secondary" id="btn-review-revert">Cancel & Revert</button>
            </div>
          </div>

          <div class="screen" id="screen-connection-error" style="justify-content:center; align-items:center; text-align:center; padding: 20px;">
            <div style="font-size:48px; margin-bottom:16px;">🔌</div>
            <h3 style="margin:0 0 8px 0; font-size:16px; color:#ff6b6b;">Connection Error</h3>
            <p id="connection-error-msg" style="color:#a0a5c0; font-size:12.5px; line-height:1.5; margin:0 0 20px 0;">Cannot reach HirenextAI server.</p>
            <button class="btn btn-secondary" id="btn-retry-connection" style="width: auto; padding: 8px 16px;">Retry Connection</button>
          </div>
        </div>
      </div>
      <div id="flying-file-container"></div>
    `;
  }

  private setupElements() {
    this.toolbar = this.shadow.getElementById('hirenextai-toolbar');
    this.contentPanel = this.shadow.getElementById('hirenextai-content-panel');
    this.btnClosePanel = this.shadow.getElementById('btn-close-panel');
    this.panelTitle = this.shadow.getElementById('panel-title-text');
    
    this.screenAuth = this.shadow.getElementById('screen-auth-required');
    this.screenProfile = this.shadow.getElementById('screen-profile');
    this.screenResume = this.shadow.getElementById('screen-resume-required');
    this.screenResumeUpload = this.shadow.getElementById('screen-resume-upload');
    this.screenFindJob = this.shadow.getElementById('screen-find-job');
    this.screenReady = this.shadow.getElementById('screen-ready');
    this.screenLoading = this.shadow.getElementById('screen-loading');
    this.screenReview = this.shadow.getElementById('screen-review');
    this.screenConnection = this.shadow.getElementById('screen-connection-error');

    // Profile elements
    this.sidebarLogoRefresh = this.shadow.getElementById('sidebar-logo-refresh');
    this.profileAvatarToggle = this.shadow.getElementById('profile-avatar-toggle');
    this.profileDropdownPanel = this.shadow.getElementById('profile-dropdown-panel');
    this.dropdownUserEmail = this.shadow.getElementById('dropdown-user-email');
    this.btnLogout = this.shadow.getElementById('btn-logout');

    // Upload elements
    this.resumeUploadSection = this.shadow.getElementById('screen-resume-upload');
    this.resumeDropzone = this.shadow.getElementById('resume-dropzone');
    this.resumeFileInput = this.shadow.getElementById('resume-file-input') as HTMLInputElement;
    this.browseResumeTrigger = this.shadow.getElementById('browse-resume-trigger');
    this.resumeFilePreview = this.shadow.getElementById('resume-file-preview');
    this.previewFileName = this.shadow.getElementById('preview-file-name');
    this.previewFileMeta = this.shadow.getElementById('preview-file-meta');
    this.btnRemoveResume = this.shadow.getElementById('btn-remove-resume');
    this.resumeUploadProgress = this.shadow.getElementById('resume-upload-progress');
    this.progressFillElement = this.shadow.getElementById('progress-fill-element');
    this.progressPercentStats = this.shadow.getElementById('progress-percent-stats');
    this.btnCancelUpload = this.shadow.getElementById('btn-cancel-upload');
    this.resumeSuccessState = this.shadow.getElementById('resume-success-state');
    this.btnUploadResume = this.shadow.getElementById('btn-upload-resume') as HTMLButtonElement;
    this.dragArrowLeft = this.shadow.getElementById('drag-arrow-left');
    this.dragArrowRight = this.shadow.getElementById('drag-arrow-right');
    this.uploadErrorMsg = this.shadow.getElementById('upload-error-msg');
  }

  private switchTab(tab: 'profile' | 'resume' | 'find-job' | 'tracking') {
    if (this.activeTab === tab && this.contentPanel!.style.display === 'flex') {
      this.contentPanel!.style.display = 'none';
      this.activeTab = null;
      this.updateActiveTabHighlight();
      return;
    }

    this.activeTab = tab;
    this.contentPanel!.style.display = 'flex';
    this.updateActiveTabHighlight();

    // Hide all tab screens
    [this.screenProfile, this.screenResume, this.screenResumeUpload, this.screenFindJob, this.screenReady, this.screenConnection, this.screenAuth].forEach(s => {
      if (s) {
        s.classList.remove('active');
        s.classList.remove('active-stepper-state');
      }
    });

    let screenToShow: HTMLElement | null = null;
    let title = '';

    if (tab === 'profile') {
      if (this.currentSessionState === 'auth-required') {
        screenToShow = this.screenAuth;
        title = 'Account Authentication';
      } else {
        screenToShow = this.screenProfile;
        title = 'User Account';
      }
    } else if (tab === 'resume') {
      if (this.currentSessionState === 'resume-required') {
        screenToShow = this.screenResume;
        if (this.screenResume) {
          this.screenResume.classList.add('active-stepper-state');
        }
        title = 'Profile Resume Builder';
      } else {
        screenToShow = this.screenResumeUpload;
        title = 'Resume Profile';
      }
    } else if (tab === 'tracking') {
      if (this.currentSessionState === 'connection-error') {
        screenToShow = this.screenConnection;
        title = 'Connection Error';
      } else {
        screenToShow = this.screenReady;
        title = 'Job Tracking & Autofill';
        this.fetchAndRenderApplications();
      }
    } else if (tab === 'find-job') {
      screenToShow = this.screenFindJob;
      title = 'Matched Opportunities';
    }

    if (screenToShow) {
      screenToShow.classList.add('active');
    }

    if (this.panelTitle && title) {
      this.panelTitle.textContent = title;
    }
  }

  private updateActiveTabHighlight() {
    const tabs = {
      'profile': 'toolbar-btn-profile',
      'resume': 'toolbar-btn-resume',
      'find-job': 'toolbar-btn-find-job',
      'tracking': 'toolbar-btn-tracking'
    };

    (Object.keys(tabs) as Array<keyof typeof tabs>).forEach(t => {
      const btn = this.shadow.getElementById(tabs[t]);
      if (btn) {
        if (t === this.activeTab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
  }

  private handleFindJobClick() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'getProfile' }, (profileRes) => {
        let careerGoal = 'Software Engineer';
        let location = '';
        if (profileRes && profileRes.success && profileRes.data) {
          careerGoal = profileRes.data.career_goal || 'Software Engineer';
        }

        const hostname = window.location.hostname;
        const matchedKey = Object.keys(PLATFORM_SEARCH_MAP).find(key => hostname.includes(key)) || 'linkedin.com';
        const searchUrlBuilder = PLATFORM_SEARCH_MAP[matchedKey];
        const targetUrl = searchUrlBuilder(careerGoal, location);

        window.location.href = targetUrl;
      });
    }
  }

  private setupEventListeners() {
    // Close panel dispatcher
    if (this.btnClosePanel) {
      this.btnClosePanel.onclick = () => {
        if (this.contentPanel) this.contentPanel.style.display = 'none';
        this.activeTab = null;
        this.updateActiveTabHighlight();
      };
    }

    // Toolbar navigation buttons
    const btnProfile = this.shadow.getElementById('toolbar-btn-profile');
    if (btnProfile) {
      btnProfile.onclick = () => this.switchTab('profile');
    }
    const btnResume = this.shadow.getElementById('toolbar-btn-resume');
    if (btnResume) {
      btnResume.onclick = () => this.switchTab('resume');
    }
    const btnFindJob = this.shadow.getElementById('toolbar-btn-find-job');
    if (btnFindJob) {
      btnFindJob.onclick = () => this.handleFindJobClick();
    }
    const btnTracking = this.shadow.getElementById('toolbar-btn-tracking');
    if (btnTracking) {
      btnTracking.onclick = () => this.switchTab('tracking');
    }
    const btnDocuments = this.shadow.getElementById('toolbar-btn-documents');
    if (btnDocuments) {
      btnDocuments.onclick = () => {
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
          chrome.runtime.sendMessage({ action: 'openDocuments' });
        }
      };
    }

    // Pull-tab click and drag/pull interactions on the toolbar container (horizontal slide)
    const tab = this.shadow.getElementById('hirenextai-pull-tab');
    if (tab && this.toolbar) {
      tab.addEventListener('pointerdown', (e: PointerEvent) => {
        this.isDragging = true;
        this.startX = e.clientX;
        tab.setPointerCapture(e.pointerId);
        this.toolbar!.style.transition = 'none';
      });

      tab.addEventListener('pointermove', (e: PointerEvent) => {
        if (!this.isDragging) return;
        const deltaX = e.clientX - this.startX;
        let newTranslate = this.isOpen ? deltaX : 80 + deltaX;

        // Bound translate between 0 and 80
        if (newTranslate < 0) newTranslate = 0;
        if (newTranslate > 80) newTranslate = 80;

        this.currentTranslate = newTranslate;
        this.toolbar!.style.transform = `translateX(${newTranslate}px)`;
        
        // Update arrow indicator rotation direction based on translation offset
        const arrow = this.shadow.getElementById('pull-arrow-icon');
        if (arrow) {
          const rotation = ((80 - newTranslate) / 80) * 180;
          arrow.style.transform = `rotate(${rotation}deg)`;
        }
      });

      tab.addEventListener('pointerup', (e: PointerEvent) => {
        if (!this.isDragging) return;
        this.isDragging = false;
        tab.releasePointerCapture(e.pointerId);

        this.toolbar!.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

        const deltaX = e.clientX - this.startX;
        const dragThreshold = 20;

        if (this.isOpen) {
          // Dragging right (positive deltaX) collapses the vertical pill bar to the right
          if (deltaX > dragThreshold) {
            this.closeSidebar();
          } else {
            this.openSidebar();
          }
        } else {
          // Dragging left (negative deltaX) reveals the vertical pill bar from the right
          if (deltaX < -dragThreshold) {
            this.openSidebar();
          } else {
            this.closeSidebar();
          }
        }
      });

      tab.addEventListener('click', (e) => {
        const deltaX = Math.abs(e.clientX - this.startX);
        if (deltaX < 5) {
          if (this.isOpen) {
            this.closeSidebar();
          } else {
            this.openSidebar();
          }
        }
      });
    }

    // Primary fill trigger dispatcher
    const btnFill = this.shadow.getElementById('btn-fill-action');
    if (btnFill) {
      btnFill.onclick = () => {
        this.element.dispatchEvent(new CustomEvent('fill-requested'));
      };
    }

    // Retry connection trigger
    const btnRetry = this.shadow.getElementById('btn-retry-connection');
    if (btnRetry) {
      btnRetry.onclick = () => {
        this.element.dispatchEvent(new CustomEvent('refresh-session'));
      };
    }

    // Confirm Log dispatcher
    const btnConfirm = this.shadow.getElementById('btn-review-submit-confirm');
    if (btnConfirm) {
      btnConfirm.onclick = () => {
        this.element.dispatchEvent(new CustomEvent('confirm-logged'));
      };
    }

    // Revert/Cancel dispatcher
    const btnRevert = this.shadow.getElementById('btn-review-revert');
    if (btnRevert) {
      btnRevert.onclick = () => {
        this.element.dispatchEvent(new CustomEvent('revert-requested'));
      };
    }

    // Logo refresh/reset click
    const btnLogo = this.shadow.getElementById('toolbar-btn-logo');
    if (btnLogo) {
      const logoMark = btnLogo.querySelector('.hnai-logo-mark') as HTMLElement;
      const logoSvg = btnLogo.querySelector('.hnai-logo-svg') as HTMLElement;

      btnLogo.onclick = () => {
        // Reset/refresh UI state
        if (this.contentPanel) this.contentPanel.style.display = 'none';
        this.activeTab = null;
        this.updateActiveTabHighlight();
        this.element.dispatchEvent(new CustomEvent('refresh-session'));

        // Play the animation once
        if (logoSvg) {
          logoSvg.classList.remove('hnai-animating-once');
          void logoSvg.offsetWidth; // Trigger reflow to restart animation on repeat clicks
          logoSvg.classList.add('hnai-animating-once');
        }
      };

      if (logoSvg) {
        logoSvg.addEventListener('animationend', () => {
          logoSvg.classList.remove('hnai-animating-once');
        }, { once: false });
      }
    }

    // Logout action
    if (this.btnLogout) {
      this.btnLogout.onclick = () => {
        if (this.contentPanel) this.contentPanel.style.display = 'none';
        this.activeTab = null;
        this.updateActiveTabHighlight();
        this.element.dispatchEvent(new CustomEvent('logout-requested'));
      };
    }

    // Drag & Drop Upload Zone events
    if (this.resumeDropzone) {
      const dragOverlay = this.shadow.getElementById('dropzone-drag-overlay')!;
      
      dragOverlay.addEventListener('dragenter', (e: any) => this.handleDragEnter(e));
      dragOverlay.addEventListener('dragleave', (e: any) => this.handleDragLeave(e));
      dragOverlay.addEventListener('dragover', (e: any) => this.handleDragOver(e));
      dragOverlay.addEventListener('drop', (e: any) => this.handleDrop(e));

      dragOverlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.resumeFileInput!.click();
      });
    }

    // Browse file trigger
    if (this.browseResumeTrigger && this.resumeFileInput) {
      this.browseResumeTrigger.onclick = () => {
        this.resumeFileInput!.click();
      };
    }

    // File input change
    if (this.resumeFileInput) {
      this.resumeFileInput.onchange = (e: any) => {
        if (e.target.files && e.target.files.length > 0) {
          this.selectFile(e.target.files[0]);
        }
      };
    }

    // Remove uploaded file
    if (this.btnRemoveResume) {
      this.btnRemoveResume.onclick = () => {
        this.removeUploadedFile();
      };
    }

    // Upload file action
    if (this.btnUploadResume) {
      this.btnUploadResume.onclick = () => {
        this.startResumeUpload();
      };
    }

    // Cancel upload
    if (this.btnCancelUpload) {
      this.btnCancelUpload.onclick = () => {
        this.cancelResumeUpload();
      };
    }

    // Stepper bindings
    this.setupWizardStepper();
  }

  // Drag and drop handlers
  private handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter++;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      this.resumeDropzone?.classList.add('active');
      this.showDragArrows(true);
    }
  }

  private handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter--;
    if (this.dragCounter === 0) {
      this.resumeDropzone?.classList.remove('active');
      this.showDragArrows(false);
    }
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  private handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    this.dragCounter = 0;
    this.resumeDropzone?.classList.remove('active');
    this.showDragArrows(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      
      // Calculate coordinates for the arc flying file path
      const dropzoneRect = this.resumeDropzone!.getBoundingClientRect();
      const startX = e.clientX || (dropzoneRect.left + dropzoneRect.width / 2);
      const startY = e.clientY || (dropzoneRect.top + dropzoneRect.height / 2);
      
      const previewThumb = this.shadow.getElementById('resume-file-preview')!;
      const previewThumbRect = previewThumb.getBoundingClientRect();
      const targetX = previewThumbRect.left + 20;
      const targetY = previewThumbRect.top + 20;

      const container = this.shadow.getElementById('flying-file-container')!;
      const flying = document.createElement('div');
      flying.className = 'flying-file';
      flying.style.setProperty('--start-x', `${startX}px`);
      flying.style.setProperty('--start-y', `${startY}px`);
      flying.style.setProperty('--target-x', `${targetX}px`);
      flying.style.setProperty('--target-y', `${targetY}px`);
      flying.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#7A66FE" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      `;
      container.appendChild(flying);

      setTimeout(() => {
        flying.remove();
        this.selectFile(droppedFile);
      }, 700);
    }
  }

  private updateExpansionState() {
    const hasFile = !!this.uploadedFile;
    const isUploading = this.resumeUploadProgress && this.resumeUploadProgress.style.display === 'block';
    const isSuccess = this.resumeSuccessState && (this.resumeSuccessState.style.display === 'flex' || this.resumeSuccessState.classList.contains('active'));
    
    if (hasFile || isUploading || isSuccess) {
      this.resumeUploadSection?.classList.add('expanded');
    } else {
      this.resumeUploadSection?.classList.remove('expanded');
    }
  }

  private selectFile(file: File) {
    // 1. Client-side file validation checks
    const maxBytes = 5 * 1024 * 1024;
    const isPdf = file.name.toLowerCase().endsWith('.pdf') && file.type === 'application/pdf';

    if (!isPdf) {
      if (this.uploadErrorMsg) {
        this.uploadErrorMsg.textContent = 'Only PDF (.pdf) files are supported. Please select a PDF resume.';
        this.uploadErrorMsg.style.display = 'block';
      }
      this.removeUploadedFile();
      return;
    }

    if (file.size > maxBytes) {
      if (this.uploadErrorMsg) {
        this.uploadErrorMsg.textContent = 'File too large — please upload a resume under 5MB';
        this.uploadErrorMsg.style.display = 'block';
      }
      this.removeUploadedFile();
      return;
    }

    // Reset error message on valid file selection
    if (this.uploadErrorMsg) {
      this.uploadErrorMsg.style.display = 'none';
      this.uploadErrorMsg.textContent = '';
    }

    this.uploadedFile = file;
    this.resumeDropzone!.style.display = 'none';
    this.resumeFilePreview!.style.display = 'flex';
    this.previewFileName!.textContent = file.name;
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    this.previewFileMeta!.textContent = `Document • ${sizeMb} MB • ${ext}`;
    
    this.btnUploadResume!.classList.remove('disabled');
    this.btnUploadResume!.removeAttribute('disabled');
    this.resumeSuccessState!.style.display = 'none';
    this.resumeSuccessState!.classList.remove('active');
    this.updateExpansionState();
  }

  private removeUploadedFile() {
    this.uploadedFile = null;
    if (this.resumeDropzone) this.resumeDropzone.style.display = 'flex';
    if (this.resumeFilePreview) this.resumeFilePreview.style.display = 'none';
    if (this.resumeFileInput) this.resumeFileInput.value = '';
    if (this.btnUploadResume) {
      this.btnUploadResume.classList.add('disabled');
      this.btnUploadResume.setAttribute('disabled', 'true');
    }
    // Also clear error state if any
    if (this.uploadErrorMsg) {
      this.uploadErrorMsg.style.display = 'none';
      this.uploadErrorMsg.textContent = '';
    }
    this.updateExpansionState();
  }

  private startResumeUpload() {
    if (!this.uploadedFile) return;
    const file = this.uploadedFile;
    this.resumeDropzone!.style.display = 'none';
    this.resumeFilePreview!.style.display = 'none';
    this.resumeUploadProgress!.style.display = 'block';
    this.btnUploadResume!.style.display = 'none';
    this.updateExpansionState();

    // Reset progress UI
    this.progressFillElement!.style.width = '0%';
    this.progressPercentStats!.textContent = '0%';
    if (this.uploadErrorMsg) {
      this.uploadErrorMsg.style.display = 'none';
      this.uploadErrorMsg.textContent = '';
    }

    // 1. Simulate visual progress bar until upload/parse completes (capped at 90%)
    let progress = 0;
    this.uploadIntervalId = setInterval(() => {
      if (progress < 90) {
        progress += Math.floor(Math.random() * 8) + 3;
        if (progress > 90) progress = 90;
        this.progressFillElement!.style.width = `${progress}%`;
        this.progressPercentStats!.textContent = `${progress}%`;
      }
    }, 250);

    // 2. Read file as base64 and upload
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      
      chrome.runtime.sendMessage({
        action: 'uploadResume',
        payload: {
          fileName: file.name,
          fileType: file.type,
          base64: base64
        }
      }, (res) => {
        if (this.uploadIntervalId) {
          clearInterval(this.uploadIntervalId);
        }
        
        if (res && res.success) {
          // Success! Fast-forward to 100%
          this.progressFillElement!.style.width = '100%';
          this.progressPercentStats!.textContent = '100%';
          
          setTimeout(() => {
            this.resumeUploadProgress!.style.display = 'none';
            this.resumeSuccessState!.style.display = 'flex';
            this.resumeSuccessState!.classList.add('active');
            this.removeUploadedFile(); // Will clear file and reset elements but updateExpansionState keeps it open due to isSuccess
            
            this.btnUploadResume!.style.display = 'block';
            this.btnUploadResume!.classList.add('disabled');
            this.btnUploadResume!.setAttribute('disabled', 'true');
            this.updateExpansionState();
            
            // Dispatch session refresh to reload states
            this.element.dispatchEvent(new CustomEvent('refresh-session'));

            // Auto-collapse after 3 seconds of showing success check animation
            setTimeout(() => {
              this.resumeSuccessState!.style.display = 'none';
              this.resumeSuccessState!.classList.remove('active');
              this.updateExpansionState();
            }, 3000);
          }, 500);
        } else {
          // Failure - show backend error
          const errMsg = res?.error || 'Failed to parse resume PDF. Please check file formatting.';
          if (this.uploadErrorMsg) {
            this.uploadErrorMsg.textContent = errMsg;
            this.uploadErrorMsg.style.display = 'block';
          }
          this.resumeUploadProgress!.style.display = 'none';
          this.btnUploadResume!.style.display = 'block';
          this.removeUploadedFile();
        }
      });
    };
    
    reader.onerror = () => {
      if (this.uploadIntervalId) clearInterval(this.uploadIntervalId);
      if (this.uploadErrorMsg) {
        this.uploadErrorMsg.textContent = 'FileReader error while reading local file.';
        this.uploadErrorMsg.style.display = 'block';
      }
      this.resumeUploadProgress!.style.display = 'none';
      this.btnUploadResume!.style.display = 'block';
      this.removeUploadedFile();
    };
    
    reader.readAsDataURL(file);
  }

  private cancelResumeUpload() {
    if (this.uploadIntervalId) {
      clearInterval(this.uploadIntervalId);
    }
    this.resumeUploadProgress!.style.display = 'none';
    this.btnUploadResume!.style.display = 'block';
    this.removeUploadedFile();
  }

  private showDragArrows(show: boolean) {
    const displayVal = show ? 'block' : 'none';
    if (this.dragArrowLeft) this.dragArrowLeft.style.display = displayVal;
    if (this.dragArrowRight) this.dragArrowRight.style.display = displayVal;
  }

  private updateProfileUI() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['email'], (res) => {
        const email = res.email || 'user@hirenext.ai';
        if (this.dropdownUserEmail) this.dropdownUserEmail.textContent = email;
        const avatarLetters = this.shadow.getElementById('avatar-letters');
        if (avatarLetters) {
          const parts = email.split('@')[0];
          avatarLetters.textContent = parts ? parts.substring(0, 2).toUpperCase() : 'HN';
        }

        // Fetch user profile from background to check for photo URL
        chrome.runtime.sendMessage({ action: 'getProfile' }, (profileRes) => {
          const btnProfile = this.shadow.getElementById('toolbar-btn-profile');
          if (!btnProfile) return;

          const genericSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

          if (profileRes && profileRes.success && profileRes.data) {
            const profile = profileRes.data;
            
            // Support photo_url, avatar_url, picture, photo, avatar
            const photoUrl = profile.photo_url || profile.avatar_url || profile.picture || profile.photo || profile.avatar;

            if (photoUrl) {
              btnProfile.innerHTML = `<img id="profile-avatar-img" src="${photoUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`;
              btnProfile.style.padding = '0';
              btnProfile.style.overflow = 'hidden';
              btnProfile.style.background = 'transparent';

              // Handle image load error: fall back to generic icon
              const img = btnProfile.querySelector('#profile-avatar-img');
              if (img) {
                img.addEventListener('error', () => {
                  btnProfile.innerHTML = genericSvg;
                  btnProfile.style.padding = '';
                  btnProfile.style.overflow = '';
                  btnProfile.style.background = '';
                });
              }
            } else {
              btnProfile.innerHTML = genericSvg;
              btnProfile.style.padding = '';
              btnProfile.style.overflow = '';
              btnProfile.style.background = '';
            }
          } else {
            btnProfile.innerHTML = genericSvg;
            btnProfile.style.padding = '';
            btnProfile.style.overflow = '';
            btnProfile.style.background = '';
          }
        });
      });
    }
  }

  private updateLoginUrl() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'getLoginUrl' }, (res) => {
        if (res && res.success && res.data) {
          const loginLink = this.shadow.getElementById('btn-login-link');
          if (loginLink) {
            loginLink.setAttribute('href', res.data);
          }
        }
      });
    }
  }

  private fetchAndRenderApplications() {
    const listContainer = this.shadow.getElementById('recent-applications-list');
    if (!listContainer) return;

    chrome.runtime.sendMessage({ action: 'getApplications' }, (res) => {
      if (res && res.success && Array.isArray(res.data)) {
        const apps = res.data;
        if (apps.length === 0) {
          listContainer.innerHTML = `
            <div style="text-align:center; padding: 20px 10px; font-size:11px; color:#a0a5c0; font-style:italic; border: 1px dashed #23273a; border-radius: 8px; background: #161822; line-height: 1.4;">
              No applications tracked yet — apply to a job to see it here.
            </div>
          `;
          return;
        }

        listContainer.innerHTML = '';
        const recentApps = apps.slice(0, 5);
        recentApps.forEach((app: any) => {
          const card = document.createElement('div');
          card.className = 'tracking-card';
          card.style.background = '#1a1d29';
          card.style.border = '1px solid #23273a';
          card.style.borderRadius = '8px';
          card.style.padding = '10px 12px';
          card.style.display = 'flex';
          card.style.justifyContent = 'space-between';
          card.style.alignItems = 'center';
          card.style.gap = '8px';

          let timeAgo = 'recently';
          if (app.date_applied) {
            const date = new Date(app.date_applied);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
              timeAgo = 'today';
            } else if (diffDays === 1) {
              timeAgo = '1 day ago';
            } else {
              timeAgo = `${diffDays} days ago`;
            }
          }

          let badgeBg = 'rgba(108, 92, 231, 0.15)';
          let badgeColor = '#a29bfe';
          const status = app.status || 'Applied';
          if (status.toLowerCase() === 'applied') {
            badgeBg = 'rgba(0, 184, 148, 0.15)';
            badgeColor = '#00b894';
          } else if (status.toLowerCase() === 'interview' || status.toLowerCase() === 'interviewing') {
            badgeBg = 'rgba(253, 203, 110, 0.15)';
            badgeColor = '#fdcb6e';
          } else if (status.toLowerCase() === 'rejected' || status.toLowerCase() === 'declined') {
            badgeBg = 'rgba(255, 107, 107, 0.15)';
            badgeColor = '#ff6b6b';
          }

          card.innerHTML = `
            <div style="min-width: 0; flex: 1; text-align: left;">
              <div style="font-size: 11.5px; font-weight: 600; color: #f5f6fa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${this.escapeHTML(app.role)}</div>
              <div style="font-size: 9.5px; color: #a0a5c0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${this.escapeHTML(app.company)} • ${timeAgo}</div>
            </div>
            <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 700; flex-shrink: 0;">${this.escapeHTML(status)}</span>
          `;
          listContainer.appendChild(card);
        });
      } else {
        listContainer.innerHTML = `
          <div style="text-align:center; padding: 20px 10px; font-size:11px; color:#ff6b6b; font-style:italic; border: 1px dashed rgba(255,107,107,0.2); border-radius: 8px; background: #161822;">
            Failed to load application history.
          </div>
        `;
      }
    });
  }

  public showState(state: 'auth-required' | 'resume-required' | 'ready-to-fill' | 'loading' | 'review-mapping' | 'connection-error') {
    this.currentSessionState = state;

    // Refresh profile UI if loaded
    this.updateProfileUI();

    // If the panel is closed, do not force it open or change the active tab.
    if (!this.activeTab || this.contentPanel!.style.display !== 'flex') {
      return;
    }

    const screensMap: Record<'auth-required' | 'profile' | 'resume-required' | 'resume-upload' | 'find-job' | 'ready-to-fill' | 'loading' | 'review-mapping' | 'connection-error', HTMLElement | null> = {
      'auth-required': this.screenAuth,
      'profile': this.screenProfile,
      'resume-required': this.screenResume,
      'resume-upload': this.screenResumeUpload,
      'find-job': this.screenFindJob,
      'ready-to-fill': this.screenReady,
      'loading': this.screenLoading,
      'review-mapping': this.screenReview,
      'connection-error': this.screenConnection
    };

    [
      this.screenAuth, this.screenProfile, this.screenResume, this.screenResumeUpload,
      this.screenFindJob, this.screenReady, this.screenLoading, this.screenReview, this.screenConnection
    ].forEach(s => {
      if (s) {
        s.classList.remove('active');
        s.classList.remove('active-stepper-state');
      }
    });

    if (state === 'auth-required') {
      this.activeTab = 'profile';
      this.updateActiveTabHighlight();
      if (this.screenAuth) this.screenAuth.classList.add('active');
      if (this.panelTitle) this.panelTitle.textContent = 'Account Authentication';
    } else if (state === 'resume-required') {
      this.activeTab = 'resume';
      this.updateActiveTabHighlight();
      if (this.screenResume) {
        this.screenResume.classList.add('active');
        this.screenResume.classList.add('active-stepper-state');
      }
      if (this.panelTitle) this.panelTitle.textContent = 'Profile Resume Builder';
    } else if (state === 'ready-to-fill') {
      this.activeTab = 'tracking';
      this.updateActiveTabHighlight();
      if (this.screenReady) this.screenReady.classList.add('active');
      if (this.panelTitle) this.panelTitle.textContent = 'Job Tracking & Autofill';
      this.fetchAndRenderApplications();
    } else {
      // Overlays: loading, review-mapping, connection-error
      const active = screensMap[state];
      if (active) active.classList.add('active');
      
      if (this.panelTitle) {
        const overlayTitles = {
          'loading': 'Processing Request',
          'review-mapping': 'Autofill Completed',
          'connection-error': 'Connection Error'
        };
        this.panelTitle.textContent = overlayTitles[state] || 'Assistant';
      }
    }
  }

  public showNetworkError(message: string) {
    // TODO: Kunal will specify how this should be shown
    // this.showState('connection-error');
    this.showState('ready-to-fill');
    const msgEl = this.shadow.getElementById('connection-error-msg');
    if (msgEl) msgEl.textContent = message;
  }

  public setLoadingTitle(title: string) {
    const titleEl = this.shadow.getElementById('loading-title');
    if (titleEl) titleEl.textContent = title;
  }

  // Stepper Controller Q&A resume builder
  private setupWizardStepper() {
    const prev = this.shadow.getElementById('w-prev') as HTMLButtonElement;
    const next = this.shadow.getElementById('w-next') as HTMLButtonElement;
    
    const updateWizardStep = () => {
      const steps = this.shadow.querySelectorAll('.wizard-step');
      steps.forEach(s => {
        const stepNum = parseInt(s.getAttribute('data-step') || '0');
        if (stepNum === this.currentStep) {
          s.classList.add('active');
        } else {
          s.classList.remove('active');
        }
      });

      const fill = this.shadow.getElementById('wizard-progress') as HTMLElement;
      fill.style.width = `${((this.currentStep - 1) / (this.totalSteps - 1)) * 100}%`;
      next.textContent = this.currentStep === this.totalSteps ? 'Generate ATS' : 'Next';
    };

    next.onclick = () => {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        updateWizardStep();
      } else {
        // Build final profile payload
        this.wizardAnswers = {
          name: (this.shadow.getElementById('w-name') as HTMLInputElement).value,
          phone: (this.shadow.getElementById('w-phone') as HTMLInputElement).value,
          career_goal: (this.shadow.getElementById('w-goal') as HTMLInputElement).value,
          education: {
            degree: (this.shadow.getElementById('w-degree') as HTMLInputElement).value,
            school: (this.shadow.getElementById('w-school') as HTMLInputElement).value,
            graduation_year: (this.shadow.getElementById('w-grad') as HTMLInputElement).value
          },
          experience: {
            company: (this.shadow.getElementById('w-company') as HTMLInputElement).value,
            role: (this.shadow.getElementById('w-role') as HTMLInputElement).value,
            dates: 'Present',
            description: (this.shadow.getElementById('w-desc') as HTMLTextAreaElement).value
          },
          skills: (this.shadow.getElementById('w-skills') as HTMLInputElement).value
        };

        this.element.dispatchEvent(new CustomEvent('resume-builder-completed', {
          detail: { answers: this.wizardAnswers }
        }));
      }
    };

    prev.onclick = () => {
      if (this.currentStep > 1) {
        this.currentStep--;
        updateWizardStep();
      }
    };

    updateWizardStep();
  }

  // Populate mapped fields in review list
  public populateReviewList(fields: Array<{ labelText: string, resolvedValue: string | null, isLowConfidence: boolean }>) {
    const container = this.shadow.getElementById('review-mapping-container');
    if (!container) return;

    container.innerHTML = '';
    fields.forEach(field => {
      const item = document.createElement('div');
      item.className = `mapping-item ${field.isLowConfidence ? 'low-confidence' : ''}`;
      
      const badge = field.isLowConfidence 
        ? `<span class="badge-warning">Manual</span>` 
        : `<span class="badge-success" style="color:#00b894; font-size:10px; font-weight:700;">OK</span>`;

      item.innerHTML = `
        <div>
          <div class="mapping-label">${this.escapeHTML(field.labelText || 'Question')}</div>
          <div class="mapping-val">${this.escapeHTML(field.resolvedValue || 'Left empty')}</div>
        </div>
        ${badge}
      `;
      container.appendChild(item);
    });
  }

  private escapeHTML(str: string): string {
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

  public openSidebar() {
    this.isOpen = true;
    this.currentTranslate = 0;
    if (this.toolbar) {
      this.toolbar.style.transform = 'translateX(0)';
    }
    const arrow = this.shadow.getElementById('pull-arrow-icon');
    if (arrow) {
      arrow.style.transform = 'rotate(180deg)';
    }
    this.element.classList.add('open');
    this.element.dispatchEvent(new CustomEvent('open-sidebar-state'));
  }

  public closeSidebar() {
    this.isOpen = false;
    this.currentTranslate = 80;
    if (this.toolbar) {
      this.toolbar.style.transform = 'translateX(80px)';
    }
    const arrow = this.shadow.getElementById('pull-arrow-icon');
    if (arrow) {
      arrow.style.transform = 'rotate(0deg)';
    }
    if (this.contentPanel) {
      this.contentPanel.style.display = 'none';
    }
    this.activeTab = null;
    this.updateActiveTabHighlight();
    this.element.classList.remove('open');
    this.element.dispatchEvent(new CustomEvent('close-sidebar'));
    this.element.dispatchEvent(new CustomEvent('close-sidebar-state'));
  }

  public updateAutofillCard(isJobPage: boolean, platform?: string) {
    const cardEmoji = this.shadow.getElementById('autofill-card-emoji');
    const cardTitle = this.shadow.getElementById('autofill-card-title');
    const cardText = this.shadow.getElementById('autofill-card-text');
    const fillBtn = this.shadow.getElementById('btn-fill-action');

    if (platform === 'indeed') {
      if (cardEmoji) cardEmoji.textContent = '💼';
      if (cardTitle) cardTitle.textContent = 'Platform Not Supported Yet';
      if (cardText) cardText.textContent = 'Form prefilling is currently only supported on LinkedIn Easy Apply and Naukri.com.';
      if (fillBtn) fillBtn.style.display = 'none';
      return;
    }

    if (isJobPage) {
      if (cardEmoji) cardEmoji.textContent = '⚡';
      if (cardTitle) cardTitle.textContent = 'Application Autocompleter';
      if (cardText) cardText.textContent = 'Our AI agent will match the form questions to your profile. You review before submitting.';
      if (fillBtn) fillBtn.style.display = 'inline-flex';
    } else {
      if (cardEmoji) cardEmoji.textContent = '💼';
      if (cardTitle) cardTitle.textContent = 'Job Application Gated';
      if (cardText) cardText.textContent = 'Navigate to a job description page with "Easy Apply" to enable the AI Form Autocompleter.';
      if (fillBtn) fillBtn.style.display = 'none';
    }
  }
}

// Expose the sidebar class in the global scope of the isolated world
(window as any).HirenextAISidebar = HirenextAISidebar;
