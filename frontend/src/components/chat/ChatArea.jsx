import { useState, useEffect } from 'react';
import { MoreHorizontal, Share2, Pin, Archive, Trash2, AlertCircle, PanelLeftOpen } from 'lucide-react';
import useChatStore from '../../store/useChatStore';
import useUserStore from '../../store/useUserStore';
import useUIStore from '../../store/useUIStore';
import { useTranslation } from '../../hooks/useTranslation';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import { useNavigate } from 'react-router-dom';
import { getPlanDisplay } from '../../lib/planUtils';
import { motion } from 'framer-motion';
import api from '../../lib/api';

const DeleteConfirmModal = ({ onConfirm, onCancel, t }) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
    <div className="fixed inset-0 bg-black/55 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative bg-white border border-[#E0E0E0] rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
      <div className="flex items-center gap-3 mb-4 text-black">
        <AlertCircle size={24} className="text-red-500" />
        <h3 className="text-lg font-bold text-black">{t('deleteChat')}?</h3>
      </div>
      <p className="text-gray-500 text-sm mb-6">This action cannot be undone. All messages in this conversation will be permanently removed.</p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-[#E0E0E0] text-black font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
        >
          {t('deleteChat')}
        </button>
      </div>
    </div>
  </div>
);

const ChatArea = ({ demo }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { messages, currentChatId, sendMessage, deleteChat, pinChat, archiveChat, restoreChat, chats, isTyping } = useChatStore();
  const { user } = useUserStore();
  const { setPricingModalOpen, showToast, isMobile, setMobileSidebarOpen } = useUIStore();

  const [greetingKey, setGreetingKey] = useState('goodMorning');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.chat-menu-container')) {
        setMenuOpen(false);
        setArchiveConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setShowDeleteModal(false);
        setArchiveConfirm(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreetingKey('goodMorning');
    else if (hour >= 12 && hour < 17) setGreetingKey('goodAfternoon');
    else if (hour >= 17 && hour < 21) setGreetingKey('goodEvening');
    else setGreetingKey('goodNight');
  }, []);

  const handleShare = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token && !demo) {
        showToast('Please sign in to share this chat.');
        return;
      }

      if (demo) {
        showToast('Share is not available in demo mode.');
        return;
      }

      const res = await api.post('/api/chat/share', {
        messages,
        title: currentChat?.title || 'Shared Chat',
        options: {}
      });

      const shareId = res.data.shareId;
      const shareLink = `${window.location.origin}/share/chat/${shareId}`;

      await navigator.clipboard.writeText(shareLink);
      showToast(t('linkCopied'));
      setMenuOpen(false);
    } catch (err) {
      console.error('Error sharing chat:', err);
      showToast('Failed to generate share link');
    }
  };

  const handlePin = () => {
    const isPinned = pinChat(currentChatId);
    showToast(isPinned ? t('chatPinned') : t('chatUnpinned'));
    setMenuOpen(false);
  };

  const handleArchive = () => {
    if (!archiveConfirm) {
      setArchiveConfirm(true);
      return;
    }
    archiveChat(currentChatId);
    showToast(t('chatArchived'));
    setMenuOpen(false);
    setArchiveConfirm(false);
    navigate('/chat');
  };

  const handleConfirmDelete = () => {
    deleteChat(currentChatId);
    setShowDeleteModal(false);
    setMenuOpen(false);
    showToast(t('chatDeleted'));
    navigate('/chat');
  };

  const quickActions = [
    { key: 'findJobs', text: t('findJobs') },
    { key: 'reviewResume', text: t('reviewResume') },
    { key: 'mockInterview', text: t('mockInterview') },
    { key: 'careerAdvice', text: t('careerAdvice') },
  ];

  const currentChat = chats.find((c) => c.id === currentChatId);
  const hasConversation = messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {showDeleteModal && (
        <DeleteConfirmModal
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
          t={t}
        />
      )}

      {/* Unified Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-white shrink-0 z-20">
        <div className="flex-1 flex items-center">
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1 text-gray-500 hover:text-black transition-colors mr-3"
              title="Open Sidebar"
            >
              <PanelLeftOpen size={18} />
            </button>
          )}
        </div>
        <h1 className="text-sm font-medium text-black/80">
          HirenextAI
          {demo && (
            <span className="text-gray-500 text-sm font-normal">/ {user?.firstName}</span>
          )}
        </h1>
        <div className="flex-1 flex justify-end items-center gap-3">
          <button
            onClick={() => setPricingModalOpen(true)}
            data-demo-lock="true"
            className="px-3 py-1 bg-[#F7F7F7] border border-[#E0E0E0] rounded-full text-[12px] text-black hover:bg-gray-100 transition-colors font-medium"
          >
            {getPlanDisplay(user?.plan)}
          </button>
          
          {hasConversation && (
            <div className="relative chat-menu-container">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`p-1 transition-colors ${menuOpen ? 'text-black' : 'text-gray-500 hover:text-black'}`}
              >
                <MoreHorizontal size={18} />
              </button>

              {menuOpen && (
                <div className="absolute top-full right-0 mt-2 w-[200px] bg-white border border-[#E0E0E0] rounded-[10px] p-1.5 shadow-2xl z-50 animate-fade-in">
                  <button
                    onClick={handleShare}
                    className="w-full flex items-center gap-[10px] px-3 py-2.5 rounded-md text-[13px] text-black/80 hover:bg-gray-50 transition-colors"
                  >
                    <Share2 size={16} className="text-gray-500" />
                    <span>{t('shareChat')}</span>
                  </button>
                  <button
                    onClick={handlePin}
                    className="w-full flex items-center gap-[10px] px-3 py-2.5 rounded-md text-[13px] text-black/80 hover:bg-gray-50 transition-colors"
                  >
                    <Pin
                      size={16}
                      className={currentChat?.pinned ? 'text-black fill-black' : 'text-gray-500'}
                    />
                    <span>{currentChat?.pinned ? t('chatUnpinned') : t('pinChat')}</span>
                  </button>

                  {archiveConfirm ? (
                    <div className="px-3 py-2 bg-white rounded-md mt-1 animate-fade-in border border-gray-100">
                      <p className="text-[12px] text-gray-500 mb-2">{t('archive')}?</p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleArchive}
                          className="text-[11px] font-bold text-white bg-black px-2 py-1 rounded hover:bg-black/90"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setArchiveConfirm(false)}
                          className="text-[11px] text-gray-400 px-2 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setArchiveConfirm(true)}
                      className="w-full flex items-center gap-[10px] px-3 py-2.5 rounded-md text-[13px] text-black/80 hover:bg-gray-50 transition-colors"
                    >
                      <Archive size={16} className="text-gray-500" />
                      <span>{t('archive')}</span>
                    </button>
                  )}

                  <div className="h-[1px] bg-gray-100 my-1 mx-1" />
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full flex items-center gap-[10px] px-3 py-2.5 rounded-md text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                    <span>{t('deleteChat')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Viewport Container */}
      <div className="flex-1 min-h-0 relative bg-white overflow-hidden">
        
        {/* Scrollable Viewport (holds messages or initial welcome) */}
        <div className="h-full overflow-y-auto scrollbar-none pb-[120px] md:pb-[140px] relative z-10">
          {hasConversation ? (
            <MessageList />
          ) : (
            /* Welcome / Initial Screen */
            <div className="max-w-[720px] mx-auto px-4 pt-[8vh] md:pt-[10vh] flex flex-col items-center pb-8">
              <div className="text-center w-full mb-6">
                <motion.h2 
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="text-4xl md:text-5xl font-extrabold text-black mb-4 tracking-tight leading-tight"
                >
                  What is your <span className="text-blue-700">next step?</span>
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="text-[#4B5563] text-base md:text-lg max-w-[540px] mx-auto leading-relaxed mb-4 font-medium"
                >
                  Prepare for the role you want. Start with a question, your resume or a little interview practice.
                </motion.p>
                
                {demo && (
                  <motion.span 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="inline-block text-[10px] px-3 py-1 bg-[#F7F7F7] border border-[#E0E0E0] text-black rounded-full uppercase tracking-wider font-semibold animate-pulse"
                  >
                    {t('demoMode')}
                  </motion.span>
                )}
              </div>

              {/* Chat Input & Mascot Container */}
              <div className="w-full relative z-[300] mb-8">
                <ChatInput embedded demo={demo} />
              </div>

              {/* Onboarding action cards grid */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 w-full mb-8"
              >
                {[
                  { icon: '📄', title: 'Review Resume', desc: 'Analyze and score your resume structure.', prompt: 'Review my resume' },
                  { icon: '💼', title: 'Find Jobs', desc: 'Search roles that match your career goals.', prompt: 'Find active job matching roles' },
                  { icon: '🎯', title: 'Career Roadmap', desc: 'Build a step-by-step career path roadmap.', prompt: 'Create a career roadmap for me' },
                  { icon: '🎤', title: 'Mock Interview', desc: 'Practice with real role-specific questions.', prompt: 'Start a mock interview prep session' },
                  { icon: '✉️', title: 'Cover Letter', desc: 'Create a tailored cover letter for a job.', prompt: 'Generate a matching cover letter' },
                  { icon: '📊', title: 'ATS Analysis', desc: 'Increase ATS compatibility and readability.', prompt: 'Perform an ATS score analysis on my profile' }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(item.prompt)}
                    className="chat-suggestion p-4 rounded-2xl border border-[#E0E0E0] bg-white hover:bg-neutral-50 hover:border-black active:scale-[0.98] hover:shadow-sm text-left transition-all duration-200 flex flex-col gap-2 group cursor-pointer"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                    <h3 className="text-sm font-semibold text-black">{item.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </button>
                ))}
              </motion.div>

              {/* Footer Disclaimer */}
              <p className="text-center text-[11px] text-[var(--text-placeholder)]">
                HirenextAI can make mistakes. Verify important information.
              </p>
            </div>
          )}
        </div>

        {/* Floating/Fixed Bottom Chat Input */}
        {hasConversation && !currentChat?.archived && (
          <div className="absolute bottom-0 inset-x-0 pb-4 sm:pb-6 md:pb-8 px-4 sm:px-6 md:px-8 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none flex flex-col items-center justify-end z-[300]">
            <div className="w-full max-w-3xl pointer-events-auto">
              <ChatInput demo={demo} />
            </div>
          </div>
        )}

        {hasConversation && currentChat?.archived && (
          /* Archived Notice */
          <div className="absolute bottom-0 inset-x-0 p-4 md:p-6 bg-white border-t border-[#E0E0E0] flex justify-center z-[300]">
            <div className="w-full max-w-3xl flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-[#E0E0E0] bg-[#F7F7F7] shadow-sm">
              <div className="flex items-center gap-3">
                <Archive className="w-5 h-5 text-gray-500 shrink-0" />
                <div className="text-left">
                  <h4 className="text-sm font-semibold text-black">This conversation is archived</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Restore this conversation to continue sending messages.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  restoreChat(currentChatId);
                  showToast('Conversation restored');
                }}
                className="w-full sm:w-auto px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-black/90 transition-all flex items-center justify-center gap-1.5"
              >
                Restore Conversation
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ChatArea;
