import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, CheckCircle } from "lucide-react";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [preferences, setPreferences] = useState({ analytics: false, preference: false });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const checkConsent = () => {
      try {
        const consent = localStorage.getItem("cookie_consent");
        if (!consent) {
          setShowBanner(true);
        } else {
          const parsed = JSON.parse(consent);
          setPreferences({
            analytics: !!parsed.analytics,
            preference: !!parsed.preference
          });
          setShowBanner(false);
        }
      } catch (e) {
        setShowBanner(true);
      }
    };

    checkConsent();

    window.addEventListener("show-cookie-banner", checkConsent);
    return () => {
      window.removeEventListener("show-cookie-banner", checkConsent);
    };
  }, []);

  const acceptAll = () => {
    const consent = { necessary: true, analytics: true, preference: true };
    try {
      localStorage.setItem("cookie_consent", JSON.stringify(consent));
    } catch (e) {}
    setPreferences({ analytics: true, preference: true });
    setShowBanner(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const acceptNecessary = () => {
    const consent = { necessary: true, analytics: false, preference: false };
    try {
      localStorage.setItem("cookie_consent", JSON.stringify(consent));
    } catch (e) {}
    setPreferences({ analytics: false, preference: false });
    setShowBanner(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const savePreferences = () => {
    const consent = { necessary: true, analytics: preferences.analytics, preference: preferences.preference };
    try {
      localStorage.setItem("cookie_consent", JSON.stringify(consent));
    } catch (e) {}
    setShowBanner(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      {/* FIXED COOKIE CONSENT BANNER */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
          >
            <div className="max-w-5xl mx-auto bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl p-5 md:p-7 shadow-[0_-8px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <Cookie className="w-5 h-5 text-black" />
                    <span className="text-black font-bold text-base">Cookie Preferences</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-black text-[10px] font-semibold">
                      We respect your privacy
                    </span>
                  </div>
                  <p className="text-[#666666] text-sm font-light leading-relaxed max-w-xl">
                    We use cookies to keep you logged in, understand how you use HirenextAI, and remember your preferences. You control what we store.
                  </p>

                  <div className="flex flex-wrap gap-5 mt-4">
                    <div
                      onClick={() => setPreferences(p => ({ ...p, analytics: !p.analytics }))}
                      className="flex items-center gap-3 cursor-pointer select-none"
                    >
                      <div
                        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${preferences.analytics ? 'bg-black' : 'bg-[#EAEAEA]'}`}
                      >
                        <motion.div
                          animate={{ x: preferences.analytics ? 22 : 2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                        />
                      </div>
                      <span className="text-[#555555] text-xs font-semibold">Analytics cookies</span>
                    </div>

                    <div
                      onClick={() => setPreferences(p => ({ ...p, preference: !p.preference }))}
                      className="flex items-center gap-3 cursor-pointer select-none"
                    >
                      <div
                        className={`relative w-10 h-5 rounded-full transition-colors duration-300 ${preferences.preference ? 'bg-black' : 'bg-[#EAEAEA]'}`}
                      >
                        <motion.div
                          animate={{ x: preferences.preference ? 22 : 2 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
                        />
                      </div>
                      <span className="text-[#555555] text-xs font-semibold">Preference cookies</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full md:w-auto">
                  <button
                    onClick={acceptNecessary}
                    className="py-2.5 px-5 text-sm bg-white hover:bg-[#FAFAFA] text-black border border-[#EAEAEA] hover:border-black/20 rounded-xl font-bold transition-all duration-200 whitespace-nowrap w-full sm:w-auto cursor-pointer"
                  >
                    Necessary Only
                  </button>
                  <button
                    onClick={savePreferences}
                    className="py-2.5 px-5 text-sm bg-white hover:bg-[#FAFAFA] text-black border border-[#EAEAEA] hover:border-black/20 rounded-xl font-bold transition-all duration-200 whitespace-nowrap w-full sm:w-auto cursor-pointer"
                  >
                    Save Preferences
                  </button>
                  <button
                    onClick={acceptAll}
                    className="py-2.5 px-5 text-sm bg-black hover:bg-black/90 text-white border border-transparent rounded-xl font-bold transition-all duration-200 whitespace-nowrap w-full sm:w-auto cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                  >
                    Accept All
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION TOAST */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed top-24 right-6 z-[9999] inline-flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#F7F7F7] border border-[#E0E0E0] text-black text-sm font-semibold shadow-[0_8px_30px_rgba(255,255,255,0.15)] backdrop-blur-xl"
          >
            <div className="w-5 h-5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-black">Cookie preferences saved!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
