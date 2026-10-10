import { BrandMarquee, FAQSection, CareerCTA } from '../components/marketing/Refinements';
import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValue, useReducedMotion } from "framer-motion";
import {
  Sparkles, Zap, BrainCircuit, Target, Briefcase, ArrowRight,
  Star, Users, TrendingUp, Cpu, Rocket, FileText, Bot, UserPlus,
  UserCircle, ChevronDown, Quote, Check, Play, LogIn, Link as LinkIcon, MessageSquare, Mic,
  Map, ShieldCheck, User, ArrowUp, Search, Clock, BarChart2, Send,
  ChevronLeft, ChevronRight, Plus, Minus, HelpCircle, Mail, Headphones,
  Calendar, Trophy
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { DemoRoleModal } from "../components/DemoRoleModal";

const phrases = [
  "Smarter — Not Harder",
  "Find Jobs with AI", 
  "Make Your Next Move",
  "Land Your Dream Job",
  "Your Next Chapter."
]

function useTypingCycle() {
  const reduced = useReducedMotion();
  const [text, setText] = useState('')
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const timeoutRef = useRef(null)

  useEffect(() => {
    if (reduced) return;
    const currentPhrase = phrases[phraseIdx]

    const tick = () => {
      if (!isDeleting) {
        if (text.length < currentPhrase.length) {
          setText(currentPhrase.slice(0, text.length + 1))
          timeoutRef.current = setTimeout(tick, 35)
        } else {
          // Done typing, wait then delete
          timeoutRef.current = setTimeout(() => {
            setIsDeleting(true)
          }, 1200)
        }
      } else {
        if (text.length > 0) {
          setText(currentPhrase.slice(0, text.length - 1))
          timeoutRef.current = setTimeout(tick, 20)
        } else {
          // Done deleting, next phrase
          setIsDeleting(false)
          setPhraseIdx(i => (i + 1) % phrases.length)
        }
      }
    }

    timeoutRef.current = setTimeout(tick, 
      isDeleting ? 20 : 35)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [text, phraseIdx, isDeleting, reduced])

  return reduced ? 'Your Next Chapter.' : text
}

/* ── Section fade-up wrapper ─────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Animated Counter ────────────────────────────────────────────────────── */
function Counter({ value, suffix = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  const targetValue = value.replace(/[^0-9]/g, "");
  const target = targetValue ? parseInt(targetValue) : 0;

  useEffect(() => {
    if (isInView && target > 0) {
      let start = 0;
      const duration = 2000;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}
      {suffix || (value.includes("+") ? "+" : value.includes("%") ? "%" : "")}
    </span>
  );
}

function StatCounter({ target, suffix }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView && target > 0) {
      let startTime = null;
      const duration = 1400;

      const animate = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const percentage = Math.min(progress / duration, 1);
        
        // Easing function (easeOutQuad)
        const easePercentage = percentage * (2 - percentage);
        
        setCount(easePercentage * target);

        if (percentage < 1) {
          requestAnimationFrame(animate);
        } else {
          setCount(target);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isInView, target]);

  const formatStat = (val) => {
    if (suffix === 'M+') 
      return Math.max(1, Math.round(val/1000000)) + 'M+'
    if (suffix === 'k+') 
      return Math.max(1, Math.round(val/1000)) + 'k+'
    if (suffix === '%') 
      return Math.round(val) + '%'
    return Math.floor(val)
  };

  return <span ref={ref}>{formatStat(count)}</span>;
}

const statsData = [
  {
    icon: Zap,
    number: 2000000,
    display: "2M+",
    suffix: "M+",
    label: "AI APPLICATIONS",
    tag: "Auto Apply",
    glow: "rgba(139,92,246,0.32)"
  },
  {
    icon: TrendingUp,
    number: 94,
    display: "94%",
    suffix: "%",
    label: "SUCCESS RATE",
    tag: "Smart Match",
    glow: "rgba(34,197,94,0.26)"
  },
  {
    icon: Users,
    number: 50000,
    display: "50k+",
    suffix: "k+",
    label: "ACTIVE USERS",
    tag: "Trusted",
    glow: "rgba(251,191,36,0.24)"
  },
  {
    icon: Target,
    number: 15000,
    display: "15k+",
    suffix: "k+",
    label: "DAILY MATCHES",
    tag: "Live Jobs",
    glow: "rgba(236,72,153,0.26)"
  }
];

const statsTags = ["ATS-ready", "AI matched", "One-click apply", "Live insights"];

const CompanyLogos = {
  Google: () => (
    <svg className="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  ),
  Microsoft: () => (
    <svg className="w-3.5 h-3.5 inline-block" viewBox="0 0 23 23" fill="none">
      <path d="M0 0h11v11H0z" fill="#F25022" />
      <path d="M12 0h11v11H12z" fill="#7FBA00" />
      <path d="M0 12h11v11H0z" fill="#00A4EF" />
      <path d="M12 12h11v11H12z" fill="#FFB900" />
    </svg>
  ),
  Amazon: () => (
    <svg className="w-4 h-4 inline-block shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.2 12.5c0 1.3-.8 2.1-2.1 2.1-1.1 0-1.7-.7-1.7-1.7 0-1.3.9-1.9 2.1-1.9h1.7v1.5zm1.5-3.8c-.4-.9-1.3-1.4-2.6-1.4-1.9 0-3.1 1.1-3.2 2.6 0 .2.1.3.3.3h1.1c.2 0 .3-.1.4-.2.2-.6.7-1.1 1.4-1.1.8 0 1.3.4 1.3 1.1v.7h-1.6c-2.2 0-3.7.9-3.7 2.7 0 1.6 1.1 2.6 2.7 2.6 1.3 0 2.2-.7 2.6-1.5v1.2c0 .2.1.3.3.3h1.1c.2 0 .3-.1.3-.3V10.2c0-1.1-.3-1.5-1.1-1.5z"
        fill="currentColor"
      />
      <path
        d="M4.5 19.5c3.2 2 7.1 3 11 3 2.7 0 5.4-.5 7.8-1.5.3-.1.3-.5 0-.7-.3-.2-.6-.1-.8.1-2.1 1-4.5 1.5-7 1.5-3.5 0-6.9-.9-9.7-2.6-.3-.2-.6 0-.6.3l.3.9z"
        fill="currentColor"
      />
      <path
        d="M22.8 18.8c-.2-.5-.8-1-1.3-1.1-.2 0-.4.1-.3.3l.8 1.8c.1.2.3.2.4 0l.9-1.7c.1-.2-.1-.4-.3-.3-.4.2-.9.6-1.2 1z"
        fill="currentColor"
      />
    </svg>
  ),
  Spotify: () => (
    <svg className="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.668.47-.745 3.856-.88 7.15-.51 9.82 1.127.294.18.387.563.207.86zm1.224-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.076-1.182-.413.125-.848-.107-.973-.52-.125-.413.107-.847.52-.972 3.665-1.112 8.232-.574 11.343 1.34.367.227.487.708.26 1.074zm.106-2.833C14.384 8.7 8.35 8.5 4.88 9.553a1.004 1.004 0 0 1-1.157-.798 1.004 1.004 0 0 1 .798-1.156C8.5 6.38 15.175 6.6 19.3 9.05a1.004 1.004 0 0 1 .324 1.385c-.244.36-.708.473-1.075.247z" fill="#1DB954" />
    </svg>
  ),
  GoogleColored: () => (
    <svg className="w-5 h-5 inline-block shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  ),
  MicrosoftColored: () => (
    <svg className="w-5 h-5 inline-block shrink-0" viewBox="0 0 23 23" fill="none">
      <path d="M0 0h11v11H0z" fill="#F25022" />
      <path d="M12 0h11v11H12z" fill="#7FBA00" />
      <path d="M0 12h11v11H0z" fill="#00A4EF" />
      <path d="M12 12h11v11H12z" fill="#FFB900" />
    </svg>
  ),
  AmazonColored: () => (
    <svg className="w-5 h-5 inline-block shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.2 12.5c0 1.3-.8 2.1-2.1 2.1-1.1 0-1.7-.7-1.7-1.7 0-1.3.9-1.9 2.1-1.9h1.7v1.5zm1.5-3.8c-.4-.9-1.3-1.4-2.6-1.4-1.9 0-3.1 1.1-3.2 2.6 0 .2 0 .3.2.3h1.2c.2 0 .3-.1.4-.2.2-.6.7-1.1 1.4-1.1.8 0 1.3.4 1.3 1.1v.7h-1.6c-2.2 0-3.7.9-3.7 2.7 0 1.6 1.1 2.6 2.7 2.6 1.3 0 2.2-.7 2.6-1.5v1.2c0 .2.1.3.3.3h1.1c.2 0 .3-.1.3-.3V10.2c0-1.1-.3-1.5-1.1-1.5z"
        fill="currentColor"
      />
      <path
        d="M4.5 19.5c3.2 2 7.1 3 11 3 2.7 0 5.4-.5 7.8-1.5.3-.1.3-.5 0-.7-.3-.2-.6-.1-.8.1-2.1 1-4.5 1.5-7 1.5-3.5 0-6.9-.9-9.7-2.6-.3-.2-.6 0-.6.3l.3.9z"
        fill="#FF9900"
      />
      <path
        d="M22.8 18.8c-.2-.5-.8-1-1.3-1.1-.2 0-.4.1-.3.3l.8 1.8c.1.2.3.2.4 0l.9-1.7c.1-.2-.1-.4-.3-.3-.4.2-.9.6-1.2 1z"
        fill="#FF9900"
      />
    </svg>
  ),
  SpotifyColored: () => (
    <svg className="w-5 h-5 inline-block shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.075-.668-.135-.744-.47-.077-.337.135-.668.47-.745 3.856-.88 7.15-.51 9.82 1.127.294.18.387.563.207.86zm1.224-2.723c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.076-1.182-.413.125-.848-.107-.973-.52-.125-.413.107-.847.52-.972 3.665-1.112 8.232-.574 11.343 1.34.367.227.487.708.26 1.074zm.106-2.833C14.384 8.7 8.35 8.5 4.88 9.553a1.004 1.004 0 0 1-1.157-.798 1.004 1.004 0 0 1 .798-1.156C8.5 6.38 15.175 6.6 19.3 9.05a1.004 1.004 0 0 1 .324 1.385c-.244.36-.708.473-1.075.247z" fill="#1DB954" />
    </svg>
  ),
  MetaColored: () => (
    <svg className="w-5 h-5 inline-block text-[#0668E1] shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.994 6.002c-1.34 0-2.583.504-3.567 1.342-.984-.838-2.228-1.342-3.567-1.342C6.35 6.002 3.5 8.852 3.5 12.362s2.85 6.36 6.36 6.36c1.339 0 2.583-.504 3.567-1.342.984.838 2.228 1.342 3.567 1.342 3.51 0 6.36-2.85 6.36-6.36s-2.85-6.36-6.36-6.36zm0 10.92c-2.514 0-4.56-2.046-4.56-4.56s2.046-4.56 4.56-4.56 4.56 2.046 4.56 4.56-2.046 4.56-4.56 4.56zm-7.128 0c-2.514 0-4.56-2.046-4.56-4.56s2.046-4.56 4.56-4.56 4.56 2.046 4.56 4.56-2.046 4.56-4.56 4.56z" />
    </svg>
  ),
  NotionColored: () => (
    <svg className="w-5 h-5 inline-block text-black shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.2 3h15.6c.7 0 1.2.5 1.2 1.2v15.6c0 .7-.5 1.2-1.2 1.2H4.2C3.5 22 3 21.5 3 20.8V4.2C3 3.5 3.5 3 4.2 3zm2.3 2.7v12.6l4.6-2.5V5.7L6.5 5.7zm6.7.7v10.5l4.3-2.3V6.4l-4.3 0z" />
    </svg>
  ),
  AdobeColored: () => (
    <svg className="w-5 h-5 inline-block text-[#FF0000] shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.966 2H22v20H13.966zM10.034 2H2v20H10.034zM12 10.034L17.966 22H13.966L12 17.966L10.034 22H6.034z" />
    </svg>
  ),
  SalesforceColored: () => (
    <svg className="w-6 h-5 inline-block text-[#00A1E0] shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.8 9.9c-.3-1.6-1.5-2.8-3-3.1-1-.2-2.1.1-2.9.8-.7-.6-1.6-.9-2.5-.9-1.8 0-3.3 1.2-3.8 2.9-.6-.4-1.3-.6-2-.6-1.8 0-3.3 1.5-3.3 3.3 0 .2 0 .3.1.5C.6 13.5 0 14.5 0 15.7 0 17.5 1.5 19 3.3 19h15.4c2.4 0 4.3-1.9 4.3-4.3 0-2.2-1.7-4-3.9-4.2-.1-.2-.2-.4-.3-.6z" />
    </svg>
  ),
  Meta: () => null,
  Notion: () => null,
  Adobe: () => null,
  Salesforce: () => null
};

function TestimonialCard({
  name,
  role,
  avatar,
  tag,
  stars,
  quote,
  atsScore: targetAts,
  appsCount: targetApps,
  status,
  company,
  logo
}) {
  const cardRef = useRef(null);
  const isInView = useInView(cardRef, { once: true, margin: "-50px" });

  const [atsVal, setAtsVal] = useState(0);
  const [appsVal, setAppsVal] = useState(0);

  useEffect(() => {
    if (isInView) {
      let startAts = 0;
      const duration = 1200;
      const stepTime = 16;
      const stepsAts = duration / stepTime;
      const incrementAts = targetAts / stepsAts;

      const atsTimer = setInterval(() => {
        startAts += incrementAts;
        if (startAts >= targetAts) {
          setAtsVal(targetAts);
          clearInterval(atsTimer);
        } else {
          setAtsVal(Math.floor(startAts));
        }
      }, stepTime);

      let startApps = 0;
      const incrementApps = targetApps / stepsAts;
      const appsTimer = setInterval(() => {
        startApps += incrementApps;
        if (startApps >= targetApps) {
          setAppsVal(targetApps);
          clearInterval(appsTimer);
        } else {
          setAppsVal(Math.floor(startApps));
        }
      }, stepTime);

      return () => {
        clearInterval(atsTimer);
        clearInterval(appsTimer);
      };
    }
    return undefined;
  }, [isInView, targetAts, targetApps]);

  // 3D Tilt state
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-30, 30], [10, -10]);
  const rotateY = useTransform(mouseX, [-30, 30], [-10, 10]);

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = e.clientX - rect.left - width / 2;
    const y = e.clientY - rect.top - height / 2;
    mouseX.set(x);
    mouseY.set(y);
  }

  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const LogoIcon = CompanyLogos[logo];

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.215, 0.61, 0.355, 1] }}
      className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-[24px] p-6 md:p-8 flex flex-col justify-between h-full transition-all duration-300 hover:shadow-xl hover:border-black/35 hover:-translate-y-2.5 group relative overflow-hidden"
    >
      <div>
        {/* Top: Tag Badge & Stars */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-bold text-[#000000] bg-black/5 border border-black/10 px-3 py-1.5 rounded-full uppercase tracking-wider">
            {tag}
          </span>
          <div className="flex gap-0.5 text-yellow-500">
            {[...Array(stars)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-yellow-500 stroke-yellow-500" />
            ))}
          </div>
        </div>

        {/* Middle: Portrait & Info */}
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-14 h-14 rounded-full overflow-hidden border border-[#EAEAEA] shadow-sm cursor-pointer shrink-0"
          >
            <motion.img
              src={avatar}
              alt={name}
              className="w-full h-full object-cover"
              whileHover={{ scale: 1.15 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
            />
          </motion.div>
          <div>
            <h4 className="font-extrabold text-[#000000] text-base leading-tight font-sans tracking-tight">{name}</h4>
            <div className="text-xs text-[#555555] mt-1 flex items-center gap-1.5 font-medium">
              <span>{role}</span>
              <span className="w-1 h-1 rounded-full bg-neutral-300" />
              <span className="flex items-center gap-1.5">
                {LogoIcon && <LogoIcon />}
                <span>{company}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quote */}
        <div className="border-l-[3px] border-[#000000] pl-4 my-6">
          <p className="text-[#555555] text-[14px] leading-relaxed italic font-medium">
            "{quote}"
          </p>
        </div>
      </div>

      {/* Bottom: Results Metrics */}
      <div className="grid grid-cols-3 gap-2 border-t border-[#EAEAEA] pt-6 mt-2 items-center">
        {/* ATS Score Circular Progress */}
        <div className="flex flex-col items-center">
          <div className="relative w-11 h-11 flex items-center justify-center mb-1.5">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="22"
                cy="22"
                r="18"
                className="stroke-[#EAEAEA]"
                strokeWidth="3.5"
                fill="transparent"
              />
              <circle
                cx="22"
                cy="22"
                r="18"
                className="stroke-[#000000]"
                strokeWidth="3.5"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 18}
                strokeDashoffset={2 * Math.PI * 18 * (1 - atsVal / 100)}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 0.1s ease-out" }}
              />
            </svg>
            <span className="absolute text-[10px] font-black text-[#000000] font-sans">
              {atsVal}%
            </span>
          </div>
          <span className="text-[10px] font-bold text-[#555555] uppercase tracking-wider">ATS Score</span>
        </div>

        {/* Applications Count */}
        <div className="flex flex-col items-center border-x border-[#EAEAEA] px-2">
          <div className="text-lg font-black text-[#000000] mb-1 font-sans h-11 flex items-center justify-center">
            {appsVal}
          </div>
          <span className="text-[10px] font-bold text-[#555555] uppercase tracking-wider text-center">Applications</span>
        </div>

        {/* Status Badge */}
        <div className="flex flex-col items-center">
          <div className="h-11 flex items-center justify-center mb-1">
            <motion.span
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="text-[10px] font-bold text-white bg-black px-2.5 py-1 rounded-full uppercase tracking-wider text-center shadow-sm"
            >
              {status}
            </motion.span>
          </div>
          <span className="text-[10px] font-bold text-[#555555] uppercase tracking-wider">Result</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Landing() {
  const { setDemoMode, isAuthenticated, isDemoMode, user, isValidatingSession } = useAuthStore();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoRoleModalOpen, setDemoRoleModalOpen] = useState(false);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;
    setMousePos({ x, y });
  };
  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const carouselRef = useRef(null);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const handleScroll = () => {
      const index = Math.round(el.scrollLeft / el.clientWidth);
      setActiveSlide(index);
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    const interval = setInterval(() => {
      if (window.innerWidth >= 768) return; // Only autoplay on mobile
      const nextSlide = (activeSlide + 1) % 4;
      el.scrollTo({
        left: nextSlide * el.clientWidth,
        behavior: "smooth"
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [activeSlide]);

  const handleNextSlide = () => {
    const el = carouselRef.current;
    if (!el) return;
    const nextSlide = (activeSlide + 1) % 4;
    el.scrollTo({
      left: nextSlide * el.clientWidth,
      behavior: "smooth"
    });
  };

  const handlePrevSlide = () => {
    const el = carouselRef.current;
    if (!el) return;
    const prevSlide = (activeSlide - 1 + 4) % 4;
    el.scrollTo({
      left: prevSlide * el.clientWidth,
      behavior: "smooth"
    });
  };

  const handleGoToSlide = (idx) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({
      left: idx * el.clientWidth,
      behavior: "smooth"
    });
  };
  // --- Interactive Demo Section States & Effects ---
  const [atsScore, setAtsScore] = useState(0);
  const [appCount, setAppCount] = useState(0);
  const [chatIndex, setChatIndex] = useState(0);
  const [typedChatText, setTypedChatText] = useState("");
  const [showJobs, setShowJobs] = useState(false);
  const [notificationIdx, setNotificationIdx] = useState(0);
  const [showNotification, setShowNotification] = useState(true);

  const chatMessages = [
    "Analyzing your resume...",
    "Finding matching jobs...",
    "Generating cover letter...",
    "Interview preparation ready..."
  ];

  const notifications = [
    "Resume Uploaded",
    "New Job Match Found",
    "ATS Score Improved",
    "Interview Ready"
  ];

  // ATS score animation loop
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      while (isMounted) {
        setAtsScore(0);
        for (let i = 0; i <= 98; i++) {
          if (!isMounted) return;
          await new Promise((resolve) => setTimeout(resolve, 15));
          setAtsScore(i);
        }
        await new Promise((resolve) => setTimeout(resolve, 4000));
      }
    };
    run();
    return () => { isMounted = false; };
  }, []);

  // Application counter loop
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      while (isMounted) {
        setAppCount(0);
        for (let i = 0; i <= 12; i++) {
          if (!isMounted) return;
          await new Promise((resolve) => setTimeout(resolve, 100));
          setAppCount(i);
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    };
    run();
    return () => { isMounted = false; };
  }, []);

  // AI chat messaging typing loop
  useEffect(() => {
    let isMounted = true;
    const currentMsg = chatMessages[chatIndex];
    
    const typeText = async () => {
      if (chatIndex !== 1) {
        setShowJobs(false);
      }
      for (let i = 0; i <= currentMsg.length; i++) {
        if (!isMounted) return;
        setTypedChatText(currentMsg.slice(0, i));
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      if (chatIndex === 1) {
        setShowJobs(true);
        await new Promise((resolve) => setTimeout(resolve, 3500));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      if (isMounted) {
        setChatIndex((prev) => (prev + 1) % chatMessages.length);
      }
    };

    typeText();
    return () => { isMounted = false; };
  }, [chatIndex]);

  // Floating notifications loop
  useEffect(() => {
    const interval = setInterval(() => {
      setShowNotification(false);
      setTimeout(() => {
        setNotificationIdx((prev) => (prev + 1) % notifications.length);
        setShowNotification(true);
      }, 500);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 800], [0, 100]);
  const bgScale = useTransform(scrollY, [0, 800], [1, 1.08]);
  const bgOpacity = useTransform(scrollY, [0, 800], [0.95, 0.4]);

  const heroTextY = useTransform(scrollY, [0, 800], [0, 80]);
  const heroTextScale = useTransform(scrollY, [0, 800], [1, 0.95]);
  const heroTextOpacity = useTransform(scrollY, [0, 800], [1, 0.15]);
  const [openFaq, setOpenFaq] = useState(0);
  const [activeStep, setActiveStep] = useState(1);
  const [hoveredStep, setHoveredStep] = useState(null);
  const currentActive = hoveredStep !== null ? hoveredStep : activeStep;
  const [scrollProgress, setScrollProgress] = useState(0);

  const worksRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: worksRef,
    offset: ["start center", "end center"]
  });

  const lineWidth = useTransform(scrollYProgress, [0, 0.6], ["0%", "100%"]);

  useEffect(() => {
    return scrollYProgress.onChange((latest) => {
      setScrollProgress(latest);
      if (latest < 0.15) {
        setActiveStep(1);
      } else if (latest < 0.3) {
        setActiveStep(2);
      } else if (latest < 0.45) {
        setActiveStep(3);
      } else {
        setActiveStep(4);
      }
    });
  }, [scrollYProgress]);

  const [showScrollTop, setShowScrollTop] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem('hnai_visitors');
    const current = stored ? parseInt(stored) : 
      Math.floor(Math.random() * 500) + 1200;
    const newCount = current + 1;
    localStorage.setItem('hnai_visitors', newCount);
    setVisitorCount(newCount);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  const typedText = useTypingCycle();

  const handleDemoRole = () => {
    setDemoRoleModalOpen(false);
    navigate("/demo");
  };

  const partners = [
    {
      name: "LinkedIn",
      component: (
        <svg viewBox="0 0 291 79.46" className="h-7 w-auto shrink-0 animate-fade-in" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(-200.55198,-393.96227)">
            <g transform="matrix(1.018827,0,0,-1.018827,170.5996,498.03288)">
              <path
                 d="m 239.3298,95.036 c 0,2.96 2.4604,5.361 5.4956,5.361 l 63.376,0 c 3.0351,0 5.4956,-2.401 5.4956,-5.361 l 0,-64.117 c 0,-2.961 -2.4605,-5.361 -5.4956,-5.361 l -63.376,0 c -3.0352,0 -5.4956,2.4 -5.4956,5.361 l 0,64.117 z"
                 fill="#0A66C2" />
              <path d="m 31.1516,37.709 31.0356,0 0,10.189 -19.8042,0 0,38.874 -11.2314,0 0,-49.063 z" fill="#000000" />
              <path d="m 77.9001,37.709 0,33.793 -11.2324,0 0,-33.793 11.2324,0 z m -5.6162,38.407 c 3.917,0 6.355,2.595 6.355,5.84 -0.073,3.315 -2.438,5.837 -6.2803,5.837 -3.8428,0 -6.355,-2.522 -6.355,-5.837 0,-3.245 2.4375,-5.84 6.207,-5.84 l 0.073,0 z" fill="#000000" />
              <path d="m 83.1154,37.709 11.2325,0 0,18.872 c 0,1.01 0.073,2.019 0.3701,2.741 0.8115,2.017 2.6596,4.107 5.7627,4.107 4.0649,0 5.6909,-3.1 5.6909,-7.64 l 0,-18.08 11.2314,0 0,19.377 c 0,10.38 -5.542,15.21 -12.9321,15.21 -6.0591,0 -8.7197,-3.387 -10.1978,-5.694 l 0.075,0 0,4.9 -11.2325,0 c 0.1475,-3.171 0,-33.793 0,-33.793 z" fill="#000000" />
              <path d="m 133.2487,86.772 -11.2329,0 0,-49.063 11.2329,0 0,10.956 2.8072,3.534 8.7939,-14.49 13.8179,0 -14.7783,20.977 12.9316,14.272 -13.5225,0 c 0,0 -9.2368,-12.769 -10.0498,-14.283 l 0,28.097 z" fill="#000000" />
              <path d="m 188.7062,51.805 c 0.1475,0.868 0.3697,2.533 0.3697,4.415 0,8.736 -4.4346,17.604 -16.1094,17.604 -12.4888,0 -18.2524,-9.877 -18.2524,-18.835 0,-11.08 7.02,-18 19.2866,-18 4.8774,0 9.3843,0.72 13.0796,2.234 l -1.4785,7.418 c -3.0293,-1.005 -6.1329,-1.507 -9.9751,-1.507 -5.2466,0 -9.8277,2.153 -10.1978,6.743 l 23.2773,-0.07 z m -23.3505,7.599 c 0.2954,2.884 2.2168,7.138 7.02,7.138 5.0976,0 6.2807,-4.543 6.2807,-7.138 l -13.3007,0 z" fill="#000000" />
              <path d="m 216.801,86.772 0,-16.984 -0.1475,0 c -1.626,2.377 -5.0259,3.963 -9.5322,3.963 -8.6465,0 -16.2573,-6.92 -16.1841,-18.741 0,-10.958 6.8726,-18.094 15.4443,-18.094 4.6553,0 9.0889,2.019 11.3057,5.912 l 0.2222,0 0.4433,-5.119 9.9766,0 c -0.148,2.379 -0.2969,6.488 -0.2969,10.524 l 0,38.539 -11.2314,0 z m 0,-33.421 c 0,-0.864 -0.074,-1.73 -0.2222,-2.45 -0.6641,-3.1 -3.3252,-5.262 -6.5757,-5.262 -4.6557,0 -7.6855,3.748 -7.6855,9.659 0,5.55 2.5869,10.019 7.7588,10.019 3.4726,0 5.9116,-2.378 6.5771,-5.333 0.1475,-0.65 0.1475,-1.371 0.1475,-2.019 l 0,-4.614 z" fill="#000000" />
              <path d="m 261.8728,37.749 0,33.794 -11.2325,0 0,-33.794 11.2325,0 z m -5.6163,38.408 c 3.917,0 6.355,2.595 6.355,5.838 -0.073,3.316 -2.438,5.839 -6.2807,5.839 -3.8423,0 -6.3545,-2.523 -6.3545,-5.839 0,-3.243 2.4375,-5.838 6.207,-5.838 l 0.073,0 z" fill="#ffffff" />
              <path d="m 268.0881,37.749 11.2324,0 0,18.872 c 0,1.01 0.073,2.019 0.3696,2.741 0.812,2.018 2.6602,4.108 5.7632,4.108 4.0645,0 5.6904,-3.099 5.6904,-7.642 l 0,-18.079 11.2315,0 0,19.377 c 0,10.38 -5.5415,15.21 -12.9316,15.21 -6.0596,0 -8.7198,-3.387 -10.1978,-5.694 l 0.075,0 0,4.901 -11.2324,0 c 0.1474,-3.171 0,-33.794 0,-33.794 z" fill="#ffffff" />
            </g>
          </g>
        </svg>
      )
    },
    {
      name: "Indeed",
      component: (
        <svg viewBox="0 0 1486.1 400" className="h-7 w-auto shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1472.2,71.4c-5.2-5.9-12.2-8.8-21.5-8.8s-16.6,3.1-21.7,9.6c-5,6.3-7.6,15.7-7.6,27.8v88.8c-11.6-12.5-23.6-21.4-35.9-27.4c-7.6-3.7-16.6-6.4-26.7-7.7c-5.9-0.7-11.8-1.1-18.4-1.1c-30.6,0-55.4,10.5-74.4,31.7c-18.8,21-28.2,50.3-28.2,87.8c0,17.7,2.4,34.3,7.2,49.5c4.8,15.1,11.6,28.4,20.8,39.8c9.2,11.2,20.3,19.9,32.8,26.2c12.5,6.1,26.2,9.2,41.1,9.2c6.8,0,13.3-0.6,19.2-1.7c4.1-0.6,7.7-1.7,11.6-2.8c9.4-3.1,18.2-7.6,26.2-13.3c8.3-5.9,16.4-13.4,24.7-22.7v5.9c0,11.1,2.8,19.5,8.3,25.6c5.7,5.9,12.7,9,21,9c8.7,0,15.7-2.9,21-8.5c5.3-5.9,8.3-14.4,8.3-26V96.8C1479.7,85.8,1477.2,77.1,1472.2,71.4z M1409.9,316.5c-5.3,11.2-12.7,19.7-21.4,25.2c-9,5.5-18.8,8.1-29.7,8.1h-0.2c-10.9,0-20.6-2.9-29.7-8.5c-9-5.9-16.2-14.4-21.4-25.8c-5.2-11.4-7.7-25.4-7.7-41.6c0-15.5,2.4-29.1,7.4-40.5c4.8-11.6,11.8-20.6,20.6-26.9c9-6.4,19-9.4,30.4-9.4h0.6c10.7,0,20.4,3.1,29.5,9.2c9,6.1,16.2,14.9,21.5,26.3c5.3,11.4,7.9,25.4,7.9,41.3C1417.9,290.9,1415.3,305.1,1409.9,316.5z M1215.5,319.1c-3.9-3.3-9-5-15.5-5c-5.9,0-10.1,1.5-13.4,3.9c-7.7,7-14,12.7-18.8,16.8c-4.8,3.9-10.1,7.7-16,11.4c-5.5,3.5-11.6,6.3-17.7,7.7c-6.3,1.7-12.9,2.6-20.3,2.6c-1.7,0-3.1,0-4.6-0.2c-9.2-0.6-17.9-3.1-25.6-7.7c-9.2-5.3-16.4-13.1-22.1-23.2c-5.3-10.5-8.3-22.7-8.5-36.3h121c16.2,0,28.7-2.4,37.6-6.6c9-4.6,13.4-14.4,13.4-29.5c0-16.4-4.4-32.4-13.1-48.1c-8.7-15.7-21.4-28.5-38.9-38.3c-17.3-9.9-37.9-14.7-62.1-14.7h-1.8c-17.9,0.2-34.3,3.1-48.8,8.7c-15.3,5.9-28,14.2-38.7,24.9c-10.1,10.9-18.2,23.9-23.6,39.2s-8.3,31.9-8.3,49.5c0,37.8,11.1,67.4,33,89.5c20.8,20.8,49.5,31.9,86.2,33c2,0.2,4.2,0.2,6.4,0.2c17.1,0,32.6-2.2,46-6.6c13.4-4.4,24.5-9.9,33.3-16.6c8.8-6.8,15.5-13.8,19.7-21c4.4-7.2,6.6-13.6,6.6-19C1221.5,327.2,1219.5,322.3,1215.5,319.1z M1071.4,209c9.8-10.3,22.5-15.5,37.9-15.5h0.2c16,0,29.1,5,38.9,15.1c9.8,10.1,15.7,25.6,16.9,46.2h-112C1055.4,234.6,1061.3,219.3,1071.4,209z M952.7,314c-6.1,0-10.3,1.5-13.6,3.9c-7.6,7-14,12.7-18.8,16.8c-4.8,3.9-9.9,7.7-15.8,11.4c-5.7,3.5-11.6,6.3-17.9,7.7c-6.1,1.7-12.9,2.6-20.3,2.6c-1.7,0-3.1,0-4.6-0.2c-9.2-0.6-17.9-3.1-25.6-7.7c-9-5.3-16.4-13.1-21.7-23.2c-5.7-10.5-8.5-22.7-8.7-36.3h120.8c16,0,28.5-2.4,37.6-6.6c8.8-4.6,13.3-14.4,13.3-29.5c0-16.4-4.2-32.4-12.9-48.1s-21.5-28.5-38.9-38.3c-17.3-9.9-38.1-14.7-62.1-14.7h-2c-17.9,0.2-34.1,3.1-48.8,8.7c-15.3,5.9-28,14.2-38.5,24.9c-10.3,10.9-18.4,23.9-23.8,39.2c-5.5,15.3-8.3,31.9-8.3,49.5c0,37.8,11.2,67.4,33.2,89.5c20.8,20.8,49.4,31.9,86,33c2.2,0.2,4.2,0.2,6.4,0.2c17.3,0,32.6-2.2,46-6.6c13.4-4.4,24.5-9.9,33.2-16.6c9-6.8,15.5-13.8,19.9-21c4.4-7.2,6.6-13.6,6.6-19c0-6.1-2-10.9-5.9-14.2C964.1,315.6,958.7,314,952.7,314z M823.7,209c9.8-10.3,22.5-15.5,37.9-15.5h0.2c16,0,29.1,5,38.9,15.1c9.9,10.1,15.7,25.6,17.1,46.2H805.7C807.9,234.6,814,219.3,823.7,209z M134.9,356.5V213c4.2,0.4,8.3,0.6,12.3,0.6c20.1,0,38.9-5.3,54.9-14.5v157.5c0,13.4-3.1,23.4-9.4,30c-6.3,6.6-14.4,9.9-24.5,9.9c-9.8,0-17.7-3.3-23.9-10.1C138.3,379.5,134.9,369.8,134.9,356.5z M716.6,71.4c-5.2-5.9-12.3-8.8-21.4-8.8c-9.4,0-16.6,3.1-21.7,9.6c-5.2,6.3-7.6,15.7-7.6,27.8v88.8c-11.6-12.5-23.6-21.4-35.9-27.4c-7.7-3.7-16.6-6.4-26.5-7.7c-5.7-0.7-11.8-1.1-18.4-1.1c-30.6,0-55.6,10.5-74.4,31.7c-18.8,21-28.2,50.3-28.2,87.8c0,17.7,2.4,34.3,7,49.5c4.8,15.1,11.8,28.4,21,39.8c9.2,11.2,20.3,19.9,32.8,26.2c12.7,6.1,26.2,9.2,41.1,9.2c6.6,0,13.1-0.6,19.2-1.7c4.1-0.6,7.7-1.7,11.6-2.8c9.4-3.1,18.2-7.6,26.2-13.3c8.3-5.9,16.2-13.4,24.7-22.7v5.9c0,11.1,2.8,19.5,8.3,25.6c5.3,5.9,12.7,9,21,9s15.5-2.9,20.8-8.5c5.3-5.9,7.9-14.4,7.9-26V96.8C723.9,85.8,721.5,77.1,716.6,71.4z M654.5,316.5c-5.3,11.2-12.7,19.7-21.5,25.2c-8.8,5.5-18.8,8.1-29.5,8.1h-0.2c-10.9,0-20.6-2.9-29.7-8.5c-9.2-5.9-16.2-14.4-21.4-25.8c-5.2-11.4-7.7-25.4-7.7-41.6c0-15.5,2.4-29.1,7.2-40.5c5-11.6,11.8-20.6,20.8-26.9c8.8-6.4,19-9.4,30.2-9.4h0.7c10.7,0,20.4,3.1,29.3,9.2c9.2,6.1,16.4,14.9,21.7,26.3c5.2,11.4,7.9,25.4,7.9,41.3C662.4,290.9,659.6,305.1,654.5,316.5z M300.9,185.2v7.4c11.1-14,22.8-24.1,35.5-30.8c13.1-6.4,27.8-9.8,44.6-9.8c16.2,0,30.8,3.5,43.6,10.3c12.9,6.8,22.3,16.6,28.5,29.3c4.2,7.4,6.8,15.5,7.9,23.9c1.1,8.3,1.8,19.3,1.8,32.6v111.6c0,12.2-2.9,21.2-8.7,27.3c-5.5,6.3-13.1,9.4-22.1,9.4c-9.2,0-16.6-3.1-22.5-9.6c-5.9-6.3-8.7-15.3-8.7-27.1v-100c0-19.9-2.8-35-8.5-45.5c-5.5-10.5-16.9-15.8-33.9-15.8c-11.1,0-21,3.3-30,9.6c-9,6.4-15.8,15.1-20.1,26.5c-2.9,9-4.4,25.6-4.4,50.3v75c0,12.3-2.9,21.2-8.8,27.4c-5.9,6.1-13.3,9.2-22.5,9.2c-9,0-16.2-3.1-22.1-9.6c-5.9-6.3-8.7-15.3-8.7-27.1V186.2c0-11.4,2.6-20.1,7.7-25.6c5-5.7,12-8.7,21-8.7c5.3,0,10.1,1.1,14.5,3.7s7.9,6.3,10.7,11.2C299.8,172.2,300.9,178.2,300.9,185.2z M135.3,12.7C176.9-1.9,224.5-1.1,260,28.9c6.6,6.1,14.2,13.6,17.1,22.7c3.7,11.2-12.5-1.1-14.9-2.8c-11.6-7.4-23.2-13.6-36.3-17.9c-70-21-136.3,16.9-177.5,76.1c-16.9,26-28.2,53.4-37.4,83.6c-0.9,3.3-1.8,7.6-3.7,10.5c-1.8,3.3-0.7-8.8-0.7-9.4c1.5-12.5,4.1-24.5,7.2-36.6C32.9,90.9,74.9,37.3,135.3,12.7z M216,128.3c0,27.3-22.1,49.5-49.4,49.5s-49.4-22.1-49.4-49.5s22.1-49.5,49.4-49.5S216,100.9,216,128.3z" fill="#003A9B" />
        </svg>
      )
    },
    {
      name: "Naukri",
      component: (
        <svg viewBox="80.7 201.8 689.3 191.2" className="h-7 w-auto shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="naukri-grad" gradientUnits="userSpaceOnUse" x1="194.699" y1="249.0076" x2="138.9347" y2="313.3353" gradientTransform="matrix(1 0 0 -1 3.051759e-05 596.7244)">
              <stop offset="0" stopColor="#FFFFFF"/>
              <stop offset="1" stopColor="#265DF5"/>
            </linearGradient>
          </defs>
          <path fill="#265DF5" d="M366.7,256c-4.8-0.1-9.6,1-14,3c-4.1,1.9-7.7,4.7-10.5,8.3v-10.1h-20.6v81.5h20.6v-45c0-6.5,1.6-11.4,4.9-14.9c3.3-3.5,7.8-5.2,13.5-5.2c5.6,0,10,1.7,13.2,5.2c3.2,3.5,4.9,8.5,4.9,14.9v45h20.6v-47.8c0-11-3-19.5-9-25.7C384.2,259,376.4,256,366.7,256z"/>
          <path fill="#265DF5" d="M474.8,268.8c-2.9-3.9-6.6-7-10.9-9.3c-4.6-2.4-9.9-3.7-16-3.7c-6.7-0.1-13.2,1.7-18.9,5.2c-5.8,3.6-10.4,8.6-13.4,14.7c-3.3,6.4-4.9,13.7-4.9,21.9c0,8.3,1.6,15.7,4.9,22.1c3,6.1,7.6,11.3,13.4,14.9c5.6,3.5,12.1,5.4,18.7,5.3c5.6,0.1,11.1-1.2,16.1-3.7c4.4-2.2,8.1-5.5,10.9-9.5v11.9h20.7v-81.4h-20.7V268.8z M471.9,310.8c-1.8,3.4-4.6,6.3-7.9,8.2c-3.3,1.9-7,2.9-10.7,2.9c-3.7,0-7.4-1-10.5-2.9c-3.4-2-6.1-5-7.9-8.5c-2.1-4-3.1-8.4-3-12.9c0-4.9,1-9.1,3-12.7c1.4-2.5,3.2-4.6,5.4-6.4c2.2-1.7,4.8-3,7.5-3.8c2.7-0.8,5.6-1,8.4-0.6c2.8,0.4,5.5,1.3,7.9,2.7c3.4,1.9,6.1,4.8,7.9,8.2c2,3.6,2.9,7.9,2.9,12.9C474.8,302.8,473.8,307.1,471.9,310.8z"/>
          <path fill="#265DF5" d="M565.5,302c0,6.5-1.6,11.4-4.9,14.9c-3.2,3.5-7.7,5.2-13.4,5.2c-5.6,0-10-1.7-13.2-5.2c-3.2-3.5-4.9-8.5-4.9-14.9v-44.9h-20.6V305c0,7.3,1.4,13.5,4.2,18.7c2.6,5,6.6,9.2,11.5,11.9c5.2,2.8,11,4.2,16.9,4c4.8,0,9.5-1,13.9-3c4.1-1.9,7.7-4.7,10.4-8.3v10.3h20.7v-81.4h-20.7V302z"/>
          <path fill="#265DF5" d="M674,257.2h-26.8l-27.4,34.6v-61.9h-20.6v108.8h20.6V304l27.6,34.7h26.8l-36.2-40.6L674,257.2z"/>
          <path fill="#265DF5" d="M704.4,269.9v-12.7h-20.6v81.5h20.6v-40.6c0-7.6,1.6-12.8,4.9-15.9c3.3-3,8.2-4.6,14.6-4.6h5.5V256c-5-0.1-10,1.1-14.4,3.5C710.6,262,706.9,265.5,704.4,269.9z"/>
          <path fill="#265DF5" d="M759.6,257.1H739v81.5h20.6V257.1z"/>
          <path fill="#265DF5" d="M749.3,247.4c6.8,0,12.3-5.5,12.3-12.3c0-6.8-5.5-12.3-12.3-12.3c-6.8,0-12.3,5.5-12.3,12.3C737,241.9,742.5,247.4,749.3,247.4z"/>
          <path fill="#265DF5" d="M175.8,393c52.5,0,95.1-42.6,95.1-95.1c0-52.5-42.6-95.1-95.1-95.1c-52.5,0-95.1,42.6-95.1,95.1C80.8,350.4,123.3,393,175.8,393z"/>
          <path fill="url(#naukri-grad)" d="M204.4,333.1l-0.2,9.6l-0.6,27.8v1.1c-47-40.7-55-50.6-56.4-53.6l0-0.1c-0.2-0.6-0.2-1.2-0.1-1.8c0-0.2,0.1-0.4,0.1-0.6c0-0.2,0.1-0.3,0.2-0.5c0.5-1.3,1.2-2.6,2.1-3.7c0.6-0.8,1.4-1.6,2.1-2.4c1.6-1.6,3.4-3.1,5.2-4.4c0.9-0.7,1.9-1.4,2.9-2.1c1.9-1.3,4-2.7,6.2-3.9C182.7,314.3,204.2,332.9,204.4,333.1z"/>
          <path fill="#FFFFFF" d="M205.1,241.7l-0.2,9.7l-0.1,4.8l-0.2,9.6l-0.1,4.8l-0.2,9.6c-0.3,0.1-21.8,8.5-38.3,18.3c-2.2,1.3-4.3,2.6-6.2,3.9c-1,0.7-2,1.4-2.9,2.1c-1.8,1.4-3.6,2.8-5.2,4.4c-0.8,0.7-1.5,1.5-2.1,2.4c-1.5,1.9-2.4,3.8-2.5,5.5l0.2-8v-0.1l0-1.2v-0.5l0.1-5.1l0.3-10l0.1-4.9l0.3-10C151.4,263.1,199.4,243.9,205.1,241.7z"/>
          <path fill="#FFFFFF" d="M160.8,252.4c7.8,0,14.1-6.3,14.1-14.1c0-7.8-6.3-14.1-14.1-14.1c-7.8,0-14.1,6.3-14.1,14.1C146.7,246.1,153,252.4,160.8,252.4z"/>
        </svg>
      )
    },
    {
      name: "Glassdoor",
      component: (
        <svg viewBox="0 142.67 241.33 36" className="h-[22px] w-auto shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g transform="matrix(1.3333333,0,0,-1.3333333,0,190.66667)">
            <g transform="scale(0.1)">
              <path
                 d="m 1803.99,278.707 c 0,1.984 -1.41,4.254 -3.11,5.106 -3.97,2.269 -9.93,3.683 -22.12,3.683 -27.51,0 -51.61,-13.609 -62.1,-36.578 v 27.789 c 0,2.27 -1.98,4.254 -4.53,4.254 h -40.84 c -2.27,0 -4.25,-1.703 -4.25,-4.254 V 90.4258 c 0,-2.2656 1.98,-4.25 4.53,-4.25 l 43.11,-0.0039 c 2.26,0 4.25,1.9883 4.25,4.2539 v 84.7812 c 0,37.715 26.37,56.43 60.11,56.43 7.94,0 15.88,-1.414 19.85,-2.836 2.84,-0.852 5.39,1.137 5.39,4.254 v 45.937 z m -274.48,9.074 c 60.4,0 105.49,-41.683 105.49,-103.211 0,-61.25 -45.09,-103.2145 -105.2,-103.2145 -60.12,0 -104.92,41.6795 -104.92,103.2145 -0.28,61.528 44.52,103.211 104.63,103.211 z m 0,-155.39 c 29.49,0 52.18,20.703 52.18,52.179 0,31.473 -22.69,52.453 -52.18,52.453 -29.2,0 -51.89,-20.98 -51.89,-52.453 0.29,-31.476 22.97,-52.179 51.89,-52.179 z m -238.75,155.39 c 60.4,0 105.2,-41.683 105.2,-103.211 0,-61.25 -45.08,-103.2145 -104.92,-103.2145 -60.39,0 -105.48,41.6795 -105.48,103.2145 0,61.528 44.8,103.211 105.2,103.211 z m 0,-155.39 c 29.49,0 52.17,20.703 52.17,52.179 0,31.473 -22.68,52.453 -51.89,52.453 -29.2,0 -51.89,-20.98 -51.89,-52.453 -0.28,-31.761 22.4,-52.461 51.61,-52.179 z m -141.49,229.117 c 2.27,0 4.25,-1.703 4.25,-4.254 V 90.4258 c 0,-2.2656 -1.7,-4.25 -4.25,-4.25 l -43.11,-0.0039 c -2.27,0 -4.25,1.9883 -4.25,4.2539 v 23.2502 c -14.46,-20.4143 -36.58,-32.6057 -64.93,-32.6057 -48.492,0 -89.039,36.8597 -89.039,103.4957 0,66.633 40.547,103.497 88.189,103.497 30.62,0 52.46,-14.461 65.78,-33.458 V 357.25 c 0,2.27 1.98,4.539 4.54,4.539 l 42.82,-0.281 z m -96.98,-229.965 c 28.92,0 51.33,20.414 51.33,52.742 0,32.606 -22.41,52.738 -51.33,52.738 -29.21,0 -51.32,-20.98 -51.32,-52.738 0,-32.043 22.11,-52.742 51.32,-52.742 z m -132.704,13.895 c 0,-44.805 -32.324,-64.0825 -84.5,-64.0825 -35.727,0 -66.918,9.9218 -84.496,29.7695 -1.422,1.703 -1.422,3.973 0,5.672 l 24.664,32.609 c 1.703,2.27 4.82,2.27 6.523,0.285 13.043,-13.613 33.457,-21.836 58.414,-21.836 14.461,0 26.368,3.973 26.368,15.032 0,10.773 -10.774,13.043 -43.664,20.129 -28.926,5.957 -64.938,19.285 -64.938,62.101 0,39.981 31.477,62.664 82.516,62.664 33.742,0 57.847,-10.207 74.859,-26.371 1.703,-1.699 1.703,-4.25 0.285,-5.957 l -23.539,-30.906 c -1.414,-1.984 -4.25,-2.266 -6.234,-0.848 -11.344,10.489 -30.625,16.731 -49.625,16.731 -15.879,0 -24.953,-5.106 -24.953,-13.614 0,-9.925 10.777,-12.191 45.371,-19.566 34.308,-7.371 62.949,-20.414 62.949,-61.812 z m -198.488,0 c 0,-44.805 -32.325,-64.0825 -84.5,-64.0825 -36.012,0 -66.914,9.9218 -84.782,29.7695 -1.136,1.703 -1.136,3.973 0,5.672 l 24.954,32.328 c 1.414,2.266 4.82,2.266 6.519,0.281 13.047,-13.609 33.461,-21.832 58.414,-21.832 14.461,0 26.371,3.969 26.371,15.028 0,10.773 -10.773,13.043 -43.668,20.132 -28.922,5.954 -64.933,19.282 -64.933,62.102 0,39.98 31.187,62.66 82.515,62.66 33.739,0 57.848,-10.207 74.856,-26.371 1.703,-1.414 1.703,-4.25 0.285,-5.949 l -23.535,-30.629 c -1.414,-1.984 -4.535,-2.266 -6.239,-0.848 -11.339,10.489 -30.625,16.731 -49.621,16.731 -15.882,0 -24.953,-5.106 -24.953,-13.614 0,-9.925 10.774,-12.191 45.371,-19.566 34.028,-7.371 62.661,-20.414 62.946,-61.812 z M 429.887,287.215 c 56.996,0 85.633,-25.238 85.633,-79.965 V 89.8594 c 0,-2.2696 -1.985,-4.2539 -4.536,-4.2539 h -43.101 c -2.266,0 -4.25,1.6992 -4.25,4.2539 v 22.4026 c -9.926,-15.8831 -29.488,-30.6253 -60.117,-30.6253 -38.848,0 -66.067,24.9533 -66.067,61.2503 0,35.726 26.656,58.41 62.668,61.812 l 53.59,4.824 c 7.086,0.848 9.926,3.118 9.926,7.934 v 3.121 c 0,11.344 -10.778,19.567 -34.028,19.567 -18.714,0 -38.281,-5.387 -46.785,-21.27 -1.136,-2.266 -3.972,-2.551 -5.957,-1.133 l -31.191,22.688 c -1.703,1.133 -2.27,3.683 -1.133,5.386 13.609,27.504 44.516,41.114 85.348,41.114 z M 463.633,165.57 v 7.938 l -48.207,-5.957 C 399.547,165.285 391.324,157.063 391.324,146 c 0,-12.758 9.922,-20.98 27.785,-20.98 27.223,0 44.805,19 44.524,40.55 z M 302.285,357.254 V 90.4258 c 0,-2.5508 -1.984,-4.5352 -4.25,-4.5352 h -43.387 c -2.265,0 -4.535,1.9844 -4.535,4.5352 V 357.254 c 0,2.266 1.985,4.25 4.254,4.25 l 43.383,0.004 c 2.551,0 4.535,-1.988 4.535,-4.254 z m -99.242,-74.012 c 2.266,0 4.539,-1.984 4.539,-4.535 V 99.2188 c 0,-50.7579 -24.105,-96.69536 -106.336,-96.69536 -37.7108,0 -63.8007,10.77736 -83.6483,28.07426 -1.418,1.1328 -1.7032,3.6875 0.8515,7.9375 l 19.2813,32.8945 c 1.1367,2.2656 4.2539,2.8359 6.2383,0.8516 15.5937,-13.8946 33.1757,-21.2657 55.2929,-21.2657 43.6683,0 57.2773,22.3985 57.2773,50.7544 v 12.476 C 143.777,95.8164 121.945,84.1914 93.875,84.1914 41.6992,84.1914 2,119.918 2,185.418 c 0,65.789 41.6836,102.367 90.4531,102.367 30.0589,0 52.7459,-14.465 63.8049,-32.328 v 22.969 c 0,2.269 1.984,4.535 4.535,4.535 l 42.25,0.281 z M 106.352,131.828 c 29.203,0 50.753,20.414 50.753,52.742 0,32.606 -21.55,52.739 -50.753,52.739 -29.4926,0 -51.3247,-20.985 -51.3247,-52.739 0,-31.761 22.1133,-52.742 51.3247,-52.742"
                 fill="#0DAB40" />
            </g>
          </g>
        </svg>
      )
    },
    {
      name: "Internshala",
      component: (
        <svg viewBox="0 0 118 32" className="h-7 w-auto shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M91.1885 5.48222L96.1378 9.29731L96.1213 14.5188L100.143 11.873L104.007 14.6013L112.686 1L91.1885 5.48222ZM98.4609 10.5594L97.0513 12.9309L97.0575 8.93951L109.964 2.72504L98.4609 10.5594Z" fill="#00A5EC"/>
          <path d="M1 19.8433H3.21997V30.9957H1V19.8433Z" fill="#00A5EC"/>
          <path d="M5.45605 30.9962V19.853H6.20154L13.1832 26.8326V19.853H15.4103V30.9962H14.5947L7.68634 24.0878V30.9962H5.45605Z" fill="#00A5EC"/>
          <path d="M26.8154 19.853V21.9328H23.1034V30.9952H20.8721V21.9328H17.1602V19.853H26.8154Z" fill="#00A5EC"/>
          <path d="M28.4414 30.9958V19.8599H36.6315V21.9396H30.6717V24.3111H35.1395V26.3847H30.6717V28.9171H36.615V30.9989L28.4414 30.9958Z" fill="#00A5EC"/>
          <path d="M45.5825 26.1345L48.3582 30.9952H45.8052L43.1346 26.3882H41.1002V30.9952H38.873V19.853H43.7306C46.331 19.853 47.6309 20.9219 47.6302 23.0598C47.7033 23.731 47.5383 24.4066 47.1641 24.9686C46.7898 25.5306 46.23 25.9432 45.5825 26.1345ZM41.1002 24.3084H44.2235C45.1185 24.2919 45.5814 23.8847 45.6031 23.0835C45.5825 22.3493 45.1267 21.9699 44.2441 21.9379H41.1002V24.3095V24.3084Z" fill="#00A5EC"/>
          <path d="M49.5205 30.9962V19.853H50.2598L57.2466 26.8326V19.853H59.4738V30.9962H58.6551L51.7467 24.0878V30.9962H49.5205Z" fill="#00A5EC"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M79.2275 18.5012C84.5615 17.7279 89.5933 15.8832 94.788 14.1582C93.1795 15.4491 81.1671 18.8219 79.2275 18.5012Z" fill="#666666"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M100.139 11.873L96.1172 14.5189L98.4599 10.5625L100.139 11.873Z" fill="#666666"/>
          <path d="M67.8185 20.2238C68.4154 20.4912 68.9566 20.8686 69.4137 21.3364L67.9309 22.8243C67.6755 22.5256 67.3545 22.2898 66.9931 22.1353C66.6317 21.9808 66.2395 21.9117 65.8471 21.9334C64.9572 21.9334 64.387 22.1396 64.1406 22.5634C64.0192 22.7168 63.9532 22.9066 63.9532 23.1022C63.9532 23.2977 64.0192 23.4876 64.1406 23.6409C64.6223 24.0423 65.2209 24.2771 65.8471 24.3101C66.7657 24.3999 67.6472 24.719 68.4104 25.2381C68.8006 25.5181 69.1117 25.8943 69.3135 26.3301C69.5153 26.7659 69.601 27.2465 69.5621 27.7251C69.5549 28.1787 69.4398 28.6241 69.2264 29.0244C69.0131 29.4248 68.7076 29.7686 68.3351 30.0276C67.5192 30.6691 66.5074 31.0103 65.4697 30.9938C64.5847 31.0207 63.7034 30.8688 62.8785 30.5473C62.2129 30.2702 61.6074 29.8664 61.0957 29.3584L62.5754 27.8767C62.9056 28.2098 63.2991 28.4736 63.7328 28.6524C64.1664 28.8313 64.6315 28.9216 65.1005 28.9181C66.0925 28.9181 66.708 28.7119 66.9565 28.2881C67.0768 28.0993 67.1407 27.88 67.1407 27.6561C67.1407 27.4321 67.0768 27.2129 66.9565 27.024C66.7091 26.6043 66.0956 26.3424 65.1005 26.2434C64.2342 26.1527 63.3981 25.874 62.6506 25.4268C62.2719 25.1818 61.9678 24.8375 61.7714 24.4315C61.575 24.0255 61.494 23.5733 61.537 23.1243C61.5295 22.6542 61.6417 22.1899 61.863 21.775C62.0843 21.3602 62.4075 21.0084 62.8022 20.7528C63.5551 20.1883 64.4669 19.8758 65.4078 19.8599C66.2275 19.8215 67.0467 19.9451 67.8185 20.2238Z" fill="#666666"/>
          <path d="M71.5537 30.9972V19.854H73.784V24.3094H78.9766V19.8447H81.21V30.9869L78.9766 30.9972V26.3902H73.784V30.9972H71.5537Z" fill="#666666"/>
          <path d="M83.0215 30.9972L87.4759 19.854H89.7061L94.1564 30.9899L91.7848 31.0003L91.1157 29.2927H86.0632L85.3941 31.0003L83.0215 30.9972ZM88.6513 22.8246L86.9562 27.0604H90.299L88.6513 22.8246Z" fill="#666666"/>
          <path d="M98.0769 19.854V28.9154H104.02V30.9972H95.8477V19.854H98.0769Z" fill="#666666"/>
          <path d="M105.268 30.9972L109.728 19.854H111.955L116.405 30.9899L114.033 31.0003L113.372 29.2896H108.32L107.652 30.9972H105.268ZM110.897 22.8246L109.203 27.0604H112.547L110.897 22.8246Z" fill="#666666"/>
        </svg>
      )
    },
    {
      name: "Monster",
      component: (
        <svg viewBox="0 0 178.0022 29.00036" className="h-[22px] w-auto shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
             fillRule="evenodd"
             fill="#6e46ae"
             d="m 168.53,16.9473 c 1.3219,-0.48859 5.8059,-2.4897 5.8059,-8.1957 C 174.3359,4.6254 171.0895,0 164.0799,0 h -9.0777 v 29 h 6.2515 V 17.545 h 0.319 L 170.5319,29 h 7.4703 L 168.5304,16.947 Z M 164.7322,12 h -3.7303 V 6 h 3.7303 c 1.9723,0 3.2697,1.3158 3.2697,2.9994 0,1.4718 -1.0961,3.0006 -3.2697,3.0006 z" />
          <polygon
             fillRule="evenodd"
             fill="#6e46ae"
             points="140.5,23.5 140.5,19.5 147,19.5 147,14.5 140.5,14.5 140.5,10.5 149,10.5 149,5 135,5 135,29 149,29 149,23.5"
             transform="translate(0,3e-4)" />
          <polygon
             fillRule="evenodd"
             fill="#6e46ae"
             points="123.5,29 123.5,10.5 129,10.5 129,5 112,5 112,10.5 117.5,10.5 117.48,29"
             transform="translate(0,3e-4)" />
          <path
             fill="#6e46ae"
             d="m 98.708,29.0003 c -5.4204,0 -8.2367,-2.9876 -8.7082,-3.4406 l 3.0445,-4.2435 c 0.47567,0.41292 2.6335,2.2908 5.4798,2.2908 1.9332,0 2.4928,-0.91066 2.4928,-1.6393 0,-0.75633 -0.57751,-1.429 -2.6174,-2.1765 l -1.7972,-0.65914 c -3.3099,-1.2134 -5.4157,-3.4836 -5.4157,-6.8565 0,-4.1357 3.3692,-7.2753 8.1534,-7.2753 4.3116,0 6.727,2.0375 6.9942,2.2678 l -2.8504,4.3701 c -0.5835,-0.39348 -2.1938,-1.2564 -3.9773,-1.2564 -1.669,0 -2.4299,0.69978 -2.4299,1.5398 0,1.0939 0.98908,1.5586 2.748,2.203 l 1.6259,0.5967 c 3.4064,1.2488 5.5492,3.8141 5.5492,6.8842 0,4.214 -3.3872,7.3949 -8.2918,7.3949" />
          <polygon
             fillRule="evenodd"
             fill="#6e46ae"
             points="84,5 78,5 78,17 64,5 64,29 70,29 70,17.5 84,29"
             transform="translate(0,3e-4)" />
          <path
             fillRule="evenodd"
             fill="#00b6b4"
             d="m 46,5.0003 c -6.7078,0 -12,5.3727 -12,12 0,6.6276 5.2922,12 12,12 6.7078,0 12,-5.3727 12,-12 0,-6.627 -5.2922,-12 -12,-12 m 0,18.382 c -3.5353,0 -6.2558,-2.8572 -6.2558,-6.3825 0,-3.5247 2.7205,-6.3825 6.2558,-6.3825 3.5353,0 6.2564,2.8578 6.2564,6.3825 0,3.5253 -2.721,6.3825 -6.2564,6.3825" />
          <polygon
             fillRule="evenodd"
             fill="#6e46ae"
             points="6.2297,29 6.2297,14.402 14,21.888 21.771,14.402 21.771,29 28,29 28,0 14.001,13.481 0,0 0,29"
             transform="translate(0,3e-4)" />
        </svg>
      )
    }
  ];

  const featureHighlights = [
    {
      icon: FileText,
      title: "AI Resume Builder",
      desc: "Craft a professional, ATS-friendly resume in minutes with our intelligent editor.",
      hoverClass: "hover:border-blue-200 hover:shadow-[0_20px_60px_rgba(59,130,246,0.06)]",
      glowBg: "radial-gradient(circle at 70% 30%, rgba(59,130,246,0.04), transparent 60%)",
      iconBg: "bg-blue-50/50",
      iconBorder: "border-blue-100/30",
      iconBgHover: "group-hover:bg-blue-50 group-hover:border-blue-200",
      iconColor: "text-blue-600",
      iconColorHover: "group-hover:text-blue-700",
      iconTransform: "group-hover:scale-110 group-hover:rotate-[5deg]",
      linkHoverColor: "group-hover:text-blue-600"
    },
    {
      icon: Mic,
      title: "Interview Prep AI",
      desc: "Practice with realistic AI mock interviews and get instant feedback on your performance.",
      hoverClass: "hover:border-purple-200 hover:shadow-[0_20px_60px_rgba(168,85,247,0.06)]",
      glowBg: "radial-gradient(circle at 70% 30%, rgba(168,85,247,0.04), transparent 60%)",
      iconBg: "bg-purple-50/50",
      iconBorder: "border-purple-100/30",
      iconBgHover: "group-hover:bg-purple-50 group-hover:border-purple-200",
      iconColor: "text-purple-600",
      iconColorHover: "group-hover:text-purple-700",
      iconTransform: "group-hover:scale-110 group-hover:rotate-[-5deg]",
      linkHoverColor: "group-hover:text-purple-600"
    },
    {
      icon: Target,
      title: "Job Match AI",
      desc: "Our neural matching engine finds roles that perfectly align with your skills and goals.",
      hoverClass: "hover:border-emerald-200 hover:shadow-[0_20px_60px_rgba(16,185,129,0.06)]",
      glowBg: "radial-gradient(circle at 70% 30%, rgba(16,185,129,0.04), transparent 60%)",
      iconBg: "bg-emerald-50/50",
      iconBorder: "border-emerald-100/30",
      iconBgHover: "group-hover:bg-emerald-50 group-hover:border-emerald-200",
      iconColor: "text-emerald-600",
      iconColorHover: "group-hover:text-emerald-700",
      iconTransform: "group-hover:scale-110 group-hover:rotate-[5deg]",
      linkHoverColor: "group-hover:text-emerald-600"
    },
    {
      icon: Map,
      title: "Career Roadmap",
      desc: "Generate a step-by-step personalized career path planner powered by AI recommendations.",
      hoverClass: "hover:border-orange-200 hover:shadow-[0_20px_60px_rgba(249,115,22,0.06)]",
      glowBg: "radial-gradient(circle at 70% 30%, rgba(249,115,22,0.04), transparent 60%)",
      iconBg: "bg-orange-50/50",
      iconBorder: "border-orange-100/30",
      iconBgHover: "group-hover:bg-orange-50 group-hover:border-orange-200",
      iconColor: "text-orange-600",
      iconColorHover: "group-hover:text-orange-700",
      iconTransform: "group-hover:scale-110 group-hover:rotate-[-5deg]",
      linkHoverColor: "group-hover:text-orange-600"
    },
    {
      icon: ShieldCheck,
      title: "ATS Scanner",
      desc: "Calculate your resume compatibility score and identify missing formatting and keywords instantly.",
      hoverClass: "hover:border-indigo-200 hover:shadow-[0_20px_60px_rgba(99,102,241,0.06)]",
      glowBg: "radial-gradient(circle at 70% 30%, rgba(99,102,241,0.04), transparent 60%)",
      iconBg: "bg-indigo-50/50",
      iconBorder: "border-indigo-100/30",
      iconBgHover: "group-hover:bg-indigo-50 group-hover:border-indigo-200",
      iconColor: "text-indigo-600",
      iconColorHover: "group-hover:text-indigo-700",
      iconTransform: "group-hover:scale-110 group-hover:rotate-[5deg]",
      linkHoverColor: "group-hover:text-indigo-600"
    },
    {
      icon: Zap,
      title: "Application Workspace",
      desc: "Keep applications and preparation together while the browser extension is paused.",
      hoverClass: "hover:border-cyan-200 hover:shadow-[0_20px_60px_rgba(6,182,212,0.06)]",
      glowBg: "radial-gradient(circle at 70% 30%, rgba(6,182,212,0.04), transparent 60%)",
      iconBg: "bg-cyan-50/50",
      iconBorder: "border-cyan-100/30",
      iconBgHover: "group-hover:bg-cyan-50 group-hover:border-cyan-200",
      iconColor: "text-cyan-600",
      iconColorHover: "group-hover:text-cyan-700",
      iconTransform: "group-hover:scale-110 group-hover:rotate-[-5deg]",
      linkHoverColor: "group-hover:text-cyan-600"
    }
  ];

  const steps = [
    { 
      icon: User, 
      badgeIcon: Check,
      title: "Create Your Profile", 
      desc: "Sign up in seconds and build your professional profile with ease.",
      time: "1 MIN"
    },
    { 
      icon: FileText, 
      badgeIcon: ArrowUp,
      title: "Connect & Analyze", 
      desc: "Upload your resume or connect LinkedIn. Our AI analyzes your skills and experience.",
      time: "2 MIN"
    },
    { 
      icon: BrainCircuit, 
      badgeIcon: Search,
      title: "Smart Matching", 
      desc: "Our AI matches you with relevant job opportunities that fit your profile and career goals.",
      time: "3 MIN"
    },
    { 
      icon: Rocket, 
      badgeIcon: null,
      title: "Apply Faster", 
      desc: "Prepare tailored resumes and cover letters, then track each application.",
      time: "1 MIN"
    }
  ];

  const testimonials = [
    {
      name: "Rahul Sharma",
      role: "BCA Graduate, Noida",
      content: "Got my first job offer within 2 weeks! The AI matched me perfectly.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
      tag: "Got Hired ✓",
      stars: 5
    },
    {
      name: "Priya Verma",
      role: "MBA Fresher, Delhi",
      content: "Just typed 'find marketing jobs in Delhi' and got perfect matches!",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
      tag: "5 Apps in 1 Day ✓",
      stars: 5
    },
    {
      name: "Arjun Patel",
      role: "CS Engineer, Bangalore",
      content: "The Apply with AI extension fills every form automatically!",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun",
      tag: "Saves 5hrs/week ✓",
      stars: 5
    },
    {
      name: "Sneha Gupta",
      role: "Data Analyst, Pune",
      content: "Had 3 job offers in a month. The mock interview AI prepared me better than any coaching class.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sneha",
      tag: "3 Offers ✓",
      stars: 5
    },
    {
      name: "Vikram Singh",
      role: "Full Stack Dev, Hyderabad",
      content: "The match percentage feature is brilliant. Stopped wasting time on wrong applications. Got my dream job!",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
      tag: "Dream Job ✓",
      stars: 5
    },
    {
      name: "Ananya Roy",
      role: "HR Professional, Mumbai",
      content: "Applied to 20 jobs in one day with AI. The cover letters were so good, recruiters thought I wrote them!",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya",
      tag: "10x Faster ✓",
      stars: 5
    }
  ];

  const faqs = [
    {
      q: "How does HirenextAI work?",
      a: "HirenextAI uses advanced AI to analyze your resume, skills, and experience, and then helps you create an ATS-optimized resume, find the best job matches, prepare for interviews, and even apply to jobs on your behalf."
    },
    {
      q: "Is the AI Resume Builder free?",
      a: "Yes, the basic version of our AI Resume Builder is free to use. It allows you to import details, format your layout, and check your ATS compatibility score. Advanced AI improvements and custom templates are part of our premium plans."
    },
    {
      q: "Can HirenextAI apply to jobs for me?",
      a: "Yes! Our AI assistant can automatically search and apply to jobs that match your preferences. We also offer a browser extension that autocompletes complex application forms in seconds while keeping you in control of the final submission."
    },
    {
      q: "How accurate is the ATS scoring?",
      a: "Our ATS scoring engine is trained on thousands of real job descriptions and ATS scanning algorithms. It provides a highly accurate compatibility check, scanning for keywords, formatting compatibility, and structural issues that might filter out your resume."
    },
    {
      q: "Is my data secure with HirenextAI?",
      a: "Absolutely. We take your privacy and data security very seriously. Your profile, applications, and documents are encrypted using bank-grade AES-256 encryption. We never share your personal information or sell resume data to third parties."
    },
    {
      q: "What is included in the Premium plan?",
      a: "Premium includes unlimited AI resume generation, advanced interview coaching simulations with real-time feedback, priority smart job matching, automated one-click applications, and 24/7 access to your AI Career Assistant."
    }
  ];

  const renderCard = (step, i, isActive) => {
    const stepNum = i + 1;
    const BadgeIcon = step.badgeIcon;
    return (
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6, delay: i * 0.15 }}
        onMouseEnter={() => setHoveredStep(stepNum)}
        onMouseLeave={() => setHoveredStep(null)}
        className={`relative bg-white border rounded-[24px] p-6 shadow-sm flex flex-col items-center text-center transition-all duration-300 z-10 cursor-pointer w-full ${
          isActive 
            ? "border-black ring-1 ring-black shadow-md -translate-y-1.5" 
            : "border-black/5 hover:border-black/25 hover:-translate-y-1 hover:shadow"
        }`}
      >
        {/* Icon Container */}
        <motion.div
          whileInView={{ scale: [0.85, 1] }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.15 }}
          className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 relative border transition-all duration-300 ${
            isActive ? "border-black/20 bg-neutral-50" : "border-black/5 bg-white"
          }`}
        >
          <step.icon className={`w-9 h-9 stroke-[1.25] text-black`} />
          {BadgeIcon && (
            <div className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center absolute -bottom-1 -right-1 border-2 border-white shadow-sm">
              <BadgeIcon className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </div>
          )}
        </motion.div>

        {/* Step Title */}
        <h3 className="text-xl font-bold text-black mb-2">
          {step.title}
        </h3>

        {/* Step Description */}
        <p className="text-black/60 text-sm leading-relaxed font-light mb-6">
          {step.desc}
        </p>

        {/* Clock Duration Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F5F5F5] border border-black/5 text-[10px] font-bold text-black tracking-wide mt-auto">
          <Clock className="w-3.5 h-3.5 text-black stroke-[2]" />
          <span>{step.time}</span>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', width: '100%' }} className="landing-refined bg-white text-black relative flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section
        id="home"
        style={{ paddingTop: '100px', minHeight: '100vh', overflow: 'hidden' }}
        className="relative pb-20 px-6 flex flex-col justify-center items-center z-10 bg-white"
      >
        {/* Parallax Sketch Background */}
        <motion.div
          style={{
            y: bgY,
            scale: bgScale,
            opacity: bgOpacity,
            backgroundImage: 'url("/hero-sketch.jpg")',
            backgroundSize: 'cover',
            backgroundPosition: 'center 60%',
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.95 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />

        {/* Soft elegant gradient overlays to ensure readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent z-0 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent z-0 pointer-events-none" />

        <div style={{ overflow: 'visible' }} className="max-w-7xl mx-auto text-center relative z-10 px-4">
          <motion.div
            style={{ y: heroTextY, scale: heroTextScale, opacity: heroTextOpacity }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7]/80 border border-black/5 mb-10 backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
              <span className="text-[12px] font-bold text-[#444444] tracking-widest uppercase">Next-Gen Career AI is Here</span>
            </div>

            <h1
              style={{ overflow: 'visible', clip: 'unset', maxHeight: 'none' }}
              className="text-5xl md:text-7xl premium-heading mb-8 text-black"
            >
              <span>Hire Better.</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg, #245aa1, #167765)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: 'inline'
              }}>
                {typedText}
              </span>
              <span style={{
                display: 'inline-block',
                width: '3px',
                height: '0.85em',
                background: '#444444',
                marginLeft: '4px',
                verticalAlign: 'middle',
                borderRadius: '2px',
                animation: 'cursorBlink 0.8s step-end infinite'
              }} />
            </h1>

            <p className="text-base md:text-lg text-black/80 max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
              A clearer path from preparation to your next opportunity. Build your resume, practise interviews and keep your job search in one place.
            </p>

            <div className="hero-tags"><span>Resume tools</span><span>Interview practice</span><span>One career workspace</span></div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {isValidatingSession ? (
                <div className="w-full sm:w-auto h-12 w-44 rounded-xl bg-neutral-100 animate-pulse" />
              ) : isAuthenticated && !isDemoMode && user ? (
                (user.role === 'admin' || user.role === 'owner') ? (
                  <Link to="/admin" className="w-full sm:w-auto h-12 px-8 rounded-xl bg-black text-white font-bold flex items-center justify-center hover:bg-neutral-800 hover:shadow-[0_0_30px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-300 text-sm">
                    Admin Panel
                  </Link>
                ) : (
                  <Link to="/chat" className="w-full sm:w-auto h-12 px-8 rounded-xl bg-black text-white font-bold flex items-center justify-center hover:bg-neutral-800 hover:shadow-[0_0_30px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-300 text-sm">
                    Chat Now
                  </Link>
                )
              ) : (
                <Link to="/register" className="w-full sm:w-auto h-12 px-8 rounded-xl bg-black text-white font-bold flex items-center justify-center hover:bg-neutral-800 hover:shadow-[0_0_30px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-300 text-sm">
                  Get Started for Free
                </Link>
              )}
              <button
                onClick={() => setDemoRoleModalOpen(true)}
                className="w-full sm:w-auto h-12 px-8 rounded-xl bg-black text-white border border-black font-bold flex items-center justify-center gap-3 hover:bg-neutral-800 hover:shadow-[0_0_30px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-300 text-sm"
              >
                <Play className="w-4 h-4 text-white fill-white" /> Try Live Demo
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.65, ease: "easeOut" }}
              className="mt-9 flex flex-col items-center justify-center gap-2 text-black"
            >
              <span className="text-[10px] font-bold uppercase tracking-widest text-black/60">Scroll to explore</span>
              <motion.div
                animate={{ y: [0, 6, 0] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="w-8 h-8 rounded-full border border-black/10 bg-[#F7F7F7] flex items-center justify-center"
              >
                <ChevronDown className="w-4 h-4 text-black" />
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <BrandMarquee partners={partners} />

      <section id="features" className="relative z-10 py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center"
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.04] border border-black/5 mb-4 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-black animate-pulse" />
                <span className="text-[10px] font-bold text-black/60 tracking-wider uppercase">Powered by AI</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
                Built for Excellence
              </h2>
              <p className="text-black text-base max-w-2xl mx-auto">
                Everything you need to master the modern job market, powered by state-of-the-art AI.
              </p>
            </motion.div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {featureHighlights.map((feature, i) => {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.1, ease: "easeOut" }}
                  className={`group relative bg-white border border-[#E5E7EB] rounded-[24px] p-8 transition-all duration-400 ease-in-out overflow-hidden hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.03)] ${feature.hoverClass}`}
                >
                  {/* Glow Blob */}
                  <div
                    className="glow-blob absolute -top-[50px] -right-[50px] w-[200px] h-[200px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none"
                    style={{ background: feature.glowBg }}
                  />

                  <div className="relative z-10 flex flex-col justify-between h-full w-full">
                    <div>
                      {/* Icon Container */}
                      <div className={`w-14 h-14 rounded-[14px] ${feature.iconBg} border ${feature.iconBorder} flex items-center justify-center mb-6 transition-all duration-400 ${feature.iconBgHover} ${feature.iconTransform}`}>
                        <feature.icon className={`w-6 h-6 ${feature.iconColor} transition-colors duration-400 ${feature.iconColorHover}`} />
                      </div>

                      <h3 className="text-lg font-bold mb-2 text-[#111111]">{feature.title}</h3>
                      <p className="text-[#6B7280] text-sm leading-relaxed font-light">{feature.desc}</p>
                    </div>

                    <div>
                      <Link
                        to="/features"
                        className={`mt-8 inline-flex items-center gap-1 text-[#6B7280] text-sm font-semibold transition-all duration-300 ${feature.linkHoverColor}`}
                      >
                        Learn More
                        <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section B: How It Works */}
      <section ref={worksRef} className="relative z-10 py-24 px-6 bg-white border-b border-black/5 overflow-hidden">
        {/* Dot Grid Background */}
        <div className="absolute inset-0 graph-grid-dots opacity-30 pointer-events-none z-0" />
        
        {/* Floating Ambient Dots */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div 
            className="absolute w-2.5 h-2.5 rounded-full bg-black/10"
            style={{ top: '20%', left: '12%' }}
            animate={{ y: [0, -20, 0], x: [0, 10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute w-3.5 h-3.5 rounded-full bg-black/5"
            style={{ top: '75%', left: '85%' }}
            animate={{ y: [0, 25, 0], x: [0, -15, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute w-2 h-2 rounded-full bg-black/5"
            style={{ top: '45%', right: '20%' }}
            animate={{ y: [0, -25, 0], x: [0, 15, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Header */}
          <div className="text-center mb-16">
            <FadeUp>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F5F5] border border-black/5 mb-4">
                <span className="text-[10px] font-bold text-black tracking-widest uppercase">Workflow</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-black tracking-tight mb-4">
                How HireNextAI Works
              </h2>
              <p className="text-black/60 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed">
                A practical path from preparation to application
              </p>
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <div className="w-10 h-0.5 bg-black rounded-full" />
                <div className="w-1.5 h-1.5 bg-black rounded-full" />
              </div>
            </FadeUp>
          </div>

          {/* Desktop Timeline Layout */}
          <div className="relative w-full hidden md:block">
            {/* Top Horizontal Timeline Line */}
            <div className="absolute top-[22px] left-[12.5%] right-[12.5%] h-[1.5px] bg-black/10 z-0">
              <motion.div
                style={{ width: lineWidth }}
                className="h-full bg-black origin-left"
              />
            </div>

            {/* Top Row of Circles */}
            <div className="grid grid-cols-4 gap-8 relative z-10 mb-12">
              {steps.map((step, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentActive;

                return (
                  <div key={i} className="flex flex-col items-center relative">
                    {/* Circle wrapper */}
                    <div className={`w-11 h-11 rounded-full border border-dashed flex items-center justify-center bg-white transition-all duration-300 z-10 ${
                      isActive ? "border-black shadow-sm" : "border-black/20"
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 ${
                        isActive ? "bg-black text-white" : "bg-neutral-100 text-black/40"
                      }`}>
                        {`0${stepNum}`}
                      </div>
                    </div>
                    {/* Vertical dashed connector */}
                    <div className={`w-[1px] h-12 border-l border-dashed absolute top-11 left-1/2 -translate-x-1/2 transition-all duration-300 ${
                      isActive ? "border-black/35" : "border-black/10"
                    }`} />
                  </div>
                );
              })}
            </div>

            {/* Grid of Step Cards */}
            <div className="grid grid-cols-4 gap-8 relative z-10">
              {steps.map((step, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentActive;
                return (
                  <div key={i} className="flex">
                    {renderCard(step, i, isActive)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile Timeline Layout */}
          <div className="relative w-full md:hidden pl-4 pr-2">
            {/* Left Vertical Progress Line */}
            <div className="absolute left-[31px] top-6 bottom-12 w-[1.5px] bg-black/10 z-0">
              <motion.div
                style={{ height: lineWidth }}
                className="w-full bg-black origin-top"
              />
            </div>

            {/* Vertically Stacked Steps */}
            <div className="flex flex-col gap-12 relative z-10">
              {steps.map((step, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentActive;

                return (
                  <div key={i} className="relative pl-14">
                    {/* Mobile Circle Wrapper */}
                    <div className={`absolute left-0 top-3 w-11 h-11 rounded-full border border-dashed flex items-center justify-center bg-white z-10 transition-all duration-300 ${
                      isActive ? "border-black shadow-sm" : "border-black/20"
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 ${
                        isActive ? "bg-black text-white" : "bg-neutral-100 text-black/40"
                      }`}>
                        {`0${stepNum}`}
                      </div>
                    </div>

                    {renderCard(step, i, isActive)}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Scroll Progress Bar */}
          <div className="relative w-full py-8 mt-16 max-w-5xl mx-auto px-4 md:px-12">
            <div className="absolute top-1/2 left-4 md:left-12 right-4 md:right-12 h-[1.5px] bg-black/10 -translate-y-1/2 z-0" />
            <div className="absolute top-1/2 left-4 md:left-12 right-4 md:right-12 h-[1.5px] -translate-y-1/2 z-0 origin-left">
              <motion.div
                style={{ width: lineWidth }}
                className="h-full bg-black"
              />
            </div>
            
            {/* Dot Markers & Percentage Labels */}
            <div className="relative w-full flex justify-between items-center z-10 pointer-events-none">
              {[
                { pct: "0%", activeThreshold: 0 },
                { pct: "25%", activeThreshold: 0.15 },
                { pct: "50%", activeThreshold: 0.3 },
                { pct: "75%", activeThreshold: 0.45 },
                { pct: "100%", activeThreshold: 0.58 }
              ].map((marker, idx) => {
                const markerActive = scrollProgress >= marker.activeThreshold;
                return (
                  <div key={idx} className="relative flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 border-white transition-all duration-300 ${
                      markerActive ? "bg-black scale-110" : "bg-neutral-200"
                    }`} />
                    <span className="text-[10px] font-bold text-black/50 absolute top-5 whitespace-nowrap font-mono">
                      {marker.pct}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pill Banner */}
          <div className="flex justify-center mt-14">
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#F5F5F5] border border-black/5 shadow-sm">
              <BarChart2 className="w-4 h-4 text-black rotate-90 scale-y-[-1]" />
              <span className="text-xs font-medium text-black/80">
                Prepare, practise and track your next move in one place.
              </span>
            </div>
          </div>

        </div>
      </section>

            {/* Section C: Demo Showcase & Stats */}
      <section className="relative z-10 py-24 px-6 bg-white overflow-hidden border-b border-black/5">
        {/* Subtle Tech Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

        {/* Faint City Skyline Line Art */}
        <svg className="absolute bottom-0 left-0 w-full h-[150px] text-[#8B5CF6]/5 pointer-events-none z-0" viewBox="0 0 1200 120" fill="currentColor" preserveAspectRatio="none">
          {/* Ferris Wheel */}
          <circle cx="200" cy="70" r="30" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle cx="200" cy="70" r="2" fill="currentColor" />
          <line x1="200" y1="40" x2="200" y2="100" stroke="currentColor" strokeWidth="0.8" />
          <line x1="170" y1="70" x2="230" y2="70" stroke="currentColor" strokeWidth="0.8" />
          <line x1="178.8" y1="48.8" x2="221.2" y2="91.2" stroke="currentColor" strokeWidth="0.8" />
          <line x1="178.8" y1="91.2" x2="221.2" y2="48.8" stroke="currentColor" strokeWidth="0.8" />
          <polygon points="190,120 200,70 210,120" fill="none" stroke="currentColor" strokeWidth="1" />

          {/* Suspension Bridge */}
          <line x1="850" y1="120" x2="850" y2="60" stroke="currentColor" strokeWidth="1.5" />
          <line x1="980" y1="120" x2="980" y2="60" stroke="currentColor" strokeWidth="1.5" />
          <path d="M 750 120 Q 850 60 915 90 Q 980 60 1080 120" fill="none" stroke="currentColor" strokeWidth="1.5" />
          {/* bridge cables */}
          <line x1="800" y1="120" x2="800" y2="93" stroke="currentColor" strokeWidth="0.5" />
          <line x1="915" y1="120" x2="915" y2="90" stroke="currentColor" strokeWidth="0.5" />
          <line x1="1030" y1="120" x2="1030" y2="93" stroke="currentColor" strokeWidth="0.5" />


        </svg>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row gap-16 items-center mb-20">
            {/* Left Side: Content & Feature List */}
            <div className="flex-1 max-w-xl">
              <FadeUp>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 border border-black/10 text-black text-[11px] font-bold uppercase tracking-widest mb-6">
                  <Sparkles className="w-3.5 h-3.5 fill-black text-black" />
                  Interactive Demo
                </div>
                
                <h2 className="text-4xl md:text-5xl font-black mb-6 leading-[1.15] text-black tracking-tight">
                  Experience the <br />
                  <span className="text-black">AI Advantage</span>
                </h2>
                
                <p className="text-neutral-500 text-base md:text-lg font-normal leading-relaxed mb-10">
                  From perfecting your resume to landing your dream job, our AI works 24/7 to accelerate your career.
                </p>

                {/* Features List */}
                <div className="space-y-6 mb-10">
                  {[
                    {
                      title: "AI Resume Builder",
                      desc: "Create ATS-optimized resumes that get noticed.",
                      icon: Zap
                    },
                    {
                      title: "Smart Job Matching",
                      desc: "Find jobs that perfectly match your skills.",
                      icon: Target
                    },
                    {
                      title: "AI Interview Coach",
                      desc: "Practice smarter. Answer better. Get hired.",
                      icon: MessageSquare
                    },
                    {
                      title: "Career Assistant",
                      desc: "Get guidance for every step of your journey.",
                      icon: Cpu
                    }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4 items-start group">
                      <div className="w-12 h-12 rounded-full bg-black/5 border border-black/10 flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110">
                        <item.icon className="w-5 h-5 text-black" />
                      </div>
                      <div>
                        <h4 className="text-black font-bold text-base mb-1">{item.title}</h4>
                        <p className="text-neutral-500 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CTA & Active Users */}
                <div className="flex flex-wrap items-center gap-6">
                  <button
                    onClick={() => setDemoRoleModalOpen(true)}
                    className="h-12 px-8 rounded-full bg-black hover:bg-neutral-800 text-white font-bold flex items-center justify-center gap-2 hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm group"
                  >
                    Launch Interactive Demo 
                    <Rocket className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </button>
                </div>
              </FadeUp>
            </div>

            {/* Right Side: Dashboard Mockup */}
            <div className="flex-1 w-full lg:w-auto z-10" style={{ perspective: "1000px" }}>
              <FadeUp delay={0.2}>
                <div className="relative group">
                  {/* Subtle purple aura glow */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-[#8B5CF6]/20 to-[#C084FC]/10 rounded-[2.5rem] blur-2xl opacity-40 group-hover:opacity-60 transition duration-700 pointer-events-none" />
                  
                  {/* Mockup Card */}
                  <motion.div
                    whileHover={{ rotateY: 3, rotateX: -1.5, scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    style={{ transformStyle: "preserve-3d" }}
                    className="relative bg-[#0F0F13] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row aspect-auto lg:aspect-[1.35/1] min-h-[500px]"
                  >
                    {/* Mockup Sidebar */}
                    <div className="w-full md:w-52 shrink-0 bg-[#0F0F13] border-r border-white/5 p-4 flex flex-col justify-between text-white font-sans">
                      <div>
                        {/* Logo */}
                        <div className="flex items-center gap-2 mb-6 px-2">
                          <div className="w-6 h-6 rounded-lg bg-[#8B5CF6] flex items-center justify-center">
                            <Sparkles className="w-3.5 h-3.5 text-white fill-white/30" />
                          </div>
                          <span className="font-bold text-sm tracking-tight text-white">HirenextAI</span>
                        </div>

                        {/* Menu */}
                        <nav className="space-y-1">
                          {[
                            { name: "Dashboard", icon: BarChart2, active: true },
                            { name: "Resume", icon: FileText },
                            { name: "Job Matches", icon: Target },
                            { name: "Applications", icon: Briefcase },
                            { name: "AI Coach", icon: MessageSquare },
                            { name: "Cover Letters", icon: Quote },
                            { name: "Analytics", icon: TrendingUp },
                            { name: "Settings", icon: Cpu }
                          ].map((item, index) => (
                            <div
                              key={index}
                              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
                                item.active
                                  ? "bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/10"
                                  : "text-neutral-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              <item.icon className="w-4 h-4 shrink-0" />
                              <span>{item.name}</span>
                            </div>
                          ))}
                        </nav>
                      </div>

                      {/* Upgrade to Pro Card */}
                      <div className="mt-6 bg-white/[0.03] border border-white/5 rounded-2xl p-3 text-[10px] text-neutral-400 relative overflow-hidden">
                        <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-[#8B5CF6]/10 blur-md" />
                        <h5 className="font-bold text-white mb-1">Upgrade to Pro</h5>
                        <p className="leading-snug mb-2 font-light">Unlock advanced AI features & insights.</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#8B5CF6] cursor-pointer hover:underline">Upgrade now</span>
                          <div className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center text-white cursor-pointer hover:bg-[#7C3AED]">
                            <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mockup Main Content */}
                    <div className="flex-1 bg-[#F9FAFB] p-5 flex flex-col text-neutral-800">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-neutral-200/50 mb-4">
                        <div>
                          <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-1.5">
                            Welcome back, Alex! 👋
                          </h3>
                          <p className="text-[9px] text-neutral-500">Let&apos;s get you hired.</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 relative cursor-pointer hover:bg-neutral-50">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
                          </div>
                          <div className="flex items-center gap-1 cursor-pointer">
                            <img
                              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"
                              alt="Profile"
                              className="w-6 h-6 rounded-full border border-neutral-200 object-cover"
                            />
                            <ChevronDown className="w-3 h-3 text-neutral-500" />
                          </div>
                        </div>
                      </div>

                      {/* Main Grid: 2 columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        
                        {/* Column 1 Card 1: AI Assistant */}
                        <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
                                AI Assistant
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold border border-emerald-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                              </span>
                            </div>

                            {/* Message Bubble */}
                            <div className="bg-[#8B5CF6]/5 border border-[#8B5CF6]/10 rounded-2xl p-3 text-[11px] text-neutral-700 mb-3 leading-normal">
                              Hi Alex! I analyzed your profile and found some great opportunities. Here&apos;s what I can help you with today:
                            </div>

                            {/* Interactive Typing Text Response */}
                            <div className="min-h-[36px] px-2 text-[11px] font-mono text-neutral-600 flex items-start gap-1">
                              <Bot className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0 mt-0.5" />
                              <p className="leading-relaxed">
                                {typedChatText}
                                <span className="inline-block w-1.5 h-3.5 bg-[#8B5CF6] ml-0.5 animate-pulse" />
                              </p>
                            </div>
                          </div>

                          {/* Quick Pills */}
                          <div>
                            <div className="grid grid-cols-2 gap-1.5 my-3">
                              {[
                                "Improve my resume",
                                "Find relevant jobs",
                                "Practice interview",
                                "Generate cover letter"
                              ].map((pill, idx) => (
                                <button
                                  key={idx}
                                  className="px-2 py-1.5 text-[9px] font-semibold text-neutral-600 hover:text-black bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-left transition-colors truncate"
                                >
                                  {pill}
                                </button>
                              ))}
                            </div>

                            {/* Chat Input */}
                            <div className="relative flex items-center">
                              <input
                                type="text"
                                placeholder="Ask anything..."
                                disabled
                                className="w-full bg-neutral-50 border border-neutral-200/80 rounded-xl py-2 pl-3 pr-10 text-[10px] text-neutral-500 cursor-not-allowed"
                              />
                              <button className="absolute right-1.5 w-6 h-6 rounded-lg bg-[#8B5CF6] text-white flex items-center justify-center font-bold hover:bg-[#7C3AED] transition-colors">
                                <span className="text-[10px]">&gt;</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Column 2 Card 1: Resume Score */}
                        <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-neutral-900 block mb-3">Resume Score</span>
                            
                            {/* Circular Gauge */}
                            <div className="flex flex-col items-center justify-center my-2">
                              <div className="relative w-24 h-24 flex items-center justify-center">
                                {/* SVG Ring */}
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke="#F3E8FF"
                                    strokeWidth="8"
                                  />
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    stroke="#8B5CF6"
                                    strokeWidth="8"
                                    strokeDasharray={251.2}
                                    strokeDashoffset={251.2 - (251.2 * atsScore) / 100}
                                    strokeLinecap="round"
                                    style={{ transition: "stroke-dashoffset 0.1s ease-out" }}
                                  />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                  <span className="text-xl font-extrabold text-neutral-950">{atsScore}%</span>
                                  <span className="text-[7px] font-bold text-neutral-400 uppercase tracking-wider">ATS Friendly</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="text-center">
                            <p className="text-[9px] text-neutral-500 font-medium mb-2">
                              Your resume is exceptionally strong!
                            </p>
                            <span className="text-[9px] font-bold text-[#8B5CF6] hover:underline cursor-pointer flex items-center justify-center gap-1">
                              View Full Analysis <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>

                        {/* Column 1 Card 2: Top Job Matches */}
                        <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-neutral-900">Top Job Matches</span>
                            <span className="text-[9px] text-[#8B5CF6] font-bold cursor-pointer hover:underline">View all</span>
                          </div>

                          {/* Jobs list showing sequentially */}
                          <div className="space-y-2">
                            {[
                              {
                                company: "Google",
                                role: "Senior Product Designer",
                                loc: "Google • Remote",
                                match: "98% Match",
                                logo: (
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.73 0 3.3.63 4.5 1.675l2.45-2.45C17.43 1.643 14.99 1 12.24 1 6.59 1 2 5.59 2 11.24s4.59 10.24 10.24 10.24c5.9 0 10.24-4.14 10.24-10.24 0-.69-.08-1.35-.22-1.955H12.24z" fill="#EA4335" />
                                  </svg>
                                )
                              },
                              {
                                company: "Notion",
                                role: "UI/UX Designer",
                                loc: "Notion • Remote",
                                match: "95% Match",
                                logo: (
                                  <svg className="w-4 h-4 text-black" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M4.2 3h15.6c.7 0 1.2.5 1.2 1.2v15.6c0 .7-.5 1.2-1.2 1.2H4.2C3.5 21 3 20.5 3 19.8V4.2C3 3.5 3.5 3 4.2 3zm2.4 3.6v10.8c0 .3.3.6.6.6h.6c.3 0 .6-.3.6-.6V9.4l5.1 7.7c.2.3.5.5.9.5h1.2c.3 0 .6-.3.6-.6V6.6c0-.3-.3-.6-.6-.6H15c-.3 0-.6.3-.6.6v7.4L9.3 6.3c-.2-.3-.5-.3-.9-.3H7.2c-.3 0-.6.3-.6.6z" />
                                  </svg>
                                )
                              },
                              {
                                company: "Spotify",
                                role: "Product Designer",
                                loc: "Spotify • Remote",
                                match: "93% Match",
                                logo: (
                                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.895-.98-.336.075-.668-.135-.744-.47-.077-.337.135-.668.47-.745 3.856-.88 7.15-.506 9.822 1.13.295.178.387.563.207.858zm1.225-2.72c-.227.367-.707.487-1.074.26-2.72-1.672-6.87-2.157-10.08-1.182-.413.125-.847-.107-.972-.52-.125-.413.107-.847.52-.972 3.674-1.115 8.243-.574 11.347 1.335.367.226.487.707.26 1.074zm.106-2.833C14.384 8.78 8.56 8.588 5.18 9.613c-.53.16-1.09-.14-1.25-.67-.16-.53.14-1.09.67-1.25 3.88-1.18 10.31-.96 14.39 1.46.48.28.64.9.36 1.38-.28.48-.9.64-1.38.36z" fill="#1DB954" />
                                  </svg>
                                )
                              }
                            ].map((job, idx) => {
                              const isVisible = showJobs || idx === 0;
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-200/40 transition-all duration-500 ${
                                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-lg bg-white border border-neutral-200 flex items-center justify-center shrink-0">
                                      {job.logo}
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="font-bold text-[10px] text-neutral-900 truncate leading-tight">{job.role}</h5>
                                      <p className="text-[8px] text-neutral-400 truncate">{job.loc}</p>
                                    </div>
                                  </div>
                                  <span className="text-[9px] font-extrabold text-[#8B5CF6] whitespace-nowrap bg-[#8B5CF6]/5 px-2 py-0.5 rounded-full">
                                    {job.match}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Column 2 Card 2: Application Tracker */}
                        <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                          <div>
                            <span className="text-xs font-bold text-neutral-900 block mb-2">Application Tracker</span>
                            
                            {/* Arc Gauge representation */}
                            <div className="flex justify-center items-center h-20 relative">
                              <svg className="w-24 h-24 transform -rotate-180" viewBox="0 0 100 100">
                                <path
                                  d="M 20 50 A 30 30 0 0 1 80 50"
                                  fill="none"
                                  stroke="#F3E8FF"
                                  strokeWidth="8"
                                  strokeLinecap="round"
                                />
                                <path
                                  d="M 20 50 A 30 30 0 0 1 80 50"
                                  fill="none"
                                  stroke="#8B5CF6"
                                  strokeWidth="8"
                                  strokeLinecap="round"
                                  strokeDasharray={94.2}
                                  strokeDashoffset={94.2 - (94.2 * appCount) / 12}
                                  style={{ transition: "stroke-dashoffset 0.1s ease-out" }}
                                />
                              </svg>
                              <div className="absolute top-[40%] flex flex-col items-center justify-center">
                                <span className="text-base font-black text-neutral-950 leading-none">{appCount}</span>
                                <span className="text-[6px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">Total Apps</span>
                              </div>
                            </div>
                          </div>

                          {/* Stats Legend */}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-neutral-100 pt-2 text-[9px] font-semibold text-neutral-600">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" /> Applied</span>
                              <span className="text-neutral-900">{appCount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Under Rev.</span>
                              <span className="text-neutral-900">5</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-pink-500" /> Interview</span>
                              <span className="text-neutral-900">3</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Offered</span>
                              <span className="text-neutral-900">1</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </motion.div>

                  {/* Floating notifications */}
                  <div className="absolute right-4 bottom-4 left-4 md:left-auto md:w-72 flex flex-col gap-2 z-20 pointer-events-none">
                    {[
                      {
                        title: "Resume Uploaded",
                        desc: "Your resume has been uploaded successfully.",
                        time: "2m ago",
                        icon: Check,
                        color: "bg-emerald-500 text-white"
                      },
                      {
                        title: "AI Analysis Complete",
                        desc: "We found 24 job matches for your profile.",
                        time: "3m ago",
                        icon: Sparkles,
                        color: "bg-[#8B5CF6] text-white"
                      },
                      {
                        title: "New Job Match",
                        desc: "Senior Product Designer at Google just matched!",
                        time: "5m ago",
                        icon: Briefcase,
                        color: "bg-blue-500 text-white"
                      }
                    ].map((notif, index) => {
                      const isVisible = index === notificationIdx || (index < notificationIdx);
                      return (
                        <div
                          key={index}
                          className={`bg-white/95 backdrop-blur-sm border border-neutral-200/80 rounded-2xl p-3 shadow-lg flex items-center gap-3 transition-all duration-500 pointer-events-auto transform ${
                            isVisible
                              ? "opacity-100 translate-y-0 scale-100"
                              : "opacity-0 translate-y-4 scale-95 pointer-events-none"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full ${notif.color} flex items-center justify-center shrink-0`}>
                            <notif.icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[10px] text-neutral-900">{notif.title}</span>
                              <span className="text-[8px] text-neutral-400">{notif.time}</span>
                            </div>
                            <p className="text-[9px] text-neutral-500 truncate leading-tight">{notif.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </FadeUp>
            </div>
          </div>



        </div>
      </section>

      {/* Section E: Testimonials */}
      <section id="about" className="section-wrap relative z-10 bg-white">
        <div className="text-center mb-10"><span className="eyebrow">Built around your next step</span><h2 className="text-3xl md:text-4xl font-bold tracking-tight">A little preparation goes a long way.</h2><p className="mt-4 text-slate-500 text-sm">Choose where to start. Keep moving at your own pace.</p></div>
        <div className="about-values">{[
          { icon: FileText, title: 'Tell your story clearly', text: 'Turn your experience into a focused resume and a cover letter that sounds like you.' },
          { icon: Mic, title: 'Practise before the call', text: 'Work through interview questions and build confidence explaining your skills.' },
          { icon: Briefcase, title: 'Keep your search together', text: 'Track applications and next steps without losing the details that matter.' }
        ].map(({ icon: Icon, title, text }, i) => <FadeUp key={title} delay={i * .06}><article><Icon size={26} /><h3>{title}</h3><p>{text}</p><Link to="/features" className="text-link mt-5">Explore tools <ArrowRight size={16} /></Link></article></FadeUp>)}</div>
      </section>

      <FAQSection />
      <CareerCTA />

      <Footer />

      <DemoRoleModal
        open={demoRoleModalOpen}
        onClose={() => setDemoRoleModalOpen(false)}
        onSelect={handleDemoRole}
        loading={demoLoading}
      />

      {/* Scroll to Top Button */}
      <motion.button
        onClick={scrollToTop}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: showScrollTop ? 1 : 0, 
          scale: showScrollTop ? 1 : 0.8,
        }}
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
        style={{
          position: 'fixed',
          bottom: '32px',
          right: '32px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#000000',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          pointerEvents: showScrollTop ? 'auto' : 'none',
        }}
        className="shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)] group"
        aria-label="Scroll to top"
      >
        <motion.div
          style={{ transform: 'rotate(180deg)' }}
          whileHover={{ rotate: 195 }}
          transition={{ type: "spring", stiffness: 300, damping: 10 }}
          className="flex items-center justify-center"
        >
          <ChevronDown size={24} />
        </motion.div>
      </motion.button>

      <style>{`
        .animate-blink { animation: blink 1s step-end infinite; }
        @keyframes blink { 50% { opacity: 0; } }
        .animate-gradient-x { animation: gradientShift 6s ease infinite; }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes circlePulse {
          0% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
          70% { box-shadow: 0 0 0 10px rgba(139,92,246,0); }
          100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); }
        }
        .animate-circle-pulse {
          animation: circlePulse 2s infinite;
        }

        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        
        @keyframes cursorBlink {
          0%, 100% { opacity: 1 }
          50% { opacity: 0 }
        }
        
        @keyframes marqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }


        .stat-card-custom {
          position: relative;
          background: rgba(10,10,25,0.9);
          border: 1px solid rgba(139,92,246,0.15);
          border-radius: 20px;
          padding: 28px 20px;
          text-align: center;
          width: 100%;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .stat-card-custom:hover {
          border-color: rgba(139,92,246,0.35);
          background: rgba(139,92,246,0.06);
          transform: translateY(-4px);
          box-shadow: 0 16px 32px rgba(139,92,246,0.1);
        }
        .stat-accent-line-custom {
          position: absolute;
          top: 0;
          left: 25%;
          right: 25%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent);
          transition: all 0.3s ease;
        }
        .stat-card-custom:hover .stat-accent-line-custom {
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.8), transparent);
        }
        .stat-number-custom {
          font-family: 'Syne', sans-serif;
          font-size: 38px;
          font-weight: 800;
          color: white;
          line-height: 1.1;
          letter-spacing: -1px;
        }
        .stat-label-custom {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          margin-top: 8px;
          line-height: 1.4;
        }

        .stats-trust-section::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 0%, rgba(139,92,246,0.08), transparent 42%),
            linear-gradient(180deg, rgba(255,255,255,0.015), transparent 45%, rgba(255,255,255,0.012));
          pointer-events: none;
        }

        .stats-tags-row {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 34px;
        }

        .stats-trust-tag {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 30px;
          padding: 0 13px;
          border-radius: 999px;
          border: 1px solid rgba(139,92,246,0.22);
          background: rgba(139,92,246,0.07);
          color: rgba(255,255,255,0.68);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0;
          white-space: nowrap;
          box-shadow: 0 10px 36px rgba(0,0,0,0.24);
          backdrop-filter: blur(12px);
        }

        .stats-trust-tag svg {
          color: #a78bfa;
        }

        .stats-grid-clean {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0;
        }

        .stat-clean-item {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 170px;
          padding: 4px 28px 0;
          text-align: center;
        }

        .stat-clean-item:not(:last-child)::after {
          content: "";
          position: absolute;
          right: 0;
          top: 22px;
          bottom: 14px;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.075), transparent);
        }

        .stat-icon-clean {
          width: 46px;
          height: 46px;
          border-radius: 999px;
          border: 1px solid rgba(139,92,246,0.32);
          background:
            radial-gradient(circle at 50% 35%, rgba(139,92,246,0.22), rgba(139,92,246,0.08) 58%, rgba(139,92,246,0.04));
          color: #8b5cf6;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 34px;
          cursor: pointer;
        }

        .stat-number-clean {
          font-family: 'Syne', 'Outfit', sans-serif;
          font-size: 50px;
          font-weight: 800;
          line-height: 0.95;
          letter-spacing: 0;
          color: #fff;
          margin-bottom: 13px;
          text-shadow: 0 16px 40px rgba(255,255,255,0.06);
        }

        .stat-label-clean {
          color: rgba(255,255,255,0.34);
          font-size: 11px;
          font-weight: 600;
          line-height: 1.35;
          letter-spacing: 0;
          text-transform: uppercase;
        }

        .stat-mini-tag {
          margin-top: 14px;
          color: rgba(167,139,250,0.72);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0;
        }

        @media (max-width: 900px) {
          .stats-grid-clean {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            row-gap: 42px;
          }

          .stat-clean-item:nth-child(2)::after,
          .stat-clean-item:nth-child(4)::after {
            display: none;
          }

          .stat-number-clean {
            font-size: 46px;
          }
        }

        @media (max-width: 560px) {
          .stats-trust-section {
            padding-top: 58px !important;
            padding-bottom: 60px !important;
          }

          .stats-grid-clean {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            row-gap: 36px;
          }

          .stat-clean-item {
            min-height: 148px;
            padding: 0 12px;
          }

          .stat-clean-item::after {
            display: none;
          }

          .stat-icon-clean {
            margin-bottom: 24px;
          }

          .stat-number-clean {
            font-size: 40px;
          }
        }

        @media (max-width: 340px) {
          .stats-grid-clean {
            grid-template-columns: 1fr;
          }
        }

        @keyframes reviewScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .reviews-track {
          display: flex;
          width: max-content;
        }
        .reviews-track:hover {
          animation-play-state: paused;
        }
        
        .review-card-custom {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 28px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .review-card-custom:hover {
          border-color: rgba(139,92,246,0.3);
          background: rgba(139,92,246,0.04);
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.3);
        }
        .review-badge-custom {
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.2);
          color: #86efac;
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 99px;
        }
        .review-quote-custom {
          font-size: 14px;
          line-height: 1.8;
          color: rgba(255,255,255,0.65);
          font-style: italic;
          margin: 16px 0;
        }
        
        @keyframes logoMarqueeScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .logo-marquee-track {
          display: flex;
          width: max-content;
          animation: logoMarqueeScroll 25s linear infinite;
        }
        .logo-marquee-track:hover {
          animation-play-state: paused;
        }
        
      `}</style>
    </div>
  );
}
