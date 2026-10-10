import { canUseModel } from '../../lib/modelAccess';
import { workspaceStorage } from '../../lib/workspaceStorage';
import { useEffect, useState } from 'react';
import {
  X,
  User,
  Sparkles,
  Palette,
  Bell,
  Shield,
  CreditCard,
  Keyboard,
  LogOut,
  Lock,
  Cpu,
  RefreshCw,
  Clock,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useUIStore from '../../store/useUIStore';
import useUserStore from '../../store/useUserStore';
import useAuthStore from '../../store/useAuthStore';
import useChatStore from '../../store/useChatStore';
import useSettingsStore from '../../store/useSettingsStore';
import { AI_MODELS } from '../chat/ModelSelector';
import { getPlanDisplay, normalizePlan } from '../../lib/planUtils';
import api from '../../lib/api';

const LS = {
  displayName: 'hirenext_displayName',
  responseStyle: 'hirenext_responseStyle',
  autoSave: 'hirenext_autoSaveConversations',
  fontSize: 'hirenext_fontSize',
  sidebarCollapsed: 'hirenext_sidebarCollapsedDefault',
  showTimestamps: 'hirenext_showTimestamps',
  emailNotif: 'hirenext_emailNotifications',
  jobAlerts: 'hirenext_jobMatchAlerts',
  appUpdates: 'hirenext_applicationUpdates',
  weeklyDigest: 'hirenext_weeklyDigest',
  creditsUsed: 'hirenext_creditsUsed',
};

const NAV = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'ai', label: 'AI Preferences', icon: Sparkles },
  { id: 'models', label: 'AI Models', icon: Cpu },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Data', icon: Shield },
  { id: 'billing', label: 'Subscription', icon: CreditCard },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
];

const readBool = (key, def = true) => {
  const v = workspaceStorage.getItem(key);
  if (v === null) return def;
  return v === 'true';
};

