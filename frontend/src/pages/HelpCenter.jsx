import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Globe,
  Mail,
  MessageCircle,
  PlayCircle,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  User,
  Users,
  Zap,
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

function CountUpStat({ value }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [count, setCount] = useState(0);
  const is50k = value === "50K+";
  const isRating = value === "4.9★";

  useEffect(() => {
    if (!isInView || (!is50k && !isRating)) return undefined;

    let frameId;
    let startTime;
    const target = is50k ? 50 : 4.9;
    const duration = 1200;

    const tick = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(target * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setCount(target);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [is50k, isInView, isRating]);

  if (!is50k && !isRating) {
    return <span ref={ref}>{value}</span>;
  }

  return <span ref={ref}>{is50k ? `${Math.round(count)}K+` : `${count.toFixed(1)}★`}</span>;
}

const quickTags = ["Getting Started", "AI Tools", "Resume Tips", "Billing", "Privacy & Security", "Remote Jobs"];
const popularSearches = ["cover letter", "free plan", "resume optimizer", "cancel subscription", "remote jobs", "data security"];

const helpStats = [
  { value: "5 min", label: "Average resolution time" },
  { value: "24h", label: "Support response time" },
  { value: "50K+", label: "Users helped worldwide" },
];

const categories = [
  {
    icon: Zap,
    title: "AI Tools",
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    questions: [
      "How many AI generations do I get on the free plan?",
      "How do I generate a cover letter?",
      "Can I regenerate a cover letter?",
      "What is Resume Optimizer?",
      "How does Interview Prep AI work?",
    ],
  },
  {
    icon: Briefcase,
    title: "Job Search",
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    questions: [
      "Where do job listings come from?",
      "How do I search for remote jobs worldwide?",
      "Why am I seeing jobs from other fields?",
      "How often are jobs updated?",
      "Can I filter jobs by country or city?",
    ],
  },
  {
    icon: User,
    title: "Account & Profile",
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    questions: [
      "How do I update my skills?",
      "Can I change my email address?",
      "How do I reset my password?",
      "What is profile completion percentage?",
      "How do I delete my account?",
    ],
  },
  {
    icon: CreditCard,
    title: "Billing & Plans",
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    questions: [
      "What is included in the free plan?",
      "How do I upgrade to Pro?",
      "Can I get a refund?",
      "Will my plan auto-renew?",
      "What payment methods are accepted?",
    ],
  },
  {
    icon: Shield,
    title: "Privacy & Security",
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    questions: [
      "Is my resume data secure?",
      "Do you sell my personal data?",
      "How do I export my data?",
      "Can I delete my account and all data?",
      "Is HirenextAI GDPR compliant?",
    ],
  },
  {
    icon: BookOpen,
    title: "Getting Started",
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    questions: [
      "How do I create my first resume?",
      "What is the Demo mode?",
      "How do I set up job alerts?",
      "What features are free forever?",
      "How do I invite a friend?",
    ],
  },
];

const popularGuides = [
  {
    icon: FileText,
    title: "Write a Winning Resume",
    tag: "5 min read",
    desc: "Step-by-step guide to using AI Resume Optimizer to beat ATS filters and get more callbacks.",
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
  },
  {
    icon: Zap,
    title: "Craft the Perfect Cover Letter",
    tag: "3 min read",
    desc: "How to generate and personalise AI cover letters that match the job description every time.",
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
  },
  {
    icon: TrendingUp,
    title: "Track Your Applications",
    tag: "4 min read",
    desc: "Use the job tracker to stay organised, follow up on time, and never miss an opportunity.",
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
  },
];

const faqs = [
  { q: "How many AI generations do I get on the free plan?", a: "Free plan users get 5 AI generations per month. This resets on the 1st of each month. Upgrade to Pro for 100 generations/month, or Premium for unlimited." },
  { q: "How do I generate a cover letter?", a: "Go to AI Tools → Cover Letter Generator. Paste the job description, select your tone, and click Generate. The AI will write a personalised cover letter in seconds. You can edit, regenerate, or copy it directly." },
  { q: "Can I regenerate a cover letter?", a: "Yes — click the Regenerate button on any cover letter. Each regeneration uses 1 AI credit. Pro and Premium users get more monthly credits." },
  { q: "What is Resume Optimizer?", a: "Resume Optimizer analyses your resume against a job description and suggests improvements to beat ATS filters. It checks keyword match, formatting, and readability and gives you a score with actionable fixes." },
  { q: "How does Interview Prep AI work?", a: "Interview Prep generates likely interview questions based on the job role and your resume. It also provides model answers and tips. Available on Pro and Premium plans." },
  { q: "Where do job listings come from?", a: "HirenextAI aggregates jobs from multiple trusted global sources including JSearch, Adzuna, Remotive, LinkedIn, and our own curated database. We support job listings from 40+ countries including the US, UK, Canada, Australia, India, UAE, and more." },
  { q: "How do I search for remote jobs worldwide?", a: "Use the search bar and type your role, then select 'Remote' under the location filter. You can also filter by country, salary range, and experience level." },
  { q: "Why am I seeing jobs from other fields?", a: "This can happen if your profile skills are broad or the job title you searched matches multiple industries. Try using more specific search terms or updating your profile skills to improve relevance." },
  { q: "How often are jobs updated?", a: "Job listings are refreshed every 6–12 hours from our source APIs. New jobs appear on the platform within a few hours of being posted by employers." },
  { q: "Can I filter jobs by country or city?", a: "Yes — use the Location filter in job search to filter by country, city, or remote. You can save your preferred location in your profile settings for faster searching." },
  { q: "How do I update my skills?", a: "Go to Dashboard → Profile → Skills section. You can add, remove, or reorder skills. Keeping your skills updated helps the AI give you better job matches and resume suggestions." },
  { q: "Can I change my email address?", a: "Yes — go to Dashboard → Settings → Account. Enter your new email and verify it. Note: if you signed up with Google, your email is tied to your Google account." },
  { q: "How do I reset my password?", a: "Click 'Forgot Password' on the login page. Enter your email and we'll send a reset link. The link expires after 30 minutes for security." },
  { q: "What is profile completion percentage?", a: "Profile completion shows how complete your HirenextAI profile is. A higher percentage improves your job match quality and unlocks certain AI features. Add your resume, skills, experience, and preferences to reach 100%." },
  { q: "How do I delete my account?", a: "Go to Dashboard → Settings → Account → Delete Account. This permanently removes all your data including resume, applications, and AI history. This action cannot be undone." },
  { q: "What is included in the free plan?", a: "The free plan includes 5 AI generations per month, full job search access, basic application tracking, and resume upload. It's free forever with no credit card required." },
  { q: "How do I upgrade to Pro?", a: "Go to Dashboard → Subscription → Upgrade. Choose Pro or Premium, select monthly or annual billing, and complete payment. Upgrade takes effect immediately." },
  { q: "Can I get a refund?", a: "Yes — we offer a 48-hours money-back guarantee on all paid plans. Contact support within 48 hours of payment and we'll process a full refund, no questions asked." },
  { q: "Will my plan auto-renew?", a: "Yes, all paid plans auto-renew at the end of each billing period. You can cancel anytime from Dashboard → Subscription and your plan stays active until the end of the period." },
  { q: "What payment methods are accepted?", a: "We accept all major credit and debit cards (Visa, Mastercard, Amex) via Stripe. UPI and other local payment methods are coming soon." },
  { q: "Is my resume data secure?", a: "Yes — all uploaded resumes and personal data are encrypted at rest using AES-256 and in transit using TLS. Only you can access your resume data." },
  { q: "Do you sell my personal data?", a: "Never. We do not sell, rent, or share your personal data with third parties for marketing purposes. Your data is yours, period." },
  { q: "How do I export my data?", a: "Go to Dashboard → Settings → Privacy → Export Data. You'll receive a downloadable file of all your data including profile, applications, and AI history within 24 hours." },
  { q: "Can I delete my account and all data?", a: "Yes — go to Dashboard → Settings → Account → Delete Account. All your data is permanently deleted within 30 days per our data retention policy." },
  { q: "Is HirenextAI GDPR compliant?", a: "Yes — HirenextAI is GDPR compliant. You have the right to access, correct, export, or delete your personal data at any time. Contact support@hirenextai.com for any data requests." },
  { q: "How do I create my first resume?", a: "Go to Dashboard → Resume → Create New. You can build from scratch using our AI-guided form, upload an existing PDF, or import from LinkedIn. The AI will suggest improvements automatically." },
  { q: "What is the Demo mode?", a: "Demo mode lets you explore HirenextAI without creating an account. Click 'Try Demo' on the login page. You'll see sample data across the dashboard. Some actions will prompt you to sign up." },
  { q: "How do I set up job alerts?", a: "Go to Job Search → Save Search → Enable Alerts. Enter your keywords, location, and frequency (daily or weekly). Alerts are sent to your registered email." },
  { q: "What features are free forever?", a: "Job search, basic application tracking, resume upload, and 5 AI generations per month are free forever. No credit card required to start." },
  { q: "How do I invite a friend?", a: "Go to Dashboard → Referrals. Share your unique referral link. When your friend signs up and uses HirenextAI, you both get bonus AI credits." },
  { q: "Is HirenextAI free to use?", a: "Yes — HirenextAI has a free plan that includes 5 AI generations per month, job search, and basic application tracking. Upgrade to Pro or Premium for more AI credits, unlimited tracking, and priority support." },
  { q: "What is the ATS Score Checker?", a: "The ATS Score Checker analyses your resume against a job description and gives it a score based on keyword match, formatting, and readability. It tells you exactly what to fix to pass automated screening systems used by most companies." },
  { q: "Can I use HirenextAI on mobile?", a: "Yes — HirenextAI is fully responsive and works on all modern browsers on mobile and desktop. A dedicated mobile app is on our roadmap for later this year." },
  { q: "What countries are supported?", a: "HirenextAI works for job seekers in 40+ countries. Our job listings cover major markets including the US, UK, Canada, Australia, India, UAE, Germany, Singapore, and more. AI tools work for any country and language." },
  { q: "Is my data safe?", a: "Yes. We encrypt all personal data at rest and in transit. We never sell your data to third parties. You can export or delete your data at any time from your profile settings." },
  { q: "How do I cancel my subscription?", a: "Go to Dashboard → Subscription → click 'Cancel Plan'. Your plan remains active until the end of your billing period. No questions asked." },
];

export default function HelpCenter() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const filteredFaqs = faqs.filter(f =>
    f.q.toLowerCase().includes(search.toLowerCase()) ||
    f.a.toLowerCase().includes(search.toLowerCase())
  );
  const displayFaqs = search ? filteredFaqs : showAll ? faqs : faqs.slice(0, 5);

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', width: '100%' }} className="bg-background relative">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-60px] left-[20%] w-[600px] h-[600px] rounded-full bg-[#F7F7F7] blur-[160px]" />
        <div className="absolute bottom-[10%] right-[-60px] w-[400px] h-[400px] rounded-full bg-[#F7F7F7] blur-[130px]" />
      </div>
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#F7F7F7] blur-[120px]" />
      </div>

      <Navbar />

      {/* Hero */}
      <section className="relative z-10 pt-40 pb-16 px-6 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] mb-6"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span className="text-[#222222] text-sm">Support & Guides</span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-extrabold mb-4 text-black"
        >
          Help <span className="text-gradient">Center</span>
        </motion.h1>
        <p className="text-[#555555] mb-10 text-lg font-light">Find answers, explore guides, and get support for HirenextAI — we're here to help you land your dream job.</p>

        {/* Search */}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#888888]" />
          <input
            type="text"
            placeholder="Search for help (e.g. 'cover letter', 'billing', 'remote jobs')…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={() => setIsFocused(true)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            className="w-full bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl pl-12 pr-6 py-4 text-black placeholder:text-[#888888] focus:outline-none focus:border-white focus:bg-[#F7F7F7] transition-all text-sm"
          />
          {isFocused && !search && (
            <div className="absolute top-full left-0 right-0 mt-3 z-20 bg-background border border-[#E0E0E0] rounded-2xl p-4 flex flex-wrap gap-2">
              {popularSearches.map((tag) => (
                <div
                  key={tag}
                  onClick={() => setSearch(tag)}
                  className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-full text-[#666666] text-xs px-3 py-1.5 cursor-pointer hover:text-[#222222] transition-colors"
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>
        {!search && (
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {quickTags.map((tag) => (
              <motion.div
                key={tag}
                whileHover={{ scale: 1.05, y: -2 }}
                onClick={() => setSearch(tag)}
                className="bg-[#F7F7F7] border border-[#E0E0E0] rounded-full text-[#666666] text-xs px-3 py-1.5 cursor-pointer hover:text-[#222222] transition-colors"
              >
                {tag}
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Stats */}
      {!search && (
        <FadeUp className="relative z-10 max-w-2xl mx-auto py-4 px-6">
          <div className="grid grid-cols-3 gap-4">
            {helpStats.map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.04 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="glass-card p-5 text-center"
              >
                <p className="text-2xl font-display font-extrabold text-black">{stat.value}</p>
                <p className="text-xs text-[#777777] mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </FadeUp>
      )}

      {/* Categories */}
      {!search && (
        <FadeUp>
          <section className="relative z-10 py-8 px-6 max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {categories.map((cat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
                  whileHover={{ y: -4 }}
                  className="glass-card p-6 relative"
                >
                  <span className="absolute top-5 right-5 bg-[#F7F7F7] border border-[#E0E0E0] text-[#888888] text-[10px] rounded-full px-2 py-0.5">
                    {cat.questions.length} questions
                  </span>
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${cat.bg}`}>
                    <cat.icon className={`w-5 h-5 ${cat.color}`} />
                  </div>
                  <h3 className="font-semibold text-black mb-3">{cat.title}</h3>
                  <ul className="space-y-2">
                    {cat.questions.map((q, j) => (
                      <li key={j} onClick={() => { setSearch(q); setOpenFaq(0); }} className="flex items-start gap-2 text-sm text-[#666666] hover:text-[#222222] cursor-pointer transition-colors font-light">
                        <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#888888]" />
                        {q}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </section>
        </FadeUp>
      )}

      {/* Popular Guides */}
      {!search && (
        <section className="relative z-10 py-12 px-6 max-w-6xl mx-auto">
          <FadeUp className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] mb-6">
              <PlayCircle className="w-4 h-4 text-black" />
              <span className="text-[#222222] text-sm">Quick Guides</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-black text-center mb-8">Most Helpful Articles</h2>
          </FadeUp>
          <div className="grid md:grid-cols-3 gap-5">
            {popularGuides.map((guide, index) => (
              <FadeUp key={guide.title} delay={index * 0.1}>
                <motion.div
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="p-6 glass-card hover-glow"
                >
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-4 ${guide.bg}`}>
                    <guide.icon className={`w-5 h-5 ${guide.color}`} />
                  </div>
                  <h3 className="font-semibold text-black mb-2">{guide.title}</h3>
                  <span className="bg-[#F7F7F7] border border-[#E0E0E0] text-[#888888] text-[10px] rounded-full px-2 py-0.5 inline-block mb-3">
                    {guide.tag}
                  </span>
                  <p className="text-sm text-[#666666] font-light leading-relaxed">{guide.desc}</p>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </section>
      )}

      {/* FAQs */}
      <FadeUp>
        <section className="relative z-10 py-12 px-6 max-w-3xl mx-auto">
          <h2 className="text-2xl font-display font-bold mb-8 text-center text-black">
            {search ? `Results for "${search}"` : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-3">
            {displayFaqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-card overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                >
                  <span className="text-sm font-medium text-black">{faq.q}</span>
                  <motion.div
                    animate={{ rotate: openFaq === i ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 ml-4"
                  >
                    <ChevronRight className="w-4 h-4 text-[#777777]" />
                  </motion.div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-[#555555] leading-relaxed border-t border-[#E0E0E0] pt-4 font-light">
                    {faq.a}
                  </div>
                )}
              </motion.div>
            ))}
            {search && filteredFaqs.length === 0 && (
              <div className="text-center py-12 text-[#777777] font-light">
                No results found. Try a different search term.
              </div>
            )}
          </div>
          {!search && (
            <div className="text-center mt-6">
              <button onClick={() => setShowAll(!showAll)} className="btn-secondary">
                {showAll ? "Show less ↑" : `View all ${faqs.length} FAQs →`}
              </button>
            </div>
          )}
        </section>
      </FadeUp>

      {/* Contact CTA */}
      <FadeUp>
        <section className="relative z-10 py-16 px-6 max-w-3xl mx-auto text-center">
          <div className="glass-card p-10">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
            >
              <div className="w-12 h-12 rounded-xl bg-[#F7F7F7] border border-[#E0E0E0] flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-black" />
              </div>
            </motion.div>
            <h3 className="text-xl font-bold mb-2 text-black">Still need help?</h3>
            <p className="text-[#666666] mb-6 text-sm font-light">Can't find what you need? Our support team is real humans who actually care — typically responding within 24 hours.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/contact" className="btn-primary py-3 px-8 inline-flex items-center gap-2 text-black">
                Contact Support
              </Link>
              <a href="mailto:support@hirenextai.com" className="btn-secondary py-3 px-8 inline-flex items-center gap-2 text-black">
                <Mail className="w-4 h-4" /> Email Us
              </a>
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {["Typically replies in 24h", "Real human support", "Free for all users"].map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 text-black/35 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-black" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>
      </FadeUp>

      <Footer />
    </div>
  );
}
