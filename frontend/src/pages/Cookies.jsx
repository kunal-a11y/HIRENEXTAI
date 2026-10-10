import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import {
  Cookie, Shield, BarChart2, Settings, CheckCircle, XCircle, Globe, Lock, Sparkles, ChevronDown, RefreshCw, Info, AlertTriangle, Mail, Clock
} from "lucide-react";

function FadeUp({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const cookieTypes = [
  {
    icon: Lock,
    name: "Strictly Necessary Cookies",
    required: true,
    desc: "These cookies are essential for the platform to function. They maintain your login session and security tokens. You cannot opt out of these — they are required for the service to work.",
    examples: ["Session authentication token", "CSRF protection token", "Load balancer preference", "Security verification"],
    color: "border-[#EAEAEA] bg-[#FAFAFA]",
    badge: "Always Active",
    badgeColor: "bg-black text-white border-transparent",
    tag: "Required",
    tagColor: "bg-[#8B5CF6]/10 text-[#7C3AED] border border-[#8B5CF6]/20 font-medium",
    iconColor: "text-[#8B5CF6]",
    bg: "bg-[#8B5CF6]/5",
  },
  {
    icon: BarChart2,
    name: "Analytics Cookies",
    required: false,
    desc: "These help us understand how users interact with our platform so we can improve it. We use strictly anonymised, aggregated data — no personal identification is possible from this data.",
    examples: ["Page view counts", "Feature usage patterns", "Search term frequency", "Session duration"],
    color: "border-[#EAEAEA] bg-[#FAFAFA]",
    badge: "Optional",
    badgeColor: "bg-black/5 text-black border-transparent",
    tag: "Analytics",
    tagColor: "bg-[#2563EB]/10 text-[#1D4ED8] border border-[#2563EB]/20 font-medium",
    iconColor: "text-[#2563EB]",
    bg: "bg-[#2563EB]/5",
  },
  {
    icon: Settings,
    name: "Preference Cookies",
    required: false,
    desc: "These remember your in-app settings and preferences to give you a more personalised and consistent experience across sessions.",
    examples: ["Dark/light mode preference", "Dashboard layout preference", "Search filter defaults", "Notification settings"],
    color: "border-[#EAEAEA] bg-[#FAFAFA]",
    badge: "Optional",
    badgeColor: "bg-black/5 text-black border-transparent",
    tag: "Personalisation",
    tagColor: "bg-[#059669]/10 text-[#047857] border border-[#059669]/20 font-medium",
    iconColor: "text-[#059669]",
    bg: "bg-[#059669]/5",
  },
  {
    icon: XCircle,
    name: "Advertising Cookies",
    required: false,
    desc: "HirenextAI does NOT use advertising cookies or share your data with ad networks. We do not display third-party ads on our platform.",
    examples: ["None — we don't use these"],
    color: "border-[#EAEAEA] bg-[#FAFAFA]",
    badge: "Not Used",
    badgeColor: "bg-black/5 text-black border-transparent",
    tag: "Never Used",
    tagColor: "bg-[#DC2626]/10 text-[#B91C1C] border border-[#DC2626]/20 font-medium",
    iconColor: "text-[#DC2626]",
    bg: "bg-[#DC2626]/5",
  },
];

export default function Cookies() {
  const handleManageCookies = () => {
    localStorage.removeItem("cookie_consent");
    window.dispatchEvent(new Event("show-cookie-banner"));
  };

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', width: '100%' }} className="bg-background relative">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-60px] left-[15%] w-[600px] h-[600px] rounded-full bg-[#F7F7F7] blur-[160px]" />
        <div className="absolute bottom-[10%] right-[-60px] w-[400px] h-[400px] rounded-full bg-[#F7F7F7] blur-[130px]" />
        <div className="absolute bottom-[15%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[#F7F7F7] blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.5) 1px,transparent 0)", backgroundSize: "40px 40px" }} />
      </div>

      <Navbar />

      <section className="relative z-10 pt-40 pb-12 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] mb-4"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span className="text-[#222222] text-sm font-medium">Cookies & Privacy</span>
          </motion.div>

          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-[#F7F7F7] border border-[#E0E0E0] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <Cookie className="w-8 h-8 text-black" />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-display font-extrabold mb-3 text-black">Cookie Policy</h1>
          <p className="text-black/60 text-sm mb-4">Last updated: May 2026</p>
          <p className="text-black/85 max-w-2xl mx-auto text-sm leading-relaxed font-normal">
            HirenextAI uses cookies to provide a secure, functional, and personalised experience. You're in control — choose exactly what you allow.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#333333] text-xs font-semibold">
              <XCircle className="w-3.5 h-3.5 text-black" />
              <span>No Ad Cookies</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#333333] text-xs font-semibold">
              <Globe className="w-3.5 h-3.5 text-black" />
              <span>GDPR Compliant</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#333333] text-xs font-semibold">
              <Settings className="w-3.5 h-3.5 text-black" />
              <span>You're in Control</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#333333] text-xs font-semibold">
              <Lock className="w-3.5 h-3.5 text-black" />
              <span>Encrypted Storage</span>
            </motion.div>
          </div>
        </div>

        {/* What are cookies */}
        <FadeUp>
          <div className="glass-card p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#F7F7F7] blur-[60px] pointer-events-none" />
            <h2 className="flex items-center gap-3 text-xl font-bold text-black mb-4">
              <Info className="w-5 h-5 text-black shrink-0" />
              <span>What Are Cookies?</span>
            </h2>
            <p className="text-[#222222] text-sm leading-relaxed font-normal">
              Cookies are small text files stored on your device when you visit a website. They allow the website to remember information about your visit — like your login state or preferences. Cookies are widely used to make websites work efficiently and to provide analytics information to site owners.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <div className="inline-flex items-center gap-1.5 text-xs text-[#333333] bg-white border border-[#E0E0E0] px-3 py-1.5 rounded-full font-medium">
                <CheckCircle className="w-3.5 h-3.5 text-black" />
                <span>Stored on your device</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-[#333333] bg-white border border-[#E0E0E0] px-3 py-1.5 rounded-full font-medium">
                <Clock className="w-3.5 h-3.5 text-black" />
                <span>Session or persistent</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs text-[#333333] bg-white border border-[#E0E0E0] px-3 py-1.5 rounded-full font-medium">
                <RefreshCw className="w-3.5 h-3.5 text-black" />
                <span>Deletable anytime</span>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Cookie Types */}
        <div className="space-y-5 mb-10">
          {cookieTypes.map((type, i) => {
            const IconComponent = type.icon;
            return (
              <FadeUp key={i} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className={`glass-card p-8 border ${type.color} relative overflow-hidden`}
                >
                  <div className={`absolute top-0 right-0 w-32 h-32 blur-[50px] pointer-events-none ${type.bg || 'bg-[#F7F7F7]'}`} />

                  <div className="flex items-center justify-between mb-4 flex-wrap gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${type.color}`}>
                        <IconComponent className={`w-5 h-5 ${type.iconColor}`} />
                      </div>
                      <h3 className="text-lg font-bold text-black">{type.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full ${type.tagColor}`}>
                        {type.tag}
                      </span>
                      <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${type.badgeColor}`}>
                        {type.badge}
                      </span>
                    </div>
                  </div>

                  <p className="text-[#222222] text-sm leading-relaxed mb-5 font-normal relative z-10">{type.desc}</p>

                  <div className="relative z-10">
                    <p className="text-xs text-[#444444] uppercase tracking-wider mb-3 font-bold">Examples</p>
                    <div className="flex flex-wrap gap-2">
                      {type.examples.map((ex, j) => (
                        <span key={j} className="px-3 py-1 rounded-full bg-white border border-[#E0E0E0] text-[#333333] font-medium text-xs">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </FadeUp>
            );
          })}
        </div>

        {/* Your Rights Card */}
        <FadeUp>
          <div className="glass-card p-6 mb-8 border border-[#E0E0E0] bg-[#FAFAFA]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#FAFAFA] border border-[#E0E0E0] flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-black" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-black mb-2">Your Global Cookie Rights</h3>
                <p className="text-[#222222] text-sm font-normal leading-relaxed">
                  Under GDPR, CCPA, and other global privacy laws, you have the right to know what cookies we use, consent to optional cookies, withdraw consent at any time, and request deletion of any stored cookie data. HirenextAI honours these rights for all users worldwide.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-0.5 rounded-full bg-white border border-[#E0E0E0] text-[#333333] font-semibold text-[10px]">
                    GDPR
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-[#E0E0E0] text-[#333333] font-semibold text-[10px]">
                    CCPA
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-[#E0E0E0] text-[#333333] font-semibold text-[10px]">
                    ePrivacy Directive
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-[#E0E0E0] text-[#333333] font-semibold text-[10px]">
                    Global Standards
                  </span>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>

        {/* Manage Preferences */}
        <FadeUp>
          <div className="glass-card p-8 text-center relative overflow-hidden mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-white to-white pointer-events-none" />

            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="inline-flex mb-4"
            >
              <RefreshCw className="w-8 h-8 text-black" />
            </motion.div>

            <h2 className="text-xl font-bold text-black mb-3 relative z-10">Manage Your Cookie Preferences</h2>
            <p className="text-[#222222] text-sm mb-6 font-normal max-w-lg mx-auto relative z-10">
              Reset your cookie preferences at any time. The consent banner will reappear on your next visit so you can make a fresh choice.
            </p>

            <div className="relative z-10 mb-6">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleManageCookies}
                className="py-3 px-8 inline-flex items-center gap-2 bg-black hover:bg-black/90 text-white rounded-xl font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.1)] cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset Cookie Preferences</span>
              </motion.button>
            </div>

            <div className="flex flex-wrap gap-4 justify-center mt-5 relative z-10">
              <div className="flex items-center gap-1.5 text-[#444444] font-medium text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-black" />
                <span>Takes effect immediately</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#444444] font-medium text-xs">
                <Shield className="w-3.5 h-3.5 text-black" />
                <span>No account impact</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#444444] font-medium text-xs">
                <Globe className="w-3.5 h-3.5 text-black" />
                <span>GDPR right to withdraw</span>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

      <Footer />
    </div>
  );
}
