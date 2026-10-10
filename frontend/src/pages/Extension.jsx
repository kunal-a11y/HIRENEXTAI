import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Link } from "react-router-dom";
import {
  Chrome, Zap, Shield, FileText, CheckCircle, ArrowRight, Download,
  Lock, Key, Eye, HelpCircle, Laptop, Settings, ArrowUpRight, Play, Info, Sparkles, AlertCircle
} from "lucide-react";

// ============================================================================
// MOCK SVG LOGOS FOR SUPPORTED SITES (Monochrome, Premium)
// ============================================================================
function LinkedInLogo() {
  return (
    <svg className="h-5 text-neutral-400 fill-current hover:text-black transition-colors" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

function IndeedLogo() {
  return (
    <span className="text-neutral-400 font-black tracking-tighter text-sm hover:text-black transition-colors font-sans select-none">
      indeed
    </span>
  );
}

function GlassdoorLogo() {
  return (
    <span className="text-neutral-400 font-bold tracking-tight text-sm hover:text-black transition-colors font-mono select-none">
      glassdoor
    </span>
  );
}

function NaukriLogo() {
  return (
    <span className="text-neutral-400 font-black text-sm hover:text-black transition-colors font-sans select-none">
      naukri<span className="font-light text-neutral-400">.com</span>
    </span>
  );
}

function MonsterLogo() {
  return (
    <span className="text-neutral-400 font-black tracking-wide text-sm hover:text-black transition-colors font-mono select-none">
      MONSTER
    </span>
  );
}

function FounditLogo() {
  return (
    <span className="text-neutral-400 font-extrabold text-sm hover:text-black transition-colors font-sans select-none">
      found<span className="text-neutral-400 font-light">it</span>
    </span>
  );
}

function InternshalaLogo() {
  return (
    <span className="text-neutral-400 font-extrabold tracking-tight text-sm hover:text-black transition-colors font-sans select-none">
      INTERNSHALA
    </span>
  );
}

// ============================================================================
// HERO SECTION: INTERACTIVE FLOATING MOCKUP (Right Side)
// ============================================================================
function HeroMockupDemo() {
  const [step, setStep] = useState(0);
  const [loopVal, setLoopVal] = useState(0);
  const [atsScore, setAtsScore] = useState(60);
  const [typedName, setTypedName] = useState("");
  const [typedEmail, setTypedEmail] = useState("");

  const nameToType = "Alex Johnson";
  const emailToType = "alex@johnson.dev";

  useEffect(() => {
    setStep(0);
    setAtsScore(60);
    setTypedName("");
    setTypedEmail("");

    // Timeline:
    // 0.8s: Panel slides out (step = 1)
    const t1 = setTimeout(() => setStep(1), 800);

    // 2.2s: ATS Score increments to 98% (step = 2)
    const t2 = setTimeout(() => {
      setStep(2);
      let score = 60;
      const scoreInt = setInterval(() => {
        score += 2;
        if (score >= 98) {
          score = 98;
          clearInterval(scoreInt);
        }
        setAtsScore(score);
      }, 15);
      return () => clearInterval(scoreInt);
    }, 2200);

    // 3.8s: Start filling inputs (step = 3)
    const t3 = setTimeout(() => {
      setStep(3);
      let nameIdx = 0;
      const typeNameInt = setInterval(() => {
        if (nameIdx < nameToType.length) {
          setTypedName((prev) => prev + nameToType.charAt(nameIdx));
          nameIdx++;
        } else {
          clearInterval(typeNameInt);
          // Start typing email
          let emailIdx = 0;
          const typeEmailInt = setInterval(() => {
            if (emailIdx < emailToType.length) {
              setTypedEmail((prev) => prev + emailToType.charAt(emailIdx));
              emailIdx++;
            } else {
              clearInterval(typeEmailInt);
              setStep(4); // Success checkbox
            }
          }, 35);
        }
      }, 45);
    }, 3800);

    // Loop Reset
    const tReset = setTimeout(() => {
      setLoopVal((prev) => prev + 1);
    }, 9500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tReset);
    };
  }, [loopVal]);

  return (
    <div className="w-full h-[380px] bg-white border border-[#EAEAEA] rounded-2xl flex flex-col overflow-hidden shadow-[0_12px_45px_rgba(0,0,0,0.03)] select-none">
      {/* Browser Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAFA] border-b border-[#EAEAEA] shrink-0">
        <div className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neutral-200" />
          <span className="w-2 h-2 rounded-full bg-neutral-200" />
          <span className="w-2 h-2 rounded-full bg-neutral-200" />
        </div>
        <div className="h-5.5 w-60 rounded-md bg-[#FAFAFA] border border-[#EAEAEA] flex items-center justify-center gap-1.5 text-[8px] text-neutral-400 px-3 font-mono truncate">
          <span>🔒</span>
          <span>stripe.com/jobs/designer</span>
        </div>
        <div className="flex items-center gap-1">
          <motion.div
            animate={step >= 1 ? { scale: [1, 1.2, 1] } : {}}
            className={`w-4 h-4 rounded flex items-center justify-center border ${
              step >= 1 ? "bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6]" : "bg-white border-[#EAEAEA] text-neutral-400"
            }`}
          >
            <span className="text-[9px]">✦</span>
          </motion.div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex relative overflow-hidden bg-[#FAFAFA]">
        {/* Main Job Application Page */}
        <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto scrollbar-none">
          <div>
            <span className="text-[7.5px] font-bold text-neutral-400 uppercase tracking-widest">Stripe Careers</span>
            <h4 className="text-[12px] font-bold text-black mt-0.5">Senior Product UI Designer</h4>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[7.5px] font-bold text-neutral-400">Full Name</label>
              <div className="h-6.5 bg-white border border-[#EAEAEA] rounded px-2 text-[8px] font-semibold text-black flex items-center">
                {typedName}
                {step === 3 && typedName.length < nameToType.length && (
                  <span className="w-0.5 h-2.5 bg-[#8B5CF6] ml-0.5 animate-cursor-blink" />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7.5px] font-bold text-neutral-400">Email Address</label>
              <div className="h-6.5 bg-white border border-[#EAEAEA] rounded px-2 text-[8px] font-semibold text-black flex items-center">
                {typedEmail}
                {step === 3 && typedName.length >= nameToType.length && typedEmail.length < emailToType.length && (
                  <span className="w-0.5 h-2.5 bg-[#8B5CF6] ml-0.5 animate-cursor-blink" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Extension Sidebar Overlay */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ x: 160, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 160, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-[150px] bg-white border-l border-[#EAEAEA] p-3 flex flex-col justify-between shrink-0 shadow-[-5px_0_15px_rgba(0,0,0,0.01)] relative z-10"
            >
              <div className="space-y-3.5">
                <div className="flex items-center gap-1 border-b border-[#EAEAEA] pb-2">
                  <span className="text-[9px]">✦</span>
                  <span className="text-[9px] font-bold text-black uppercase tracking-wider">HirenextAI Companion</span>
                </div>

                {/* Score Diagnostic Block */}
                <div className="flex flex-col items-center p-2 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl">
                  <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-wider">ATS Score</span>
                  <div className="relative w-11 h-11 flex items-center justify-center mt-1">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="22" cy="22" r="18" className="stroke-neutral-100 fill-transparent" strokeWidth="2" />
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        className="stroke-[#8B5CF6] fill-transparent"
                        strokeWidth="2"
                        strokeDasharray={2 * Math.PI * 18}
                        strokeDashoffset={2 * Math.PI * 18 * (1 - atsScore / 100)}
                      />
                    </svg>
                    <span className="absolute text-[8.5px] font-black text-black">{atsScore}%</span>
                  </div>
                </div>

                {/* Checklist */}
                <div className="space-y-1.5 pl-0.5">
                  <div className="flex items-center gap-1.5 text-[7px] font-bold text-neutral-800">
                    <span className="text-emerald-500">✓</span>
                    <span>Autofill Mapped</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[7px] font-bold text-neutral-800">
                    <span className={step >= 2 ? "text-emerald-500" : "text-neutral-300"}>
                      {step >= 2 ? "✓" : "○"}
                    </span>
                    <span>Resume Optimized</span>
                  </div>
                </div>
              </div>

              {/* Status Actions */}
              <div className="pt-2.5 border-t border-[#EAEAEA] text-center">
                {step >= 4 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-1"
                  >
                    <span className="text-[7.5px] font-black text-emerald-600 block">✓ Filled Successfully</span>
                    <button className="w-full h-5.5 bg-black text-white text-[7.5px] font-bold rounded-lg hover:bg-neutral-800 transition-colors uppercase tracking-wider">
                      Submit Apply
                    </button>
                  </motion.div>
                ) : (
                  <span className="text-[7px] font-medium text-neutral-400 italic">
                    {step === 3 ? "Autofilling form..." : "Calculating match..."}
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// LIVE DEMO SECTION (Interactive Sequence / See It In Action)
// ============================================================================
const demoSteps = [
  { id: 1, title: "1. Detect Application", text: "Open any job board. The extension instantly maps inputs.", badge: "Ready" },
  { id: 2, title: "2. Scan Job Parameters", text: "AI extracts skills and experience criteria from requirements.", badge: "Analyzing" },
  { id: 3, title: "3. Autofill Form Inputs", text: "AI writes details into form fields with typing speed.", badge: "Autofilling" },
  { id: 4, title: "4. Tailor Bullet Points", text: "Reshape CV statements based on keyword gaps.", badge: "Optimizing" },
  { id: 5, title: "5. Verify & Submit", text: "The form is ready. Simply review diagnostics and click send.", badge: "Ready to Apply" }
];

function LiveDemoAutofill() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % demoSteps.length);
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
      {/* Sidebar step indicators */}
      <div className="lg:col-span-4 space-y-4">
        {demoSteps.map((step, idx) => {
          const isActive = idx === activeStep;
          const isPassed = idx < activeStep;

          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                isActive
                  ? "bg-[#FAFAFA] border-black shadow-sm"
                  : "bg-white border-[#EAEAEA] hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold ${isActive ? "text-[#8B5CF6]" : "text-neutral-400"}`}>
                  {step.title}
                </span>
                <span className={`text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                  isActive
                    ? "bg-[#8B5CF6]/5 border-[#8B5CF6]/20 text-[#8B5CF6]"
                    : "bg-[#FAFAFA] border-neutral-100 text-neutral-400"
                }`}>
                  {step.badge}
                </span>
              </div>
              <p className="text-neutral-500 text-[11px] leading-relaxed font-semibold">
                {step.text}
              </p>
            </div>
          );
        })}
      </div>

      {/* Browser Mockup on the right */}
      <div className="lg:col-span-8">
        <div className="w-full h-[360px] bg-white border border-[#EAEAEA] rounded-2xl flex flex-col overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.02)] select-none">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#FAFAFA] border-b border-[#EAEAEA]">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-neutral-200" />
              <span className="w-2 h-2 rounded-full bg-neutral-200" />
              <span className="w-2 h-2 rounded-full bg-neutral-200" />
            </div>
            <span className="text-[8.5px] font-mono text-neutral-400">linkedin.com/jobs/view/44908</span>
            <div className="w-6" />
          </div>

          <div className="flex-1 flex min-h-0 bg-[#FAFAFA]">
            {/* Left page form */}
            <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto scrollbar-none">
              <div>
                <h4 className="text-[11px] font-bold text-black">Product Engineer Application</h4>
                <p className="text-[7.5px] text-neutral-400 font-semibold mt-0.5">Linear • Remote</p>
              </div>

              {/* Steps reactive inputs */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[7.5px] font-bold text-neutral-400">Full Name</label>
                  <div className={`h-6.5 bg-white border rounded px-2 text-[8.5px] font-semibold text-black flex items-center transition-all ${
                    activeStep >= 2 ? "border-emerald-200" : activeStep >= 1 ? "border-[#8B5CF6]/40" : "border-[#EAEAEA]"
                  }`}>
                    {activeStep >= 2 ? "Alex Johnson" : ""}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[7.5px] font-bold text-neutral-400">Work Experience</label>
                  <div className={`h-6.5 bg-white border rounded px-2 text-[8.5px] font-semibold text-black flex items-center transition-all ${
                    activeStep >= 2 ? "border-emerald-200" : activeStep >= 1 ? "border-[#8B5CF6]/40" : "border-[#EAEAEA]"
                  }`}>
                    {activeStep >= 2 ? "4 Years (Senior Designer)" : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel Extension */}
            <div className="w-[170px] bg-white border-l border-[#EAEAEA] p-3.5 flex flex-col justify-between shrink-0">
              <div className="space-y-4">
                <div className="flex items-center gap-1 border-b border-[#EAEAEA] pb-2">
                  <span className="text-[9px] text-[#8B5CF6]">✦</span>
                  <span className="text-[9px] font-bold text-black uppercase tracking-wider">Autofill Module</span>
                </div>

                <div className="space-y-2.5 text-[8.5px]">
                  <div className="flex items-center justify-between text-neutral-500 font-medium">
                    <span>Target Node:</span>
                    <span className="text-black font-bold">Linear</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[7px] font-bold text-neutral-400 uppercase tracking-widest">
                      <span>Status</span>
                      <span>{activeStep * 25}%</span>
                    </div>
                    <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#8B5CF6] transition-all duration-300" style={{ width: `${activeStep * 25}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1 border-t border-[#EAEAEA] pt-2">
                    <span className="text-[7.5px] font-bold text-neutral-400 uppercase">Diagnostics:</span>
                    <div className="space-y-1 text-neutral-700 font-semibold text-[7px]">
                      {activeStep >= 1 && <div className="text-black">✓ Input fields mapped</div>}
                      {activeStep >= 2 && <div className="text-black">✓ Details compiled</div>}
                      {activeStep >= 3 && <div className="text-black">✓ AI cover letter attached</div>}
                      {activeStep >= 4 && <div className="text-emerald-600 font-black">✓ Resume Optimized (Score: 98)</div>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#EAEAEA]">
                {activeStep === 4 ? (
                  <button className="w-full h-6 bg-black text-white text-[8px] font-bold rounded-lg uppercase tracking-wider hover:bg-neutral-800 transition-colors shadow-sm">
                    Submit Application
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-1 text-[#8B5CF6] text-[7.5px] font-bold">
                    <span className="w-1 h-1 rounded-full bg-[#8B5CF6] animate-ping" />
                    <span>Processing Step {activeStep + 1}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AI PANEL SHOWCASE: FEEDBACK MOCKUP
// ============================================================================
function AIPanelShowcase() {
  const [atsScore, setAtsScore] = useState(82);
  const [showAddition, setShowAddition] = useState(false);
  const [loopCount, setLoopCount] = useState(0);

  useEffect(() => {
    setAtsScore(82);
    setShowAddition(false);

    // Timeline:
    // 2.2s: Add project details (showAddition = true)
    const t1 = setTimeout(() => {
      setShowAddition(true);
    }, 2200);

    // 2.8s: ATS Score updates from 82% to 98%
    const t2 = setTimeout(() => {
      let score = 82;
      const scoreInt = setInterval(() => {
        score += 1;
        if (score >= 98) {
          score = 98;
          clearInterval(scoreInt);
        }
        setAtsScore(score);
      }, 20);
      return () => clearInterval(scoreInt);
    }, 2800);

    // Reset loop
    const tReset = setTimeout(() => {
      setLoopCount((prev) => prev + 1);
    }, 8500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tReset);
    };
  }, [loopCount]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
      {/* Mock Extension Panel Visual */}
      <div className="lg:col-span-7">
        <div className="w-full max-w-[420px] mx-auto bg-white border border-[#EAEAEA] rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.02)] select-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-2.5 mb-3.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#8B5CF6]">✦</span>
              <span className="text-[10px] font-bold text-black uppercase tracking-wider">HirenextAI Optimizer</span>
            </div>
            <span className="text-[7.5px] font-mono text-neutral-400">cv_analyzer_v1.0.js</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Circle Match Score Gauge */}
            <div className="md:col-span-5 bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl p-3 flex flex-col items-center justify-center">
              <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest">ATS Match Score</span>
              <div className="relative w-18 h-18 flex items-center justify-center mt-2.5">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="36" cy="36" r="30" className="stroke-neutral-100 fill-transparent" strokeWidth="3.5" />
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    className="stroke-[#8B5CF6] fill-transparent"
                    strokeWidth="3.5"
                    strokeDasharray={2 * Math.PI * 30}
                    strokeDashoffset={2 * Math.PI * 30 * (1 - atsScore / 100)}
                  />
                </svg>
                <span className="absolute text-[15px] font-black text-black">{atsScore}%</span>
              </div>
            </div>

            {/* Diagnostic Lists on the right */}
            <div className="md:col-span-7 space-y-3">
              {/* Missing Skills */}
              <div className="space-y-1">
                <span className="text-[7.5px] font-bold text-neutral-400 uppercase tracking-wider block">Missing Skills:</span>
                <div className="flex flex-wrap gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-red-50 border border-red-100 text-red-700 text-[6.5px] font-bold">
                    React
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-red-50 border border-red-100 text-red-700 text-[6.5px] font-bold">
                    Node.js
                  </span>
                </div>
              </div>

              {/* Improvements */}
              <div className="space-y-1.5 pt-1.5 border-t border-[#EAEAEA]">
                <span className="text-[7.5px] font-bold text-neutral-400 uppercase tracking-wider block">Suggested Optimizations:</span>
                <div className="space-y-1 text-neutral-700 font-semibold text-[7px]">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <span>✓</span> Add Project Experience
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                    <span>✓</span> Add Leadership Example
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Change box */}
          <div className="border border-[#EAEAEA] bg-[#FAFAFA] rounded-xl p-3.5 mt-3.5 space-y-2">
            <h5 className="text-[8px] font-bold text-black uppercase tracking-wider">Optimize Resume Bullets:</h5>
            <div className="text-[8px] font-mono leading-relaxed bg-white border border-[#EAEAEA] p-2 rounded-lg text-neutral-500">
              <span className="text-red-500 font-bold block line-through">"Refactored stripe checkout ui layout"</span>
              <AnimatePresence>
                {showAddition && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-emerald-600 font-bold block mt-1"
                  >
                    "Refactored checkout UI to React and optimized nextjs load paths, increasing conversion rates by 12%."
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Text Details */}
      <div className="lg:col-span-5 space-y-4">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">AI Panel Showcase</span>
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight text-black">Instant Resume Diagnostics</h3>
        <p className="text-neutral-500 text-sm leading-relaxed font-medium">
          The floating AI side companion evaluates your resume template, finds keyword gaps based on target requirements, and auto-generates optimized experience bullet points.
        </p>
        <ul className="space-y-3">
          <li className="flex items-center gap-2.5 text-xs text-neutral-800 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Missing skill gap alerts</span>
          </li>
          <li className="flex items-center gap-2.5 text-xs text-neutral-800 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>AI-generated metric improvements</span>
          </li>
          <li className="flex items-center gap-2.5 text-xs text-neutral-800 font-semibold">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Real-time ATS score counting increments</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function Extension() {
  const bentoGrid = [
    {
      title: "AI Autofill",
      desc: "Autodetect form fields and insert contact details, history, and custom answers automatically.",
      tag: "Time Saver",
      icon: Chrome,
      wide: true
    },
    {
      title: "ATS Optimization",
      desc: "Tailor keyword density of CV statements to target job requirements.",
      tag: "Precision",
      icon: Sparkles,
      wide: false
    },
    {
      title: "Cover Letter Builder",
      desc: "Auto-generate letters based on specific role parameters.",
      tag: "Writing",
      icon: FileText,
      wide: false
    },
    {
      title: "Match Analyzer",
      desc: "Calculate match score metrics for any job posting before you submit.",
      tag: "Analytics",
      icon: Zap,
      wide: false
    },
    {
      title: "Interview Prep Guide",
      desc: "Practice role-tailored HR prompts directly in the side companion.",
      tag: "Practice",
      icon: Laptop,
      wide: false
    },
    {
      title: "ATS Checker",
      desc: "Verify formatting is compliant and bot-friendly in real-time.",
      tag: "Verification",
      icon: Shield,
      wide: false
    },
    {
      title: "Smart Answers",
      desc: "Draft context-aware answers to custom application questions.",
      tag: "AI Copywriter",
      icon: Key,
      wide: true
    }
  ];

  const scrollTimeline = [
    { step: "01", title: "Job Found", desc: "Navigate to any job application form on your web browser." },
    { step: "02", title: "AI Reads Description", desc: "The sidebar companion extracts skills, tags, and experience thresholds." },
    { step: "03", title: "Resume Optimized", desc: "Dynamic keyword tuning increases ATS match scoring metrics." },
    { step: "04", title: "Autofill Inputs", desc: "Autofills fields, contacts, experience history, and cover letters." },
    { step: "05", title: "Application Ready", desc: "The application is verified and validated. Click submit." }
  ];

  const securityCards = [
    { title: "AES Encryption", desc: "Personal profiles, resumes, and contacts are protected via AES-256 local keys.", icon: Lock },
    { title: "No Password Storage", desc: "Authentication uses secure Google and LinkedIn token integrations.", icon: Key },
    { title: "Encrypted Data Channels", desc: "All background transfers utilize secure SSL/TLS channels.", icon: Shield },
    { title: "Review Before Submit", desc: "You remain in full control. The extension never auto-submits forms without review.", icon: Eye }
  ];

  const installSteps = [
    { num: "01", title: "Add to Chrome", desc: "Visit Chrome Web Store and install with one single click." },
    { num: "02", title: "Connect Profile", desc: "Login to sync your resume, skills, and application tracker pipeline." },
    { num: "03", title: "Start Applying", desc: "Browse any target board and click the sidebar panel to autofill." }
  ];

  return (
    <div className="min-h-screen bg-white relative flex flex-col overflow-x-hidden font-sans text-neutral-800">
      {/* Background Subtle Overlays */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-neutral-50/50 to-transparent" />
        <div className="absolute top-1/3 left-[-10%] w-[500px] h-[500px] rounded-full bg-neutral-50/20 blur-[130px]" />
        <div className="absolute top-2/3 right-[-10%] w-[500px] h-[500px] rounded-full bg-neutral-50/20 blur-[130px]" />
      </div>

      <Navbar />

      {/* ====================================================================
          HERO SECTION
          ==================================================================== */}
      <section className="relative z-10 pt-32 pb-16 lg:pt-40 lg:pb-24 px-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Text column */}
          <div className="lg:col-span-5 text-left">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAFAFA] border border-[#EAEAEA] shadow-sm mb-6"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-black">Browser Extension</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-black tracking-tight leading-[1.05] mb-6">
              Apply Smarter. <br />
              <span className="text-neutral-400">Not Harder.</span>
            </h1>

            <p className="text-neutral-500 text-sm md:text-base leading-relaxed mb-10 font-medium">
              Your AI-powered job application assistant that helps you optimize resumes, generate answers, and save hours while applying online.
            </p>

            <div className="flex flex-col sm:flex-row gap-3.5">
              <a href="#install" className="h-11 px-7 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl text-xs flex items-center justify-center transition-colors shadow-md gap-2">
                <Chrome className="w-4 h-4" /> Install Extension
              </a>
              <a href="#action" className="h-11 px-7 bg-white hover:bg-neutral-50 border border-[#EAEAEA] text-black font-bold rounded-xl text-xs flex items-center justify-center transition-colors shadow-sm gap-2">
                <Play className="w-3.5 h-3.5 text-neutral-600" /> Watch Demo
              </a>
            </div>

            <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-4 pl-0.5">
              COMPATIBLE WITH CHROME, BRAVE & EDGE
            </p>
          </div>

          {/* Right Mockup column */}
          <div className="lg:col-span-7">
            <HeroMockupDemo />
          </div>
        </div>
      </section>

      {/* ====================================================================
          LIVE DEMO SECTION (See It In Action)
          ==================================================================== */}
      <section id="action" className="relative z-10 py-16 lg:py-24 px-6 border-t border-[#EAEAEA] bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">Live Demo</span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight mt-2">See It In Action</h3>
            <p className="text-neutral-500 text-xs md:text-sm font-medium mt-3 max-w-lg mx-auto">
              Watch how our AI extracts parameters, adjusts statements, and fills job forms automatically.
            </p>
          </div>

          <LiveDemoAutofill />
        </div>
      </section>

      {/* ====================================================================
          FEATURES GRID (BENTO GRID)
          ==================================================================== */}
      <section className="relative z-10 py-20 lg:py-28 px-6 border-t border-[#EAEAEA]">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">Supercharged Tools</span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight mt-2">Full Companion Feature Grid</h3>
            <p className="text-neutral-500 text-xs md:text-sm font-medium mt-3 max-w-lg mx-auto">
              Everything built directly inside your browser panel to let you apply faster.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {bentoGrid.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  whileHover={{ y: -5, shadow: "0 15px 35px rgba(0,0,0,0.02)" }}
                  className={`bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 ${
                    item.wide ? "md:col-span-2" : "col-span-1"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-[#EAEAEA] flex items-center justify-center shadow-sm">
                      <Icon className="w-4.5 h-4.5 text-black" />
                    </div>
                    <div>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-[#8B5CF6]">{item.tag}</span>
                      <h4 className="text-sm font-bold text-black mt-0.5">{item.title}</h4>
                    </div>
                    <p className="text-neutral-500 text-xs leading-relaxed font-semibold">
                      {item.desc}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold text-black mt-6 block">Autofill Configured ✓</span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SMART APPLICATION FLOW (SCROLL-TRIGGERED TIMELINE)
          ==================================================================== */}
      <section className="relative z-10 py-20 lg:py-26 px-6 border-t border-[#EAEAEA] bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">Optimized Flow</span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight mt-2">Smart Application Timeline</h3>
            <p className="text-neutral-500 text-xs md:text-sm font-medium mt-3 max-w-lg mx-auto">
              How the HirenextAI background pipeline processes details to match requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {scrollTimeline.map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-white border border-[#EAEAEA] rounded-xl p-5 relative z-10 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-black text-neutral-300 block mb-2">{item.step}</span>
                  <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-2">{item.title}</h4>
                  <p className="text-neutral-500 text-[11px] leading-relaxed font-medium">
                    {item.desc}
                  </p>
                </div>
                <span className="text-[8.5px] font-bold text-[#8B5CF6] mt-4 block">Checkpoint Verified ✓</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          SUPPORTED WEBSITES CAROUSEL (INFINITE SCROLL)
          ==================================================================== */}
      <section className="relative z-10 py-12 px-6 border-t border-[#EAEAEA] bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto w-full">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-8">
            Works Seamlessly Across 100+ Major Portals
          </p>

          {/* Infinite Carousel Wrap */}
          <div className="flex items-center w-full relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white to-transparent z-10" />

            <div className="flex gap-16 py-2 animate-infinite-scroll hover:[animation-play-state:paused] shrink-0">
              <div className="flex items-center gap-16 shrink-0">
                <LinkedInLogo />
                <IndeedLogo />
                <GlassdoorLogo />
                <NaukriLogo />
                <MonsterLogo />
                <FounditLogo />
                <InternshalaLogo />
              </div>
              {/* Duplicate for infinite effect */}
              <div className="flex items-center gap-16 shrink-0">
                <LinkedInLogo />
                <IndeedLogo />
                <GlassdoorLogo />
                <NaukriLogo />
                <MonsterLogo />
                <FounditLogo />
                <InternshalaLogo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================================
          AI PANEL SHOWCASE SECTION
          ==================================================================== */}
      <section className="relative z-10 py-20 lg:py-26 px-6 border-t border-[#EAEAEA] bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto w-full">
          <AIPanelShowcase />
        </div>
      </section>

      {/* ====================================================================
          SECURITY SECTION
          ==================================================================== */}
      <section className="relative z-10 py-20 lg:py-28 px-6 border-t border-[#EAEAEA] bg-white">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">Trust & Security</span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight mt-2">Private By Design</h3>
            <p className="text-neutral-500 text-xs md:text-sm font-medium mt-3 max-w-lg mx-auto">
              Your application details and credential parameters are fully protected at all times.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {securityCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-xl p-5 hover:border-black transition-colors duration-300">
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#EAEAEA] flex items-center justify-center mb-4 shadow-sm">
                    <Icon className="w-4 h-4 text-black" />
                  </div>
                  <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-2">{card.title}</h4>
                  <p className="text-neutral-500 text-[11px] leading-relaxed font-medium">{card.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ====================================================================
          INSTALL SECTION (THREE STEPS)
          ==================================================================== */}
      <section id="install" className="relative z-10 py-20 lg:py-26 px-6 border-t border-[#EAEAEA] bg-[#FAFAFA]">
        <div className="max-w-7xl mx-auto w-full">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B5CF6]">Getting Started</span>
            <h3 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight mt-2">Install in 3 Simple Steps</h3>
            <p className="text-neutral-500 text-xs md:text-sm font-medium mt-3 max-w-lg mx-auto">
              Start applying smarter and tracking submissions in less than two minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {installSteps.map((step, idx) => (
              <div key={step.num} className="bg-white border border-[#EAEAEA] rounded-xl p-6 shadow-sm hover:-translate-y-1 transition-transform duration-300">
                <span className="text-xs font-black text-neutral-300 block mb-3">{step.num}</span>
                <h4 className="text-xs font-bold text-black uppercase tracking-wider mb-2">{step.title}</h4>
                <p className="text-neutral-500 text-[11px] leading-relaxed font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====================================================================
          FINAL CTA
          ==================================================================== */}
      <section className="bg-white border-t border-[#EAEAEA] relative z-10 overflow-hidden pt-24 pb-8">
        <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAFAFA] border border-[#EAEAEA] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-black">Start Optimization</span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-5xl font-black text-black tracking-tight mb-4">
            Bring AI To Every <br />
            <span className="text-neutral-400">Job Application.</span>
          </h2>

          {/* Subheading */}
          <p className="text-neutral-500 text-sm max-w-xl mx-auto mb-10 leading-relaxed font-medium">
            Install the HirenextAI Extension and make every application stronger.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3.5 justify-center mb-16">
            <a href="#install" className="h-11 px-7 bg-black hover:bg-neutral-800 text-white font-bold rounded-xl text-xs flex items-center justify-center transition-colors shadow-md gap-2">
              <Chrome className="w-4 h-4" /> Install Extension
            </a>
            <Link to="/docs" className="h-11 px-7 bg-white hover:bg-neutral-50 border border-[#EAEAEA] text-black font-bold rounded-xl text-xs flex items-center justify-center transition-colors shadow-sm">
              View Documentation
            </Link>
          </div>
        </div>
      </section>

      <Footer />

      {/* Embedded CSS Custom Keyframe Styles */}
      <style>{`
        @keyframes cursor-blink {
          50% { opacity: 0; }
        }
        .animate-cursor-blink {
          animation: cursor-blink 1s step-end infinite;
        }
        @keyframes voice-wave {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1.8); }
        }
        @keyframes infinite-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-infinite-scroll {
          animation: infinite-scroll 24s linear infinite;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
