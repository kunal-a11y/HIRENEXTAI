import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Zap,
  Target,
  FileText,
  MessageSquare,
  X,
  Check,
  Video,
  Award,
  Activity,
  Compass,
  FileEdit
} from "lucide-react";

export function DemoRoleModal({ open, onClose, onSelect }) {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes (600 seconds)

  useEffect(() => {
    if (!open) return;
    setTimeLeft(600);
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, onClose]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const handleStart = () => {
    onClose();
    if (onSelect) {
      onSelect("job_seeker");
    } else {
      navigate("/demo");
    }
  };

  const handleCreateAccount = () => {
    onClose();
    navigate("/signup");
  };

  const featuresList = [
    { title: "AI Resume Builder", icon: FileText },
    { title: "ATS Score Analysis", icon: Target },
    { title: "Job Match AI", icon: Compass },
    { title: "Mock Interview", icon: Video },
    { title: "Career Coach", icon: Award },
    { title: "Cover Letter Generator", icon: FileEdit },
    { title: "Application Tracker", icon: Activity },
    { title: "AI Chat Assistant", icon: MessageSquare }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 140,
        damping: 16
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-white/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container Wrapper */}
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 350, damping: 26 }}
              className="pointer-events-auto w-full max-w-[430px] bg-white border border-[#EAEAEA] rounded-2xl relative shadow-[0_24px_48px_rgba(0,0,0,0.05)] p-4 flex flex-col gap-3"
            >
              {/* TOP HEADER: Logo, Badge, Timer, Close button in a single row */}
              <div className="flex items-center justify-between pb-2 border-b border-[#EAEAEA]">
                <div className="flex items-center gap-2">
                  {/* Sparkles Icon */}
                  <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-[#FAFAFA] border border-[#EAEAEA] overflow-hidden group shrink-0">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                      className="absolute inset-0 bg-[radial-gradient(circle_at_center,#8B5CF6_0%,transparent_60%)] opacity-20"
                    />
                    <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6] relative z-10" />
                  </div>
                  {/* Badge */}
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FAFAFA] border border-[#EAEAEA] text-[9px] font-bold text-[#111111] tracking-wider uppercase shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6] animate-pulse" />
                    DEMO MODE
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* Timer Display */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-[#111111]">{formatTime(timeLeft)}</span>
                    <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          className="stroke-[#111111] fill-none"
                          strokeWidth="2"
                        />
                        <motion.circle
                          cx="12"
                          cy="12"
                          r="10"
                          className="stroke-[#8B5CF6] fill-none"
                          strokeWidth="2"
                          strokeDasharray={62.83}
                          animate={{ strokeDashoffset: 62.83 * (1 - timeLeft / 600) }}
                          transition={{ duration: 0.1, ease: "linear" }}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* Inline Close Button */}
                  <button
                    onClick={onClose}
                    className="w-6.5 h-6.5 rounded-full border border-[#EAEAEA] bg-[#FAFAFA] flex items-center justify-center text-[#111111]/60 hover:text-[#111111] hover:bg-white hover:border-[#111111]/25 transition-all duration-200 active:scale-95 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* HEADLINE SECTION */}
              <div className="space-y-0.5 text-left pr-4">
                <h2 className="text-sm font-display font-extrabold tracking-tight text-[#111111] leading-tight">
                  Experience HirenextAI <span className="text-black/45 font-normal">Before You Sign Up</span>
                </h2>
                <p className="text-[10.5px] text-black/60 leading-snug max-w-sm">
                  Explore AI tools, resume optimization, interview prep, and job discovery in a safe sandbox.
                </p>
              </div>

              {/* FEATURE PREVIEW GRID */}
              <div className="space-y-1">
                <div className="text-[8.5px] font-bold text-black uppercase tracking-wider opacity-40">
                  Included Features
                </div>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 gap-1.5"
                >
                  {featuresList.map((item, idx) => {
                    const IconComponent = item.icon;
                    return (
                      <motion.div
                        key={idx}
                        variants={cardVariants}
                        whileHover={{
                          y: -1,
                          scale: 1.01,
                          boxShadow: "0 4px 8px rgba(0,0,0,0.01)"
                        }}
                        className="group flex items-center gap-1.5 p-1.5 rounded-lg bg-[#FAFAFA] border border-[#EAEAEA] hover:border-[#8B5CF6]/30 transition-all duration-200 cursor-pointer"
                      >
                        <div className="w-5 h-5 rounded-md bg-white border border-[#EAEAEA] flex items-center justify-center text-black/70 group-hover:text-[#8B5CF6] group-hover:border-[#8B5CF6]/30 group-hover:bg-[#8B5CF6]/5 transition-all duration-200 shrink-0">
                          <IconComponent className="w-3 h-3 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
                        </div>
                        <span className="text-[10px] font-bold text-[#111111] group-hover:text-black transition-colors truncate">
                          {item.title}
                        </span>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {/* DEMO NOTICE SUMMARY (INLINE) */}
              <div className="flex flex-col gap-1">
                <div className="text-[8.5px] font-bold text-black uppercase tracking-wider opacity-40">
                  Sandbox Conditions
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 px-0.5 text-[9.5px] font-bold text-black/60">
                  {["Sample Data", "Full Preview", "No Signup Required", "Private Sandbox"].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0 stroke-[3]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[8.5px] text-black/40 text-center font-normal pt-1 border-t border-[#EAEAEA]/60 mt-0.5">
                  Changes made during the demo will not be saved.
                </p>
              </div>

              {/* WHAT HAPPENS NEXT TIMELINE (COMPACT INLINE) */}
              <div className="relative flex items-center justify-between py-1.5 px-3 bg-[#FAFAFA] border border-[#EAEAEA] rounded-lg overflow-hidden text-[9px] font-bold">
                {/* Thin animated line */}
                <div className="absolute top-1/2 left-[10%] right-[10%] h-[1px] bg-[#EAEAEA] -translate-y-1/2" />
                <motion.div
                  className="absolute top-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent w-1/4"
                  animate={{ left: ["-25%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  style={{ transform: "translateY(-50%)" }}
                />

                {/* Steps */}
                {["1. Enter", "2. Explore", "3. Test AI", "4. Register"].map((label, idx) => (
                  <span key={idx} className="text-[#111111] z-10 bg-[#FAFAFA] px-1 rounded">
                    {label}
                  </span>
                ))}
              </div>

              {/* BOTTOM CTA */}
              <div className="flex gap-2 pt-0.5">
                <motion.button
                  whileHover={{ scale: 1.015, boxShadow: "0 8px 20px rgba(139, 92, 246, 0.2)" }}
                  whileTap={{ scale: 0.985 }}
                  onClick={handleStart}
                  className="flex-grow h-10 bg-[#111111] hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all duration-300 text-xs cursor-pointer border border-transparent"
                >
                  <Zap className="w-3.5 h-3.5 text-[#8B5CF6] fill-[#8B5CF6]" />
                  Start 10-Minute Demo
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={handleCreateAccount}
                  className="h-10 px-4 bg-white hover:bg-[#FAFAFA] text-[#111111] border border-[#EAEAEA] hover:border-black/20 rounded-xl font-bold flex items-center justify-center gap-1 transition-all duration-300 text-xs cursor-pointer shrink-0"
                >
                  Create Free Account
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
