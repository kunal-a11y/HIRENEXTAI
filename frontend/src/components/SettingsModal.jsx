import { workspaceStorage } from '../lib/workspaceStorage';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Globe, User, HelpCircle, LogOut } from 'lucide-react';
import useUserStore from '../store/useUserStore';
import { getPlanDisplay } from '../lib/planUtils';

const SettingsModal = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();
  const { user } = useUserStore();

  // AI Response Language state (local storage)
  const [aiLanguage, setAiLanguage] = useState('English');

  useEffect(() => {
    const savedAiLang = workspaceStorage.getItem('aiLanguage');
    if (savedAiLang) {
      setAiLanguage(savedAiLang);
    }
  }, []);

  const handleAiLanguageChange = (e) => {
    const val = e.target.value;
    setAiLanguage(val);
    workspaceStorage.setItem('aiLanguage', val);
  };

  const handleInterfaceLanguageChange = (e) => {
    const code = e.target.value;
    i18n.changeLanguage(code);

    // Apply RTL for Arabic
    if (code === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0]">
            <h2 className="text-lg font-medium text-black">Settings</h2>
            <button onClick={onClose} className="p-2 text-black hover:text-black rounded-md hover:bg-[#F2F2F2] hover:text-black transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-8">

            {/* 1. LANGUAGE & AI OUTPUT */}
            <section>
              <h3 className="text-sm font-medium text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe size={16} /> Language & AI Output
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-black font-medium">AI Response Language</p>
                    <p className="text-sm text-black">The language the AI will reply to you in.</p>
                  </div>
                  <select
                    value={aiLanguage}
                    onChange={handleAiLanguageChange}
                    className="bg-[#F7F7F7] border border-[#E0E0E0] text-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Arabic">Arabic</option>
                    <option value="German">German</option>
                    <option value="French">French</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Japanese">Japanese</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-black font-medium">Interface Language</p>
                    <p className="text-sm text-black">Language for buttons and menus.</p>
                  </div>
                  <select
                    value={i18n.language}
                    onChange={handleInterfaceLanguageChange}
                    className="bg-[#F7F7F7] border border-[#E0E0E0] text-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                    <option value="ar">Arabic</option>
                    <option value="de">German</option>
                    <option value="fr">French</option>
                    <option value="es">Spanish</option>
                    <option value="ja">Japanese</option>
                  </select>
                </div>
              </div>
            </section>

            <div className="h-px bg-[#F7F7F7] w-full"></div>

            {/* 2. ACCOUNT */}
            <section>
              <h3 className="text-sm font-medium text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                <User size={16} /> Account
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F7F7F7] rounded-full flex items-center justify-center text-lg font-medium text-black">
                      JD
                    </div>
                    <div>
                      <p className="text-black font-medium">John Doe</p>
                      <p className="text-sm text-black">john.doe@example.com</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-lg p-4 flex items-center justify-between mt-4">
                  <div>
                    <p className="text-black font-medium">{getPlanDisplay(user.plan)}</p>
                    <p className="text-sm text-black">10 messages/day. Upgrade for unlimited access.</p>
                  </div>
                  <div className="flex gap-3">
                    <button className="btn-outline">Learn More</button>
                    <button className="btn-solid">Upgrade Plan</button>
                  </div>
                </div>
              </div>
            </section>

            <div className="h-px bg-[#F7F7F7] w-full"></div>

            {/* 3. SUPPORT */}
            <section>
              <h3 className="text-sm font-medium text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                <HelpCircle size={16} /> Support
              </h3>
              <div className="flex gap-4 items-center">
                <button className="btn-solid">Get Help</button>
                <a href="#" className="text-sm text-black hover:text-black flex items-center underline underline-offset-2">Contact Us</a>
              </div>
            </section>

            <div className="h-px bg-[#F7F7F7] w-full"></div>

            {/* 4. SESSION */}
            <section>
              <h3 className="text-sm font-medium text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                <LogOut size={16} /> Session
              </h3>
              <button className="px-4 py-2 bg-transparent border border-[#E0E0E0] text-black font-medium rounded-lg hover:bg-[#F2F2F2] hover:text-black transition-colors text-sm">
                Logout
              </button>
            </section>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SettingsModal;
