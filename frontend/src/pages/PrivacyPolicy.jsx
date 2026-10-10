import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import {
  Lock, Eye, Database, Share2, Clock, UserCheck, Cookie, Mail, CheckCircle, Globe, Sparkles, ChevronDown, ArrowRight, Shield
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

const sections = [
  {
    icon: Eye,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Transparency",
    title: "Information We Collect",
    content: [
      "Account information: When you create an account, we collect your name, email address, and password (stored as a secure hash). We never store plaintext passwords.",
      "Profile data: Skills, experience, education history, preferred job categories, target locations, and salary expectations you provide during onboarding.",
      "Usage data: How you interact with our platform — searches performed, AI generations used, applications tracked, and features accessed.",
      "Device & technical data: IP address, browser type, operating system, and access timestamps used strictly for security and debugging purposes.",
    ],
  },
  {
    icon: CheckCircle,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Purpose",
    title: "How We Use Your Information",
    content: [
      "To personalise job recommendations and AI outputs specifically for your profile and career goals.",
      "To enforce usage quotas and subscription plan limits fairly across all users.",
      "To improve our AI models and product features — using aggregated, anonymised data only. Your personal data is never used to train models individually.",
      "To send important account notifications such as usage alerts, subscription renewals, and security alerts.",
      "To maintain platform security, prevent fraud, and protect all users on the platform.",
    ],
  },
  {
    icon: Share2,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "No Selling",
    title: "Data Sharing",
    content: [
      "We do NOT sell your personal data to any third party — ever. This is a core commitment, not just a policy.",
      "We may share anonymised, aggregated data with partners for analytics purposes. This data cannot identify you in any way.",
      "We use trusted payment gateways (e.g. Razorpay or Stripe) for secure billing transactions. These providers are contractually bound to protect your data under strict data processing agreements.",
      "We may disclose data if required by applicable law or a valid legal order. We will notify you where legally permitted to do so.",
    ],
  },
  {
    icon: Clock,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Retention",
    title: "Data Retention",
    content: [
      "Your account data is retained for as long as your account is active and you continue to use HirenextAI.",
      "Upon account deletion, all personal data is permanently and irreversibly removed within 30 days.",
      "Anonymised usage logs may be retained for up to 2 years for product improvement and security monitoring purposes.",
    ],
  },
  {
    icon: UserCheck,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Your Control",
    title: "Your Rights",
    content: [
      "Access: You may request a full copy of all personal data we hold about you at any time.",
      "Correction: You may update or correct your data at any time through your profile settings.",
      "Deletion: You may permanently delete your account and all associated data — no questions asked.",
      "Portability: You may export your profile data in JSON format directly from your account settings.",
      "Opt-out: You may opt out of non-essential communications at any time via your notification preferences.",
      "GDPR & global rights: Users in the EU, UK, and other regions with applicable data protection laws retain all rights under those frameworks.",
    ],
  },
  {
    icon: Lock,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "AES-256",
    title: "Security",
    content: [
      "All data is encrypted at rest using AES-256 and in transit using TLS 1.3 — industry-standard encryption.",
      "We conduct regular security audits and penetration testing to identify and fix vulnerabilities proactively.",
      "Passwords are hashed using bcrypt with salting — we never store plaintext passwords under any circumstances.",
      "Access to production systems is restricted to authorised personnel only, with audit logging on all access.",
    ],
  },
  {
    icon: Cookie,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Cookies",
    title: "Cookies",
    content: [
      "We use strictly necessary cookies to maintain your login session and keep you securely signed in.",
      "With your consent, we use analytics cookies to understand how users navigate our platform and improve the experience.",
      "You can manage or withdraw cookie consent at any time using our cookie consent tool in the footer.",
      "We do not use advertising cookies or share cookie data with ad networks.",
    ],
  },
  {
    icon: Globe,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Global",
    title: "International Users",
    content: [
      "HirenextAI is a global platform serving users in 40+ countries. We comply with applicable data protection laws in all regions we operate.",
      "For users in the European Union: We comply with GDPR. You have the right to lodge a complaint with your local data protection authority.",
      "For users in California: We comply with CCPA. You have the right to know, delete, and opt-out of sale of personal information.",
      "For all other regions: We apply the same high standard of data protection globally, regardless of local law requirements.",
    ],
  },
  {
    icon: Mail,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Contact Us",
    title: "Contact & Privacy Requests",
    content: [
      "For privacy-related questions or data requests, contact us at: support@hirenextai.com",
      "HirenextAI — Global Platform, Operated from Greater Noida, India",
      "We will respond to all privacy requests within 7 business days.",
      "For urgent data deletion or security concerns, mark your email subject as URGENT — PRIVACY REQUEST for priority handling.",
    ],
  },
];

export default function PrivacyPolicy() {
  const [openSection, setOpenSection] = useState(0);

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', width: '100%' }} className="bg-background relative">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-60px] left-[15%] w-[600px] h-[600px] rounded-full bg-[#F7F7F7] blur-[160px]" />
        <div className="absolute bottom-[10%] right-[-60px] w-[400px] h-[400px] rounded-full bg-[#F7F7F7] blur-[130px]" />
        <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-[#F7F7F7] blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.018]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.5) 1px,transparent 0)", backgroundSize: "40px 40px" }} />
      </div>

      <Navbar />

      <section className="relative z-10 pt-40 pb-16 px-6 max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] mb-4"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span className="text-[#222222] text-sm font-medium">Privacy & Security</span>
          </motion.div>

          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="w-16 h-16 rounded-2xl bg-[#F7F7F7] border border-[#E0E0E0] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <Shield className="w-8 h-8 text-black" />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-display font-extrabold mb-3 text-black">Privacy Policy</h1>
          <p className="text-black/35 text-sm mb-4">Last updated: May 2026</p>
          <p className="text-black/55 max-w-2xl mx-auto text-sm leading-relaxed font-light">
            At HirenextAI, your privacy is a core commitment — not a checkbox. We're a global platform and we hold ourselves to the highest data protection standards worldwide.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#555555] text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-black" />
              <span>GDPR Compliant</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#555555] text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-black" />
              <span>AES-256 Encrypted</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#555555] text-xs font-medium">
              <Shield className="w-3.5 h-3.5 text-black" />
              <span>No Data Selling</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#555555] text-xs font-medium">
              <Globe className="w-3.5 h-3.5 text-black" />
              <span>40+ Countries</span>
            </motion.div>
          </div>
        </div>

        {/* Desktop Quick Nav */}
        <div className="hidden md:flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-none">
          {sections.map((section, i) => (
            <div
              key={i}
              onClick={() => document.getElementById(`section-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="px-3 py-1.5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#777777] text-xs hover:text-[#444444] hover:bg-[#F2F2F2] hover:text-black transition-all cursor-pointer whitespace-nowrap"
            >
              {section.title}
            </div>
          ))}
        </div>

        {/* Sections List (Accordion) */}
        <div className="space-y-4">
          {sections.map((section, i) => {
            const IconComponent = section.icon;
            return (
              <FadeUp key={i} delay={i * 0.05}>
                <motion.div
                  id={`section-${i}`}
                  whileHover={{ y: -2 }}
                  className="glass-card overflow-hidden cursor-pointer group"
                >
                  <div
                    onClick={() => setOpenSection(openSection === i ? null : i)}
                    className="flex items-center justify-between p-6 select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${section.bg}`}>
                        <IconComponent className={`w-5 h-5 ${section.color}`} />
                      </div>
                      <div className="flex items-center">
                        <span className="text-base font-bold text-black">{section.title}</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#888888] text-[10px] ml-3">
                          {section.tag}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: openSection === i ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="shrink-0"
                    >
                      <ChevronDown className="w-4 h-4 text-[#777777]" />
                    </motion.div>
                  </div>

                  <AnimatePresence initial={false}>
                    {openSection === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[#E0E0E0] px-6 pb-6 pt-5">
                          <ul className="space-y-3">
                            {section.content.map((item, j) => (
                              <li key={j} className="flex items-start gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 bg-current ${section.color}`} />
                                <p className="text-[#555555] text-sm leading-relaxed font-light">{item}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </FadeUp>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-16">
          <FadeUp>
            <div className="glass-card p-10 text-center relative overflow-hidden max-w-3xl mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-[#999999]/8 to-white pointer-events-none" />
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="inline-flex mb-4"
              >
                <Lock className="w-8 h-8 text-black" />
              </motion.div>

              <h2 className="text-2xl font-display font-bold text-black mb-3 relative z-10">Questions About Your Privacy?</h2>
              <p className="text-black/55 text-sm mb-6 max-w-lg mx-auto relative z-10 font-light">
                Our team is happy to answer any questions about how we handle your data. We respond to all privacy requests within 7 business days.
              </p>

              <div className="mb-6 relative z-10">
                <Link to="/contact" className="btn-primary py-3 px-8 inline-flex items-center gap-2 text-black">
                  <Mail className="w-4 h-4" /> Contact Privacy Team
                </Link>
              </div>

              <div className="flex flex-wrap gap-4 justify-center mt-5 relative z-10">
                <div className="flex items-center gap-1.5 text-black/35 text-xs">
                  <Mail className="w-3.5 h-3.5" />
                  <span>support@hirenextai.com</span>
                </div>
                <div className="flex items-center gap-1.5 text-black/35 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>7 day response time</span>
                </div>
                <div className="flex items-center gap-1.5 text-black/35 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-black" />
                  <span>GDPR Compliant</span>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <Footer />
    </div>
  );
}
