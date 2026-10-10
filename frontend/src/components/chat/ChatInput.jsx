import { useState, useRef, useEffect, useCallback } from 'react';
import { Plug, Send, Mic, MicOff, AudioLines, X, Volume2, VolumeX, FileText, FileArchive, FileCode, File, Image as ImageIcon, Download, Eye } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import useChatStore from '../../store/useChatStore';
import useUIStore from '../../store/useUIStore';
import FileUploadMenu from './FileUploadMenu';
import ModelSelector from './ModelSelector';
import api from '../../lib/api';
import Mascot from './Mascot';

const ChatInput = ({ embedded = false, className = '', demo = false }) => {
  const { t } = useTranslation();
  const { sendMessage, selectedModel, setSelectedModel, messages, isTyping, startNewChat, currentChatId } = useChatStore();
  const { plusPopupOpen, setPlusPopupOpen, showToast, previewItem, setPreviewItem } = useUIStore();

  const [input, setInput] = useState('');
  const [modelOpen, setModelOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [credits, setCredits] = useState(null);
  const [mascotState, setMascotState] = useState('idle');
  const [sendHovered, setSendHovered] = useState(false);
  const prevIsTypingRef = useRef(false);
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

  // Voice to Voice and Voice to Text states
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [lastSpokenMessageId, setLastSpokenMessageId] = useState('');
  
  const textareaRef = useRef(null);
  const dictationBaseRef = useRef('');
  const dictationFinalRef = useRef('');

  // Refs for tracking values inside SpeechRecognition async event handlers
  const isVoiceModeRef = useRef(false);
  const voiceTranscriptRef = useRef('');
  const inputRef = useRef('');
  const isMutedRef = useRef(false);
  const lastSpokenMessageIdRef = useRef('');

  // Timers and Recognition Refs
  const recognitionRef = useRef(null);
  const voiceTimerRef = useRef(null);
  const voiceTimeoutRef = useRef(null);
  const autoSendTimeoutRef = useRef(null);

  const fetchCredits = async () => {
    if (demo) return;
    try {
      const res = await api.get('/api/user/credits');
      setCredits(res.data);
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  const getPlaceholderText = () => {
    if (isListening) return "Listening... speak now";
    
    const hasResume = attachments.some(a => 
      a.name.toLowerCase().includes('resume') || 
      ['pdf', 'doc', 'docx'].includes(a.name.split('.').pop().toLowerCase())
    );
    if (hasResume) return "Ask me to improve your resume...";

    if (messages && messages.length > 0) {
      const isInterview = messages.some(m => 
        m.content?.toLowerCase().includes('interview') || 
        m.content?.toLowerCase().includes('mock')
      );
      if (isInterview) return "Ask your interview question...";

      const isJob = messages.some(m => 
        m.content?.toLowerCase().includes('job') || 
        m.content?.toLowerCase().includes('role') || 
        m.content?.toLowerCase().includes('hiring') ||
        m.content?.toLowerCase().includes('search')
      );
      if (isJob) return "What role are you looking for?";
    }

    return "How can I help you find your dream job today?";
  };

  useEffect(() => {
    fetchCredits();
  }, [messages, demo]);

  // Coordinate Mascot states
  useEffect(() => {
    if (isTyping) {
      // Stay in thinking during stream
      if (mascotState !== 'sent' && mascotState !== 'thinking') {
        setMascotState('thinking');
      }
    } else {
      if (prevIsTypingRef.current) {
        setMascotState('complete');
        const timer = setTimeout(() => {
          setMascotState('idle');
        }, 1500);
        return () => clearTimeout(timer);
      } else if (mascotState === 'complete') {
        // Wait for complete timer to finish
      } else {
        const isUserActive = isFocused || input.trim().length > 0 || attachments.length > 0 || isVoiceMode || isListening;
        if (isUserActive) {
          if (mascotState !== 'sent') {
            setMascotState('thinking');
          }
        } else {
          setMascotState('idle');
        }
      }
    }
    prevIsTypingRef.current = isTyping;
  }, [isTyping, isFocused, input, attachments, isVoiceMode, isListening, mascotState]);
  


  useEffect(() => {
    isVoiceModeRef.current = isVoiceMode;
  }, [isVoiceMode]);

  useEffect(() => {
    voiceTranscriptRef.current = voiceTranscript;
  }, [voiceTranscript]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    lastSpokenMessageIdRef.current = lastSpokenMessageId;
  }, [lastSpokenMessageId]);

  // Synchronize sessionSeconds to sessionStorage so that cleanup hook always gets latest value
  useEffect(() => {
    sessionStorage.setItem('hn_v2v_seconds', String(sessionSeconds));
  }, [sessionSeconds]);

  // Restore Voice session if transitioning from greeting screen to chat messages view
  // Also check if GEMINI_API_KEY is configured on the backend
  useEffect(() => {
    window.chatInputMounted = true;
    
    if (window.activeVoiceSession) {
      const session = window.activeVoiceSession;
      
      setIsVoiceMode(true);
      setIsMuted(session.isMuted);
      setVoiceTranscript(session.voiceTranscript);
      setSessionSeconds(session.sessionSeconds);
      setLastSpokenMessageId(session.lastSpokenMessageId);
      
      recognitionRef.current = session.recognition;
      voiceTimerRef.current = session.voiceTimer;
      voiceTimeoutRef.current = session.voiceTimeout;
      autoSendTimeoutRef.current = session.autoSendTimeout;
      
      // Clear global reference
      delete window.activeVoiceSession;
    }

    const checkConfig = async () => {
      try {
        const res = await api.get('/api/ai/config-check');
        if (res.data && res.data.hasGeminiKey === false) {
          showToast('AI replies are not available yet. You can still explore the workspace.');
        }
      } catch (err) {
        console.error('Failed to check AI config:', err);
      }
    };
    checkConfig();
  }, [showToast]);

  // Monitor 2-minute demo timer on /demo
  useEffect(() => {
    if (window.location.pathname === '/demo') {
      let demoStartTime = window.demoStartTime;
      if (!demoStartTime) {
        demoStartTime = Date.now();
        window.demoStartTime = demoStartTime;
      }
      
      const elapsed = Date.now() - demoStartTime;
      const remaining = 120 * 1000 - elapsed;
      
      if (remaining <= 0) {
        setIsVoiceMode(false);
        try {
          recognitionRef.current?.stop();
        } catch(e) {}
        window.speechSynthesis?.cancel();
      } else {
        const timer = setTimeout(() => {
          setIsVoiceMode(false);
          try {
            recognitionRef.current?.stop();
          } catch(e) {}
          window.speechSynthesis?.cancel();
        }, remaining);
        return () => clearTimeout(timer);
      }
    } else {
      delete window.demoStartTime;
    }
  }, []);

  // Listen for global clicks on "Exit Demo" to stop session immediately
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const exitBtn = e.target.closest('button');
      if (exitBtn && (exitBtn.textContent?.includes('Exit Demo') || exitBtn.innerText?.includes('Exit Demo'))) {
        setIsVoiceMode(false);
        try {
          recognitionRef.current?.stop();
        } catch(e) {}
        window.speechSynthesis?.cancel();
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  // Request Microphone Permission
  const requestMicPermission = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Voice input is not supported in this browser. Please use Chrome.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Mic permission denied:', err);
      showToast('Microphone access denied. Please allow microphone in browser settings.');
      return false;
    }
  };

  const setTranscript = (text) => {
    if (isVoiceModeRef.current) {
      setVoiceTranscript(text);
    } else {
      setInput(text);
    }
  };

  const autoSendVoiceMessage = async (text) => {
    if (!text.trim()) return;
    
    if (demo) {
      window.dispatchEvent(new CustomEvent('hn-demo-signup'));
      return;
    }
    setMascotState('sent');
    await sendMessage(text);
    setVoiceTranscript('');
  };

  const speakResponse = (text) => {
    if (!text || isMutedRef.current) {
      // If muted, restart listening immediately
      setTimeout(() => {
        if (isVoiceModeRef.current) {
          try {
            window.isMicStarting = true;
            recognitionRef.current?.start();
          } catch(e) {}
        }
      }, 300);
      return;
    }
    
    window.speechSynthesis.cancel(); // cancel any ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = isMutedRef.current ? 0 : 1;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';
    
    utterance.onend = () => {
      // After AI finishes speaking → restart listening
      if (isVoiceModeRef.current) {
        setTimeout(() => {
          try {
            window.isMicStarting = true;
            recognitionRef.current?.start();
          } catch(e) {}
        }, 300);
      }
    };
    
    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      if (isVoiceModeRef.current) {
        setTimeout(() => {
          try {
            window.isMicStarting = true;
            recognitionRef.current?.start();
          } catch(e) {}
        }, 300);
      }
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      let recognition = recognitionRef.current;
      if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.maxAlternatives = 1;
        recognitionRef.current = recognition;
      }

      recognition.onstart = () => {
        setIsListening(true);
        if (!isVoiceModeRef.current) {
          dictationBaseRef.current = inputRef.current;
          dictationFinalRef.current = '';
        }

        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          try {
            recognition.start();
          } catch(e) {}
        }
      };

      recognition.onspeechstart = () => {
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          try {
            recognition.start();
          } catch(e) {}
        }
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (!isVoiceModeRef.current && finalTranscript) {
          dictationFinalRef.current += finalTranscript;
        }

        const combined = isVoiceModeRef.current
          ? `${voiceTranscriptRef.current || ''}${finalTranscript}${interimTranscript}`.trim()
          : `${dictationBaseRef.current}${dictationFinalRef.current}${interimTranscript}`.trim();

        if (combined) {
          setTranscript(combined);
        }

        if (window.speechSynthesis && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          try {
            recognition.start();
          } catch(e) {}
        }
      };

      recognition.onerror = (event) => {
        console.error('Recognition error:', event.error);
        if (event.error === 'not-allowed') {
          showToast('Microphone blocked. Click the mic icon in your browser address bar to allow access.');
        } else if (event.error === 'no-speech') {
          // no-op
        } else {
          showToast('Voice error: ' + event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);

        const transcript = isVoiceModeRef.current
          ? voiceTranscriptRef.current
          : `${dictationBaseRef.current}${dictationFinalRef.current}`.trim() || inputRef.current;

        if (!isVoiceModeRef.current && transcript?.trim()) {
          setInput(transcript.trim());
        }

        if (isVoiceModeRef.current) {
          if (transcript && transcript.trim().length > 0) {
            autoSendTimeoutRef.current = setTimeout(() => {
              autoSendVoiceMessage(transcript);
            }, 800);
          } else {
            autoSendTimeoutRef.current = setTimeout(() => {
              if (isVoiceModeRef.current) {
                try {
                  window.isMicStarting = true;
                  recognitionRef.current?.start();
                } catch(e) {}
              }
            }, 500);
          }
        }
      };
    }

    return () => {
      // Check if we are still on chat or demo pages to verify if this is a transition
      const isStillInChatOrDemo = window.location.pathname.startsWith('/chat') || window.location.pathname.startsWith('/demo');
      
      if (isVoiceModeRef.current && isStillInChatOrDemo) {
        window.activeVoiceSession = {
          isVoiceMode: true,
          isMuted: isMutedRef.current,
          voiceTranscript: voiceTranscriptRef.current,
          sessionSeconds: parseInt(sessionStorage.getItem('hn_v2v_seconds') || '0', 10),
          lastSpokenMessageId: lastSpokenMessageIdRef.current,
          recognition: recognitionRef.current,
          voiceTimer: voiceTimerRef.current,
          voiceTimeout: voiceTimeoutRef.current,
          autoSendTimeout: autoSendTimeoutRef.current
        };
        
        // Schedule cleanup in case transition doesn't complete
        setTimeout(() => {
          if (!window.chatInputMounted) {
            try {
              window.activeVoiceSession?.recognition?.stop();
            } catch(e) {}
            window.speechSynthesis?.cancel();
            if (window.activeVoiceSession?.voiceTimer) clearInterval(window.activeVoiceSession.voiceTimer);
            if (window.activeVoiceSession?.voiceTimeout) clearTimeout(window.activeVoiceSession.voiceTimeout);
            if (window.activeVoiceSession?.autoSendTimeout) clearTimeout(window.activeVoiceSession.autoSendTimeout);
            delete window.activeVoiceSession;
          }
        }, 100);
      } else {
        recognitionRef.current?.stop();
        window.speechSynthesis?.cancel();
      }
      
      window.chatInputMounted = false;
    };
  }, []);



  // Watch for new assistant messages to speak them in voice mode
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    
    if (!isVoiceMode) return;
    
    if (lastMessage.role === 'assistant' && lastMessage.id !== lastSpokenMessageId) {
      setLastSpokenMessageId(lastMessage.id);
      speakResponse(lastMessage.content);
    }
  }, [messages, isVoiceMode, lastSpokenMessageId]);

  const startVoiceToText = async () => {
    if (demo) {
      window.dispatchEvent(new CustomEvent('hn-demo-signup'));
      return;
    }
    const hasPermission = await requestMicPermission();
    if (!hasPermission) return;
    
    try {
      window.isMicStarting = true;
      recognitionRef.current?.start();
    } catch (err) {
      // If already started, stop first then restart
      recognitionRef.current?.stop();
      setTimeout(() => {
        try {
          window.isMicStarting = true;
          recognitionRef.current?.start();
        } catch(e) {}
      }, 100);
    }
  };

  const startVoiceToVoice = async () => {
    if (demo) {
      window.dispatchEvent(new CustomEvent('hn-demo-signup'));
      return;
    }
    const hasPermission = await requestMicPermission();
    if (!hasPermission) return;
    
    setIsVoiceMode(true);
    setVoiceTranscript('');
    setSessionSeconds(0);
    
    try {
      window.isMicStarting = true;
      recognitionRef.current?.start();
    } catch (err) {
      recognitionRef.current?.stop();
      setTimeout(() => {
        try {
          window.isMicStarting = true;
          recognitionRef.current?.start();
        } catch(e) {}
      }, 100);
    }

    // Setup 10-minute timeout
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    voiceTimeoutRef.current = setTimeout(() => {
      exitVoiceMode();
      showToast('Voice session ended after 10 minutes');
    }, 10 * 60 * 1000);

    // Setup session timer counting up and auto-ending at 10:00 (600s)
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    voiceTimerRef.current = setInterval(() => {
      setSessionSeconds((prev) => {
        const next = prev + 1;
        if (next >= 600) {
          clearInterval(voiceTimerRef.current);
          exitVoiceMode();
          showToast('Voice session ended after 10 minutes');
          return 600;
        }
        return next;
      });
    }, 1000);
  };

  const exitVoiceMode = useCallback(() => {
    setIsVoiceMode(false);
    setVoiceTranscript('');
    setSessionSeconds(0);
    setIsMuted(false); // Reset mute state
    sessionStorage.removeItem('hn_v2v_seconds');

    // Stop recognition + synthesis
    try {
      recognitionRef.current?.stop();
    } catch(e) {}
    window.speechSynthesis?.cancel();

    // Clear timers
    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
    if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
  }, []);

  // Manage timer interval when isVoiceMode changes (recovers timer correctly on remount transition)
  useEffect(() => {
    if (isVoiceMode) {
      if (!voiceTimerRef.current) {
        voiceTimerRef.current = setInterval(() => {
          setSessionSeconds((prev) => {
            const next = prev + 1;
            if (next >= 600) {
              clearInterval(voiceTimerRef.current);
              exitVoiceMode();
              showToast('Voice session ended after 10 minutes');
              return 600;
            }
            return next;
          });
        }, 1000);
      }
    } else {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);
      voiceTimerRef.current = null;
      voiceTimeoutRef.current = null;
    }
  }, [isVoiceMode, exitVoiceMode, showToast]);

  const handleMicToggle = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      startVoiceToText();
    }
  };

  const toggleVoiceToText = handleMicToggle;

  const handleSend = () => {
    let finalContent = input.trim();
    if (attachments.length > 0) {
      const attachmentTokens = attachments.map(att => `[Attached file: ${att.name}]`).join('\n');
      finalContent = finalContent ? `${finalContent}\n${attachmentTokens}` : attachmentTokens;
    }

    if (!finalContent.trim()) return;
    try {
      recognitionRef.current?.stop();
    } catch(e) {}
    setMascotState('sent');
    sendMessage(finalContent.trim());
    setInput('');
    // Revoke object URLs to prevent memory leaks
    attachments.forEach(att => {
      if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
    });
    setAttachments([]);
    dictationBaseRef.current = '';
    dictationFinalRef.current = '';
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFilesSelect = (filesList) => {
    const newAtts = [];
    const ids = [];
    
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const id = Math.random().toString(36).substring(2, 9);
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
      newAtts.push({
        id,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
        progress: 0
      });
      ids.push(id);
    }

    if (newAtts.length === 0) return;

    setAttachments((prev) => [...prev, ...newAtts]);
    setMascotState('thinking');
    showToast(`Attached ${newAtts.length} file(s)`);

    // Simulate progress bar loader
    newAtts.forEach((att) => {
      let cur = 0;
      const interval = setInterval(() => {
        cur += Math.floor(Math.random() * 15) + 15;
        if (cur >= 100) {
          cur = 100;
          clearInterval(interval);
        }
        setAttachments((prev) =>
          prev.map((a) => (a.id === att.id ? { ...a, progress: cur } : a))
        );
      }, 80);
    });
  };

  const handleFileSelect = (file) => {
    handleFilesSelect([file]);
  };

  // Drag & Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFilesSelect(files);
      setMascotState('thinking');
    }
  };

  // Clipboard Paste listener
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }
      
      if (files.length > 0) {
        e.preventDefault();
        handleFilesSelect(files);
        setMascotState('thinking');
      }
    };
    
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('paste', handlePaste);
    }
    return () => {
      if (textarea) {
        textarea.removeEventListener('paste', handlePaste);
      }
    };
  }, [textareaRef]);

  const handleRemoveAttachment = (id) => {
    setAttachments((prev) => {
      const target = prev.find(a => a.id === id);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const handleDownloadAttachment = (att) => {
    const url = att.previewUrl || URL.createObjectURL(att.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (!att.previewUrl) {
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const style = window.getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 24;
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) || 12;
    const maxHeight = lineHeight * 8 + padding;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [input]);

  const formatVoiceTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const canSend = input.trim().length > 0 || attachments.length > 0;
  const hasActiveGlow = isFocused || isListening || input.length > 0 || attachments.length > 0;

  const inputGlowClass = isListening
    ? 'border-[#444444] shadow-[0_0_20px_rgba(255,255,255,0.05)] bg-[#0D0D0D]'
    : hasActiveGlow
      ? 'border-[#444444] shadow-[0_0_15px_rgba(255,255,255,0.05)] bg-[#0D0D0D]'
      : isHovered
        ? 'border-[#2A2A2A] shadow-[0_0_10px_rgba(255,255,255,0.03)] bg-[#0D0D0D]'
        : 'border-[#1F1F1F] shadow-lg shadow-black/20 bg-[#111111]';

  return (
    <div
      className={
        embedded
          ? `relative w-full ${className}`
          : `relative px-4 pb-4 pt-2 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/95 to-transparent`
      }
    >
      <style>{`
        @keyframes micPulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.2); }
          70% { box-shadow: 0 0 0 12px rgba(0, 0, 0, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); }
        }
        .dark @keyframes micPulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.3); }
          70% { box-shadow: 0 0 0 12px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        @keyframes micRedPulse {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        @keyframes voiceBounce {
          0%, 100% { height: 4px; }
          50% { height: 24px; }
        }
        .mic-listening {
          animation: micPulse 1.2s ease-out infinite;
        }
        .mic-muted {
          animation: micRedPulse 1.5s ease-out infinite;
        }
        .animate-voice-bounce {
          animation: voiceBounce 0.8s ease-in-out infinite;
        }
      `}</style>
      <div className={embedded ? 'w-full' : 'max-w-3xl mx-auto'}>
        <div className="relative w-full !overflow-visible">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`chat-input-bar relative rounded-2xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] transition-all duration-300 ease-in-out !overflow-visible ${
              modelOpen || plusPopupOpen ? 'z-[9000]' : 'z-[300]'
            } ${isVoiceMode ? 'shadow-[0_0_30px_rgba(255,255,255,0.05)]' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Mascot docked inside input wrapper to the top-right corner with 20-30px spacing */}
            <Mascot 
              chatState={mascotState} 
              sendHovered={sendHovered} 
              className="absolute pointer-events-none -top-16 right-4 sm:right-6 md:right-8 scale-[0.65] sm:scale-75 md:scale-90 lg:scale-100 origin-bottom transition-all duration-300 overflow-visible" 
            />
            {isDragging && (
              <div className="absolute inset-0 bg-white/70 dark:bg-black/85 backdrop-blur-[1px] border-2 border-dashed border-black dark:border-white rounded-2xl flex items-center justify-center z-50 pointer-events-none">
                <p className="text-sm font-bold text-black dark:text-white">Drop files here to upload</p>
              </div>
            )}

          {isVoiceMode ? (
            /* Voice to voice active content */
            <div className="px-4 py-3.5 flex items-center justify-between gap-4 relative z-10">
              {/* Left side: animated waveform bars (5 bars, bouncing animation) */}
              <div className="flex items-center gap-2 h-8 shrink-0">
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`w-1 rounded-full transition-colors duration-300 ${isListening ? 'bg-black dark:bg-white' : 'bg-gray-400'} animate-voice-bounce`}
                      style={{ animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                {isMuted && (
                  <span className="text-[11px] text-rose-500 font-medium px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                    🔇 Muted
                  </span>
                )}
              </div>

              {/* Center: live transcript text */}
              <div className="flex-1 min-w-0">
                {voiceTranscript ? (
                  <span className="text-black/80 dark:text-white/80 text-sm italic block truncate">
                    {voiceTranscript}
                  </span>
                ) : (
                  <span className="text-black/30 dark:text-white/30 text-sm block">
                    Listening...
                  </span>
                )}
              </div>

              {/* Right side: X button to cancel voice mode */}
              <button
                type="button"
                onClick={exitVoiceMode}
                className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 hover:text-black dark:hover:text-white transition-colors shrink-0"
                aria-label="Cancel voice mode"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            /* Normal input content */
            <>
              {/* Attachment Cards Area */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-3 px-4 pt-4 pb-2 border-b border-[var(--border-color)]">
                  {attachments.map((att) => {
                    const ext = att.name.split('.').pop().toLowerCase();
                    const isPDF = ext === 'pdf';
                    const isWord = ['doc', 'docx'].includes(ext);
                    
                    return (
                      <div 
                        key={att.id} 
                        className="flex items-center gap-2.5 p-2 min-w-[190px] max-w-[230px] relative group transition-all duration-200 shadow-sm border border-[#E0E0E0] dark:border-[#2A2A2A] bg-white dark:bg-[#1E1E1E] text-black dark:text-white rounded-xl overflow-hidden"
                      >
                        {/* Left: Thumbnail/Icon */}
                        {att.previewUrl ? (
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#E0E0E0] dark:border-[#2A2A2A] shrink-0">
                            <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" />
                          </div>
                        ) : isPDF ? (
                          <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200/50 dark:border-red-900/30">
                            <FileText size={20} />
                          </div>
                        ) : isWord ? (
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-200/50 dark:border-blue-900/30">
                            <FileText size={20} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-gray-400 flex items-center justify-center shrink-0 border border-gray-200/50 dark:border-neutral-700/50">
                            <File size={20} />
                          </div>
                        )}
                        
                        {/* Center: Filename + size/progress */}
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-[12px] font-semibold truncate">{att.name}</p>
                          {att.progress < 100 ? (
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">Uploading {att.progress}%</p>
                          ) : (
                            <p className="text-[10px] text-gray-500 mt-0.5">{formatFileSize(att.size)}</p>
                          )}
                        </div>

                        {/* Always Visible Remove (top right X icon button) */}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(att.id)}
                          className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-black/5 dark:bg-white/10 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors shadow-sm duration-200 z-10"
                          title="Remove"
                        >
                          <X size={10} />
                        </button>
                        
                        {/* Hover Overlay with Preview, Download, and Remove Actions */}
                        <div className="absolute inset-0 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-[1px] rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all duration-200 z-20">
                          <button
                            type="button"
                            onClick={() => setPreviewItem(att)}
                            className="p-1.5 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                            title="Preview"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(att)}
                            className="p-1.5 text-gray-600 hover:text-black dark:text-gray-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                            title="Download"
                          >
                            <Download size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        {/* Progress bar line at bottom */}
                        {att.progress < 100 && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-neutral-800">
                            <div className="h-full bg-black dark:bg-white transition-all duration-100" style={{ width: `${att.progress}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="px-4 pt-3 pb-1 relative z-0 isolate">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onPaste={() => setMascotState('thinking')}
                  placeholder={getPlaceholderText()}
                  rows={1}
                  className="w-full bg-transparent border-none outline-none resize-none text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] max-h-[200px] custom-scrollbar leading-relaxed"
                />
              </div>

              <div className="relative z-10 flex items-center justify-between gap-2 px-2 pb-2 pt-1 border-t border-[var(--border-color)] overflow-visible">
                <div className="flex items-center gap-1">
                  <div className="relative shrink-0">
                    <FileUploadMenu onFileSelect={handleFileSelect} positionedByParent />
                    <button
                      type="button"
                      data-plus-trigger
                      onClick={() => setPlusPopupOpen(!plusPopupOpen)}
                      className={`
                        p-2 rounded-xl transition-all relative z-[1]
                        ${plusPopupOpen
                          ? 'bg-black/5 dark:bg-white/10 text-black dark:text-white/70'
                          : 'text-gray-400 dark:text-white/45 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/[0.06]'}
                      `}
                      aria-label="Connect apps and attach files"
                      aria-expanded={plusPopupOpen}
                    >
                      <Plug size={20} />
                    </button>
                  </div>

                  <ModelSelector
                    selectedModel={selectedModel}
                    onSelect={setSelectedModel}
                    open={modelOpen}
                    onOpenChange={setModelOpen}
                  />
                </div>

                <div className="flex items-center gap-0.5">
                  <div className="relative flex items-center justify-center">
                    {isListening && (
                      <span className="absolute inset-0 rounded-full animate-ping bg-black/10 dark:bg-white/50" aria-hidden />
                    )}
                    <button
                      type="button"
                      onClick={toggleVoiceToText}
                      title={isListening ? 'Stop listening' : 'Voice to text'}
                      aria-label={isListening ? 'Stop listening' : 'Voice to text'}
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isListening
                          ? 'bg-black/5 dark:bg-white/15 border border-black/10 dark:border-white/40 shadow-[0_0_12px_rgba(255,255,255,0.35)] text-black dark:text-white'
                          : 'text-gray-400 dark:text-white/40 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {isListening
                        ? <Mic className="w-4 h-4" />
                        : <Mic className="w-4 h-4" />
                      }
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (isVoiceMode) {
                        exitVoiceMode();
                      } else {
                        startVoiceToVoice();
                      }
                    }}
                    title="Voice to Voice"
                    className={`p-2 rounded-xl transition-all ${isVoiceMode ? 'bg-black/5 dark:bg-white/10 text-black dark:text-white' : 'text-gray-400 dark:text-white/45 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'}`}
                    aria-label="Start voice conversation"
                  >
                    <AudioLines size={20} />
                  </button>

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className={`
                      p-2.5 rounded-xl transition-all duration-300 ml-0.5
                      ${canSend
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-md hover:bg-neutral-800 dark:hover:bg-gray-100 hover:scale-[1.03] active:scale-[0.98]'
                        : 'bg-black/5 dark:bg-white/[0.06] text-gray-300 dark:text-white/20 cursor-not-allowed'}
                    `}
                    aria-label="Send message"
                  >
                    <Send size={18} className={canSend ? 'translate-x-[-1px]' : ''} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

        {/* Voice mode controls */}
        {isVoiceMode && (
          <div className="flex items-center gap-3 px-4 py-2">
            {!isMuted ? (
              <button
                type="button"
                onClick={() => setIsMuted(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 transition-all"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Mute AI
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsMuted(false)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs"
              >
                <VolumeX className="w-3.5 h-3.5" />
                Unmute AI
              </button>
            )}

            <button
              type="button"
              onClick={exitVoiceMode}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-xs hover:bg-white/10 transition-all"
            >
              <X className="w-3.5 h-3.5" />
              End session
            </button>

            <span className={`text-xs font-mono ml-auto ${
              sessionSeconds >= 570
                ? 'text-red-500 font-semibold'
                : sessionSeconds >= 480
                  ? 'text-amber-500 font-semibold'
                  : 'text-white/30'
            }`}>
              {formatVoiceTime(sessionSeconds)}
            </span>
          </div>
        )}

        {!embedded && !isVoiceMode && (
          <div className="flex flex-col items-center">
            {credits && (() => {
              const { plan, credits: userCredits } = credits;
              const dailyUsed = userCredits?.daily?.used ?? 0;
              const dailyLimit = userCredits?.daily?.limit ?? 5;
              const isFree = !plan || plan.toLowerCase() === 'free';
              const limitReached = dailyLimit !== -1 && dailyUsed >= dailyLimit;

              if (limitReached) {
                return (
                  <div className="text-xs text-red-500 text-center mt-1 font-semibold">
                    Daily limit reached — Upgrade for more
                  </div>
                );
              }

              if (isFree) {
                return (
                  <div className="text-xs text-[var(--text-muted)] text-center mt-1 font-medium">
                    {dailyUsed}/5 AI messages today
                  </div>
                );
              } else {
                return (
                  <div className="text-xs text-[var(--text-muted)] text-center mt-1 font-medium">
                    {dailyUsed} messages today
                  </div>
                );
              }
            })()}
            <p className="text-center text-[11px] text-[var(--text-placeholder)] mt-2">
              HirenextAI can make mistakes. Verify important information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileIcon = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return '📄';
  if (['doc', 'docx'].includes(ext)) return '📘';
  if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return '📦';
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return '🎥';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return '🎵';
  return '📎';
};

export default ChatInput;
