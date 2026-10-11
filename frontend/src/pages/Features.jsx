import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Link } from "react-router-dom";
import {
  FileText, Search, Send, Mic, Bot, Archive, LayoutDashboard,
  Chrome, ArrowRight, Shield, Key, Database, Server, Eye,
  Sparkles, CheckCircle2, ChevronRight, Zap
} from "lucide-react";
import { ScrollTimelineTrack, TimelineNode } from "../components/ui/timeline";

export default function Features() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  const handleMouseMove = (e) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX - left - width / 2) / 30;
    const y = (clientY - top - height / 2) / 30;
    setMousePos({ x, y });
  };

  const products = [
    {
      icon: FileText,
      title: "AI Resume Builder",
      desc: "Draft ATS-optimized resumes designed to bypass initial automated screenings and capture recruiter attention.",
      items: ["ATS Optimization", "Resume Score", "Resume Templates", "PDF Export"],
      tags: [
        { text: "🟢 ATS Optimized", bgGradient: "from-emerald-50 to-teal-50", textColor: "text-emerald-700", borderColor: "border-emerald-200/50" },
        { text: "🟡 Resume Score", bgGradient: "from-yellow-50 to-amber-50", textColor: "text-yellow-800", borderColor: "border-yellow-200/50" }
      ]
    },
    {
      icon: Search,
      title: "AI Job Search",
      desc: "Scan global databases to uncover job opportunities that precisely match your target experience and skill set.",
      items: ["Smart Job Matching", "Global Job Search", "Salary Insights", "Saved Jobs"],
      tags: [
        { text: "🔵 Smart Matching", bgGradient: "from-blue-50 to-cyan-50", textColor: "text-blue-700", borderColor: "border-blue-200/50" },
        { text: "🟠 Global Jobs", bgGradient: "from-orange-50 to-amber-50", textColor: "text-orange-700", borderColor: "border-orange-200/50" }
      ]
    },
    {
      icon: Send,
      title: "AI Job Apply",
      desc: "Accelerate your pipeline. Auto-generate tailored cover letters and direct recruiter communications instantly.",
      items: ["AI Cover Letter", "Recruiter Message Generator", "Application Tracking", "Autofill Support"],
      tags: [
        { text: "🔵 AI Powered", bgGradient: "from-purple-50 to-indigo-50", textColor: "text-purple-700", borderColor: "border-purple-200/50" },
        { text: "🟠 New", bgGradient: "from-orange-50 to-red-50", textColor: "text-orange-700", borderColor: "border-orange-200/50" }
      ]
    },
    {
      icon: Mic,
      title: "AI Interview Coach",
      desc: "Practice with natural real-time voice coaching and receive diagnostic feedback on your answer delivery.",
      items: ["HR Interview Practice", "Technical Interview Practice", "Voice Interview", "AI Feedback"],
      tags: [
        { text: "🔴 Interview AI", bgGradient: "from-red-50 to-pink-50", textColor: "text-red-700", borderColor: "border-red-200/50" },
        { text: "🔵 AI Powered", bgGradient: "from-blue-50 to-cyan-50", textColor: "text-blue-700", borderColor: "border-blue-200/50" }
      ]
    },
    {
      icon: Bot,
      title: "AI Career Coach",
      desc: "Receive step-by-step career guidelines, skill gap analysis indicators, and tailored learning resources.",
      items: ["Career Roadmap", "Skill Gap Analysis", "Learning Suggestions", "Progress Tracking"],
      tags: [
        { text: "🟪 Career Coach", bgGradient: "from-fuchsia-50 to-purple-50", textColor: "text-purple-850", borderColor: "border-purple-200/50" },
        { text: "🟣 AI Powered", bgGradient: "from-purple-50 to-indigo-50", textColor: "text-purple-700", borderColor: "border-purple-200/50" }
      ]
    },
    {
      icon: Archive,
      title: "AI Documents",
      desc: "Securely organize and store cover letters, reference forms, and career certificates in a single vault.",
      items: ["Resume Storage", "Cover Letters", "Certificates", "Export Center"],
      tags: [
        { text: "🟦 Secure", bgGradient: "from-sky-50 to-blue-50", textColor: "text-blue-800", borderColor: "border-blue-200/50" },
        { text: "🟡 Resume Score", bgGradient: "from-yellow-50 to-amber-50", textColor: "text-yellow-800", borderColor: "border-yellow-200/50" }
      ]
    },
    {
      icon: LayoutDashboard,
      title: "Recruiter Dashboard",
      desc: "Enable corporate teams to rank profiles, manage candidates, and explore pipeline metrics dashboard charts.",
      items: ["Candidate Management", "AI Resume Ranking", "Job Posting", "Analytics"],
      tags: [
        { text: "🔵 AI Powered", bgGradient: "from-blue-50 to-indigo-50", textColor: "text-blue-700", borderColor: "border-blue-200/50" },
        { text: "🟦 Secure", bgGradient: "from-sky-50 to-blue-50", textColor: "text-blue-805", borderColor: "border-blue-200/50" }
      ]
    },
    {
      icon: Chrome,
      title: "Chrome Extension",
      desc: "Apply to job portals directly in your browser with automatic form mapper support.",
      items: ["One-click Autofill", "Portals Support", "Coming Soon"],
      comingSoon: true,
      tags: [
        { text: "🟢 Coming Soon", bgGradient: "from-emerald-50 to-green-50 animate-pulse", textColor: "text-emerald-700", borderColor: "border-emerald-250/50" },
        { text: "🟠 New", bgGradient: "from-orange-50 to-red-50", textColor: "text-orange-700", borderColor: "border-orange-200/50" }
      ]
    }
  ];

  const timeline = [
    { step: "01", title: "Profile Setup", desc: "Define your preferences and target career roles." },
    { step: "02", title: "Resume Analysis", desc: "Instantly score and identify keywords to inject." },
    { step: "03", title: "AI Resume Builder", desc: "Draft professional, bot-friendly resumes that bypass screening systems." },
    { step: "04", title: "AI Job Match", desc: "Discover perfect matching openings globally based on your profile compatibility." },
    { step: "05", title: "AI Apply", desc: "Prepare cover letters and recruiter messages for your applications." },
    { step: "06", title: "Interview Preparation", desc: "Speak with our AI coach to review answers with real-time speech feedback." },
    { step: "07", title: "Offer Tracking", desc: "Coordinate and track status pipelines to signing offers." },
    { step: "08", title: "Career Growth", desc: "Strategic roadmap planning and skill gap analysis checkups." }
  ];

  const securityFeatures = [
    { icon: Key, title: "Secure Authentication", desc: "Multi-layered user validation checks." },
    { icon: Shield, title: "Two-Factor Authentication", desc: "Enforce additional identity barriers." },
    { icon: Database, title: "Server-Checked Sessions", desc: "Suspended and revoked sessions cannot access protected routes." },
    { icon: Server, title: "Verified Payments", desc: "The server checks payment status, ownership and amount before activating a plan." },
    { icon: Eye, title: "Restricted Admin Access", desc: "Only approved administrators can access permitted dashboard sections." }
  ];

  const highlights = [
    { title: "AI Powered Career Assistant", desc: "24/7 strategic guidance matching your trajectory." },
    { title: "Resume Intelligence", desc: "ATS-optimized keywords density verification." },
    { title: "Interview Simulator", desc: "Realistic questions matching top-tier tech roles." },
    { title: "Career Planning", desc: "Clear roadmaps showing exactly how to land the offer." },
    { title: "Smart Job Discovery", desc: "Rank listings based on your exact profile compatibility." },
    { title: "Recruiter Workspace", desc: "Dynamic filtering pipelines for corporate hiring teams." }
  ];

  return (
    <div className="features-refined min-h-screen bg-white text-black flex flex-col font-sans overflow-x-hidden selection:bg-black selection:text-white">
      <Navbar />

      {/* ── HERO SECTION ────────────────────────────────────────── */}
      <section 
        onMouseMove={handleMouseMove}
        className="relative pt-36 pb-24 md:pt-48 md:pb-36 flex flex-col items-center justify-center text-center px-4 overflow-hidden border-b border-neutral-100 bg-white"
      >
        {/* Animated Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F9F9F9] to-white pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#EAEAEA_1px,transparent_1px),linear-gradient(to_bottom,#EAEAEA_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.4] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#ffffff_100%)] pointer-events-none" />

        {/* Ambient background blur blobs */}
        <motion.div 
          animate={{ 
            x: [0, 30, -30, 0],
            y: [0, -20, 20, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 left-1/3 w-[300px] h-[300px] bg-purple-100/10 rounded-full blur-[90px] opacity-60 pointer-events-none"
        />
        <motion.div 
          animate={{ 
            x: [0, -35, 35, 0],
            y: [0, 25, -25, 0]
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-1/4 right-1/3 w-[250px] h-[250px] bg-blue-100/15 rounded-full blur-[80px] opacity-50 pointer-events-none"
        />

        {/* Floating AI Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-black/20 rounded-full pointer-events-none"
            style={{
              top: `${15 + Math.random() * 70}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0.2, 0.7, 0.2]
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 3
            }}
          />
        ))}

        <div className="max-w-4xl mx-auto relative z-10">
          {/* Subtle tag badge with soft gradient */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gradient-to-r from-purple-100 to-indigo-50 border border-purple-200/60 text-purple-750 mb-6 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-650" />
            AI Career Suite
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] text-black"
          >
            Everything You Need To <br />
            <span className="bg-gradient-to-r from-neutral-400 via-neutral-600 to-black bg-clip-text text-transparent">Build Your Career</span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-base sm:text-lg text-neutral-500 max-w-2xl mx-auto leading-relaxed"
          >
            HirenextAI combines ATS resume scanning, automated job application tools, smart matches, and mock audio interviews into one premium, unified SaaS workspace.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap gap-4 justify-center"
          >
            <Link
              to="/register"
              className="bg-black text-white hover:bg-neutral-800 text-xs font-bold px-8 py-4 rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-98"
            >
              Get Started Free
            </Link>
            <a
              href="#products"
              className="border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold px-8 py-4 rounded-xl transition-all duration-300 active:scale-98"
            >
              Explore AI Products
            </a>
          </motion.div>
        </div>

        {/* Parallax graphic elements */}
        <motion.div 
          animate={{ 
            x: mousePos.x * 0.8,
            y: mousePos.y * 0.8
          }}
          transition={{ type: "spring", stiffness: 150, damping: 25 }}
          className="absolute -bottom-8 left-10 w-24 h-24 border border-neutral-100 rounded-2xl bg-white/30 backdrop-blur-sm pointer-events-none hidden md:block"
        />
        <motion.div 
          animate={{ 
            x: -mousePos.x * 0.8,
            y: -mousePos.y * 0.8
          }}
          transition={{ type: "spring", stiffness: 150, damping: 25 }}
          className="absolute top-20 right-10 w-28 h-28 border border-neutral-100 rounded-3xl bg-white/40 backdrop-blur-sm pointer-events-none hidden md:block"
        />
      </section>

      {/* ── AI PRODUCTS GRID ────────────────────────────────────── */}
      <section id="products" className="py-24 max-w-7xl mx-auto px-4 sm:px-6 relative">
        {/* Ambient Blur Circle */}
        <div className="absolute top-[20%] left-[-100px] w-96 h-96 bg-purple-50 rounded-full blur-[130px] opacity-40 pointer-events-none" />
        <div className="absolute top-[60%] right-[-100px] w-96 h-96 bg-blue-50 rounded-full blur-[130px] opacity-40 pointer-events-none" />

        <div className="text-center max-w-2xl mx-auto mb-16 relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-black">Unified AI Products</h2>
          <p className="text-neutral-400 mt-2.5 text-xs">Practical tools to prepare your resume, practise interviews and organise your search.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {products.map((prod, idx) => {
            const Icon = prod.icon;
            return (
              <motion.div
                key={prod.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.05 }}
                className="feature-card group border border-neutral-150 rounded-2xl p-6 bg-white hover:shadow-[0_12px_40px_rgba(0,0,0,0.03)] hover:border-neutral-300 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <div className="w-10 h-10 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-all duration-300">
                      <Icon className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors" />
                    </div>
                    {/* Soft gradient accent tags */}
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      {prod.tags && prod.tags.map((tag, tIdx) => (
                        <span
                          key={tIdx}
                          className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full border bg-gradient-to-r ${tag.bgGradient} ${tag.textColor} ${tag.borderColor} shadow-[0_1px_2px_rgba(0,0,0,0.01)] uppercase tracking-wider transition-transform hover:scale-105 duration-200`}
                        >
                          {tag.text}
                        </span>
                      ))}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-black mb-2">{prod.title}</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed mb-6">{prod.desc}</p>
                </div>

                <div>
                  <div className="grid grid-cols-2 gap-1.5 pt-4 border-t border-neutral-100">
                    {prod.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center gap-1.5 text-[10px] text-neutral-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>

                  {prod.comingSoon ? (
                    <button 
                      disabled
                      className="w-full mt-5 py-2 border border-neutral-100 bg-neutral-50 text-neutral-455 text-xs font-semibold rounded-lg cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <Chrome size={12} /> Extension Disabled
                    </button>
                  ) : (
                    <Link
                      to="/register"
                      className="w-full mt-5 py-2 border border-neutral-150 bg-white text-black hover:bg-black hover:text-white hover:border-black text-xs font-semibold rounded-lg flex items-center justify-center gap-1 transition-all duration-300 active:scale-98"
                    >
                      Launch Product <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── AI WORKFLOW SECTION (TIMELINE) ───────────────────────────── */}
      <section ref={containerRef} className="py-24 bg-neutral-50 border-y border-neutral-100 relative overflow-hidden">
        {/* Soft background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-neutral-100/50 rounded-full blur-[100px] opacity-40 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl font-extrabold tracking-tight text-black">AI Career Workflow</h2>
            <p className="text-neutral-400 mt-2.5 text-xs">Discover how HirenextAI automates the transition from setup to offers.</p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Connecting center line */}
            <ScrollTimelineTrack containerRef={containerRef} lineXClass="left-4 md:left-1/2" topOffset={22} bottomOffset={22} />

            <div className="space-y-12">
              {timeline.map((step, index) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className={`flex flex-col md:flex-row items-stretch gap-6 relative ${
                    index % 2 === 1 ? "md:flex-row-reverse" : ""
                  }`}
                >
                  {/* Custom interactive animated circle node */}
                  <TimelineNode containerRef={containerRef}
                    scrollYProgress={scrollYProgress} 
                    index={index} 
                    total={timeline.length} 
                    nodeClass="left-4 md:left-1/2 top-[12px]" 
                  />

                  {/* Spacer spacer spacer */}
                  <div className="w-full md:w-1/2 md:pr-12 md:text-right text-left pl-10 md:pl-0 flex flex-col justify-start">
                    <span className="font-mono text-xs font-bold text-neutral-400">STEP {step.step}</span>
                  </div>

                  {/* Details details details */}
                  <div className="w-full md:w-1/2 pl-10 md:pl-12 text-left">
                    <div className="bg-white border border-neutral-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 duration-200">
                      <h4 className="text-sm font-bold text-black mb-1.5">{step.title}</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY COMPLIANCE ──────────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6">
        <div className="border border-neutral-100 bg-white rounded-3xl p-8 md:p-12 shadow-[0_8px_32px_rgba(0,0,0,0.01)] flex flex-col lg:flex-row items-center gap-12 relative overflow-hidden">
          {/* Subtle glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-neutral-50 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full lg:w-1/2 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-gradient-to-r from-emerald-100 to-teal-50 border border-emerald-250/50 text-emerald-700 mb-6 shadow-sm">
              <Shield className="w-3 h-3 text-emerald-600" /> Account Protection
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight leading-tight">
              Account Access & <br />
              Practical Safeguards
            </h3>
            <p className="text-neutral-500 mt-4 text-xs leading-relaxed max-w-md">
              Your account uses hashed passwords and checked sessions. Administrative actions require an approved role and email verification.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                <h5 className="text-xs font-bold text-black">Hashed Passwords</h5>
                <p className="text-[10px] text-neutral-400 mt-1">Passwords are stored as bcrypt hashes.</p>
              </div>
              <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/50">
                <h5 className="text-xs font-bold text-black">2FA Security</h5>
                <p className="text-[10px] text-neutral-400 mt-1">Multi-layered user validation checks guard your workspace.</p>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 grid grid-cols-1 gap-4 relative z-10">
            {securityFeatures.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div key={i} className="flex gap-4 p-4 rounded-2xl border border-neutral-100 bg-white hover:border-neutral-300 transition-colors duration-200">
                  <div className="w-8 h-8 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-neutral-600" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-black">{feat.title}</h5>
                    <p className="text-[10px] text-neutral-400 mt-1 leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HIGHLIGHTS GRID ──────────────────────────────────────── */}
      <section className="py-24 border-t border-neutral-100 bg-[#FBFBFB] relative overflow-hidden">
        <div className="absolute bottom-[-100px] left-[10%] w-80 h-80 bg-neutral-100 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-black tracking-tight">Platform Highlights</h2>
            <p className="text-neutral-400 mt-2 text-xs">High-density AI toolkits engineered for strategic velocity.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {highlights.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
                className="bg-white border border-neutral-150 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.01)] hover:border-neutral-300 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div>
                  <div className="w-7 h-7 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center mb-4">
                    <CheckCircle2 size={14} className="text-neutral-700" />
                  </div>
                  <h4 className="text-sm font-bold text-black mb-2">{item.title}</h4>
                  <p className="text-xs text-neutral-500 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
