import { workspaceStorage } from '../../lib/workspaceStorage';
import React, { useEffect, useRef, useState } from 'react';
import useChatStore from '../../store/useChatStore';
import useUIStore from '../../store/useUIStore';
import useUserStore from '../../store/useUserStore';
import useAuthStore from '../../store/useAuthStore';
import api from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import { Puzzle, FileText, File } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Mascot from './Mascot';
import { HirenextLogo } from '../Logo';

const ALL_ACTIONS = {
  improveResume: {
    icon: '📄',
    title: 'Improve Resume',
    desc: 'Increase ATS compatibility and readability.',
    prompt: 'Improve my resume structure and increase ATS compatibility.'
  },
  generateCoverLetter: {
    icon: '✉️',
    title: 'Generate Cover Letter',
    desc: 'Create a tailored cover letter for this resume.',
    prompt: 'Generate a professional, tailored cover letter for my profile.'
  },
  findJobs: {
    icon: '💼',
    title: 'Find Matching Jobs',
    desc: 'Search roles that match your profile.',
    prompt: 'Find active job matching roles for my skills.'
  },
  mockInterview: {
    icon: '🎤',
    title: 'Mock Interview',
    desc: 'Practice with real role-specific questions.',
    prompt: 'Start a mock interview prep session.'
  },
  careerRoadmap: {
    icon: '🎯',
    title: 'Career Roadmap',
    desc: 'Build a step-by-step career path roadmap.',
    prompt: 'Create a career roadmap for me.'
  },
  recruiterMessage: {
    icon: '💬',
    title: 'Recruiter Message',
    desc: 'Draft outreach messages for hiring managers.',
    prompt: 'Draft a recruiter outreach message.'
  }
};

const ThinkingIndicator = () => {
  const steps = [
    "Reading your request...",
    "Understanding your goal...",
    "Planning the best response...",
    "Preparing recommendations..."
  ];
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start mb-6 animate-fade-in text-left">
      <div className="flex gap-3 max-w-[75%] flex-row">
        <div className="px-5 py-4 bg-[#F7F7F7] border border-[#E0E0E0] rounded-2xl rounded-tl-sm shadow-sm flex flex-col items-start min-w-[200px]">
          <div className="hirenext-logo-container text-black mb-3 select-none">
            <HirenextLogo animated={true} />
          </div>
          <div className="flex gap-3 items-center">
            <div className="w-4 h-4 border-2 border-black/10 border-t-black rounded-full animate-spin shrink-0" />
            <motion.p
              key={stepIndex}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
              className="text-xs text-neutral-600 font-bold"
            >
              {steps[stepIndex]}
            </motion.p>
          </div>
        </div>
      </div>
    </div>
  );
};

