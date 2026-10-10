import { canUseModel } from '../lib/modelAccess';
import { workspaceStorage, workspaceScope } from '../lib/workspaceStorage';
import { create } from 'zustand';
import { autoSaveFromAIResponse } from '../lib/aiFileSaver';
import api from '../lib/api';
import useUserStore from './useUserStore';
import useUIStore from './useUIStore';

const isDemoPath = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return path === '/demo' || path === '/preview';
};

const getStorage = () => workspaceStorage;
const getChatKey = () => 'chatHistory';
const loadChats = () => {
  try {
    return JSON.parse(getStorage().getItem(getChatKey()) || '[]');
  } catch {
    return [];
  }
};
const saveChats = (chats) => {
  getStorage().setItem(getChatKey(), JSON.stringify(chats));
};

const generateSmartTitle = (content) => {
  const lower = content.toLowerCase();
  if (lower.includes('resume') || lower.includes('cv')) {
    const match = content.match(/(?:for|as|a)\s+([a-zA-Z\s.-]{3,25})(?:\s+position|\s+role|\b)/i);
    const role = match ? match[1].trim() : '';
    return role ? `${role.replace(/\b\w/g, c => c.toUpperCase())} Resume Review` : 'AI Resume Review';
  }
  if (lower.includes('interview')) {
    const match = content.match(/(?:at|with|for)\s+([a-zA-Z\s.-]{3,20})/i);
    const company = match ? match[1].trim() : '';
    return company ? `${company.replace(/\b\w/g, c => c.toUpperCase())} Interview Prep` : 'AI Interview Prep';
  }
  if (lower.includes('cover letter')) {
    const match = content.match(/(?:for|at)\s+([a-zA-Z\s.-]{3,20})/i);
    const target = match ? match[1].trim() : '';
    return target ? `AI Cover Letter — ${target.replace(/\b\w/g, c => c.toUpperCase())}` : 'AI Cover Letter';
  }
  if (lower.includes('roadmap') || lower.includes('career path') || lower.includes('career goals') || lower.includes('coach')) {
    const match = content.match(/(?:for|as|to\s+become\s+a)\s+([a-zA-Z\s.-]{3,25})/i);
    const role = match ? match[1].trim() : '';
    return role ? `${role.replace(/\b\w/g, c => c.toUpperCase())} Career Roadmap` : 'AI Career Roadmap';
  }
  return content.substring(0, 30) + (content.length > 30 ? '...' : '');
};

