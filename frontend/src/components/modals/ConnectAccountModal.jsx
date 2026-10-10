import { workspaceStorage } from '../../lib/workspaceStorage';
import { useEffect, useState } from 'react';
import { Github, X, Search, CheckCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useUIStore from '../../store/useUIStore';
import useAuthStore from '../../store/useAuthStore';
import api from '../../lib/api';

const ConnectAccountModal = () => {
  const { connectModalOpen, setConnectModalOpen, showToast } = useUIStore();
  const { user, updateUser } = useAuthStore();

  const [search, setSearch] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [savingField, setSavingField] = useState(null);

  const [urls, setUrls] = useState({
    linkedinUrl: '',
    indeedUrl: '',
    naukriUrl: '', githubUrl: ''
  });

  const [tempUrls, setTempUrls] = useState({
    linkedinUrl: '',
    indeedUrl: '',
    naukriUrl: '', githubUrl: ''
  });

  const integrations = [
    { name: 'GitHub', description: 'Keep your developer profile with your account', placeholder: 'https://github.com/your-name', instruction: 'Paste your public GitHub profile URL.', field: 'githubUrl', logo: <Github className="w-10 h-10 text-slate-800 shrink-0" /> },
    {
      name: 'LinkedIn',
      description: 'Save your professional profile link',
      placeholder: 'https://linkedin.com/in/your-username',
      instruction: 'Paste your LinkedIn profile URL. Go to LinkedIn → your profile → copy URL from browser bar. Example: https://linkedin.com/in/john-doe',
      field: 'linkedinUrl',
      logo: (
        <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10 rounded-xl shrink-0">
          <rect width="40" height="40" rx="8" fill="#999999"/>
          <path d="M13.5 16.5h-3v9h3v-9zm-1.5-4.5a1.75 1.75 0 100 3.5 1.75 1.75 0 000-3.5zM27 16.5c-1.5 0-2.5.6-3 1.5v-1.5h-3v9h3v-4.5c0-1.5.75-2.25 2-2.25s2 .75 2 2.25V25.5h3v-5c0-2.5-1.5-4-4-4z" fill="white"/>
        </svg>
      )
    },
    {
      name: 'Indeed',
      description: 'Keep your job-search profile in one place',
      placeholder: 'https://indeed.com/r/your-profile',
      instruction: 'Log into Indeed → go to your profile page → copy the URL from browser. Example: https://indeed.com/r/john-doe-123',
      field: 'indeedUrl',
      logo: (
        <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10 rounded-xl shrink-0">
          <rect width="40" height="40" rx="8" fill="#111111"/>
          <text x="20" y="27" text-anchor="middle" font-size="20" font-weight="bold" fill="white">in</text>
        </svg>
      )
    },
    {
      name: 'Naukri',
      description: 'Save your Naukri profile for reference',
      placeholder: 'https://naukri.com/mnjuser/profile',
      instruction: 'Log into Naukri.com → click your profile photo → My Naukri → copy the URL from browser bar',
      field: 'naukriUrl',
      logo: (
        <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10 rounded-xl shrink-0">
          <rect width="40" height="40" rx="8" fill="#999999"/>
          <text x="20" y="27" text-anchor="middle" font-size="13" font-weight="bold" fill="white">Naukri</text>
        </svg>
      )
    }
  ];

  const validateProfileUrl = (fieldName, value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return 'Profile URL is required.';

    let url;
    try {
      url = new URL(trimmed);
    } catch {
      return 'Enter a valid profile URL.';
    }

    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return 'Enter a valid public profile URL.';
    const host = url.hostname.toLowerCase();
    if (fieldName === 'githubUrl' && !(['github.com', 'www.github.com'].includes(host) && /^\/[a-zA-Z0-9-]+\/?$/.test(url.pathname))) return 'Enter a valid GitHub profile URL.';
    const path = url.pathname;
    if (fieldName === 'linkedinUrl' && !((host === 'linkedin.com' || host.endsWith('.linkedin.com')) && /^\/in\/[^/?#]+\/?$/i.test(path))) {
      return 'Enter a valid LinkedIn profile URL, like https://linkedin.com/in/your-name.';
    }
    if (fieldName === 'indeedUrl' && !((host === 'indeed.com' || host.endsWith('.indeed.com')) && path.length > 1)) {
      return 'Enter a valid Indeed profile URL.';
    }
    if (fieldName === 'naukriUrl' && !((host === 'naukri.com' || host.endsWith('.naukri.com')) && path.length > 1)) {
      return 'Enter a valid Naukri profile URL.';
    }

    return '';
  };

  const handleLinkedInOAuth = async () => {
    try { const { data } = await api.post('/auth/linkedin/connect'); window.location.assign(data.url); }
    catch (error) { showToast(error.response?.data?.error || 'Unable to connect LinkedIn.'); }
  };

  useEffect(() => {
    const loadProfileData = async () => {
      let loadedUrls = {
        linkedinUrl: '',
        indeedUrl: '',
        naukriUrl: '', githubUrl: ''
      };

      try {
        const res = await api.get('/api/user/me');
        const data = res.data;
        loadedUrls = {
          linkedinUrl: data.linkedinUrl || '',
          indeedUrl: data.indeedUrl || '',
          naukriUrl: data.naukriUrl || '', githubUrl: data.githubUrl || ''
        };
      } catch (err) {
        console.error('Failed to fetch from backend, checking fallback...', err);
        if (user) {
          loadedUrls = {
            linkedinUrl: user.linkedinUrl || '',
            indeedUrl: user.indeedUrl || '',
            naukriUrl: user.naukriUrl || '', githubUrl: user.githubUrl || ''
          };
        }
      }

      try {
        const cached = workspaceStorage.getItem('userProfiles');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (!loadedUrls.linkedinUrl && parsed.linkedinUrl) loadedUrls.linkedinUrl = parsed.linkedinUrl;
          if (!loadedUrls.indeedUrl && parsed.indeedUrl) loadedUrls.indeedUrl = parsed.indeedUrl;
          if (!loadedUrls.naukriUrl && parsed.naukriUrl) loadedUrls.naukriUrl = parsed.naukriUrl;
        }
      } catch (e) {
        console.error('LocalStorage parse error:', e);
      }

      setUrls(loadedUrls);
      setTempUrls(loadedUrls);
    };

    if (connectModalOpen) {
      loadProfileData();
    }
  }, [connectModalOpen, user]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === 'Escape') setConnectModalOpen(false);
    };
    if (connectModalOpen) window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [connectModalOpen, setConnectModalOpen]);

  const handleSave = async (fieldName, platformName) => {
    const value = tempUrls[fieldName] || '';
    const validationError = validateProfileUrl(fieldName, value);
    if (validationError) {
      showToast(validationError);
      return;
    }
    setSavingField(fieldName);
    try {
      const res = await api.put('/api/user/profile', {
        [fieldName]: value
      });

      const updatedUrls = { ...urls, [fieldName]: value };
      setUrls(updatedUrls);

      workspaceStorage.setItem('userProfiles', JSON.stringify(updatedUrls));

      if (res.data && res.data.user) {
        updateUser(res.data.user);
      }

      setEditingField(null);
      showToast(`${platformName} profile saved.`);
    } catch (err) {
      console.error(`Error saving ${fieldName}:`, err);
      showToast(err.response?.data?.error || `Failed to connect ${platformName}`);
    } finally {
      setSavingField(null);
    }
  };

  const filtered = integrations.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {connectModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-white/75 backdrop-blur-md"
            onClick={() => setConnectModalOpen(false)}
          />
          <div className="fixed inset-0 z-[3001] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className="pointer-events-auto w-full max-w-lg flex flex-col rounded-2xl border border-[#E0E0E0] bg-[#F7F7F7] shadow-2xl overflow-hidden max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex flex-col px-6 pt-6 pb-4 border-b border-[#E0E0E0] shrink-0 gap-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-black">Connect apps & profiles</h2>
                    <p className="text-[13px] text-[#777777] mt-0.5 leading-relaxed">
                      Save professional links to your own account. Links do not grant app access or automatically sync applications.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConnectModalOpen(false)}
                    className="p-2 rounded-xl text-[#666666] hover:text-black hover:bg-[#F2F2F2] hover:text-black transition-colors shrink-0 ml-4"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#888888]" />
                  <input
                    type="text"
                    placeholder="Search integrations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F7F7F7] border border-[#E0E0E0] rounded-xl text-sm text-black focus:border-white focus:outline-none transition-all placeholder:text-black/20"
                  />
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-[#888888] text-sm">
                    No integrations found
                  </div>
                ) : (
                  filtered.map((item) => {
                    const isConnected = !!urls[item.field];
                    const isExpanded = editingField === item.field;

                    return (
                      <div key={item.field} className="glass-card p-5 relative overflow-hidden">
                        {/* Row 1 */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.logo}
                            <div className="min-w-0">
                              <h4 className="font-bold text-black text-base truncate">{item.name}</h4>
                              <p className="text-[#777777] text-xs truncate">{item.description}</p>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {!isConnected ? (
                              <button
                                type="button"
                                onClick={() => setEditingField(isExpanded ? null : item.field)}
                                className="bg-[#F7F7F7] text-black px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-[#F2F2F2] hover:text-black"
                              >
                                Connect
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="flex items-center gap-2 bg-[#F7F7F7] text-black border border-[#E0E0E0] px-3 py-1 rounded-full text-xs">
                                  Profile saved
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingField(isExpanded ? null : item.field)}
                                  className="text-[#777777] text-xs hover:text-black transition-colors"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 2 */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-4 pt-4 border-t border-white/8">
                                <p className="text-[#666666] text-xs mb-3">{item.instruction}</p>
                                {item.field === 'linkedinUrl' && (
                                  <button
                                    type="button"
                                    onClick={handleLinkedInOAuth}
                                    className="mb-3 w-full bg-[#F7F7F7] hover:bg-[#F2F2F2] hover:text-black text-black px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
                                  >
                                    Connect with LinkedIn OAuth
                                  </button>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  <input
                                    type="url"
                                    aria-label={item.name + " profile URL"}
                                    maxLength={500}
                                    placeholder={item.placeholder}
                                    value={tempUrls[item.field] || ''}
                                    onChange={(e) =>
                                      setTempUrls((prev) => ({
                                        ...prev,
                                        [item.field]: e.target.value
                                      }))
                                    }
                                    className="min-w-0 w-full sm:w-auto flex-1 bg-[#F7F7F7] border border-[#E0E0E0] rounded-xl px-4 py-2.5 text-sm text-black focus:border-white outline-none placeholder:text-black/20"
                                  />
                                  <button
                                    type="button"
                                    disabled={savingField === item.field}
                                    onClick={() => handleSave(item.field, item.name)}
                                    className="bg-[#F7F7F7] text-black hover:bg-[#F2F2F2] hover:text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shrink-0 flex items-center justify-center min-w-[70px]"
                                  >
                                    {savingField === item.field ? (
                                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      'Save'
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTempUrls((prev) => ({ ...prev, [item.field]: urls[item.field] || '' }));
                                      setEditingField(null);
                                    }}
                                    className="border border-[#E0E0E0] bg-[#F7F7F7] text-[#555555] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-[#F2F2F2] hover:text-black"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                )}

                {/* Bottom Info Box */}
                <div className="mt-6 p-4 rounded-xl bg-[#F7F7F7] border border-[#E0E0E0]">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#555555] mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-black text-sm mb-1">Why connect your profiles?</p>
                      <p className="text-[#666666] text-xs leading-relaxed">
                        The more profiles you connect, the better HirenextAI understands
                        your background. AI will use your LinkedIn experience and job history
                        to write better cover letters, find more relevant jobs, and auto-fill
                        applications more accurately.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Scrollbar Custom Styling */}
          <style>{`
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(17,17,17, 0.1);
              border-radius: 99px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(17,17,17, 0.2);
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConnectAccountModal;
