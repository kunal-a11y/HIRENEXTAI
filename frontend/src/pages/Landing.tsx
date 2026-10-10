import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValue } from "framer-motion";
import {
  Sparkles, Zap, BrainCircuit, Target, Briefcase, ArrowRight,
  Star, Users, TrendingUp, Cpu, Rocket, FileText, Bot, UserPlus,
  UserCircle, ChevronDown, Quote, Check, Play, LogIn, Link as LinkIcon, MessageSquare, Mic,
  ChevronLeft, ChevronRight, Plus, Minus, HelpCircle, Mail, Headphones, ShieldCheck, Clock, Send,
  Calendar, Trophy
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useDemoStore } from "@/store/demo";
import { DemoRoleModal } from "@/components/DemoRoleModal";

/* ── Cycling Typing effect hook ─────────────────────────────────────────── */
function useCyclingTypingText(phrases: string[], typeSpeed = 45, deleteSpeed = 25, delayComplete = 2000) {
  const [displayedText, setDisplayedText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting) {
      if (displayedText.length < currentPhrase.length) {
        timer = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length + 1));
        }, typeSpeed);
      } else {
        timer = setTimeout(() => {
          setIsDeleting(true);
        }, delayComplete);
      }
    } else {
      if (displayedText.length > 0) {
        timer = setTimeout(() => {
          setDisplayedText(currentPhrase.slice(0, displayedText.length - 1));
        }, deleteSpeed);
      } else {
        setIsDeleting(false);
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayedText, isDeleting, phraseIndex, phrases, typeSpeed, deleteSpeed, delayComplete]);

  return displayedText;
}