const NextBestActions = ({ text = "", onActionClick }) => {
  const textLower = text.toLowerCase();
  
  const showResumeActions = textLower.includes('resume') || textLower.includes('ats') || textLower.includes('cv');
  const showInterviewActions = textLower.includes('interview') || textLower.includes('mock') || textLower.includes('prep') || textLower.includes('question');
  const showJobActions = textLower.includes('job') || textLower.includes('hiring') || textLower.includes('role') || textLower.includes('position');

  let selectedKeys = [];
  if (showResumeActions) {
    selectedKeys = ['improveResume', 'generateCoverLetter', 'findJobs', 'careerRoadmap'];
  } else if (showInterviewActions) {
    selectedKeys = ['mockInterview', 'recruiterMessage', 'careerRoadmap', 'improveResume'];
  } else if (showJobActions) {
    selectedKeys = ['findJobs', 'generateCoverLetter', 'recruiterMessage', 'mockInterview'];
  } else {
    selectedKeys = ['improveResume', 'findJobs', 'generateCoverLetter', 'mockInterview'];
  }

  const actions = selectedKeys.map(key => ALL_ACTIONS[key]).filter(Boolean);

  return (
    <div className="mt-5 w-full max-w-xl animate-fade-in text-left">
      <div className="h-[1px] bg-neutral-100 w-full mb-4" />
      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5 select-none">
        <span>✨</span> Suggested Next Steps
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {actions.map((act, i) => (
          <button
            key={i}
            onClick={() => onActionClick(act.prompt)}
            className="p-3.5 rounded-2xl border border-[#E0E0E0] bg-white hover:bg-neutral-50 hover:border-black active:scale-[0.98] transition-all duration-200 flex flex-col gap-1 group text-left cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-sm group-hover:scale-110 transition-transform duration-150">{act.icon}</span>
              <span className="text-xs font-bold text-black uppercase tracking-wider">{act.title}</span>
            </div>
            <p className="text-[10px] text-gray-500 font-medium leading-normal mt-0.5">{act.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

const AtsScoreVisual = ({ score, label = "ATS Match Score", explanation = "" }) => {
  return (
    <div className="my-4 p-5 bg-white border border-[#E0E0E0] rounded-2xl max-w-[400px] shadow-sm text-left animate-slide-up">
      <div className="flex items-center gap-4">
        <CircularProgress value={score} label="" />
        <div className="flex-1">
          <h4 className="text-xs font-bold text-black uppercase tracking-wider">{label}</h4>
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed mt-1">{explanation}</p>
        </div>
      </div>
    </div>
  );
};

const SkillsChipsVisual = ({ chips = [] }) => {
  return (
    <div className="my-3 flex flex-wrap gap-1.5 text-left">
      {chips.map((chip, idx) => (
        <span
          key={idx}
          className="text-[10px] font-bold px-3 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-neutral-800 uppercase tracking-wider hover:bg-neutral-100 transition-colors"
        >
          {chip}
        </span>
      ))}
    </div>
  );
};

const ChecklistVisual = ({ items = [] }) => {
  return (
    <div className="my-4 p-4 border border-[#E0E0E0] bg-white rounded-2xl max-w-[450px] shadow-sm text-left">
      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Action Checklist</h5>
      <div className="space-y-2.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <span className={`w-4 h-4 rounded-md border flex items-center justify-center text-[9px] shrink-0 font-black mt-0.5 select-none ${item.done ? 'bg-black border-black text-white' : 'border-[#E0E0E0] bg-white text-transparent'}`}>
              ✓
            </span>
            <span className={`text-xs font-medium leading-relaxed ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TimelineVisual = ({ items = [] }) => {
  return (
    <div className="my-5 p-5 border border-[#E0E0E0] bg-white rounded-2xl max-w-[450px] shadow-sm text-left">
      <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Milestones Path</h5>
      <div className="relative border-l border-[#E0E0E0] ml-2 pl-6 space-y-5">
        {items.map((item, idx) => (
          <div key={idx} className="relative">
            <div className="absolute -left-[31px] top-0.5 w-2.5 h-2.5 rounded-full border border-black bg-white" />
            <h6 className="text-[11px] font-bold text-black uppercase tracking-wider">{item.title}</h6>
            <p className="text-[11px] text-gray-500 font-medium leading-relaxed mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const getDisplayName = () => {
  const stored = workspaceStorage.getItem('hirenext_displayName');
  if (stored?.trim()) return stored.trim();
  const { user } = useUserStore.getState();
  return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'You';
};

const CircularProgress = ({ value, label }) => {
  const radius = 32;
  const stroke = 5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5 shrink-0">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg height="64" width="64" className="transform -rotate-90">
          <circle
            stroke="#E5E7EB"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx="32"
            cy="32"
          />
          <circle
            stroke="#10B981"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx="32"
            cy="32"
            className="transition-all duration-1000 ease-out animate-draw-circle"
          />
        </svg>
        <span className="absolute text-[12px] font-black text-black">{value}%</span>
      </div>
      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
  );
};

const ProgressBar = ({ value, label }) => {
  const getColor = (val) => {
    if (val >= 80) return 'bg-emerald-500';
    if (val >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-1 text-[10px] font-bold">
        <span className="text-gray-500 uppercase tracking-wider">{label}</span>
        <span className="text-black">{value}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-150 rounded-full overflow-hidden">
        <div className={`h-full ${getColor(value)} transition-all duration-1000`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

const ResumeReviewCard = ({ data }) => {
  return (
    <div className="mt-3 p-5 bg-white border border-[#E0E0E0] rounded-2xl max-w-[500px] shadow-sm animate-slide-up text-left">
      <div className="flex items-center gap-2 mb-5 border-b border-gray-100 pb-3">
        <span className="text-lg">📄</span>
        <h4 className="text-[14px] font-bold text-black uppercase tracking-wider">Resume Analysis Dashboard</h4>
      </div>

      {/* Circle Dials */}
      <div className="flex justify-around items-center gap-4 mb-6 bg-neutral-50 border border-neutral-100 p-4 rounded-xl">
        <CircularProgress value={data.resumeScore || 0} label="Resume Score" />
        <CircularProgress value={data.atsScore || 0} label="ATS Score" />
      </div>

      {/* Metrics Progress Grid */}
      <div className="space-y-3.5 mb-6">
        <ProgressBar value={data.grammarScore || 0} label="Grammar & Spelling" />
        <ProgressBar value={data.keywordMatch || 0} label="Keyword Match" />
        <ProgressBar value={data.formattingScore || 0} label="Formatting & Layout" />
        <ProgressBar value={data.skillsScore || 0} label="Skills Density" />
        <ProgressBar value={data.experienceScore || 0} label="Experience Score" />
        <ProgressBar value={data.projectsScore || 0} label="Projects & Impact" />
      </div>

      {/* Missing Skills */}
      {data.missingSkills && data.missingSkills.length > 0 && (
        <div className="mb-5 border-t border-gray-50 pt-4">
          <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Recommended Skills to Add</h5>
          <div className="flex flex-wrap gap-1.5">
            {data.missingSkills.map((s, idx) => (
              <span key={idx} className="text-[9px] font-bold px-2.5 py-1 rounded-full border border-rose-200/50 bg-rose-50 text-rose-700 uppercase tracking-wider">
                + {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Achievements & Suggestions list */}
      <div className="space-y-4 border-t border-gray-50 pt-4">
        {data.achievements && data.achievements.length > 0 && (
          <div>
            <h5 className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>✓</span> Achievements Detected
            </h5>
            <ul className="space-y-1.5">
              {data.achievements.map((item, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-gray-600 font-medium leading-relaxed">
                  <span className="text-emerald-500 shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.improvements && data.improvements.length > 0 && (
          <div className="pt-3 border-t border-gray-100">
            <h5 className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>⚠️</span> Formatting Improvements
            </h5>
            <ul className="space-y-1.5">
              {data.improvements.map((item, idx) => (
                <li key={idx} className="flex gap-2 text-xs text-gray-600 font-medium leading-relaxed">
                  <span className="text-amber-500 shrink-0">⚠️</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const MemoryConsentCard = () => {
  const [responded, setResponded] = useState(false);
  const { showToast } = useUIStore();
  const handleAllow = () => {
    workspaceStorage.setItem('hirenextai_profile_memory_consent', 'true');
    const currentMemory = JSON.parse(workspaceStorage.getItem('hirenextai_profile_memory') || '{}');
    workspaceStorage.setItem('hirenextai_profile_memory', JSON.stringify({
      ...currentMemory,
      skills: 'React, Node.js, Express, JavaScript, SQL',
      jobTitle: 'Frontend Developer',
      experience: '0-1 years',
    }));
    showToast('Preferences synchronized to long-term memory! 🧠');
    setResponded(true);
  };
  return (
    <div className="mt-3 p-4 bg-white border border-[#E0E0E0] rounded-xl max-w-[400px] shadow-sm animate-slide-up text-left">
      <h4 className="text-xs font-bold text-black mb-1 flex items-center gap-1.5">
        <span className="text-sm">🧠</span> Store in Memory?
      </h4>
      <p className="text-xs text-gray-500 mb-4 font-medium leading-relaxed">
        Would you like HirenextAI to record your resume skills, role goals, and experience details to customize future career roadmaps?
      </p>
      {!responded ? (
        <div className="flex gap-2">
          <button
            onClick={handleAllow}
            className="px-3.5 py-2 bg-black text-white text-[11px] font-bold rounded-lg transition-all active:scale-98"
          >
            Allow Memory
          </button>
          <button
            onClick={() => setResponded(true)}
            className="px-3.5 py-2 border border-[#E0E0E0] bg-white text-black text-[11px] font-bold rounded-lg transition-all active:scale-98"
          >
            Not Now
          </button>
        </div>
      ) : (
        <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
          ✓ Memory sync allowed and enabled.
        </p>
      )}
    </div>
  );
};

const JobCard = ({ job, applyingJobId, onApplyWithAI }) => {
  const { user } = useAuthStore();
  const handleApplyNormal = () => {
    window.open(job.url || '#', '_blank');
  };

  const getButtonText = () => {
    const plan = (user?.plan || 'free').toLowerCase();
    if (plan === 'pro') return 'Apply with AI (10/week)';
    if (plan === 'plus') return 'Apply with AI (5/week)';
    return 'Apply with AI (1/week)';
  };

  const breakdown = job.matchBreakdown || {
    resume: job.match || 90,
    skill: job.match || 90,
    experience: job.match || 90,
    salary: job.match || 90,
    location: job.match || 90,
  };

  return (
    <div className="mt-3 p-5 bg-white border border-[#E0E0E0] rounded-2xl max-w-[450px] shadow-sm animate-slide-up text-left">
      <div className="flex justify-between items-start gap-2 mb-1">
        <h4 className="text-[15px] font-bold text-black leading-snug">{job.title}</h4>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-600 shrink-0">
          {job.workStyle || 'Hybrid'}
        </span>
      </div>
      <p className="text-[12px] font-medium text-gray-500 mb-1.5">
        {job.company} • {job.location}
      </p>
      <p className="text-[12px] font-bold text-black mb-3">
        {job.salary} • <span className="text-gray-400 font-semibold">{job.experience || '0-2 years'}</span>
      </p>

      {/* Meta tags line */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{job.postedTime || 'Just posted'}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">•</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{job.applyType || 'Direct Apply'}</span>
      </div>

      {/* Overall Match Circle & Breakdown */}
      <div className="border-t border-b border-gray-100 py-4 my-4 flex flex-col sm:flex-row items-center gap-6">
        <div className="flex flex-col items-center shrink-0">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg height="64" width="64" className="transform -rotate-90">
              <circle stroke="#E5E7EB" fill="transparent" strokeWidth="4" r="26" cx="32" cy="32" />
              <circle stroke="#10B981" fill="transparent" strokeWidth="4" strokeDasharray="163.36" strokeDashoffset={163.36 - (job.match / 100) * 163.36} strokeLinecap="round" r="26" cx="32" cy="32" />
            </svg>
            <span className="absolute text-xs font-black text-black">{job.match}%</span>
          </div>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-1">Overall Match</span>
        </div>

        <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-2.5 w-full">
          {[
            { label: 'Resume', val: breakdown.resume },
            { label: 'Skills', val: breakdown.skill },
            { label: 'Experience', val: breakdown.experience },
            { label: 'Salary', val: breakdown.salary },
          ].map((item, idx) => (
            <div key={idx} className="w-full">
              <div className="flex justify-between items-center text-[10px] font-bold mb-0.5">
                <span className="text-gray-400 uppercase tracking-wider">{item.label}</span>
                <span className="text-black">{item.val}%</span>
              </div>
              <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.val}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onApplyWithAI(job)}
          disabled={applyingJobId === job.id}
          className="flex-1 h-10 bg-black hover:bg-black/90 text-white text-[12px] font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 active:scale-98 shadow-sm"
        >
          {applyingJobId === job.id ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Triggering...
            </>
          ) : (
            getButtonText()
          )}
        </button>
        <button
          onClick={handleApplyNormal}
          className="h-10 px-4 border border-[#E0E0E0] text-black text-[12px] font-bold rounded-xl hover:bg-gray-50 active:scale-98 transition-all"
        >
          Apply normally
        </button>
      </div>
    </div>
  );
};

const AgentReportCard = ({ data }) => {
  const navigate = useNavigate();
  const [showFullImage, setShowFullImage] = useState(false);
  const savedRef = useRef(false);

  useEffect(() => {
    if (savedRef.current || !data?.jobData) return;
    savedRef.current = true;

    // Save to DB tracker automatically
    api.post('/api/applications', {
      jobTitle: data.jobData.title,
      company: data.jobData.company,
      location: data.jobData.location || '',
      salary: data.jobData.salary || '',
      status: 'applied',
      matchScore: data.jobData.match ?? null,
      appliedAt: new Date()
    }).catch(err => console.error('Failed to save agent report application tracker:', err));
  }, [data]);

  return (
    <div className="mt-2 p-5 bg-white border border-[#E0E0E0] rounded-2xl max-w-[450px] shadow-sm animate-slide-up relative">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
        <span className="text-xl">🤖</span>
        <h4 className="text-[15px] font-bold text-black">AI Agent Report</h4>
      </div>

      <div className="mb-4">
        <div className="flex items-start gap-2 mb-1">
          <span className="text-black mt-0.5">✅</span>
          <p className="text-[14px] text-gray-700 leading-relaxed font-medium">
            Form filled for:<br/>
            <span className="text-black font-bold">{data.jobData?.title}</span> at <span className="text-gray-600">{data.jobData?.company}</span>
          </p>
        </div>
      </div>

      {data.screenshot && (
        <div className="mb-4 cursor-pointer group" onClick={() => setShowFullImage(true)}>
          <div className="relative rounded-lg overflow-hidden border border-gray-200 group-hover:border-gray-400 transition-colors">
            <img
              src={data.screenshot}
              alt="Form filled screenshot"
              className="w-full h-32 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-semibold px-3 py-1.5 bg-black/75 rounded-lg backdrop-blur-sm">Click to view full screenshot</span>
            </div>
          </div>
        </div>
      )}

      <p className="text-[13px] text-gray-500 mb-5">
        Please review the details and submit your application manually.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/applications')}
          className="flex-1 px-4 py-2.5 bg-black text-white text-[13px] font-bold rounded-xl hover:bg-black/90 transition-colors shadow-sm"
        >
          View Application
        </button>
      </div>

      {showFullImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setShowFullImage(false)}>
          <img
            src={data.screenshot}
            alt="Full screenshot"
            className="max-w-full max-h-[90vh] object-contain rounded-lg border border-white/20"
          />
        </div>
      )}
    </div>
  );
};

const MessageAttachmentCard = ({ att, onPreview, onDownload }) => {
  const ext = att.name.split('.').pop().toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  const isPDF = ext === 'pdf';
  const isWord = ['doc', 'docx'].includes(ext);

  return (
    <div className="flex items-center gap-2.5 p-2.5 min-w-[200px] max-w-[240px] relative group transition-all duration-200 shadow-sm border border-[#E0E0E0] dark:border-[#2A2A2A] bg-white dark:bg-[#1E1E1E] text-black dark:text-white rounded-xl overflow-hidden mt-1.5 self-start">
      {/* Icon/Thumbnail */}
      {isImage ? (
        <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#E0E0E0] dark:border-[#2A2A2A] shrink-0 bg-gray-50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      ) : isPDF ? (
        <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-100 dark:border-red-900/30">
          <FileText size={20} />
        </div>
      ) : isWord ? (
        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/30">
          <FileText size={20} />
        </div>
      ) : (
        <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-500 flex items-center justify-center shrink-0 border border-gray-200/50">
          <File size={20} />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-[12px] font-semibold truncate text-black dark:text-white">{att.name}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">Ready to preview</p>
      </div>

      {/* Hover Overlay with Preview and Download */}
      <div className="absolute inset-0 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-[1px] rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center gap-3 transition-all duration-200 z-10">
        <button
          type="button"
          onClick={onPreview}
          className="px-2.5 py-1 text-[11px] font-bold bg-[#F7F7F7] border border-[#E0E0E0] text-black hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onDownload}
          className="px-2.5 py-1 text-[11px] font-bold bg-black text-white hover:bg-black/90 rounded-lg transition-colors cursor-pointer"
        >
          Download
        </button>
      </div>
    </div>
  );
};

const MessageItem = ({ message, applyingJobId, onApplyWithAI }) => {
  const [copied, setCopied] = useState(false);
  const { setPreviewItem } = useUIStore();
  const { messages, isTyping, sendMessage } = useChatStore();

  // Try to parse message content for Agent Report
  let parsedContent = null;
  let isAgentReport = false;
  let displayContent = message.content;

  try {
    const json = JSON.parse(message.content);
    if (json && json.type === 'ai_agent_report') {
      isAgentReport = true;
      parsedContent = json;
      displayContent = json.text;
    }
  } catch (e) {
    // normal text message
  }

  // Parse attachments from content (e.g. "[Attached file: resume.pdf]")
  const fileRegex = /\[Attached file:\s*([^\]]+)\]/g;
  const parsedAttachments = [];
  let cleanContent = displayContent;

  if (typeof displayContent === 'string') {
    cleanContent = displayContent.replace(fileRegex, (match, filename) => {
      parsedAttachments.push({ name: filename });
      return ''; // remove from bubble text
    }).trim();
  }

  const isAI = message.role === 'assistant' || message.role === 'ai';

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getFormattedTime = () => {
    const date = message.createdAt ? new Date(message.createdAt) : new Date();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex w-full mb-6 group ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex gap-3 max-w-[85%] ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex flex-col min-w-0 relative ${!isAI ? 'items-end' : ''}`}>
          {!isAI && !isAgentReport && (
            <span className="text-[12px] text-gray-500 font-semibold mb-1.5 mr-1">
              {getDisplayName()}
            </span>
          )}
          {!isAgentReport && (
            <div className="relative group/card">
              {cleanContent && (
                <div 
                  className={`
                    px-5 py-3.5 rounded-2xl text-[14px] leading-relaxed break-words shadow-sm relative pr-10
                    ${isAI
                      ? 'bg-[#F7F7F7] border border-[#E0E0E0] text-black rounded-tl-sm'
                      : 'bg-black text-white border border-black font-medium rounded-tr-sm'}
                  `}
                >
                  {isAI && (
                    <div className="hirenext-logo-container mb-3 text-black">
                      <HirenextLogo animated={false} />
                    </div>
                  )}
                  {isAI ? (
                    <div className="ai-markdown prose prose-sm max-w-none">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children }) => {
                            if (href === '#connect-accounts') {
                              return (
                                <button
                                  type="button"
                                  onClick={() => useUIStore.getState().setConnectModalOpen(true)}
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-black hover:bg-black/90 text-white text-[12px] font-bold rounded-xl shadow-sm transition-all mt-2.5"
                                >
                                  {children}
                                </button>
                              );
                            }
                            return (
                              <a href={href} target="_blank" rel="noopener noreferrer" className="text-black underline font-bold">
                                {children}
                              </a>
                            );
                          },
                          pre: ({ children }) => {
                            const codeEl = children?.[0];
                            const className = codeEl?.props?.className || '';
                            if (className.includes('language-ats-score') || className.includes('language-skills-chips') || className.includes('language-checklist') || className.includes('language-timeline')) {
                              return <>{children}</>;
                            }
                            return <pre className="bg-[#111111] border border-[#222222] rounded-xl p-4 overflow-x-auto my-3">{children}</pre>;
                          },
                          code: ({ inline, className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || '');
                            const lang = match ? match[1] : '';
                            const rawContent = String(children).replace(/\n$/, '');
                            
                            if (lang === 'ats-score') {
                              try {
                                const data = JSON.parse(rawContent);
                                return <AtsScoreVisual score={data.score} label={data.label} explanation={data.explanation} />;
                              } catch (e) {}
                            }
                            if (lang === 'skills-chips') {
                              try {
                                const chips = JSON.parse(rawContent);
                                return <SkillsChipsVisual chips={chips} />;
                              } catch (e) {}
                            }
                            if (lang === 'checklist') {
                              try {
                                const items = JSON.parse(rawContent);
                                return <ChecklistVisual items={items} />;
                              } catch (e) {}
                            }
                            if (lang === 'timeline') {
                              try {
                                const items = JSON.parse(rawContent);
                                return <TimelineVisual items={items} />;
                              } catch (e) {}
                            }
                            
                            return <code className={className} {...props}>{children}</code>;
                          },
                          blockquote: ({ children }) => {
                            const rawText = String(children?.[0]?.props?.children || children || '');
                            if (rawText.includes('⚠️')) {
                              return (
                                <div className="my-4 p-4 border border-rose-200 bg-rose-50/50 rounded-2xl flex gap-3 text-rose-800 text-xs">
                                  <span className="text-sm shrink-0">⚠️</span>
                                  <div className="font-medium leading-relaxed">{children}</div>
                                </div>
                              );
                            }
                            if (rawText.includes('✅')) {
                              return (
                                <div className="my-4 p-4 border border-emerald-200 bg-emerald-50/50 rounded-2xl flex gap-3 text-emerald-800 text-xs">
                                  <span className="text-sm shrink-0">✅</span>
                                  <div className="font-medium leading-relaxed">{children}</div>
                                </div>
                              );
                            }
                            return (
                              <blockquote className="my-4 p-4 border-l-4 border-black bg-[#F7F7F7] rounded-r-2xl text-xs text-neutral-600 italic font-medium leading-relaxed">
                                {children}
                              </blockquote>
                            );
                          }
                        }}
                      >
                        {cleanContent}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    cleanContent
                  )}
                  
                  {isAI && (
                    <button
                      onClick={handleCopy}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white hover:bg-gray-50 border border-[#E0E0E0] text-gray-500 hover:text-black transition-all opacity-0 group-hover/card:opacity-100"
                      title="Copy message"
                    >
                      {copied ? (
                        <span className="text-[10px] font-semibold text-black px-0.5">✓</span>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {isAgentReport && <AgentReportCard data={parsedContent} />}
          {/* Multiple Job Cards */}
          {message.jobs && message.jobs.length > 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginTop: '12px',
              width: '100%'
            }}>
              {message.jobs.map((job, idx) => (
                <JobCard
                  key={job.id || idx}
                  job={job}
                  applyingJobId={applyingJobId}
                  onApplyWithAI={onApplyWithAI}
                />
              ))}
            </div>
          ) : message.job ? (
            <JobCard
              job={message.job}
              applyingJobId={applyingJobId}
              onApplyWithAI={onApplyWithAI}
            />
          ) : null}
          {message.resumeReview && (
            <ResumeReviewCard data={message.resumeReview} />
          )}
          {message.memoryConsent && (
            <MemoryConsentCard />
          )}

          {/* Render parsed attachments here */}
          {parsedAttachments.length > 0 && (
            <div className={`flex flex-col gap-2 mt-1.5 ${!isAI ? 'items-end' : 'items-start'}`}>
              {parsedAttachments.map((att, i) => (
                <MessageAttachmentCard
                  key={i}
                  att={att}
                  onPreview={() => setPreviewItem(att)}
                  onDownload={() => {
                    const blob = new Blob([`Mock file content for ${att.name}`], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = att.name;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 100);
                  }}
                />
              ))}
            </div>
          )}
          
          {/* Next Best Actions section below the latest AI response */}
          {isAI && messages[messages.length - 1]?.id === message.id && !isTyping && (
            <NextBestActions text={cleanContent} onActionClick={sendMessage} />
          )}

          <span className="text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1 select-none">
            {getFormattedTime()}
          </span>
        </div>
      </div>
    </div>
  );
};

const MessageList = () => {
  const { messages, isTyping } = useChatStore();
  const { user, token } = useAuthStore();
  const { showToast } = useUIStore();
  const navigate = useNavigate();
  const scrollRef = useRef(null);

  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyingJobId, setApplyingJobId] = useState(null);

  const checkExtensionInstalled = () => {
    return new Promise((resolve) => {
      const extId = import.meta.env.VITE_EXTENSION_ID || 'YOUR_EXTENSION_ID_HERE';
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          chrome.runtime.sendMessage(
            extId,
            { type: 'PING' },
            (response) => {
              if (chrome.runtime.lastError) {
                resolve(false);
              } else {
                resolve(true);
              }
            }
          );
        } catch(e) {
          resolve(false);
        }
      } else {
        resolve(false);
      }
      setTimeout(() => resolve(false), 1000);
    });
  };

  const handleApplyWithAI = async (job) => {
    setApplyingJobId(job.id);
    const isInstalled = await checkExtensionInstalled();

    if (!isInstalled) {
      setShowExtensionModal(true);
      setSelectedJob(job);
      setApplyingJobId(null);
      return;
    }

    // Save to applications tracker automatically
    try {
      await api.post('/api/applications/apply-with-ai', {
        jobTitle: job.title,
        company: job.company,
        location: job.location || '',
        salary: job.salary || '',
        matchScore: job.match || 90
      });
    } catch (err) {
      console.error('Failed to save application tracker:', err);
    }

    // Trigger extension
    try {
      const extId = import.meta.env.VITE_EXTENSION_ID || 'YOUR_EXTENSION_ID_HERE';
      chrome.runtime.sendMessage(extId, {
        type: 'APPLY_WITH_AI',
        token: token || localStorage.getItem('token'),
        job: {
          title: job.title,
          company: job.company,
          url: job.url,
        },
        userProfile: {
          ...user,
          name: user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
          phone: user?.phone || '',
          linkedin_url: user?.linkedinUrl || '',
          indeed_url: user?.indeedUrl || '',
          naukri_url: user?.naukriUrl || '',
          github_url: user?.githubUrl || '',
          years_experience: user?.experience || '',
          skills: user?.skills || ''
        },
      });
    } catch (e) {
      console.error('Failed to send message to extension:', e);
    }

    setApplyingJobId(null);
    showToast('Extension activated! Opening application form...');
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-y-auto px-6 py-6 custom-scrollbar chat-messages-scrollbar relative bg-white"
    >
      <div className="max-w-4xl mx-auto flex flex-col">
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            applyingJobId={applyingJobId}
            onApplyWithAI={handleApplyWithAI}
          />
        ))}

        {isTyping && <ThinkingIndicator />}
      </div>

      {/* Extension Not Installed Modal Overlay */}
      <AnimatePresence>
        {showExtensionModal && selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExtensionModal(false)}
              className="absolute inset-0 bg-black/55 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative z-10 w-full max-w-md bg-white border border-[#E0E0E0] rounded-2xl p-8 text-center shadow-2xl"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#F7F7F7] border border-[#E0E0E0] text-black mb-4"
              >
                <Puzzle size={24} />
              </motion.div>

              <h2 className="text-xl font-bold text-black mb-2">Install Extension to Apply with AI</h2>
              <p className="text-gray-500 text-sm mb-6">
                To apply with AI, you need the HirenextAI Chrome extension. It takes 30 seconds to install.
              </p>

              <div className="bg-[#F7F7F7] border border-[#E0E0E0] p-4 rounded-xl mb-6 text-left">
                <p className="text-gray-500 text-xs mb-2">You were trying to apply for:</p>
                <p className="text-black font-semibold text-sm">
                  {selectedJob.title} <span className="text-gray-400 font-normal">at</span> {selectedJob.company}
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/extension');
                    setShowExtensionModal(false);
                    setTimeout(() => {
                      navigate('/chat');
                    }, 3000);
                  }}
                  className="w-full h-11 bg-black text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 shadow-none hover:bg-black/90 transition-all"
                >
                  Download Extension
                </button>

                <button
                  type="button"
                  onClick={() => setShowExtensionModal(false)}
                  className="w-full h-11 border border-[#E0E0E0] bg-white text-black text-sm font-semibold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Maybe later
                </button>
              </div>

              <p className="text-gray-400 text-xs mt-4">
                After installing, come back and click Apply with AI again
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MessageList;