const useChatStore = create((set, get) => {
  const savedChats = loadChats();
  const savedModel = workspaceStorage.getItem('selectedModel') || 'hirenext-flash';

  return {
    chats: savedChats,
    currentChatId: null,
    messages: [],
    isTyping: false,
    selectedModel: savedModel,

    setSelectedModel: (model) => {
      if (!canUseModel(model, useUserStore.getState().user)) { useUIStore.getState().setPricingModalOpen(true); return; }
      set({ selectedModel: model });
      workspaceStorage.setItem('selectedModel', model);
    },

    setCurrentChat: (id) => {
      const chats = loadChats();
      const chat = chats.find((c) => c.id === id);
      set({
        chats,
        currentChatId: id,
        messages: chat ? chat.messages : [],
      });
    },

    startNewChat: () => {
      set({ currentChatId: null, messages: [] });
      if (!isDemoPath() && localStorage.getItem('token')) {
        api.post('/api/ai/clear').catch(() => {});
      }
    },

    hydrate: () => { const chats = loadChats(); const model = workspaceStorage.getItem('selectedModel') || 'hirenext-flash'; set({ chats, currentChatId: null, messages: [], isTyping: false, selectedModel: canUseModel(model, useUserStore.getState().user) ? model : 'hirenext-flash' }); },

    sendMessage: async (content) => {
      const requestScope = workspaceScope();
      if (isDemoPath()) {
        const started = Number(sessionStorage.getItem('demo_started_at')) || Date.now();
        const count = Number(sessionStorage.getItem('demo_ai_responses')) || 0;
        if (count >= 3 || Date.now() - started >= 600000) { useUIStore.getState().showToast('Demo limit reached. Sign up to continue in your own workspace.'); return; }
        const { currentChatId, messages } = get();
        const newMessage = {
          id: Date.now().toString(),
          role: 'user',
          content,
          timestamp: new Date().toISOString(),
        };
        const demoReply = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'This is a sample response. Demo chats stay in this tab until you close it. Sign up or log in to save conversations and use live HirenextAI responses.',
          timestamp: new Date().toISOString(),
        };
        const nextMessages = [...messages, newMessage, demoReply];
        const demoChatId = currentChatId || `demo-${Date.now()}`;
        const otherChats = loadChats().filter((c) => c.id !== demoChatId);
        const nextChat = {
          id: demoChatId,
          title: generateSmartTitle(content),
          messages: nextMessages,
          createdAt: new Date().toISOString(),
          pinned: false,
          archived: false,
        };
        const nextChats = [nextChat, ...otherChats];
        set({ currentChatId: demoChatId, chats: nextChats, messages: nextMessages, isTyping: false });
        saveChats(nextChats);
        sessionStorage.setItem('demo_ai_responses', String(count + 1));
        window.dispatchEvent(new CustomEvent('hn-demo-ai-response'));
        return;
      }

      const { currentChatId, chats, messages } = get();
      const newMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      let newMessages = [...messages, newMessage];
      let newChatId = currentChatId;
      let newChats = [...chats];

      if (!currentChatId) {
        newChatId = Date.now().toString();
        const newChat = {
          id: newChatId,
          title: generateSmartTitle(content),
          messages: newMessages,
          createdAt: new Date().toISOString(),
          pinned: false,
          archived: false,
        };
        newChats = [newChat, ...chats];
        set({ currentChatId: newChatId, chats: newChats, messages: newMessages });
      } else {
        newChats = chats.map((c) =>
          c.id === currentChatId ? { ...c, messages: newMessages } : c
        );
        set({ messages: newMessages, chats: newChats });
      }

      saveChats(newChats);
      set({ isTyping: true });

      const token = localStorage.getItem('token');
      if (!token) {
        set({ isTyping: false });
        useUIStore.getState().showToast('Please sign in to chat with HirenextAI');
        return;
      }

      try {
        const user = useUserStore.getState().user || {};
        const userContext = {
          jobTitle: user.jobTitle || user.role || '',
          skills: user.skills || '',
          experience: user.experience || '',
        };

        const response = await api.post('/api/ai/chat', {
          message: content,
          model: get().selectedModel,
          userContext,
        });

        if (workspaceScope() !== requestScope) return;
        let aiText = response.data?.response || '';
        if (!aiText.trim()) {
          throw new Error('Empty AI response');
        }

        let parsedJob = null;
        let parsedJobs = [];
        let parsedResumeReview = null;
        let parsedImageGen = null;
        let showMemoryConsent = false;

        // 1. Search for ALL JSON blocks representing job cards
        const jobJsonRegex = /```json\s*(\{\s*"type"\s*:\s*"job_card"[\s\S]*?\})\s*```/g;
        let jobMatch;
        while ((jobMatch = jobJsonRegex.exec(aiText)) !== null) {
          try {
            const jobData = JSON.parse(jobMatch[1]);
            parsedJobs.push({
              id: jobData.id || `job-${Date.now()}-${parsedJobs.length}`,
              title: jobData.title || '',
              company: jobData.company || '',
              companyLogo: jobData.companyLogo || null,
              location: jobData.location || '',
              salary: jobData.salary || 'Competitive Salary',
              postedTime: jobData.postedTime || 'Just posted',
              workStyle: jobData.workStyle || jobData.remoteOrHybrid || 'Hybrid',
              experience: jobData.experience || 'Not Specified',
              employmentType: jobData.employmentType || 'Full-time',
              applyType: jobData.applyType || 'Direct Apply',
              match: jobData.match || 70,
              matchBreakdown: jobData.matchBreakdown || {
                resume: jobData.match || 70,
                skill: jobData.match || 70,
                experience: jobData.match || 70,
                salary: jobData.match || 70,
                location: jobData.match || 70
              },
              missingKeywords: jobData.missingKeywords || [],
              improvements: jobData.improvements || [],
              url: jobData.url || '#',
              description: jobData.description || '',
              platform: jobData.platform || 'Direct'
            });
          } catch (e) {
            console.error('Failed to parse job JSON from AI response:', e);
          }
        }

        // Remove all job_card JSON blocks from displayed text
        aiText = aiText.replace(/```json\s*\{\s*"type"\s*:\s*"job_card"[\s\S]*?\}\s*```/g, '').trim();

        // Backward compatibility: set parsedJob to first job if any found
        if (parsedJobs.length > 0) {
          parsedJob = parsedJobs[0];
        }

        // 2. Search for a JSON block representing a resume review
        const resumeReviewRegex = /```json\s*(\{\s*"type"\s*:\s*"resume_review"[\s\S]*?\})\s*```/;
        const resumeMatch = aiText.match(resumeReviewRegex);
        if (resumeMatch) {
          try {
            parsedResumeReview = JSON.parse(resumeMatch[1]);
            aiText = aiText.replace(resumeReviewRegex, '').trim();
          } catch (e) {
            console.error('Failed to parse resume review JSON:', e);
          }
        }

        // 3. Search for a JSON block representing image generation
        const imageGenRegex = /```json\s*(\{\s*"type"\s*:\s*"image_generation"[\s\S]*?\})\s*```/;
        const imageMatch = aiText.match(imageGenRegex);
        if (imageMatch) {
          try {
            parsedImageGen = JSON.parse(imageMatch[1]);
            aiText = aiText.replace(imageGenRegex, '').trim();
            
            // Trigger Image Gen Modal
            useUIStore.getState().setImageGenPrompt(parsedImageGen.prompt || 'Professional portfolio photo');
            useUIStore.getState().setImageGenStatus('generating');
            useUIStore.getState().setImageGenOpen(true);
          } catch (e) {
            console.error('Failed to parse image generation JSON:', e);
          }
        }

        // 4. Check for Memory Consent keyword
        if (aiText.includes('[Memory Consent]')) {
          showMemoryConsent = true;
          aiText = aiText.replace('[Memory Consent]', '').trim();
        }

        // 5. Automerge Extracted Resume Info if user memory consent is active
        const memoryConsentActive = workspaceStorage.getItem('hirenextai_profile_memory_consent') === 'true';
        if (memoryConsentActive && parsedResumeReview?.extractedResumeInfo) {
          try {
            const currentMemory = JSON.parse(workspaceStorage.getItem('hirenextai_profile_memory') || '{}');
            const merged = {
              ...currentMemory,
              ...parsedResumeReview.extractedResumeInfo,
              skills: Array.isArray(parsedResumeReview.extractedResumeInfo.skills) 
                ? parsedResumeReview.extractedResumeInfo.skills.join(', ')
                : parsedResumeReview.extractedResumeInfo.skills || currentMemory.skills || '',
              education: Array.isArray(parsedResumeReview.extractedResumeInfo.education)
                ? parsedResumeReview.extractedResumeInfo.education.join('; ')
                : parsedResumeReview.extractedResumeInfo.education || currentMemory.education || '',
              experience: Array.isArray(parsedResumeReview.extractedResumeInfo.experience)
                ? parsedResumeReview.extractedResumeInfo.experience.join('; ')
                : parsedResumeReview.extractedResumeInfo.experience || currentMemory.experience || ''
            };
            workspaceStorage.setItem('hirenextai_profile_memory', JSON.stringify(merged));
            console.log('[useChatStore] Successfully auto-synchronized parsed resume details to AI long-term profile memory.');
          } catch (memErr) {
            console.warn('[useChatStore] Failed to update long-term profile memory:', memErr.message);
          }
        }

        // 6. Streaming effect simulation
        const responseId = (Date.now() + 1).toString();
        const placeholderResponse = {
          id: responseId,
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          job: null,
          resumeReview: null,
          memoryConsent: false,
        };

        const initialMessages = [...get().messages, placeholderResponse];
        const initialChats = get().chats.map((c) =>
          c.id === get().currentChatId ? { ...c, messages: initialMessages } : c
        );

        set({
          messages: initialMessages,
          chats: initialChats,
          isTyping: true, // Keep mascot in thinking state during stream
        });

        const words = aiText.split(' ');
        let wordIndex = 0;
        let tempContent = '';

        const timer = setInterval(() => {
          if (workspaceScope() !== requestScope) { clearInterval(timer); return; }
          if (wordIndex < words.length) {
            tempContent += (wordIndex === 0 ? '' : ' ') + words[wordIndex];
            wordIndex++;

            const activeMsgs = get().messages.map((m) =>
              m.id === responseId ? { ...m, content: tempContent } : m
            );
            const activeChats = get().chats.map((c) =>
              c.id === get().currentChatId ? { ...c, messages: activeMsgs } : c
            );

            set({
              messages: activeMsgs,
              chats: activeChats,
            });
          } else {
            clearInterval(timer);

            // Finalize message state payload
            const finalizedMsgs = get().messages.map((m) =>
              m.id === responseId
                ? {
                    ...m,
                    content: aiText,
                    job: parsedJob,
                    jobs: parsedJobs.length > 0 ? parsedJobs : null,
                    resumeReview: parsedResumeReview,
                    memoryConsent: showMemoryConsent,
                    extractedResumeInfo: parsedResumeReview?.extractedResumeInfo
                  }
                : m
            );
            const finalizedChats = get().chats.map((c) =>
              c.id === get().currentChatId ? { ...c, messages: finalizedMsgs } : c
            );

            set({
              messages: finalizedMsgs,
              chats: finalizedChats,
              isTyping: false, // Transition mascot back to idle
            });

            saveChats(finalizedChats);
            
            // Auto Save generated templates
            autoSaveFromAIResponse(aiText, {
              jobTitle: parsedJob?.title,
              jobCompany: parsedJob?.company,
            });
          }
        }, 25); // 25ms per word for premium quick stream feel
      } catch (err) {
        if (workspaceScope() !== requestScope) return;
        console.error('Chat error:', err);
        const isLimitError = err.response?.status === 429;
        const errorMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'AI is temporarily unavailable. Please try again.';

        const errorResponse = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: isLimitError
            ? errorMsg
            : `Sorry, I could not reach HirenextAI right now. ${errorMsg}`,
          timestamp: new Date().toISOString(),
          job: null,
          isError: true,
        };

        const updatedMessages = [...get().messages, errorResponse];
        const updatedChats = get().chats.map((c) =>
          c.id === get().currentChatId ? { ...c, messages: updatedMessages } : c
        );

        set({
          messages: updatedMessages,
          chats: updatedChats,
          isTyping: false,
        });
        saveChats(updatedChats);
        useUIStore.getState().showToast(errorMsg);
      }
    },

    deleteChat: (id) => {
      const newChats = get().chats.filter((c) => c.id !== id);
      set({
        chats: newChats,
        currentChatId: get().currentChatId === id ? null : get().currentChatId,
        messages: get().currentChatId === id ? [] : get().messages,
      });
      saveChats(newChats);
    },

    pinChat: (id) => {
      const chats = get().chats;
      const targetChat = chats.find((c) => c.id === id);
      if (!targetChat) return false;
      const isAlreadyPinned = targetChat.pinned;

      if (!isAlreadyPinned) {
        const pinnedCount = chats.filter((c) => c.pinned && !c.archived).length;
        if (pinnedCount >= 5) {
          useUIStore.getState().showToast("You can pin a maximum of 5 chats");
          return false;
        }
      }

      const newChats = chats.map((c) =>
        c.id === id ? { ...c, pinned: !c.pinned } : c
      );
      set({ chats: newChats });
      saveChats(newChats);
      return !isAlreadyPinned;
    },

    archiveChat: (id) => {
      const newChats = get().chats.map((c) =>
        c.id === id ? { ...c, archived: true } : c
      );
      set({
        chats: newChats,
        currentChatId: get().currentChatId === id ? null : get().currentChatId,
        messages: get().currentChatId === id ? [] : get().messages,
      });
      saveChats(newChats);
    },

    restoreChat: (id) => {
      const newChats = get().chats.map((c) =>
        c.id === id ? { ...c, archived: false } : c
      );
      set({ chats: newChats });
      saveChats(newChats);
    },

    clearMessages: () => set({ messages: [] }),
  };
});

export default useChatStore;
