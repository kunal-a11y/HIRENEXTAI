import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Footer } from "../components/layout/Footer";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Briefcase,
  CheckCircle2,
  FileText,
  History,
  LayoutDashboard,
  Lock,
  MessageSquare,
  Rocket,
  Search,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  User,
  X,
  Zap,
} from "lucide-react";

const jobs = [
  { title: "Frontend Developer", company: "NovaTech Labs", match: "92%", location: "Remote" },
  { title: "AI Product Intern", company: "BrightHire", match: "87%", location: "Bengaluru" },
  { title: "MERN Stack Fresher", company: "CloudBridge", match: "81%", location: "Noida" },
];

const tools = [
  { icon: FileText, title: "Resume Optimizer", desc: "ATS fixes and role-fit suggestions" },
  { icon: MessageSquare, title: "Cover Letter AI", desc: "Personalized letters in seconds" },
  { icon: Target, title: "Job Match Score", desc: "Quick fit score for every role" },
];

function V1InterceptModal({ open, onClose }) {
  const navigate = useNavigate();
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-white/75 backdrop-blur-md"
            onClick={onClose}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.9, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="pointer-events-auto w-full max-w-sm"
            >
              <div className="relative bg-[#F7F7F7] border border-[#E0E0E0] rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[280px] h-[120px] bg-[#F7F7F7] blur-[70px] pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#999999] to-transparent" />
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F7F7F7] hover:bg-[#F2F2F2] hover:text-black border border-[#E0E0E0] flex items-center justify-center text-[#777777] hover:text-black transition-all z-10"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="relative z-10 p-8 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#F7F7F7] border border-[#E0E0E0] flex items-center justify-center mx-auto mb-5">
                    <ShieldAlert className="w-7 h-7 text-black" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-black mb-2">This is V1 preview</h2>
                  <p className="text-black/55 text-sm leading-relaxed mb-7 font-light">
                    This is V1 preview. Switch to V2 to continue.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate("/")}
                      className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2 text-black"
                    >
                      <Rocket className="w-4 h-4" /> Go to V2
                    </button>
                    <button onClick={onClose} className="w-full btn-secondary py-3 text-sm text-black">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function V1Preview() {
  const [interceptOpen, setInterceptOpen] = useState(false);
  const navigate = useNavigate();

  const intercept = (e) => {
    const target = e.target;
    if (target.closest("[data-v1-safe='true']")) return;
    e.preventDefault();
    e.stopPropagation();
    setInterceptOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <div className="sticky top-0 z-[100] w-full border-b border-[#E0E0E0] bg-gradient-to-r from-white via-[#999999] to-white text-black shadow-[0_10px_30px_rgba(255,255,255,0.22)]">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <History className="w-4 h-4 text-black" />
            <span className="text-black font-semibold">You are viewing HireNextAI V1 (Preview Mode)</span>
            <span className="text-black/55 hidden sm:inline font-light">Actions are disabled for this legacy view.</span>
          </div>
          <button
            data-v1-safe="true"
            onClick={() => navigate("/")}
            className="flex h-9 items-center gap-1.5 px-3 rounded-lg bg-[#F7F7F7] border border-[#E0E0E0] text-black hover:bg-[#F2F2F2] hover:text-black transition-colors text-xs font-semibold shrink-0"
          >
            <Rocket className="w-3.5 h-3.5" /> Go to V2
          </button>
        </div>
      </div>

      <header className="sticky top-[41px] z-50 border-b border-[#E0E0E0] bg-[#F7F7F7] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-5">
          <Link data-v1-safe="true" to="/updates" className="flex items-center gap-2 text-black/55 hover:text-black text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> Updates
          </Link>
          <div className="h-6 w-px bg-[#F7F7F7]" />
          <div className="flex items-center gap-2 font-black text-lg text-black">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white to-white flex items-center justify-center text-black font-bold">
              H
            </div>
            HireNextAI <span className="rounded-full border border-[#E0E0E0] bg-[#F7F7F7] px-2 py-0.5 text-xs font-bold text-black">V1</span>
          </div>
          <nav className="hidden md:flex items-center gap-1 ml-auto">
            {["Dashboard", "Jobs", "AI Tools", "Resume", "Messages"].map((item) => (
              <button
                key={item}
                onClick={() => setInterceptOpen(true)}
                className="h-9 px-3 rounded-lg text-sm font-semibold text-black/55 hover:text-black hover:bg-[#F2F2F2] hover:text-black transition-all"
              >
                {item}
              </button>
            ))}
          </nav>
          <button onClick={() => setInterceptOpen(true)} className="w-9 h-9 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] flex items-center justify-center text-black/55 hover:text-black">
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1" onClick={intercept}>
        <section className="relative overflow-hidden border-b border-[#E0E0E0] bg-gradient-to-br from-[#111111] via-[#111111] to-[#111111]">
          <div className="absolute top-[-140px] right-[-80px] w-[420px] h-[420px] rounded-full bg-[#F7F7F7] blur-[90px]" />
          <div className="max-w-7xl mx-auto px-6 py-10 lg:py-14 grid lg:grid-cols-[1fr_420px] gap-8 items-center relative">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-black text-xs font-bold mb-5">
                <Lock className="w-3.5 h-3.5" /> Legacy preview, view only
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-black max-w-3xl">
                The original HireNextAI job-search workspace.
              </h1>
              <p className="mt-4 text-[#555555] text-base md:text-lg max-w-2xl leading-relaxed font-light font-light">
                V1 focused on AI resume polish, quick job matching, and a simple dashboard for freshers and early-career professionals.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3">
                <button onClick={() => setInterceptOpen(true)} className="h-11 px-5 rounded-xl bg-[#F7F7F7] text-black font-bold hover:bg-[#F2F2F2] hover:text-black transition-all shadow-[0_12px_30px_rgba(255,255,255,0.25)]">
                  Try V1 Action
                </button>
                <button data-v1-safe="true" onClick={() => navigate("/")} className="h-11 px-5 rounded-xl bg-[#F7F7F7] border border-[#E0E0E0] text-[#222222] font-bold hover:border-[#E0E0E0] hover:text-black transition-all">
                  Switch to V2
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-[#E0E0E0] bg-[#F7F7F7] p-4 shadow-[0_30px_80px_rgba(255,255,255,0.16)] backdrop-blur-xl">
              <div className="rounded-2xl bg-[#F7F7F7] text-black p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-black/45 text-xs font-bold uppercase tracking-wide">V1 Match Engine</p>
                    <h2 className="text-xl font-black">Top roles today</h2>
                  </div>
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <div className="space-y-3">
                  {jobs.map((job) => (
                    <button
                      key={job.title}
                      onClick={() => setInterceptOpen(true)}
                      className="w-full text-left rounded-xl border border-[#E0E0E0] bg-[#F7F7F7] p-3 hover:border-[#E0E0E0] hover:bg-[#F2F2F2] hover:text-black transition-all"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-sm">{job.title}</p>
                          <p className="text-black/45 text-xs">{job.company} • {job.location}</p>
                        </div>
                        <span className="text-xs font-black text-black bg-[#F7F7F7] border border-[#E0E0E0] rounded-full px-2 py-1">{job.match}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-8 grid lg:grid-cols-[260px_1fr] gap-6">
          <aside className="rounded-3xl bg-[#F7F7F7] border border-[#E0E0E0] shadow-sm p-4 h-fit">
            <p className="text-xs font-black uppercase tracking-wide text-black/35 mb-3">V1 Navigation</p>
            {[
              { icon: LayoutDashboard, label: "Overview" },
              { icon: Search, label: "Find Jobs" },
              { icon: FileText, label: "Resume Lab" },
              { icon: Sparkles, label: "AI Writer" },
              { icon: User, label: "Profile" },
            ].map(({ icon: Icon, label }) => (
              <button key={label} onClick={() => setInterceptOpen(true)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#555555] hover:text-black hover:bg-[#F2F2F2] hover:text-black transition-all text-sm font-semibold">
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </aside>

          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: Briefcase, label: "Applications", value: "24", tone: "text-white bg-[#111111]" },
                { icon: Zap, label: "AI credits used", value: "68%", tone: "text-white bg-[#111111]" },
                { icon: Star, label: "Saved jobs", value: "11", tone: "text-white bg-[#111111]" },
              ].map(({ icon: Icon, label, value, tone }) => (
                <button key={label} onClick={() => setInterceptOpen(true)} className="text-left rounded-2xl bg-[#F7F7F7] border border-[#E0E0E0] p-5 shadow-sm hover:-translate-y-0.5 hover:border-[#E0E0E0] transition-all">
                  <div className={`w-10 h-10 rounded-xl ${tone} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-black">{value}</p>
                  <p className="text-sm text-black/45 font-semibold">{label}</p>
                </button>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-[#F7F7F7] border border-[#E0E0E0] shadow-sm p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-black/35">AI Toolkit</p>
                    <h2 className="text-xl font-black">Original V1 tools</h2>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-black" />
                </div>
                <div className="space-y-3">
                  {tools.map(({ icon: Icon, title, desc }) => (
                    <button key={title} onClick={() => setInterceptOpen(true)} className="w-full flex items-center gap-3 text-left rounded-2xl border border-white/8 bg-[#F7F7F7] p-4 hover:bg-[#F2F2F2] hover:text-black hover:border-[#E0E0E0] transition-all">
                      <div className="w-10 h-10 rounded-xl bg-[#F7F7F7] border border-[#E0E0E0] flex items-center justify-center text-black">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-sm">{title}</p>
                        <p className="text-xs text-black/45 font-light">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-[#F7F7F7] border border-[#E0E0E0] shadow-sm p-6">
                <p className="text-xs font-black uppercase tracking-wide text-black/35 mb-1">Application Pipeline</p>
                <h2 className="text-xl font-black mb-5">Week snapshot</h2>
                <div className="space-y-4">
                  {[
                    ["Applied", "14", "w-[78%]", "bg-[#111111]"],
                    ["Interviews", "5", "w-[42%]", "bg-[#111111]"],
                    ["Offers", "2", "w-[22%]", "bg-[#111111]"],
                  ].map(([label, value, width, color]) => (
                    <button key={label} onClick={() => setInterceptOpen(true)} className="w-full text-left">
                      <div className="flex justify-between text-sm font-bold mb-2">
                        <span>{label}</span>
                        <span>{value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#F7F7F7] overflow-hidden">
                        <div className={`h-full ${width} ${color} rounded-full`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <V1InterceptModal open={interceptOpen} onClose={() => setInterceptOpen(false)} />
    </div>
  );
}