/* ── Section fade-up wrapper ─────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
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
function Counter({ value, suffix = "" }: { value: string; suffix?: string }) {
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

    </span>
  );
}

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

interface TestimonialProps {
  name: string;
  role: string;
  avatar: string;
  tag: string;
  stars: number;
  quote: string;
  atsScore: number;
  appsCount: number;
  status: string;
  company: string;
  logo: keyof typeof CompanyLogos;
}

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
}: TestimonialProps) {
  const cardRef = useRef<HTMLDivElement>(null);
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

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
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
  const { enableDemo } = useDemoStore();
  const [, setLocation] = useLocation();
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoRoleModalOpen, setDemoRoleModalOpen] = useState(false);
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
  const y2 = useTransform(scrollY, [0, 1000], [0, -100]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;
    setMousePos({ x, y });
  };
  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  const carouselRef = useRef<HTMLDivElement>(null);
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

  const handleGoToSlide = (idx: number) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollTo({
      left: idx * el.clientWidth,
      behavior: "smooth"
    });
  };

  const [activeStep, setActiveStep] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [liveUsers, setLiveUsers] = useState<number>(
    Math.floor(Math.random() * 121) + 180
  );

  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(() => {
      setActiveStep(prev => (prev % 4) + 1);
    }, 1500);
    return () => clearInterval(interval);
  }, [isHovered]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 80);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveUsers(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const next = prev + change;
        return Math.min(350, Math.max(150, next));
      });
    }, Math.random() * 5000 + 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  const phrases = [
    "Smarter — Not Harder",
    "Find Jobs with AI",
    "Apply in One Click", 
    "Land Your Dream Job",
    "50+ Countries. One Platform."
  ];
  const typedText = useCyclingTypingText(phrases);

  const handleDemoRole = () => {
    setDemoRoleModalOpen(false);
    setLocation("/demo");
  };

  const featureHighlights = [
    {
      icon: FileText,
      title: "AI Resume Builder",
      desc: "Craft a professional, ATS-friendly resume in minutes with our intelligent editor.",
      hoverClass: "hover:border-[rgba(99,102,241,0.5)] hover:bg-[rgba(99,102,241,0.06)] hover:shadow-[0_20px_60px_rgba(99,102,241,0.15)]",
      glowBg: "radial-gradient(circle, rgba(99,102,241,0.15), transparent)",
      iconBgHover: "group-hover:bg-[rgba(99,102,241,0.15)] group-hover:border-[rgba(99,102,241,0.3)]",
      iconColorHover: "group-hover:text-[#818CF8]",
      iconTransform: "group-hover:scale-110 group-hover:rotate-[5deg]",
      linkHoverColor: "group-hover:text-[#818CF8]"
    },
    {
      icon: Mic,
      title: "Interview Prep AI",
      desc: "Practice with realistic AI mock interviews and get instant feedback on your performance.",
      hoverClass: "hover:border-[rgba(139,92,246,0.5)] hover:bg-[rgba(139,92,246,0.06)] hover:shadow-[0_20px_60px_rgba(139,92,246,0.15)]",
      glowBg: "radial-gradient(circle, rgba(139,92,246,0.15), transparent)",
      iconBgHover: "group-hover:bg-[rgba(139,92,246,0.15)] group-hover:border-[rgba(139,92,246,0.3)]",
      iconColorHover: "group-hover:text-[#A78BFA]",
      iconTransform: "group-hover:scale-110 group-hover:rotate-[-5deg]",
      linkHoverColor: "group-hover:text-[#A78BFA]"
    },
    {
      icon: Target,
      title: "Job Match AI",
      desc: "Our neural matching engine finds roles that perfectly align with your skills and goals.",
      hoverClass: "hover:border-[rgba(16,185,129,0.5)] hover:bg-[rgba(16,185,129,0.06)] hover:shadow-[0_20px_60px_rgba(16,185,129,0.15)]",
      glowBg: "radial-gradient(circle, rgba(16,185,129,0.15), transparent)",
      iconBgHover: "group-hover:bg-[rgba(16,185,129,0.15)] group-hover:border-[rgba(16,185,129,0.3)]",
      iconColorHover: "group-hover:text-[#34D399]",
      iconTransform: "group-hover:scale-110 group-hover:rotate-[5deg]",
      linkHoverColor: "group-hover:text-[#34D399]"
    }
  ];

  const steps = [
    { icon: LogIn, title: "Sign In", desc: "Create your free account in seconds" },
    { icon: LinkIcon, title: "Connect Accounts", desc: "Link your LinkedIn and Indeed accounts" },
    { icon: MessageSquare, title: "Chat with AI", desc: "Tell AI what job you want to find" },
    { icon: Zap, title: "Apply with AI", desc: "AI fills forms and applies for you" }
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

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[100vh] pt-40 pb-20 px-6 flex flex-col justify-center items-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 graph-grid opacity-20" />
          <div className="absolute inset-0 graph-grid-dots opacity-40" />
          <motion.div style={{ y: y1 }} className="absolute top-[-10%] left-[10%] w-[800px] h-[800px] rounded-full bg-primary/10 blur-[150px] animate-pulse" />
          <motion.div style={{ y: y2 }} className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-purple-600/10 blur-[130px] animate-pulse" />
          
          {/* Animated Graph Lines */}
          <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <motion.path
              d="M 0 500 Q 250 400 500 500 T 1000 500"
              fill="none"
              stroke="url(#gradient)"
              strokeWidth="2"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="transparent" />
                <stop offset="50%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] mb-10 backdrop-blur-md"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[12px] font-bold text-white/70 tracking-widest uppercase">Next-Gen Career AI is Here</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl premium-heading mb-8"
          >
            Hire Better. <br />
            <span className="inline-flex min-h-[1.15em] min-w-[22ch] max-w-full items-center justify-center whitespace-normal text-center">
              <span className="animate-gradient-x bg-gradient-to-r from-primary via-purple-400 to-indigo-400 bg-[length:200%_200%] bg-clip-text text-transparent">
                {typedText}
              </span>
              <span style={{
                display: 'inline-block',
                width: '3px',
                height: '0.9em',
                background: '#8B5CF6',
                marginLeft: '2px',
                verticalAlign: 'middle',
                animation: 'cursorBlink 1s step-end infinite'
              }} />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-base md:text-lg text-white/50 max-w-2xl mx-auto mb-10 font-light leading-relaxed"
          >
            The AI-powered platform designed to craft perfect applications, optimize resumes for ATS, and streamline recruiting for the modern workforce.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/register" className="w-full sm:w-auto h-12 px-8 rounded-xl bg-primary text-white font-bold flex items-center justify-center hover:shadow-[0_0_40px_rgba(139,92,246,0.4)] hover:-translate-y-0.5 transition-all duration-300 text-sm">
              Get Started for Free
            </Link>
            <button
              onClick={() => setDemoRoleModalOpen(true)}
              className="w-full sm:w-auto h-12 px-8 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white font-bold flex items-center justify-center gap-3 hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 text-sm"
            >
              <Play className="w-4 h-4 text-primary fill-primary" /> Try Live Demo
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.95, ease: "easeOut" }}
            className="mt-9 flex flex-col items-center justify-center gap-2 text-white/35"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
              className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.03] flex items-center justify-center"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Marquee Strip 1 */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '16px 0',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          fontSize: '11px',
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.25)',
          padding: '0 24px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontWeight: '700',
          borderRight: '1px solid rgba(255,255,255,0.08)'
        }}>
          SUPPORTED BY:
        </div>
        <div className="marquee-container" style={{ overflow: 'hidden', display: 'flex', flexGrow: 1, width: '100%' }}>
          <div className="marquee-track" style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'marqueeScroll 20s linear infinite' }}>
            {['LinkedIn', 'Indeed', 'Naukri', 'Glassdoor', 'Internshala', 'Monster'].map((item, idx) => (
              <span key={idx} className="marquee-item" style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.25)', padding: '0 32px', whiteSpace: 'nowrap', letterSpacing: '0.05em', transition: 'color 0.2s', cursor: 'default' }}>
                {item}
              </span>
            ))}
            {['LinkedIn', 'Indeed', 'Naukri', 'Glassdoor', 'Internshala', 'Monster'].map((item, idx) => (
              <span key={`dup-${idx}`} className="marquee-item" style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.25)', padding: '0 32px', whiteSpace: 'nowrap', letterSpacing: '0.05em', transition: 'color 0.2s', cursor: 'default' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
      <section id="features" className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center justify-center"
            >
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                <h2 className="text-2xl md:text-4xl font-bold bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">
                  Built for Excellence
                </h2>
              </div>
              <p className="text-white/40 text-base max-w-2xl mx-auto">
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
                  transition={{ duration: 0.7, delay: i * 0.15, ease: "easeOut" }}
                  className={`group relative bg-white/[0.02] border border-white/[0.06] rounded-[20px] p-8 transition-all duration-400 ease-in-out overflow-hidden hover:-translate-y-2 ${feature.hoverClass}`}
                >
                  {/* Glow Blob */}
                  <div 
                    className="glow-blob absolute -top-[50px] -right-[50px] w-[200px] h-[200px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" 
                    style={{ background: feature.glowBg }}
                  />
                  
                  <div className="relative z-10 flex flex-col justify-between h-full w-full">
                    <div>
                      {/* Icon Container */}
                      <div className={`w-14 h-14 rounded-[14px] bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-6 transition-all duration-400 ${feature.iconBgHover} ${feature.iconTransform}`}>
                        <feature.icon className={`w-6 h-6 text-white/40 transition-colors duration-400 ${feature.iconColorHover}`} />
                      </div>
                      
                      <h3 className="text-lg font-bold mb-2 text-white">{feature.title}</h3>
                      <p className="text-white/40 text-sm leading-relaxed font-light">{feature.desc}</p>
                    </div>
                    
                    <div>
                      <Link 
                        href="/features" 
                        className={`mt-8 inline-flex items-center gap-1 text-white/30 text-sm font-semibold transition-all duration-300 ${feature.linkHoverColor}`}
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

      {/* Marquee Strip 2 */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '16px 0',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          fontSize: '11px',
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.25)',
          padding: '0 24px',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontWeight: '700',
          borderRight: '1px solid rgba(255,255,255,0.08)'
        }}>
          SUPPORTED BY:
        </div>
        <div className="marquee-container" style={{ overflow: 'hidden', display: 'flex', flexGrow: 1, width: '100%' }}>
          <div className="marquee-track" style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'marqueeScroll 20s linear infinite' }}>
            {['LinkedIn', 'Indeed', 'Naukri', 'Glassdoor', 'Internshala', 'Monster'].map((item, idx) => (
              <span key={idx} className="marquee-item" style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.25)', padding: '0 32px', whiteSpace: 'nowrap', letterSpacing: '0.05em', transition: 'color 0.2s', cursor: 'default' }}>
                {item}
              </span>
            ))}
            {['LinkedIn', 'Indeed', 'Naukri', 'Glassdoor', 'Internshala', 'Monster'].map((item, idx) => (
              <span key={`dup-${idx}`} className="marquee-item" style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255,255,255,0.25)', padding: '0 32px', whiteSpace: 'nowrap', letterSpacing: '0.05em', transition: 'color 0.2s', cursor: 'default' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Section B: How It Works */}
      <section className="relative z-10 py-20 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <FadeUp>
              <h2 className="text-2xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-white/40 text-base max-w-2xl mx-auto">
                Four simple steps to transform your career path.
              </p>
            </FadeUp>
          </div>

          {/* Mobile view: Stacked vertical grid */}
          <div className="relative w-full block md:hidden">
            <div className="grid grid-cols-1 gap-12 relative z-10">
              {steps.map((step, i) => {
                const stepNum = i + 1;
                const isActive = stepNum <= activeStep;
                
                return (
                  <FadeUp key={i} delay={i * 0.1}>
                    <div 
                      className="text-center cursor-pointer select-none"
                      onMouseEnter={() => {
                        setActiveStep(stepNum);
                        setIsHovered(true);
                      }}
                      onMouseLeave={() => {
                        setIsHovered(false);
                      }}
                    >
                      {/* Circle wrapper */}
                      <div 
                        className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 relative transition-all duration-300 ease-in-out ${
                          isActive 
                            ? "bg-[#8B5CF6]/20 border border-[#8B5CF6] shadow-[0_0_20px_rgba(139,92,246,0.4)] scale-110 animate-circle-pulse" 
                            : "bg-white/[0.05] border border-white/10"
                        }`}
                      >
                        {/* Step Number badge */}
                        <div 
                          className={`absolute -top-1 -right-1 w-[22px] h-[22px] rounded-full text-[11px] font-bold flex items-center justify-center transition-all duration-300 ${
                            isActive 
                              ? "bg-[#8B5CF6] text-white" 
                              : "bg-white/10 text-white/70"
                          }`}
                        >
                          {stepNum}
                        </div>
                        
                        {/* Icon */}
                        <step.icon 
                          className={`w-8 h-8 transition-colors duration-300 ${
                            isActive ? "text-[#8B5CF6]" : "text-white/40"
                          }`} 
                        />
                      </div>
                      
                      {/* Title */}
                      <h3 
                        className={`text-xl font-bold mb-3 transition-colors duration-300 ${
                          isActive ? "text-white" : "text-white/40"
                        }`}
                      >
                        {step.title}
                      </h3>
                      
                      {/* Description */}
                      <p className="text-white/35 text-sm font-light leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
          </div>

          {/* Desktop view: Redesigned horizontal timeline with lines sitting behind opaque circles */}
          <div className="relative w-full hidden md:block">
            <FadeUp>
              <div style={{ position: 'relative' }}>
                
                {/* CIRCLES ROW */}
                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  position: 'relative',
                  marginBottom: '24px',
                  paddingLeft: '10%',
                  paddingRight: '10%'
                }}>
                  
                  {/* Gray base line - sits at vertical center of circles */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '10%',
                    right: '10%',
                    height: '2px',
                    background: 'rgba(255,255,255,0.08)',
                    transform: 'translateY(-50%)',
                    zIndex: 0
                  }} />
                  
                  {/* Purple active line */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '10%',
                    height: '2px',
                    background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
                    transform: 'translateY(-50%)',
                    zIndex: 1,
                    transition: 'width 0.5s ease',
                    width: activeStep === 1 ? '0%' :
                           activeStep === 2 ? '30%' :
                           activeStep === 3 ? '63%' : '80%'
                  }} />
                  
                  {/* Each circle - above the line */}
                  {steps.map((step, i) => {
                    const stepNum = i + 1;
                    const isActive = stepNum <= activeStep;
                    
                    return (
                      <div 
                        key={i}
                        onMouseEnter={() => {
                          setActiveStep(stepNum);
                          setIsHovered(true);
                        }}
                        onMouseLeave={() => {
                          setIsHovered(false);
                        }}
                        style={{ 
                          position: 'relative', 
                          zIndex: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}
                      >
                        {/* Circle */}
                        <div style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#050505',
                          backgroundImage: isActive 
                            ? 'linear-gradient(rgba(139,92,246,0.2), rgba(139,92,246,0.2))' 
                            : 'linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05))',
                          border: isActive 
                            ? '1px solid #8B5CF6' 
                            : '1px solid rgba(255,255,255,0.1)',
                          boxShadow: isActive 
                            ? '0 0 20px rgba(139,92,246,0.4)' 
                            : 'none',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}>
                          <step.icon size={28} color={
                            isActive ? '#8B5CF6' : 'rgba(255,255,255,0.3)'
                          } />
                        </div>
                        
                        {/* Number badge */}
                        <div style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background: isActive 
                            ? '#8B5CF6' 
                            : 'rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: 'white',
                          zIndex: 3
                        }}>
                          {i + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* TEXT ROW - below circles */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingLeft: '10%',
                  paddingRight: '10%'
                }}>
                  {steps.map((step, i) => {
                    const stepNum = i + 1;
                    const isActive = stepNum <= activeStep;
                    
                    return (
                      <div 
                        key={i}
                        onMouseEnter={() => {
                          setActiveStep(stepNum);
                          setIsHovered(true);
                        }}
                        onMouseLeave={() => {
                          setIsHovered(false);
                        }}
                        style={{ 
                          textAlign: 'center',
                          width: '22%'
                        }}
                      >
                        <div style={{
                          fontWeight: '700',
                          fontSize: '16px',
                          color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
                          marginBottom: '6px',
                          transition: 'color 0.3s'
                        }}>
                          {step.title}
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: 'rgba(255,255,255,0.35)',
                          lineHeight: '1.5'
                        }}>
                          {step.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </FadeUp>
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
      <section id="about" className="relative z-10 py-24 px-6 overflow-hidden bg-[#FFFFFF] text-black border-y border-[#EAEAEA]">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04] z-0 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.05" />
              </linearGradient>
            </defs>
            {/* Curved career connection network lines */}
            <path d="M -100 250 C 300 150, 400 450, 800 200 C 1200 -50, 1300 500, 1800 350" fill="none" stroke="#000000" strokeWidth="2.5" />
            <path d="M 0 550 C 450 350, 600 700, 1100 450 C 1600 200, 1500 750, 2000 600" fill="none" stroke="#000000" strokeWidth="1.5" strokeDasharray="6 6" />
            <path d="M -50 850 C 350 780, 750 920, 1200 790 C 1650 660, 1750 950, 2100 820" fill="none" stroke="#000000" strokeWidth="2" />
            
            {/* World map representation using dots */}
            <g fill="#000000" opacity="0.25">
              {/* North America dots */}
              <circle cx="250" cy="180" r="2" />
              <circle cx="280" cy="190" r="1.5" />
              <circle cx="310" cy="220" r="2.5" />
              <circle cx="330" cy="240" r="2" />
              <circle cx="360" cy="260" r="1.5" />
              <circle cx="300" cy="280" r="2.5" />
              
              {/* Europe/Africa dots */}
              <circle cx="780" cy="190" r="2" />
              <circle cx="810" cy="210" r="1.5" />
              <circle cx="830" cy="230" r="2" />
              <circle cx="800" cy="280" r="2.5" />
              <circle cx="820" cy="330" r="1.5" />
              <circle cx="850" cy="400" r="2" />
              
              {/* Asia/Australia dots */}
              <circle cx="1200" cy="230" r="2" />
              <circle cx="1230" cy="250" r="2.5" />
              <circle cx="1260" cy="280" r="1.5" />
              <circle cx="1290" cy="290" r="2" />
              <circle cx="1310" cy="320" r="2.5" />
              <circle cx="1340" cy="350" r="1.5" />
              <circle cx="1380" cy="380" r="2" />
              <circle cx="1420" cy="450" r="2.5" />
              <circle cx="1450" cy="520" r="2" />
              <circle cx="1480" cy="580" r="1.5" />
            </g>

            {/* Glowing connection node dots */}
            <circle cx="310" cy="220" r="5" fill="#000000" className="animate-ping" style={{ animationDuration: '3s' }} />
            <circle cx="310" cy="220" r="3.5" fill="#000000" />

            <circle cx="800" cy="280" r="5" fill="#000000" className="animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
            <circle cx="800" cy="280" r="3.5" fill="#000000" />

            <circle cx="1230" cy="250" r="5" fill="#000000" className="animate-ping" style={{ animationDuration: '3.5s', animationDelay: '2s' }} />
            <circle cx="1230" cy="250" r="3.5" fill="#000000" />

            <circle cx="1310" cy="320" r="5" fill="#000000" className="animate-ping" style={{ animationDuration: '4.5s', animationDelay: '0.5s' }} />
            <circle cx="1310" cy="320" r="3.5" fill="#000000" />
          </svg>
          {/* Floating tiny particles */}
          <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 bg-[#000000] rounded-full animate-bounce" style={{ animationDuration: '4s' }} />
          <div className="absolute top-2/3 right-1/4 w-2 h-2 bg-[#000000] rounded-full animate-bounce" style={{ animationDuration: '6s', animationDelay: '1s' }} />
          <div className="absolute bottom-1/5 left-1/4 w-1 h-1 bg-[#000000] rounded-full animate-bounce" style={{ animationDuration: '5s', animationDelay: '2s' }} />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Section Header */}
          <div className="text-center mb-16">
            <FadeUp>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/5 border border-black/10 mb-4 shadow-sm">
                <span className="text-[11px] font-extrabold text-black tracking-widest uppercase">⭐ USER SUCCESS STORIES</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-[#000000] tracking-tight mb-4 font-display leading-tight">
                Success Stories <br className="sm:hidden" />
                <span className="bg-gradient-to-r from-black via-neutral-800 to-neutral-700 bg-clip-text text-transparent">
                  Powered by HirenextAI
                </span>
              </h2>
              <p className="text-[#555555] text-base md:text-lg max-w-2xl mx-auto font-medium">
                Real people. Real careers. <br className="sm:hidden" /> Real results powered by AI.
              </p>
            </FadeUp>
          </div>

          {/* Animated Statistics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-20">
            {[
              { label: "Active Users", value: "50", suffix: "K+", icon: Users },
              { label: "Applications Generated", value: "120", suffix: "K+", icon: Zap },
              { label: "Interviews Prepared", value: "25", suffix: "K+", icon: Briefcase },
              { label: "Jobs Secured", value: "10", suffix: "K+", icon: Target }
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-[22px] p-5 md:p-6 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-black/30 hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="p-3 rounded-xl bg-black/5 text-black shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:bg-black/10">
                  <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-2xl md:text-3xl font-black text-[#000000] font-sans leading-none tracking-tight mb-1">
                    <Counter value={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-[10px] md:text-xs font-bold text-[#555555] tracking-wide uppercase truncate">
                    {stat.label}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Testimonial Cards Layout */}
          {/* Mobile Swipe Carousel + Desktop Grid */}
          <div className="relative">
            {/* Swipe carousel container */}
            <div 
              ref={carouselRef}
              className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 snap-x snap-mandatory scrollbar-none pb-8 md:pb-0"
              style={{
                scrollBehavior: 'smooth',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {[
                {
                  name: "Sarah Johnson",
                  role: "Product Designer",
                  company: "Google",
                  logo: "Google" as const,
                  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
                  tag: "Dream Job",
                  stars: 5,
                  quote: "HirenextAI optimized my resume and helped me receive interviews from top companies within one week.",
                  atsScore: 98,
                  appsCount: 12,
                  status: "Offer Received"
                },
                {
                  name: "Rahul Sharma",
                  role: "Frontend Developer",
                  company: "Microsoft",
                  logo: "Microsoft" as const,
                  avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
                  tag: "10x Faster",
                  stars: 5,
                  quote: "The AI Interview Coach improved my confidence and helped me clear technical rounds.",
                  atsScore: 95,
                  appsCount: 8,
                  status: "Hired"
                },
                {
                  name: "Priya Patel",
                  role: "Data Analyst",
                  company: "Amazon",
                  logo: "Amazon" as const,
                  avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80",
                  tag: "Got Hired",
                  stars: 5,
                  quote: "As a fresher I didn't know where to start. HirenextAI matched me with the perfect opportunities.",
                  atsScore: 97,
                  appsCount: 15,
                  status: "Hired"
                },
                {
                  name: "Michael Chen",
                  role: "Marketing Specialist",
                  company: "Spotify",
                  logo: "Spotify" as const,
                  avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
                  tag: "5 Apps in 1 Day",
                  stars: 5,
                  quote: "The AI tools saved me hours every week and improved every application I sent.",
                  atsScore: 96,
                  appsCount: 5,
                  status: "Offer Received"
                }
              ].map((testimonial, index) => (
                <div 
                  key={index} 
                  className="w-[calc(100vw-48px)] shrink-0 snap-center md:w-auto md:shrink md:snap-align-none"
                >
                  <TestimonialCard {...testimonial} />
                </div>
              ))}
            </div>

            {/* Mobile Carousel Indicators (Arrows & Dots) */}
            <div className="flex md:hidden items-center justify-between mt-4 px-2">
              <button 
                onClick={handlePrevSlide}
                className="w-10 h-10 rounded-full border border-[#EAEAEA] bg-[#FAFAFA] flex items-center justify-center text-black active:bg-neutral-100 transition-colors shadow-sm"
                aria-label="Previous story"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              {/* Dot Indicators */}
              <div className="flex gap-2">
                {[0, 1, 2, 3].map((idx) => (
                  <button
                    key={idx}
                    onClick={() => handleGoToSlide(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      activeSlide === idx ? 'w-6 bg-black' : 'w-2 bg-neutral-300'
                    }`}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>

              <button 
                onClick={handleNextSlide}
                className="w-10 h-10 rounded-full border border-[#EAEAEA] bg-[#FAFAFA] flex items-center justify-center text-black active:bg-neutral-100 transition-colors shadow-sm"
                aria-label="Next story"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Grayscale Company Logos Loop Marquee */}
          <div className="border-t border-[#EAEAEA] pt-14 mt-20">
            <p className="text-center text-xs font-extrabold uppercase tracking-widest text-[#555555] mb-10">
              Our users get hired at top companies
            </p>
            <div className="relative w-full overflow-hidden flex items-center">
              {/* Gradient masks for soft fade edges */}
              <div className="absolute left-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-16 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
              
              <div className="logo-marquee-track flex gap-12 md:gap-16 py-3">
                {/* Set 1 */}
                {[
                  { name: "Google", component: CompanyLogos.GoogleColored },
                  { name: "Microsoft", component: CompanyLogos.MicrosoftColored },
                  { name: "Amazon", component: CompanyLogos.AmazonColored },
                  { name: "Meta", component: CompanyLogos.MetaColored },
                  { name: "Spotify", component: CompanyLogos.SpotifyColored },
                  { name: "Notion", component: CompanyLogos.NotionColored },
                  { name: "Adobe", component: CompanyLogos.AdobeColored },
                  { name: "Salesforce", component: CompanyLogos.SalesforceColored }
                ].map((logo, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300 opacity-45 hover:opacity-100 cursor-default select-none shrink-0"
                  >
                    <logo.component />
                    <span className="font-extrabold text-sm text-[#000000] tracking-tight font-sans">{logo.name}</span>
                  </div>
                ))}
                {/* Set 2 (duplication for marquee) */}
                {[
                  { name: "Google", component: CompanyLogos.GoogleColored },
                  { name: "Microsoft", component: CompanyLogos.MicrosoftColored },
                  { name: "Amazon", component: CompanyLogos.AmazonColored },
                  { name: "Meta", component: CompanyLogos.MetaColored },
                  { name: "Spotify", component: CompanyLogos.SpotifyColored },
                  { name: "Notion", component: CompanyLogos.NotionColored },
                  { name: "Adobe", component: CompanyLogos.AdobeColored },
                  { name: "Salesforce", component: CompanyLogos.SalesforceColored }
                ].map((logo, index) => (
                  <div 
                    key={`dup-${index}`} 
                    className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all duration-300 opacity-45 hover:opacity-100 cursor-default select-none shrink-0"
                  >
                    <logo.component />
                    <span className="font-extrabold text-sm text-[#000000] tracking-tight font-sans">{logo.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Section F: FAQ */}
      <section id="faq" className="relative z-10 py-24 px-6 bg-[#FFFFFF] text-black border-b border-[#EAEAEA] overflow-hidden">
        {/* Subtle Background Effects */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#000000" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotGrid)" />
            
            {/* Curved network connection lines */}
            <path d="M -100 300 C 200 200, 300 500, 700 250 C 1100 50, 1200 600, 1700 450" fill="none" stroke="#000000" strokeWidth="1.5" />
            <path d="M 0 650 C 400 450, 500 800, 1000 550 C 1500 300, 1400 850, 1900 700" fill="none" stroke="#000000" strokeWidth="1" strokeDasharray="4 4" />
            
            {/* Network node dots */}
            <circle cx="300" cy="450" r="3" fill="#000000" />
            <circle cx="700" cy="250" r="4" fill="#000000" />
            <circle cx="1000" cy="550" r="3" fill="#000000" />
          </svg>
        </div>

        {/* Floating faint chat bubble with question mark in background */}
        <div className="absolute left-[8%] bottom-[20%] opacity-[0.035] pointer-events-none z-0 hidden lg:block">
          <div className="relative w-16 h-14 border-2 border-black rounded-[20px] bg-transparent flex items-center justify-center">
            <span className="text-2xl font-black text-black font-display">?</span>
            {/* Chat bubble tail */}
            <div className="absolute -bottom-1.5 left-5 w-3.5 h-3.5 bg-white border-r-2 border-b-2 border-black transform rotate-45" />
          </div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Centered FAQ Tag at the Top */}
          <div className="flex justify-center mb-12">
            <FadeUp>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/5 border border-black/10 text-black text-[11px] font-bold uppercase tracking-widest shadow-sm">
                <HelpCircle className="w-3.5 h-3.5" />
                FAQ
              </div>
            </FadeUp>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
            
            {/* Left Column: Heading, Badge, Support Card */}
            <div className="lg:col-span-5 flex flex-col items-start text-left">
              <FadeUp>
                {/* Small Badge Frequently Asked */}
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FAFAFA] border border-[#EAEAEA] text-[#555555] text-[10px] font-black uppercase tracking-wider mb-4">
                  ✦ Frequently Asked
                </div>
                
                <h2 className="text-3xl md:text-5xl font-black text-[#111111] tracking-tight mb-4 font-display leading-[1.1]">
                  Frequently Asked Questions
                </h2>
                <p className="text-neutral-500 text-base md:text-lg font-normal leading-relaxed mb-8">
                  Everything you need to know about HirenextAI and our AI-powered career platform.
                </p>
                
                <hr className="w-full border-[#EAEAEA] my-6" />
                
                {/* Support contact card */}
                <div className="w-full bg-[#FAFAFA] border border-[#EAEAEA] rounded-[20px] p-6 flex gap-4 items-start shadow-sm mb-6 hover:shadow-md transition-all duration-300">
                  <div className="w-10 h-10 rounded-full bg-neutral-200/50 flex items-center justify-center shrink-0">
                    <Headphones className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#111111] text-base mb-1">Still have questions?</h4>
                    <p className="text-neutral-500 text-sm mb-4 leading-relaxed">
                      Contact our support team and we'll help you within 24 hours.
                    </p>
                    <button 
                      onClick={() => window.location.href = 'mailto:support@hirenextai.com'}
                      className="h-10 px-5 rounded-full bg-black hover:bg-neutral-800 text-white font-bold flex items-center justify-center gap-1.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-300 text-xs group"
                    >
                      Contact Support
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </div>
                </div>
              </FadeUp>
            </div>
            
            {/* Right Column: Accordion FAQ Cards */}
            <div className="lg:col-span-7 space-y-4">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <FadeUp key={i} delay={i * 0.05}>
                    <div 
                      className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-[20px] overflow-hidden transition-all duration-300 hover:shadow-md hover:border-[#111111]/10 hover:-translate-y-0.5 group shadow-sm"
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : i)}
                        className="w-full text-left flex items-center justify-between p-6 transition-colors duration-300"
                      >
                        <span className="font-bold text-[#111111] text-base pr-4 leading-tight font-sans">
                          {faq.q}
                        </span>
                        
                        {/* Plus/Minus circle toggler */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isOpen ? 'bg-black text-white scale-100 rotate-180' : 'bg-transparent border border-[#EAEAEA] text-black group-hover:border-[#111111]/30'
                        }`}>
                          {isOpen ? (
                            <Minus className="w-4 h-4" />
                          ) : (
                            <Plus className="w-4 h-4 transition-transform duration-300 group-hover:rotate-90" />
                          )}
                        </div>
                      </button>
                      
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="content"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-6 pb-6 pt-1 text-[#555555] text-sm leading-relaxed border-t border-[#EAEAEA]/60 mt-1">
                              {faq.a}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </FadeUp>
                );
              })}
            </div>
            
          </div>

          {/* Bottom Section: Full Width Support Banner */}
          <FadeUp delay={0.3}>
            <div className="mt-16 bg-[#FAFAFA] border border-[#EAEAEA] rounded-[24px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center shrink-0 text-white shadow-sm">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-[#111111] text-base">Still have questions?</h4>
                  <p className="text-neutral-500 text-sm">We&apos;re here to help you succeed in your career journey.</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white border border-[#EAEAEA] rounded-2xl px-5 py-3 shadow-sm shrink-0">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-black" />
                </div>
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Email us at</div>
                  <div className="text-sm font-black text-black">support@hirenextai.com</div>
                </div>
              </div>
              
              <button 
                onClick={() => window.location.href = 'mailto:support@hirenextai.com'}
                className="h-12 px-6 rounded-full bg-black hover:bg-neutral-800 text-white font-bold flex items-center justify-center gap-2 hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all duration-300 text-sm group shrink-0"
              >
                Talk To Our Team
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          </FadeUp>
          
        </div>
      </section>

      {/* Section G: Final CTA */}
      <section 
        id="cta"
        className="relative py-28 px-6 bg-[#FFFFFF] text-black border-t border-[#EAEAEA] overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Subtle Background Effects */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.035] z-0 overflow-hidden select-none">
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* World Map Outline Coordinates */}
            <path d="M150,120 Q300,80 450,150 T750,100 T1050,180 T1350,130" fill="none" stroke="#000000" strokeWidth="1" strokeDasharray="3 6" />
            <path d="M100,220 Q400,280 700,200 T1300,250" fill="none" stroke="#000000" strokeWidth="1.5" strokeDasharray="4 8" />
            
            {/* Career network lines */}
            <path d="M 120 180 C 350 80, 500 300, 850 150 C 1150 40, 1300 280, 1480 200" fill="none" stroke="#000000" strokeWidth="1.2" />
            <path d="M 220 340 C 450 220, 600 450, 950 320 C 1250 180, 1400 400, 1550 300" fill="none" stroke="#000000" strokeWidth="1" strokeDasharray="5 5" />
            <path d="M 80 400 C 400 280, 650 480, 1000 360 C 1350 240, 1450 450, 1600 380" fill="none" stroke="#8B5CF6" strokeWidth="1.2" opacity="0.3" />
            
            {/* Abstract AI connection nodes */}
            <circle cx="350" cy="120" r="3.5" fill="#8B5CF6" />
            <circle cx="850" cy="150" r="4" fill="#000000" />
            <circle cx="850" cy="150" r="10" fill="none" stroke="#8B5CF6" strokeWidth="1" opacity="0.4" />
            <circle cx="1150" cy="100" r="3" fill="#8B5CF6" />
            <circle cx="1300" cy="240" r="4.5" fill="#000000" />
            <circle cx="1300" cy="240" r="12" fill="none" stroke="#000000" strokeWidth="1" opacity="0.2" />
            <circle cx="600" cy="380" r="3" fill="#8B5CF6" />
            <circle cx="1000" cy="360" r="4" fill="#000000" />
          </svg>
        </div>

        {/* Office Skyline Sketch at the Bottom */}
        <svg 
          className="absolute bottom-0 left-0 w-full h-[100px] pointer-events-none opacity-[0.035] select-none z-0" 
          viewBox="0 0 1440 100" 
          preserveAspectRatio="none" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M0,100 L0,70 L20,70 L20,60 L35,60 L35,70 L60,70 L60,40 L80,40 L80,100 M80,100 L80,80 L95,80 L95,30 L115,30 L115,20 L120,20 L120,30 L130,30 L130,80 L150,80 L150,100 M150,100 L150,50 L180,50 L180,100 M180,100 L180,65 L210,65 L210,100 M210,100 L210,45 L225,45 L225,15 L230,15 L230,45 L245,45 L245,100 M245,100 L245,75 L275,75 L275,100 M275,100 L275,55 L310,55 L310,100 M310,100 L310,35 L325,35 L325,5 L330,5 L330,35 L345,35 L345,100 M345,100 L345,85 L375,85 L375,100 M375,100 L375,60 L400,60 L400,100 M400,100 L400,50 L420,50 L420,100 M420,100 L420,40 L440,40 L440,25 L455,25 L455,40 L470,40 L470,100 M470,100 L470,70 L500,70 L500,100 M500,100 L500,55 L525,55 L525,20 L535,20 L535,55 L550,55 L550,100 M550,100 L550,65 L590,65 L590,100 M590,100 L590,45 L610,45 L610,100 M610,100 L610,30 L630,30 L630,15 L635,15 L635,30 L650,30 L650,100 M650,100 L650,75 L690,75 L690,100 M690,100 L690,50 L715,50 L715,100 M715,100 L715,60 L745,60 L745,100 M745,100 L745,35 L760,35 L760,5 L765,5 L765,35 L780,35 L780,100 M780,100 L780,80 L810,80 L810,100 M810,100 L810,40 L840,40 L840,100 M840,100 L840,55 L860,55 L860,100 M860,100 L860,45 L880,45 L880,25 L895,25 L895,45 L910,45 L910,100 M910,100 L910,65 L940,65 L940,100 M940,100 L940,30 L955,30 L955,10 L960,10 L960,30 L975,30 L975,100 M975,100 L975,70 L1010,70 L1010,100 M1010,100 L1010,50 L1035,50 L1035,100 M1035,100 L1035,60 L1065,60 L1065,100 M1065,100 L1065,40 L1080,40 L1080,20 L1090,20 L1090,40 L1105,40 L1105,100 M1105,100 L1105,75 L1140,75 L1140,100 M1140,100 L1140,55 L1170,55 L1170,100 M1170,100 L1170,35 L1190,35 L1190,100 M1190,100 L1190,45 L1210,45 L1210,15 L1215,15 L1215,45 L1230,45 L1230,100 M1230,100 L1230,65 L1270,65 L1270,100 M1270,100 L1270,50 L1295,50 L1295,100 M1295,100 L1295,70 L1330,70 L1330,100 M1330,100 L1330,40 L1350,40 L1350,5 L1355,5 L1355,40 L1370,40 L1370,100 M1370,100 L1370,80 L1400,80 L1400,100 M1400,100 L1400,55 L1440,55 L1440,100" 
            stroke="#000000" 
            strokeWidth="1" 
          />
        </svg>

        {/* Floating Cards (Visible only on desktop screens lg:) */}
        
        {/* Card 1: ATS Resume Score Card */}
        <motion.div 
          className="absolute left-[5%] top-[18%] z-20 hidden lg:block"
          animate={{ x: mousePos.x * -35, y: mousePos.y * -35 }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
        >
          <motion.div 
            className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-48 text-left relative overflow-hidden transition-all duration-300 hover:border-black/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-[#8B5CF6] border border-purple-100/50">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Resume Score</div>
                <div className="text-xl font-black text-black">98%</div>
                <div className="text-[9px] text-neutral-500 font-medium">ATS Optimized</div>
              </div>
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
            </div>
          </motion.div>
        </motion.div>

        {/* Card 2: AI Match Found Card */}
        <motion.div 
          className="absolute left-[4%] top-[46%] z-20 hidden lg:block"
          animate={{ x: mousePos.x * -40, y: mousePos.y * 30 }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
        >
          <motion.div 
            className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-52 text-left transition-all duration-300 hover:border-black/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white shrink-0">
                <Briefcase className="w-4.5 h-4.5 text-white fill-none" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">AI Match Found</div>
                <div className="text-sm font-black text-black">23 New Jobs</div>
                <div className="text-[9px] text-neutral-500">Matches today</div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Card 3: Interview Scheduled Card */}
        <motion.div 
          className="absolute right-[5%] top-[24%] z-20 hidden lg:block"
          animate={{ x: mousePos.x * 35, y: mousePos.y * -35 }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
        >
          <motion.div 
            className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-60 text-left transition-all duration-300 hover:border-black/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative"
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white shrink-0">
                <Calendar className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Interview Scheduled</div>
                <div className="text-xs font-black text-black mt-0.5">Tomorrow, 10:00 AM</div>
                <div className="text-[10px] text-neutral-500 mt-0.5 font-medium">Product Designer at Google</div>
              </div>
              <span className="absolute top-2.5 left-2.5 w-1.5 h-1.5 rounded-full bg-[#8B5CF6]" />
            </div>
          </motion.div>
        </motion.div>

        {/* Card 4: Offer Received Card */}
        <motion.div 
          className="absolute right-[4%] top-[50%] z-20 hidden lg:block"
          animate={{ x: mousePos.x * 40, y: mousePos.y * 30 }}
          transition={{ type: "spring", stiffness: 60, damping: 20 }}
        >
          <motion.div 
            className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-56 text-left transition-all duration-300 hover:border-black/10 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative"
            animate={{ y: [0, -11, 0] }}
            transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white shrink-0">
                <Trophy className="w-4.5 h-4.5 text-white fill-none" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Offer Received</div>
                <div className="text-xs font-black text-black mt-0.5">Congratulations!</div>
                <div className="text-[10px] text-neutral-500 mt-0.5 font-medium">UX Designer at Microsoft</div>
              </div>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-black" />
            </div>
          </motion.div>
        </motion.div>

        {/* Decorative Sparkle Stars */}
        <div className="absolute right-[18%] top-[22%] text-neutral-300 opacity-40 pointer-events-none hidden lg:block z-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z" /></svg>
        </div>
        <div className="absolute right-[12%] bottom-[38%] text-neutral-300 opacity-30 pointer-events-none hidden lg:block z-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.59 8.41L23 12L14.59 15.59L12 24L9.41 15.59L1 12L9.41 8.41Z" /></svg>
        </div>

        {/* Decorative Curved Arrow from Job Match card to stats */}
        <div className="absolute left-[17%] top-[52%] pointer-events-none hidden xl:block z-20 opacity-30">
          <svg width="60" height="50" viewBox="0 0 60 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 5 C 25 5, 35 45, 55 45" stroke="#000" strokeWidth="1.5" strokeDasharray="4 3" fill="none" />
            <path d="M 45 42 L 55 45 L 48 49" stroke="#000" strokeWidth="1.5" fill="none" />
          </svg>
        </div>

        {/* Center Content Container */}
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <FadeUp>
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#FAFAFA] border border-[#EAEAEA] text-neutral-700 text-[10px] font-black uppercase tracking-widest mb-6">
              ✦ START FOR FREE
            </div>
          </FadeUp>

          <FadeUp delay={0.1}>
            <h2 className="text-4xl md:text-5xl lg:text-[64px] font-black text-black tracking-tight leading-[1.05] max-w-3xl mx-auto mb-6 font-display">
              Ready To Transform<br />Your Career?
            </h2>
          </FadeUp>

          <FadeUp delay={0.15}>
            <p className="text-neutral-500 text-sm md:text-base lg:text-lg max-w-2xl mx-auto mb-12 font-normal leading-relaxed">
              Join thousands of professionals using AI to find better opportunities, improve resumes, and land interviews faster.
            </p>
          </FadeUp>

          {/* Stats Card Container */}
          <FadeUp delay={0.2}>
            <div className="bg-[#FAFAFA] border border-[#EAEAEA] rounded-[24px] p-6 md:p-8 max-w-3xl mx-auto mb-12 shadow-[0_8px_30px_rgba(0,0,0,0.01)] relative z-10">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-0 text-center relative">
                {[
                  { icon: Users, value: "50K+", label: "Happy Users" },
                  { icon: Send, value: "120K+", label: "Applications Sent" },
                  { icon: Calendar, value: "25K+", label: "Interviews Scheduled" },
                  { icon: Star, value: "10K+", label: "Success Stories" }
                ].map((stat, idx) => (
                  <div key={idx} className="flex flex-col items-center justify-center relative px-2 group">
                    {/* Vertical Divider for Desktop */}
                    {idx > 0 && (
                      <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-12 bg-[#EAEAEA]" />
                    )}
                    
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#EAEAEA] flex items-center justify-center text-black mb-3.5 shadow-sm transition-all duration-300 group-hover:border-black/20">
                      <stat.icon className={`w-4.5 h-4.5 text-black ${idx === 3 ? 'fill-black' : 'fill-none'}`} />
                    </div>
                    <div className="text-2xl md:text-3xl font-black text-black tracking-tight leading-none mb-1">
                      {stat.value}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-semibold tracking-wide uppercase">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>

          {/* Action Buttons */}
          <FadeUp delay={0.3}>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full max-w-md mx-auto mb-8">
              <Link 
                href="/register" 
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-black hover:bg-neutral-900 text-white font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all duration-300 shadow-sm hover:shadow-[0_0_24px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 group"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <button 
                onClick={() => setDemoRoleModalOpen(true)} 
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-neutral-50 text-black border border-[#EAEAEA] hover:border-neutral-300 font-bold text-sm md:text-base flex items-center justify-center gap-3 transition-all duration-300 hover:-translate-y-0.5 shadow-sm"
              >
                <div className="w-5 h-5 rounded-full border border-black flex items-center justify-center shrink-0">
                  <Play className="w-2 h-2 fill-black text-black translate-x-[0.5px]" />
                </div>
                Watch Demo
              </button>
            </div>
          </FadeUp>

          {/* Avatar Social Proof Row */}
          <FadeUp delay={0.35}>
            <div className="flex items-center justify-center gap-3 mb-16 relative z-10">
              <div className="flex -space-x-2.5">
                <img 
                  className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" 
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80" 
                  alt="User" 
                />
                <img 
                  className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80" 
                  alt="User" 
                />
                <img 
                  className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" 
                  src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80" 
                  alt="User" 
                />
                <div className="w-8 h-8 rounded-full bg-black border-2 border-white flex items-center justify-center text-white text-[9px] font-black shadow-sm">
                  +5K
                </div>
              </div>
              <span className="text-xs text-neutral-500 font-medium">Loved by 50,000+ job seekers worldwide</span>
            </div>
          </FadeUp>

          {/* Trust Row */}
          <FadeUp delay={0.4}>
            <div className="border-t border-[#EAEAEA]/80 pt-10 mt-16">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-0 max-w-5xl mx-auto relative z-10">
                {[
                  { label: "100% Secure", desc: "Your data is always protected", icon: ShieldCheck },
                  { label: "AI-Powered", desc: "Smart. Fast. Accurate.", icon: Cpu },
                  { label: "Save Time", desc: "Automate your job search", icon: Clock },
                  { label: "Better Results", desc: "Land your dream job faster", icon: Target }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3.5 px-4 justify-start md:justify-center relative group">
                    {/* Vertical Divider for Desktop */}
                    {idx > 0 && (
                      <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-[1px] h-8 bg-[#EAEAEA]" />
                    )}
                    <item.icon className="w-5 h-5 text-black shrink-0" />
                    <div className="text-left">
                      <div className="text-xs font-black text-black leading-none mb-0.5">{item.label}</div>
                      <div className="text-[10px] text-neutral-400 font-medium leading-none">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

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
          0% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
        }
        .animate-circle-pulse {
          animation: circlePulse 2s infinite;
        }

        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        .live-dot {
          width: 8px;
          height: 8px;
          background: #22c55e;
          border-radius: 50%;
          animation: livePulse 1.5s infinite;
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
        .marquee-item:hover {
          color: #ffffff !important;
        }

        .stat-card-custom {
          position: relative;
          background: rgba(10,10,20,0.8);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 36px 28px;
          text-align: center;
          overflow: hidden;
          transition: all 0.4s ease;
        }
        .stat-card-custom:hover {
          border-color: rgba(139,92,246,0.3);
          background: rgba(139,92,246,0.05);
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(139,92,246,0.1);
        }
        .stat-accent-line-custom {
          position: absolute;
          top: 0;
          left: 20%;
          right: 20%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.6), transparent);
          transition: all 0.4s ease;
        }
        .stat-card-custom:hover .stat-accent-line-custom {
          background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.9), transparent);
        }
        .stat-number-custom {
          font-size: 52px;
          font-weight: 900;
          color: white;
          font-family: Syne, sans-serif;
          line-height: 1;
        }
        .stat-label-custom {
          font-size: 12px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          margin-top: 8px;
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