const SettingsModal = () => {
  const navigate = useNavigate();
  const { settingsModalOpen, setSettingsModalOpen, setPricingModalOpen, showToast } = useUIStore();
  const { user, setUser } = useUserStore();
  const { logout } = useAuthStore();
  const { chats, deleteChat, clearMessages, selectedModel, setSelectedModel } = useChatStore();
  const { aiLanguage, setAiLanguage } = useSettingsStore();
  const { setSidebarCollapsed } = useUIStore();

  const [section, setSection] = useState('profile');
  const [displayName, setDisplayName] = useState('');
  const [defaultModel, setDefaultModel] = useState(workspaceStorage.getItem('selectedModel') || 'hirenext-flash');
  const [responseStyle, setResponseStyle] = useState('balanced');
  const [autoSave, setAutoSave] = useState(true);
  const [fontSize, setFontSize] = useState('medium');
  const [sidebarCollapsedDefault, setSidebarCollapsedDefault] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [emailNotif, setEmailNotif] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [appUpdates, setAppUpdates] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [confirmDeleteChats, setConfirmDeleteChats] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  const [modelSettingsLoading, setModelSettingsLoading] = useState(false);
  const [creditsUsedToday, setCreditsUsedToday] = useState(0);
  const [resetTimer, setResetTimer] = useState('24h 00m');
  const [graphData, setGraphData] = useState([]);
  const [modelConfigs, setModelConfigs] = useState({});

  const fetchModelSettings = async () => {
    try {
      setModelSettingsLoading(true);
      const res = await api.get('/api/ai/model-settings');
      if (res.data?.success) {
        setCreditsUsedToday(res.data.creditsUsedToday);
        setResetTimer(res.data.resetTimer);
        setGraphData(res.data.graphData);
        setModelConfigs(res.data.configs);
      }
    } catch (err) {
      console.error('Fetch model settings failed:', err);
    } finally {
      setModelSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (settingsModalOpen && section === 'models' && !user?.demoMode) {
      fetchModelSettings();
    }
  }, [settingsModalOpen, section, user?.demoMode]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    let appliedTheme = newTheme;
    if (newTheme === 'system') {
      appliedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    if (appliedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    showToast(`Theme changed to ${newTheme}`);
  };

  const creditsUsed = Number(workspaceStorage.getItem(LS.creditsUsed) || '5');
  const creditsMax = 20;

  useEffect(() => {
    if (!settingsModalOpen) return;
    setDisplayName(
      workspaceStorage.getItem(LS.displayName) || `${user.firstName} ${user.lastName}`.trim()
    );
    setResponseStyle(workspaceStorage.getItem(LS.responseStyle) || 'balanced');
    setAutoSave(readBool(LS.autoSave, true));
    setFontSize(workspaceStorage.getItem(LS.fontSize) || 'medium');
    setSidebarCollapsedDefault(readBool(LS.sidebarCollapsed, false));
    setShowTimestamps(readBool(LS.showTimestamps, false));
    setEmailNotif(readBool(LS.emailNotif, true));
    setJobAlerts(readBool(LS.jobAlerts, true));
    setAppUpdates(readBool(LS.appUpdates, true));
    setWeeklyDigest(readBool(LS.weeklyDigest, false));
    setDefaultModel(workspaceStorage.getItem('selectedModel') || 'hirenext-flash');
    setTheme(localStorage.getItem('theme') || 'light');
  }, [settingsModalOpen, user.firstName, user.lastName]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSettingsModalOpen(false);
    };
    if (settingsModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [settingsModalOpen, setSettingsModalOpen]);

  if (!settingsModalOpen) return null;

  if (user?.demoMode) {
    return (
      <>
        <div 
          className="fixed inset-0 z-[9998] bg-white/55 backdrop-blur-[12px]" 
          onClick={() => setSettingsModalOpen(false)}
        />
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-4 pointer-events-none animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-[#E0E0E0] rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl pointer-events-auto">
            <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-5 mx-auto">
              <Lock className="w-6 h-6 text-black" />
            </div>
            <h3 className="text-black font-bold mb-2 text-lg">Sign up to access settings</h3>
            <p className="text-[#666666] text-xs mb-6 leading-relaxed max-w-[280px] mx-auto">Create a free account to personalize your layout and configure custom AI parameters.</p>
            <button
              onClick={() => {
                setSettingsModalOpen(false);
                navigate('/register');
              }}
              className="w-full h-11 bg-black text-white rounded-xl font-bold text-sm flex items-center justify-center hover:bg-neutral-800 transition-all mb-3"
            >
              Sign Up Free
            </button>
            <button
              onClick={() => {
                setSettingsModalOpen(false);
                navigate('/login');
              }}
              className="w-full h-11 border border-[#E0E0E0] bg-transparent text-black rounded-xl font-semibold text-sm flex items-center justify-center hover:bg-[#F2F2F2] transition-all mb-4"
            >
              Log In
            </button>
            <button
              onClick={() => setSettingsModalOpen(false)}
              className="text-[#888888] text-xs hover:text-black transition-colors"
            >
              Continue exploring
            </button>
          </div>
        </div>
      </>
    );
  }

  const saveProfile = async () => {
    setIsSavingProfile(true);
    try {
      const res = await api.put('/api/user/profile', { displayName });
      const updatedUser = res.data.user;
      useAuthStore.getState().updateUser({
        name: updatedUser.name
      });
      showToast('Profile saved successfully');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      showToast('New password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('Passwords do not match');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.put('/api/auth/change-password', { currentPassword, newPassword });
      showToast('Password changed successfully');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleExportData = async () => {
    try {
      const response = await api.get('/api/user/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let filename = `hirenextai-data-export.json`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('Data exported successfully');
    } catch (err) {
      showToast('Failed to export data');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);
    try {
      await api.delete('/api/user/account');
      showToast('Account deleted successfully');
      setSettingsModalOpen(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  const persistPref = (key, value) => workspaceStorage.setItem(key, String(value));

  const handleDeleteAllChats = () => {
    chats.forEach((c) => deleteChat(c.id));
    clearMessages();
    setConfirmDeleteChats(false);
    showToast('All conversations deleted');
  };

  const Toggle = ({ checked, onChange, label }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full py-2"
    >
      <span className="text-[14px] text-[#222222]">{label}</span>
      <div
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-[#F7F7F7]' : 'bg-[#F7F7F7]'}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-[#F7F7F7] transition-transform ${checked ? 'left-6' : 'left-1'}`}
        />
      </div>
    </button>
  );

  const StyleToggle = ({ value, options, onChange }) => (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${ value === opt.id ? 'bg-[#F7F7F7] text-black border border-[#E0E0E0]' : 'bg-[#F7F7F7] text-[#666666] border border-[#E0E0E0] hover:text-[#444444]' }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  const renderContent = () => {
    switch (section) {
      case 'profile':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-black">Profile Settings</h3>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-[#F7F7F7] border-2 border-[#E0E0E0] flex items-center justify-center text-xl font-bold text-black">
                {(displayName || user.firstName || 'U')[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-black font-medium">{displayName || user.firstName}</p>
                <p className="text-[13px] text-[#777777]">{user.email || 'demo@hirenext.ai'}</p>
              </div>
            </div>
            <div>
              <label className="text-[13px] text-[#666666] block mb-1.5">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#F7F7F7] border border-[#E0E0E0] rounded-xl px-4 py-2.5 text-black text-sm focus:outline-none focus:border-white"
              />
            </div>
            <div>
              <label className="text-[13px] text-[#666666] block mb-1.5">Email</label>
              <input
                value={user.email || 'demo@hirenext.ai'}
                readOnly
                className="w-full bg-[#F7F7F7] border border-[#E0E0E0] rounded-xl px-4 py-2.5 text-[#777777] text-sm cursor-not-allowed"
              />
            </div>
            {!showChangePassword ? (
              <button
                type="button"
                onClick={() => setShowChangePassword(true)}
                className="text-[13px] text-black hover:text-black block text-left"
              >
                Change password →
              </button>
            ) : (
              <form onSubmit={handleChangePasswordSubmit} className="p-4 rounded-xl border border-white/[0.08] bg-[#F7F7F7] space-y-3.5">
                <h4 className="text-[13px] font-bold text-black">Change Password</h4>
                <div>
                  <label className="text-[11px] text-[#666666] block mb-1">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg px-3 py-2 text-black text-xs focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#666666] block mb-1">New Password (min 8 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg px-3 py-2 text-black text-xs focus:outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#666666] block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="w-full bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg px-3 py-2 text-black text-xs focus:outline-none focus:border-white"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="px-4 py-2 rounded-lg bg-[#F7F7F7] border border-[#E0E0E0] text-black text-xs font-semibold hover:bg-[#F2F2F2] hover:text-black transition-all"
                  >
                    {isChangingPassword ? 'Changing...' : 'Change password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                    }}
                    className="px-4 py-2 rounded-lg text-[#666666] text-xs hover:text-black"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <button
              type="button"
              disabled={isSavingProfile}
              onClick={saveProfile}
              className="px-5 py-2.5 rounded-xl bg-[#F7F7F7] border border-[#E0E0E0] text-black text-sm font-semibold hover:bg-[#F2F2F2] hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingProfile ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        );

      case 'ai':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-black">AI Preferences</h3>
            <div>
              <label className="text-[13px] text-[#666666] block mb-1.5">Default AI model</label>
              <select
                value={defaultModel}
                onChange={(e) => {
                  setDefaultModel(e.target.value);
                  setSelectedModel(e.target.value);
                }}
                className="w-full bg-[#F7F7F7] border border-[#E0E0E0] rounded-xl px-4 py-2.5 text-black text-sm"
              >
                {AI_MODELS.filter((m) => canUseModel(m.id, user)).map((m) => (
                  <option key={m.id} value={m.id} className="bg-[#F7F7F7]">
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[13px] text-[#666666] block mb-1.5">Default language</label>
              <select
                value={aiLanguage}
                onChange={(e) => setAiLanguage(e.target.value)}
                className="w-full bg-[#F7F7F7] border border-[#E0E0E0] rounded-xl px-4 py-2.5 text-black text-sm"
              >
                {['English', 'Hindi', 'Arabic', 'German', 'French', 'Spanish', 'Japanese'].map((l) => (
                  <option key={l} value={l} className="bg-[#F7F7F7]">
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[13px] text-[#666666] block mb-2">Response style</label>
              <StyleToggle
                value={responseStyle}
                onChange={(v) => {
                  setResponseStyle(v);
                  persistPref(LS.responseStyle, v);
                }}
                options={[
                  { id: 'concise', label: 'Concise' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'detailed', label: 'Detailed' },
                ]}
              />
            </div>
            <div className="border-t border-[#E0E0E0] pt-4">
              <Toggle
                label="Auto-save conversations"
                checked={autoSave}
                onChange={(v) => {
                  setAutoSave(v);
                  persistPref(LS.autoSave, v);
                }}
              />
            </div>
          </div>
        );

      case 'models':
        const userPlan = (user.plan || 'free').toLowerCase();
        const activeModel = selectedModel || 'hirenext-flash';
        const currentModelConfig = modelConfigs[activeModel] || { cost: 1000, limits: { free: 5000, pro: 15000, max: 150000, ultimate: -1 } };
        const dailyLimit = currentModelConfig.limits[userPlan] ?? currentModelConfig.limits.free;

        const maxLimit = dailyLimit === -1 ? 500000 : dailyLimit;
        const progressPercentage = Math.min(100, (creditsUsedToday / maxLimit) * 100);
        const creditsRemaining = dailyLimit === -1 ? 'Unlimited' : Math.max(0, dailyLimit - creditsUsedToday).toLocaleString();

        const activeModelInfo = AI_MODELS.find(m => m.id === activeModel) || AI_MODELS[0];

        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-[#E0E0E0] pb-4">
              <div>
                <h3 className="text-lg font-bold text-black">AI Models & Credits</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select and manage your HirenextAI models and daily credits.</p>
              </div>
              <button
                type="button"
                onClick={fetchModelSettings}
                disabled={modelSettingsLoading}
                className="p-1.5 rounded-lg border border-[#E0E0E0] hover:bg-[#F2F2F2] transition-colors"
                title="Refresh Metrics"
              >
                <RefreshCw size={14} className={modelSettingsLoading ? 'animate-spin text-black' : 'text-gray-500'} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {AI_MODELS.map((model) => {
                const config = modelConfigs[model.id] || { limits: { free: 5000, pro: 15000 } };
                const isSelected = activeModel === model.id;
                const limit = config.limits[userPlan] ?? config.limits.free;
                const isLocked = !canUseModel(model.id, user);

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => {
                      if (isLocked) {
                        setSettingsModalOpen(false);
                        setPricingModalOpen(true);
                        showToast(`HirenextAI Pro requires a premium subscription.`);
                        return;
                      }
                      setSelectedModel(model.id);
                      workspaceStorage.setItem('selectedModel', model.id);
                    }}
                    className={`text-left p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-black shadow-[0_4px_16px_rgba(0,0,0,0.06)]'
                        : 'bg-[#F7F7F7] border-[#E0E0E0] hover:bg-white hover:border-[#D0D0D0]'
                    } ${isLocked ? 'opacity-80' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-black">{model.name}</span>
                        {isLocked && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-black text-white font-bold flex items-center gap-0.5">
                            <Lock size={8} /> PRO
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed mb-4">{model.description}</p>
                    </div>

                    <div className="mt-auto">
                      <span className="text-[10px] text-gray-400 block uppercase tracking-wider font-bold">Daily Cost Limit</span>
                      <span className="text-xs font-semibold text-black/80">
                        {limit === -1 ? 'Unlimited' : `${(limit).toLocaleString()} Credits`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 bg-white border border-[#E0E0E0] rounded-xl flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1">
                  <TrendingUp size={12} /> Daily Limit
                </span>
                <span className="text-sm font-bold text-black mt-2">
                  {dailyLimit === -1 ? 'Unlimited' : dailyLimit.toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 bg-white border border-[#E0E0E0] rounded-xl flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1">
                  <Zap size={12} /> Used Today
                </span>
                <span className="text-sm font-bold text-black mt-2">
                  {creditsUsedToday.toLocaleString()}
                </span>
              </div>
              <div className="p-3.5 bg-white border border-[#E0E0E0] rounded-xl flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1">
                  <Zap size={12} /> Remaining
                </span>
                <span className="text-sm font-bold text-black mt-2">
                  {creditsRemaining}
                </span>
              </div>
              <div className="p-3.5 bg-white border border-[#E0E0E0] rounded-xl flex flex-col justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1">
                  <Clock size={12} /> Reset Timer
                </span>
                <span className="text-sm font-bold text-black mt-2">
                  {resetTimer}
                </span>
              </div>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-black">Credits Usage Progress</span>
                <span className="text-xs text-gray-500">
                  {dailyLimit === -1 ? '0%' : `${Math.round(progressPercentage)}%`}
                </span>
              </div>
              <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-black transition-all duration-500 rounded-full" 
                  style={{ width: `${dailyLimit === -1 ? 0 : progressPercentage}%` }} 
                />
              </div>
              <div className="flex justify-between items-center mt-3 text-[10px] text-gray-400">
                <span>0 Credits</span>
                <span>{dailyLimit === -1 ? 'Unlimited' : `${dailyLimit.toLocaleString()} Credits`}</span>
              </div>
            </div>

            <div className="bg-white border border-[#E0E0E0] rounded-xl p-4">
              <span className="text-xs font-semibold text-black block mb-4">7-Day Credit Usage History</span>
              {graphData.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-xs text-gray-400 bg-neutral-50 rounded-lg border border-dashed border-neutral-200">
                  No credit usage data recorded for this week.
                </div>
              ) : (
                <div className="flex items-end justify-between gap-1.5 h-32 px-2 pt-4">
                  {graphData.map((item, idx) => {
                    const maxVal = Math.max(...graphData.map(d => d.credits)) || 1000;
                    const valPercent = Math.min(100, (item.credits / maxVal) * 90);
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow z-10 pointer-events-none whitespace-nowrap">
                          {item.credits.toLocaleString()} Credits
                        </div>
                        <div 
                          className="w-full bg-neutral-200 group-hover:bg-black transition-colors rounded-t-sm"
                          style={{ height: `${valPercent}%` }}
                        />
                        <span className="text-[9px] text-gray-400 mt-2 font-medium truncate max-w-full block">
                          {item.date.split(',')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl border border-[#E0E0E0] bg-[#F7F7F7] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-500 font-medium">Model Speed:</span>
                <span className="font-bold text-black">{activeModelInfo.id === 'hirenext-flash' ? 'High Speed ⚡' : 'Normal Speed'}</span>
              </div>
              <div className="text-gray-400 font-mono text-[9px]">Last Updated: Just now</div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-black">Appearance</h3>
            <div>
              <label className="text-[13px] text-[#666666] block mb-2">Theme</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    theme === 'light'
                      ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                      : 'bg-[#F7F7F7] text-black border border-[#E0E0E0] hover:bg-gray-200'
                  }`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    theme === 'dark'
                      ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                      : 'bg-[#F7F7F7] text-black border border-[#E0E0E0] hover:bg-gray-200'
                  }`}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('system')}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all ${
                    theme === 'system'
                      ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                      : 'bg-[#F7F7F7] text-black border border-[#E0E0E0] hover:bg-gray-200'
                  }`}
                >
                  System
                </button>
              </div>
            </div>
            <div>
              <label className="text-[13px] text-[#666666] block mb-2">Font size</label>
              <StyleToggle
                value={fontSize}
                onChange={(v) => {
                  setFontSize(v);
                  persistPref(LS.fontSize, v);
                }}
                options={[
                  { id: 'small', label: 'Small' },
                  { id: 'medium', label: 'Medium' },
                  { id: 'large', label: 'Large' },
                ]}
              />
            </div>
            <div className="border-t border-[#E0E0E0] pt-2 space-y-1">
              <Toggle
                label="Sidebar collapsed by default"
                checked={sidebarCollapsedDefault}
                onChange={(v) => {
                  setSidebarCollapsedDefault(v);
                  persistPref(LS.sidebarCollapsed, v);
                  if (v) setSidebarCollapsed(true);
                }}
              />
              <Toggle
                label="Show timestamps on messages"
                checked={showTimestamps}
                onChange={(v) => {
                  setShowTimestamps(v);
                  persistPref(LS.showTimestamps, v);
                }}
              />
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black mb-2">Notifications</h3>
            <Toggle
              label="Email notifications"
              checked={emailNotif}
              onChange={(v) => {
                setEmailNotif(v);
                persistPref(LS.emailNotif, v);
              }}
            />
            <Toggle
              label="Job match alerts"
              checked={jobAlerts}
              onChange={(v) => {
                setJobAlerts(v);
                persistPref(LS.jobAlerts, v);
              }}
            />
            <Toggle
              label="Application status updates"
              checked={appUpdates}
              onChange={(v) => {
                setAppUpdates(v);
                persistPref(LS.appUpdates, v);
              }}
            />
            <Toggle
              label="Weekly digest"
              checked={weeklyDigest}
              onChange={(v) => {
                setWeeklyDigest(v);
                persistPref(LS.weeklyDigest, v);
              }}
            />
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-black">Privacy & Data</h3>
            <p className="text-[13px] text-[#666666] leading-relaxed">
              We store your profile, chat history, job applications, and AI-generated files to provide
              HirenextAI services. Data is encrypted in transit and never sold to third parties.
            </p>
             <button
              type="button"
              onClick={handleExportData}
              className="w-full py-2.5 rounded-xl border border-[#E0E0E0] text-[#222222] text-sm hover:bg-[#F2F2F2] hover:text-black"
            >
              Export all my data
            </button>
            {!confirmDeleteChats ? (
              <button
                type="button"
                onClick={() => setConfirmDeleteChats(true)}
                className="w-full py-2.5 rounded-xl border border-[#E0E0E0] text-black text-sm hover:bg-[#F2F2F2] hover:text-black"
              >
                Delete all conversations
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-[#E0E0E0] bg-[#F7F7F7]">
                <p className="text-sm text-[#444444] mb-3">Delete all chats permanently?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteAllChats}
                    className="px-4 py-2 rounded-lg bg-[#F7F7F7] text-black text-sm font-medium"
                  >
                    Yes, delete all
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteChats(false)}
                    className="px-4 py-2 rounded-lg text-[#666666] text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {!confirmDeleteAccount ? (
              <button
                type="button"
                onClick={() => setConfirmDeleteAccount(true)}
                className="w-full py-2.5 rounded-xl border border-[#E0E0E0] text-black text-sm hover:bg-[#F2F2F2] hover:text-black"
              >
                Delete account
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-[#E0E0E0] bg-[#F7F7F7] space-y-3">
                <p className="text-sm text-[#444444]">
                  This permanently deletes your account and all data. Cannot be undone.
                </p>
                <p className="text-xs text-[#666666]">
                  Please type <span className="text-black font-bold">DELETE</span> to confirm:
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="w-full bg-[#F7F7F7] border border-[#E0E0E0] rounded-xl px-4 py-2 text-black text-sm focus:outline-none focus:border-white"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 rounded-lg bg-[#F7F7F7] disabled:bg-[#F7F7F7] disabled:text-black text-black text-sm font-medium transition-all"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm delete'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteAccount(false);
                      setDeleteConfirmText('');
                    }}
                    className="px-4 py-2 rounded-lg text-[#666666] text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-black">Subscription & Billing</h3>
            <div className="inline-flex px-3 py-1 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-black text-sm font-medium">
              {getPlanDisplay(user.plan)} — Current Plan
            </div>
            <div>
              <div className="flex justify-between text-[13px] text-[#555555] mb-2">
                <span>AI credits this month</span>
                <span>
                  {creditsUsed}/{creditsMax} used
                </span>
              </div>
              <div className="h-2 bg-[#F7F7F7] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-white to-white rounded-full"
                  style={{ width: `${Math.min(100, (creditsUsed / creditsMax) * 100)}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettingsModalOpen(false);
                setPricingModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-white to-white text-black text-sm font-semibold"
            >
              Upgrade plan
            </button>
            <div className="p-4 rounded-xl border border-[#E0E0E0] bg-[#F7F7F7]">
              <p className="text-[13px] text-[#777777]">Billing history</p>
              <p className="text-[14px] text-[#555555] mt-2">
                {normalizePlan(user.plan) === 'free' ? 'No billing history' : 'Invoices available on request.'}
              </p>
            </div>
          </div>
        );

      case 'shortcuts':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black mb-4">Keyboard Shortcuts</h3>
            {[
              ['New Chat', 'Ctrl+N'],
              ['Search', 'Ctrl+K'],
              ['Send message', 'Enter'],
              ['New line', 'Shift+Enter'],
              ['Close modal', 'Escape'],
            ].map(([label, keys]) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
              >
                <span className="text-[14px] text-[#444444]">{label}</span>
                <kbd className="px-2 py-1 rounded-md bg-[#F7F7F7] border border-[#E0E0E0] text-[12px] text-[#666666] font-mono">
                  {keys}
                </kbd>
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-white/75 backdrop-blur-sm"
        onClick={() => setSettingsModalOpen(false)}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative w-full max-w-[800px] max-h-[85vh] flex rounded-2xl bg-[#F7F7F7] border border-[#E0E0E0] shadow-2xl overflow-hidden"
      >
        <aside className="w-48 shrink-0 border-r border-white/[0.08] bg-[#F7F7F7] p-3 flex flex-col">
          <p className="text-[11px] uppercase tracking-wider text-[#888888] px-3 py-2 mb-1">Settings</p>
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] transition-all mb-0.5 ${ section === item.id ? 'bg-[#F7F7F7] text-black' : 'text-[#666666] hover:text-[#222222] hover:bg-[#F2F2F2] hover:text-black' }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={logout}
            className="mt-auto flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-black hover:bg-[#F2F2F2] hover:text-black"
          >
            <LogOut size={16} />
            Log out
          </button>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-end px-4 py-3 border-b border-[#E0E0E0]">
            <button
              type="button"
              onClick={() => setSettingsModalOpen(false)}
              className="p-2 rounded-xl text-[#666666] hover:text-black hover:bg-[#F2F2F2] hover:text-black"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsModal;
