import { workspaceStorage } from '../lib/workspaceStorage';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, UserPlus, LogIn, X, Sparkles, MessageSquare } from 'lucide-react';
import anime from 'animejs/lib/anime.es.js';
import { modalOpen } from '../lib/animations';
import ChatLayout from '../components/layout/ChatLayout';
import ChatArea from '../components/chat/ChatArea';
import VoiceToVoiceOverlay from '../components/chat/VoiceToVoiceOverlay';
import ConnectAccountModal from '../components/modals/ConnectAccountModal';
import SettingsModal from '../components/modals/SettingsModal';
import SearchPopup from '../components/modals/SearchPopup';
import FilePreviewModal from '../components/modals/FilePreviewModal';
import ImageGenModal from '../components/modals/ImageGenModal';
import useAuthStore from '../store/useAuthStore';
import useUIStore from '../store/useUIStore';
import useChatStore from '../store/useChatStore';
import api from '../lib/api';

const DEMO_MAX_RESPONSES = 3;
const DEMO_DURATION = 600; // 10 minutes in seconds

const ChatPage = ({ demo }) => {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const location = useLocation();
  const { setDemoMode, user } = useAuthStore();
  const { showToast } = useUIStore();
  const [timeLeft, setTimeLeft] = useState(() => {
    if (!demo) return DEMO_DURATION;
    let started = Number(sessionStorage.getItem('demo_started_at'));
    if (!started) { started = Date.now(); sessionStorage.setItem('demo_started_at', String(started)); }
    return Math.max(0, DEMO_DURATION - Math.floor((Date.now() - started) / 1000));
  });
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showSparklesModal, setShowSparklesModal] = useState(false);
  const [aiResponseCount, setAiResponseCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    return workspaceStorage.getItem('hn_verification_banner_dismissed') === 'true';
  });
  const modalRef = useRef(null);

  const showUnverifiedBanner = !demo && user && !user.emailVerified && !bannerDismissed;

  const handleDismissBanner = () => {
    workspaceStorage.setItem('hn_verification_banner_dismissed', 'true');
    setBannerDismissed(true);
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await api.post('/api/auth/resend-verification');
      showToast('Verification email sent successfully');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to send verification email');
    } finally {
      setIsResending(false);
    }
  };

  const handleDemoInteraction = (e) => {
    if (demo) {
      const interactive = e.target.closest('button, input, textarea, select, a, [role="button"]');
      if (interactive) {
        const isLock = interactive.hasAttribute('data-demo-lock') ||
                       interactive.closest('[data-demo-lock="true"]');
        if (isLock) {
          e.preventDefault();
          e.stopPropagation();
          setShowSparklesModal(true);
        }
      }
    }
  };

  // Track AI response count from sessionStorage
  useEffect(() => {
    if (demo) {
      const stored = sessionStorage.getItem('demo_ai_responses');
      if (stored) setAiResponseCount(parseInt(stored, 10) || 0);
    }
  }, [demo]);

  // Listen for AI responses being sent (increment counter)
  useEffect(() => {
    if (!demo) return;
    const onAiResponse = () => {
      setAiResponseCount(prev => {
        const next = Number(sessionStorage.getItem('demo_ai_responses')) || 0;
        sessionStorage.setItem('demo_ai_responses', String(next));
        if (next >= DEMO_MAX_RESPONSES) {
          setTimeout(() => {
            setShowLimitModal(true);
            setTimeout(() => modalOpen('.demo-limit-modal'), 50);
          }, 500);
        }
        return next;
      });
    };
    window.addEventListener('hn-demo-ai-response', onAiResponse);
    return () => window.removeEventListener('hn-demo-ai-response', onAiResponse);
  }, [demo]);

  useEffect(() => {
    const chats = useChatStore.getState().chats;
    const target = location.state?.newChat ? null : (chatId || chats[0]?.id || null);
    if (chatId && !chats.some(chat => chat.id === chatId)) {
      showToast('Chat not found in this account.');
      navigate('/chats', { replace: true });
      return;
    }
    useChatStore.getState().setCurrentChat(target);
  }, [demo, chatId, location.key]);

  useEffect(() => {
    if (!demo) return;
    const onDemoSignup = () => setShowSparklesModal(true);
    window.addEventListener('hn-demo-signup', onDemoSignup);
    return () => window.removeEventListener('hn-demo-signup', onDemoSignup);
  }, [demo]);

  // 10-minute countdown timer
  useEffect(() => {
    if (!demo) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setShowExpiredModal(true);
          setTimeout(() => modalOpen('.demo-expired-modal'), 50);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [demo]);

  const formatTime = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const timerColor = timeLeft > 300 ? 'text-gray-700' : timeLeft > 120 ? 'text-yellow-600' : 'text-red-600';
  const timerBg = timeLeft > 300 ? 'bg-white border-[#E0E0E0]' : timeLeft > 120 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';

  const responsesLeft = Math.max(0, DEMO_MAX_RESPONSES - aiResponseCount);

  const clearDemoSession = () => {
    // Demo history stays isolated in this tab until it closes.


  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col relative bg-white">
      {demo && (
        <div className="w-full flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#F7F7F7] border-b border-[#E0E0E0] backdrop-blur-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E0E0E0] text-gray-500 text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-gray-600" />
            Demo — saved for this tab
          </div>

          <div className="flex items-center gap-3">
            {/* Response counter */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E0E0E0] bg-white">
              <MessageSquare className={`w-3.5 h-3.5 ${responsesLeft > 0 ? 'text-gray-600' : 'text-black'}`} />
              <span className={`font-mono font-bold text-sm ${responsesLeft > 0 ? 'text-gray-600' : 'text-black'}`}>
                {responsesLeft}/{DEMO_MAX_RESPONSES}
              </span>
            </div>

            {/* Timer */}
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${timerBg} ${timeLeft <= 60 ? 'animate-pulse' : ''}`}>
              <Clock className={`w-3.5 h-3.5 ${timerColor}`} />
              <span className={`font-mono font-bold text-sm ${timerColor}`}>{formatTime(timeLeft)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { clearDemoSession(); navigate('/register'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-black text-xs font-semibold hover:bg-white/90 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up Free
            </button>
            <button
              onClick={() => { clearDemoSession(); navigate('/login'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0E0E0] bg-white text-black text-xs font-semibold hover:bg-gray-50 transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              Log In
            </button>
            <button
              onClick={() => { clearDemoSession(); navigate('/'); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E0E0E0] bg-white text-black text-xs font-semibold hover:bg-gray-50 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Exit
            </button>
          </div>
        </div>
      )}

      {showUnverifiedBanner && (
        <div className="w-full flex-shrink-0 flex items-center justify-between px-6 py-2 bg-red-50 border-b border-red-100 text-red-700 backdrop-blur-md">
          <div className="w-6" />
          <div className="flex items-center gap-2 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Please verify your email address to secure your account.</span>
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="ml-2 bg-red-600 text-black rounded-lg px-4 py-1.5 text-xs transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700"
            >
              {isResending ? 'Sending...' : 'Resend Verification Link'}
            </button>
          </div>
          <button
            onClick={handleDismissBanner}
            className="p-1 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-100/50 transition-all"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 relative" onClickCapture={handleDemoInteraction}>
        <ChatLayout className="h-full">
          <ChatArea demo={demo} />
          <VoiceToVoiceOverlay />
          <ConnectAccountModal />
          <SettingsModal />
          <SearchPopup />
          <FilePreviewModal />
          <ImageGenModal />
        </ChatLayout>
      </div>

      {/* Demo Session Expired Modal */}
      {demo && (
        <AnimatePresence>
          {showExpiredModal && (
            <>
              <div className="fixed inset-0 z-[9998] bg-white/55 backdrop-blur-[12px] animate-fade-in" />
              <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-4 pointer-events-none">
                <div className="demo-expired-modal w-full max-w-[400px] bg-white border border-[#E0E0E0] rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl pointer-events-auto">
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-5 mx-auto">
                      <Clock className="w-6 h-6 text-black" />
                    </div>
                    <h2 className="text-xl font-bold text-black mb-2">Demo Session Ended</h2>
                    <p className="text-gray-600 text-xs mb-6 leading-relaxed max-w-[280px] mx-auto">
                      Your 10-minute demo has ended. Sign up free to get full access to HirenextAI — no credit card required.
                    </p>
                    <div className="space-y-3">
                      <button
                        onClick={() => { clearDemoSession(); navigate('/register'); }}
                        className="w-full h-11 bg-black text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all"
                      >
                        <UserPlus className="w-4 h-4" />
                        Sign Up Free
                      </button>
                      <button
                        onClick={() => { clearDemoSession(); navigate('/login'); }}
                        className="w-full h-11 border border-[#E0E0E0] bg-transparent text-black rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#F2F2F2] transition-all"
                      >
                        <LogIn className="w-4 h-4" />
                        Already have an account? Log In
                      </button>
                      <button
                        onClick={() => navigate('/')}
                        className="w-full h-11 border border-[#E0E0E0] bg-transparent text-black rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#F2F2F2] transition-all"
                      >
                        <X className="w-4 h-4" />
                        Back to Home
                      </button>
                    </div>
                    <p className="text-gray-600 text-[11px] mt-4">Free forever plan · Cancel anytime</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Demo Response Limit Modal */}
      {demo && (
        <AnimatePresence>
          {showLimitModal && (
            <>
              <div
                className="fixed inset-0 z-[9998] bg-white/55 backdrop-blur-[12px] animate-fade-in"
                onClick={() => setShowLimitModal(false)}
              />
              <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-4 pointer-events-none">
                <div className="demo-limit-modal w-full max-w-[400px] bg-white border border-[#E0E0E0] rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl pointer-events-auto">
                  <div className="relative z-10 flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-5">
                      <MessageSquare className="w-6 h-6 text-black" />
                    </div>
                    <h3 className="text-black font-bold text-xl mb-2">Demo Limit Reached</h3>
                    <p className="text-gray-600 text-xs mb-6 leading-relaxed max-w-xs">
                      You've used all {DEMO_MAX_RESPONSES} free AI responses in this demo. Create a free account for your own workspace and daily allowance.
                    </p>
                    <button
                      onClick={() => { clearDemoSession(); navigate('/register'); }}
                      className="w-full h-11 bg-black text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all mb-3"
                    >
                      <UserPlus className="w-4 h-4" />
                      Sign Up Free
                    </button>
                    <button
                      onClick={() => { clearDemoSession(); navigate('/login'); }}
                      className="w-full h-11 border border-[#E0E0E0] bg-transparent text-black rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#F2F2F2] transition-all mb-4"
                    >
                      <LogIn className="w-4 h-4" />
                      Log In
                    </button>
                    <button
                      onClick={() => setShowLimitModal(false)}
                      className="text-gray-500 text-xs hover:text-black transition-colors"
                    >
                      Continue browsing demo
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </AnimatePresence>
      )}

      {/* Sparkles Lock Modal overlay */}
      <AnimatePresence>
        {showSparklesModal && (
          <>
            <div
              className="fixed inset-0 z-[9998] bg-white/55 backdrop-blur-[12px] animate-fade-in"
              onClick={() => setShowSparklesModal(false)}
            />
            <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-4 pointer-events-none">
              <div className="w-full max-w-sm bg-white border border-[#E0E0E0] rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl pointer-events-auto">
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-5">
                    <Sparkles className="w-6 h-6 text-black" />
                  </div>
                  <h3 className="text-black font-bold text-lg mb-2">Create a free account to access this</h3>
                  <p className="text-gray-600 text-xs mb-6 leading-relaxed max-w-xs">
                    Sign up free to unlock Applications, Files, Interview prep and more.
                  </p>
                  <button
                    onClick={() => { setShowSparklesModal(false); navigate('/register'); }}
                    className="w-full h-11 bg-black text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-neutral-800 transition-all mb-3"
                  >
                    Sign Up Free
                  </button>
                  <button
                    onClick={() => { setShowSparklesModal(false); navigate('/login'); }}
                    className="w-full h-11 border border-[#E0E0E0] bg-transparent text-black rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#F2F2F2] transition-all mb-4"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => setShowSparklesModal(false)}
                    className="text-gray-500 text-xs hover:text-black transition-colors"
                  >
                    Continue browsing demo
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatPage;
