import { useState, useEffect, useCallback, useRef } from 'react';
import ChatLayout from '../components/layout/ChatLayout';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Loader2,
  Mic,
  MicOff,
  ChevronRight,
  RotateCcw,
  Sparkles,
  X,
  Volume2,
  VolumeX,
  Plus,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  ArrowLeft,
  FileText,
  User,
  Check,
  Award,
  Zap,
  Cpu,
  Brain,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAIApplications } from '../lib/applicationsStorage';
import {
  generateQuestions,
  evaluateAnswers,
  rateSingleAnswer,
  buildMindMapText,
} from '../lib/interviewService';
import { saveInterviewToFiles } from '../lib/aiFileSaver';
import useInterviewStore from '../store/useInterviewStore';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import useUIStore from '../store/useUIStore';

const CATEGORIES = [
  { id: 'frontend', name: 'Frontend Engineering', desc: 'React, Javascript, CSS, HTML, Web APIs', icon: Sparkles, color: 'text-blue-600 bg-blue-50' },
  { id: 'backend', name: 'Backend Engineering', desc: 'APIs, Databases, System Design, Security', icon: Cpu, color: 'text-purple-600 bg-purple-50' },
  { id: 'fullstack', name: 'Full Stack Engineering', desc: 'Mixed frontend and backend capabilities', icon: Zap, color: 'text-amber-600 bg-amber-50' },
  { id: 'datascience', name: 'Data Science & ML', desc: 'Python, Machine Learning, Stats, SQL', icon: Brain, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'systemdesign', name: 'System Design', desc: 'Scalability, Caching, Load Balancers, Distributed Systems', icon: Briefcase, color: 'text-orange-600 bg-orange-50' },
  { id: 'hr', name: 'HR & Behavior', desc: 'Behavioral questions, STAR method, Teamwork', icon: User, color: 'text-rose-600 bg-rose-50' }
];

const speak = (text, onEnd) => {
  if (!window.speechSynthesis) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.95;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
};

const InterviewPage = () => {
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { saveSession } = useInterviewStore();

  // Selection states
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0].id);
  const [difficulty, setDifficulty] = useState('medium');
  const [mode, setMode] = useState('text'); // text or voice
  const [totalQuestions, setTotalQuestions] = useState(5);

  // Flow states
  const [phase, setPhase] = useState('select'); // select, generating, running, evaluating, results
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [textAnswer, setTextAnswer] = useState('');
  
  // Voice states
  const [transcript, setTranscript] = useState('');
  const [phaseVoice, setPhaseVoice] = useState('speaking'); // speaking, listening, feedback
  const [lastRating, setLastRating] = useState(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  
  // Results states
  const [results, setResults] = useState(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Timer states
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerIntervalRef = useRef(null);

  const interimRef = useRef('');
  const answersRef = useRef([]);
  const spokenIndexRef = useRef(-1);

  useEffect(() => {
    setApplications(getAIApplications());
  }, []);

  // Timer Effect for Text Mode
  useEffect(() => {
    if (phase === 'running' && mode === 'text') {
      setTimeElapsed(0);
      timerIntervalRef.current = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [phase, mode]);

  const handleSpeechResult = useCallback((text, isFinal) => {
    if (isFinal) {
      setTranscript((prev) => `${prev}${text} `.trim() + ' ');
      interimRef.current = '';
    } else {
      interimRef.current = text;
      setTranscript((prev) => {
        const base = prev.replace(new RegExp(interimRef.current + '$'), '').trim();
        return `${base} ${text}`.trim() + ' ';
      });
    }
  }, []);

  const { isListening, supported, start, stop } = useSpeechRecognition({
    onResult: handleSpeechResult,
    onError: (msg) => showToast(msg),
  });

  const startInterview = async () => {
    setErrorMsg('');
    setPhase('generating');
    try {
      let roleName = '';
      if (selectedJob) {
        roleName = selectedJob.job_title || 'Software Engineer';
      } else {
        const cat = CATEGORIES.find(c => c.id === selectedCategory);
        roleName = cat ? cat.name : 'Software Engineer';
      }
      
      const generated = await generateQuestions(roleName, difficulty, 'mixed', totalQuestions);
      setQuestions(generated.slice(0, totalQuestions));
      setAnswers(new Array(totalQuestions).fill(''));
      answersRef.current = new Array(totalQuestions).fill('');
      setCurrentIndex(0);
      setTextAnswer('');
      setTranscript('');
      setLastRating(null);
      setPhase('running');
      
      if (mode === 'voice') {
        setPhaseVoice('speaking');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not generate questions. Please try again.');
      setPhase('select');
    }
  };

  const currentQuestionObj = questions[currentIndex];
  const currentQuestion = currentQuestionObj?.question;

  // Voice Speech Synthesis Trigger
  useEffect(() => {
    if (phase !== 'running' || mode !== 'voice' || !currentQuestion || phaseVoice !== 'speaking') return;
    if (spokenIndexRef.current === currentIndex) return;
    spokenIndexRef.current = currentIndex;

    if (isVoiceMuted) {
      setPhaseVoice('listening');
      setTranscript('');
      interimRef.current = '';
      start();
    } else {
      speak(currentQuestion, () => {
        setPhaseVoice('listening');
        setTranscript('');
        interimRef.current = '';
        start();
      });
    }

    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [phase, mode, currentIndex, phaseVoice, currentQuestion, start, isVoiceMuted]);

  const handleNextTextQuestion = () => {
    const nextAnswers = [...answers];
    nextAnswers[currentIndex] = textAnswer.trim();
    setAnswers(nextAnswers);
    answersRef.current = nextAnswers;

    if (currentIndex + 1 >= questions.length) {
      finishInterview(nextAnswers);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setTextAnswer(answers[currentIndex + 1] || '');
    }
  };

  const handlePrevTextQuestion = () => {
    if (currentIndex > 0) {
      const nextAnswers = [...answers];
      nextAnswers[currentIndex] = textAnswer.trim();
      setAnswers(nextAnswers);
      answersRef.current = nextAnswers;
      
      setCurrentIndex((prev) => prev - 1);
      setTextAnswer(answers[currentIndex - 1] || '');
    }
  };

  const finishVoiceAnswer = () => {
    stop();
    const answer = transcript.trim();
    const rated = rateSingleAnswer(questions[currentIndex], answer);
    const nextAnswers = [...answersRef.current];
    nextAnswers[currentIndex] = answer;
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
    setLastRating(rated);
    setPhaseVoice('feedback');
  };

  const goNextVoiceQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      finishInterview(answersRef.current);
      return;
    }
    setCurrentIndex((i) => i + 1);
    setTranscript('');
    setLastRating(null);
    setPhaseVoice('speaking');
  };

  const finishInterview = async (finalAnswers) => {
    setPhase('evaluating');
    if (mode === 'voice') {
      stop();
      window.speechSynthesis?.cancel();
    }
    
    let roleName = '';
    let jobObj = selectedJob;
    if (selectedJob) {
      roleName = selectedJob.job_title || 'Candidate';
    } else {
      const cat = CATEGORIES.find(c => c.id === selectedCategory);
      roleName = cat ? cat.name : 'Candidate';
      jobObj = { job_title: roleName, company: 'Practice Session' };
    }

    try {
      const evalResults = await evaluateAnswers(roleName, questions, finalAnswers);
      const mindMap = buildMindMapText(jobObj, questions, finalAnswers, evalResults);
      const summaryText = [
        `Overall Score: ${evalResults.overall_score}/100`,
        '',
        'Strengths:',
        evalResults.strengths,
        '',
        'Areas to improve:',
        evalResults.improvements,
        '',
        'Study topics:',
        ...(evalResults.study_topics || []).map((t) => `• ${t}`),
      ].join('\n');

      const payload = {
        job: jobObj,
        questions,
        answers: finalAnswers,
        results: { ...evalResults, summaryText, mindMap },
      };

      saveSession(payload);
      saveInterviewToFiles({
        job: jobObj,
        results: { summaryText },
        mindMapContent: mindMap,
      });
      setResults({ ...evalResults, summaryText, mindMap });
      setPhase('results');
    } catch (err) {
      console.error(err);
      setErrorMsg('Evaluation failed. Could not assess responses.');
      setPhase('results');
    }
  };

  const resetAll = () => {
    if (mode === 'voice') {
      stop();
      window.speechSynthesis?.cancel();
    }
    spokenIndexRef.current = -1;
    setPhase('select');
    setSelectedJob(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setTextAnswer('');
    setTranscript('');
    setLastRating(null);
    setResults(null);
    setErrorMsg('');
  };

  const progress = questions.length ? ((currentIndex + (mode === 'voice' && phaseVoice === 'feedback' ? 1 : 0)) / questions.length) * 100 : 0;
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <ChatLayout>
      <div className="flex-1 flex flex-col h-full bg-white overflow-hidden text-black">
        {phase === 'select' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-xl bg-black text-white">
                <Award size={22} />
              </div>
              <h1 className="text-3xl font-display font-bold text-black">AI Mock Interview</h1>
            </div>
            <p className="text-gray-500 mb-8 text-sm">Select a category or applied job, choose your mode, and practice with simulated real-time questions.</p>

            {errorMsg && (
              <div className="flex items-center gap-2 mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600">
                <AlertCircle size={18} />
                <p className="text-sm font-medium">{errorMsg}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              {/* Left Column: Topics */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">1. Select Interview Topic</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => {
                      const IconComponent = cat.icon;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setSelectedJob(null);
                          }}
                          className={`
                            text-left p-4 rounded-xl border transition-all duration-200 hover-glow flex flex-col gap-2
                            ${selectedCategory === cat.id && !selectedJob
                              ? 'border-black bg-gray-50/50 ring-1 ring-black'
                              : 'border-[#E0E0E0] bg-white'}
                          `}
                        >
                          <div className={`p-2 rounded-lg w-fit ${cat.color}`}>
                            <IconComponent size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-black text-sm">{cat.name}</p>
                            <p className="text-xs text-gray-500 leading-snug mt-0.5">{cat.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {applications.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Or Choose From Applied Jobs</h3>
                    <div className="max-h-[220px] overflow-y-auto custom-scrollbar border border-[#E0E0E0] rounded-xl p-2 space-y-1.5">
                      {applications.map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => {
                            setSelectedJob(app);
                            setSelectedCategory(null);
                          }}
                          className={`
                            w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between
                            ${selectedJob?.id === app.id
                              ? 'border-black bg-gray-50'
                              : 'border-transparent bg-transparent hover:bg-gray-50'}
                          `}
                        >
                          <div>
                            <p className="font-semibold text-black text-sm">{app.job_title}</p>
                            <p className="text-xs text-gray-500">{app.company} • {app.location}</p>
                          </div>
                          {selectedJob?.id === app.id && <Check size={16} className="text-black shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Settings */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">2. Difficulty</h3>
                  <div className="flex gap-2">
                    {['easy', 'medium', 'hard'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`
                          flex-1 py-2 text-xs font-semibold rounded-lg border uppercase tracking-wider transition-all
                          ${difficulty === d
                            ? 'bg-black border-black text-white shadow-sm'
                            : 'bg-white border-[#E0E0E0] text-gray-600 hover:bg-gray-50'}
                        `}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">3. Duration</h3>
                  <div className="flex gap-2">
                    {[5, 10, 15].map((cnt) => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setTotalQuestions(cnt)}
                        className={`
                          flex-1 py-2 text-xs font-semibold rounded-lg border transition-all
                          ${totalQuestions === cnt
                            ? 'bg-black border-black text-white shadow-sm'
                            : 'bg-white border-[#E0E0E0] text-gray-600 hover:bg-gray-50'}
                        `}
                      >
                        {cnt} Qs
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">4. Interview Mode</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('text')}
                      className={`
                        py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all
                        ${mode === 'text'
                          ? 'border-black bg-gray-50/50 ring-1 ring-black'
                          : 'border-[#E0E0E0] bg-white hover:bg-gray-50'}
                      `}
                    >
                      <FileText size={18} className="text-gray-500" />
                      <span className="text-xs font-bold">Text Mode</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode('voice')}
                      className={`
                        py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all
                        ${mode === 'voice'
                          ? 'border-black bg-gray-50/50 ring-1 ring-black'
                          : 'border-[#E0E0E0] bg-white hover:bg-gray-50'}
                      `}
                    >
                      <Mic size={18} className="text-gray-500" />
                      <span className="text-xs font-bold">Voice Mode</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startInterview}
                  className="w-full py-4 bg-black text-white rounded-xl font-semibold hover:bg-black/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 shadow-sm"
                >
                  <Play size={16} fill="white" /> Start Practice Session
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white">
            <Loader2 className="animate-spin text-black" size={40} />
            <p className="text-gray-500 font-medium">Generating {totalQuestions} tailored interview questions…</p>
          </div>
        )}

        {phase === 'evaluating' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white">
            <Loader2 className="animate-spin text-black" size={40} />
            <p className="text-gray-500 font-medium">Evaluating your performance with AI...</p>
          </div>
        )}

        {phase === 'running' && mode === 'text' && (
          <div className="flex-1 flex flex-col h-full bg-white relative">
            {/* Header / Info */}
            <header className="px-6 py-4 border-b border-[#E0E0E0] flex items-center justify-between bg-[#F7F7F7]">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Text Interview Mode</span>
                <h2 className="text-sm font-bold text-black mt-0.5">
                  Question {currentIndex + 1} of {questions.length}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-[#E0E0E0] rounded-full text-xs font-semibold text-gray-600">
                  <Clock size={13} />
                  <span>{formatTime(timeElapsed)}</span>
                </div>
                <button
                  onClick={resetAll}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                  title="Quit Session"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Progress bar */}
            <div className="w-full h-1 bg-gray-100">
              <motion.div
                className="h-full bg-black"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {/* Content area */}
            <div className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar max-w-3xl mx-auto w-full flex flex-col justify-between">
              <div className="space-y-6">
                <div className="p-6 rounded-2xl border border-[#E0E0E0] bg-[#F7F7F7]">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Question {currentIndex + 1}</span>
                  <p className="text-lg font-medium text-black mt-1 leading-relaxed">{currentQuestion}</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="answer-input" className="text-xs font-bold uppercase text-gray-400 tracking-wider">Your Response</label>
                  <textarea
                    id="answer-input"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Type your comprehensive response here... Try to use STAR method (Situation, Task, Action, Result) for behavioral questions."
                    rows={8}
                    className="w-full rounded-xl border border-[#E0E0E0] p-4 text-sm text-black bg-white focus:outline-none focus:border-black focus:ring-1 focus:ring-black leading-relaxed"
                  />
                  <div className="flex justify-between items-center text-xs text-gray-400 px-1">
                    <span>{textAnswer.split(/\s+/).filter(w => w.length > 0).length} words</span>
                    <span>Min length recommended: 30 words</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-4 mt-8">
                <button
                  onClick={handlePrevTextQuestion}
                  disabled={currentIndex === 0}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl border border-[#E0E0E0] text-black font-semibold text-sm hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowLeft size={16} /> Prev
                </button>
                <button
                  onClick={handleNextTextQuestion}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-black text-white font-semibold text-sm hover:bg-black/90 transition-all active:scale-[0.98]"
                >
                  {currentIndex + 1 >= questions.length ? 'Submit & Evaluate' : 'Next Question'} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'running' && mode === 'voice' && (
          <div className="flex-1 flex flex-col h-full bg-[#F7F7F7] relative">
            {/* Waveform graphic overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(0,0,0,0.015),transparent_60%)] pointer-events-none" />

            <header className="relative flex items-center justify-between px-6 py-4 border-b border-[#E0E0E0] bg-white">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Voice Interview Mode</span>
                <p className="text-sm font-bold text-black mt-0.5">
                  Question {currentIndex + 1} of {questions.length}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!isVoiceMuted ? (
                  <button
                    onClick={() => {
                      setIsVoiceMuted(true);
                      window.speechSynthesis?.cancel();
                    }}
                    className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                    title="Mute AI Speech Output"
                  >
                    <Volume2 size={18} />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsVoiceMuted(false)}
                    className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors"
                    title="Unmute AI Speech Output"
                  >
                    <VolumeX size={18} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={resetAll}
                  className="p-2 rounded-xl text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                  title="Quit Session"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="w-full h-1 bg-gray-100">
              <motion.div
                className="h-full bg-black"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            <div className="flex-1 flex flex-col items-center justify-between p-6 max-w-2xl mx-auto w-full gap-6 overflow-y-auto custom-scrollbar py-8">
              {/* Question card */}
              <div className="w-full p-6 rounded-2xl bg-white border border-[#E0E0E0] shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Question</span>
                <p className="text-lg font-medium text-black mt-1 leading-relaxed">{currentQuestion}</p>
                {phaseVoice === 'speaking' && (
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-black font-semibold animate-pulse">
                    <div className="w-1.5 h-1.5 bg-black rounded-full" />
                    <span>AI speaking…</span>
                  </div>
                )}
              </div>

              {/* Pulsing AI Circle / Waveform */}
              <div className="my-4 flex flex-col items-center gap-4">
                <div className="relative flex items-center justify-center w-28 h-28 rounded-full border border-gray-100 bg-white shadow-sm">
                  {phaseVoice === 'listening' && isListening && (
                    <motion.div
                      className="absolute inset-0 rounded-full border border-black/20 bg-black/5"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                  )}
                  <div className="flex items-center justify-center w-24 h-24 rounded-full bg-black text-white">
                    {phaseVoice === 'speaking' ? (
                      <Volume2 size={32} />
                    ) : isListening ? (
                      <Mic size={32} />
                    ) : (
                      <MicOff size={32} className="text-white/40" />
                    )}
                  </div>
                </div>

                {phaseVoice === 'listening' && (
                  <div className="flex items-center gap-1.5 h-6">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-black animate-voice-bounce"
                        style={{ animationDelay: `${i * 0.1}s` }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Real-time transcript container */}
              <div className="w-full min-h-[120px] p-5 rounded-2xl bg-white border border-[#E0E0E0] shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Your Answer (Real-time Transcript)</span>
                  <p className="text-sm text-gray-800 leading-relaxed mt-2">
                    {transcript || (
                      <span className="text-gray-400 italic">
                        {phaseVoice === 'listening' && isListening
                          ? 'Listening… speak clearly into your mic.'
                          : supported
                            ? 'Waiting for voice input to activate…'
                            : 'Voice recognition not supported in this browser. Please use Chrome.'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Accordion intermediate feedback */}
              {phaseVoice === 'feedback' && lastRating && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full p-5 rounded-2xl border border-green-100 bg-green-50/50"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl font-extrabold text-black">{lastRating.score}</span>
                    <span className="text-gray-400 text-sm">/ 10 points</span>
                  </div>
                  <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {lastRating.feedback}
                  </p>
                </motion.div>
              )}

              {/* Footer controllers */}
              <footer className="w-full flex flex-col items-center gap-3">
                {phaseVoice === 'listening' && (
                  <>
                    <button
                      type="button"
                      onClick={finishVoiceAnswer}
                      className="px-8 py-3 bg-black hover:bg-black/90 text-white font-semibold text-sm rounded-xl flex items-center gap-2 shadow-sm transition-all"
                    >
                      <MicOff size={16} /> Stop & Save Answer
                    </button>
                    <p className="text-[10px] text-gray-400">Click when you are done speaking</p>
                  </>
                )}
                {phaseVoice === 'feedback' && (
                  <button
                    type="button"
                    onClick={goNextVoiceQuestion}
                    className="flex items-center gap-2 px-8 py-3.5 bg-black text-white font-semibold rounded-xl hover:bg-black/90 shadow-sm transition-all"
                  >
                    {currentIndex + 1 >= questions.length ? 'See Evaluation Results' : 'Next Question'}
                    <ChevronRight size={18} />
                  </button>
                )}
              </footer>
            </div>
          </div>
        )}

        {phase === 'results' && results && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="text-green-600" size={24} />
              <h2 className="text-3xl font-display font-bold text-black">Practice Completed</h2>
            </div>
            <p className="text-gray-500 mb-8 text-sm">
              Here is your overall AI performance assessment. A detailed copy has been saved to your Files.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Score panel */}
              <div className="p-6 rounded-2xl border border-[#E0E0E0] bg-[#F7F7F7] flex flex-col items-center justify-center text-center shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Overall Performance</span>
                <div className="relative flex items-center justify-center w-32 h-32 rounded-full border-[6px] border-black flex-shrink-0">
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-extrabold text-black">{results.overall_score}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">out of 100</span>
                  </div>
                </div>
              </div>

              {/* Metrics Breakdown */}
              <div className="md:col-span-2 p-6 rounded-2xl border border-[#E0E0E0] bg-white shadow-sm space-y-4">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Skill Metrics</span>
                <div className="space-y-3">
                  {[
                    { label: 'Technical Depth', key: 'technical' },
                    { label: 'Communication Clarity', key: 'communication' },
                    { label: 'Problem Solving', key: 'problem_solving' },
                    { label: 'Confidence & Delivery', key: 'confidence' }
                  ].map((m) => {
                    const val = results.breakdown?.[m.key] || 70;
                    return (
                      <div key={m.key} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-gray-700">{m.label}</span>
                          <span className="text-black">{val}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-black" style={{ width: `${val}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-5 rounded-xl border border-[#E0E0E0] bg-white shadow-sm">
                <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Strengths</p>
                <p className="text-sm text-gray-700 leading-relaxed">{results.strengths}</p>
              </div>
              <div className="p-5 rounded-xl border border-[#E0E0E0] bg-white shadow-sm">
                <p className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Areas for Improvement</p>
                <p className="text-sm text-gray-700 leading-relaxed">{results.improvements}</p>
              </div>
            </div>

            {/* Per-question feedback accordion */}
            <div className="space-y-3 mb-8">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Detailed Question Review</span>
              {questions.map((q, i) => {
                const scoreObj = results.question_scores?.[i] || {};
                const isExpanded = expandedQuestionId === q.id;
                return (
                  <div key={q.id} className="border border-[#E0E0E0] rounded-xl bg-white overflow-hidden shadow-sm">
                    <button
                      onClick={() => setExpandedQuestionId(isExpanded ? null : q.id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="pr-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Q{i + 1} • Score: {scoreObj.score || 7}/10</span>
                        <p className="font-semibold text-sm text-black mt-0.5 leading-snug">{q.question}</p>
                      </div>
                      <div>
                        {isExpanded ? <ChevronUp size={18} className="text-gray-400 shrink-0" /> : <ChevronDown size={18} className="text-gray-400 shrink-0" />}
                      </div>
                    </button>
                    
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden border-t border-gray-100 bg-gray-50/50"
                        >
                          <div className="p-4 space-y-3.5 text-xs text-gray-700">
                            <div>
                              <p className="font-bold text-black uppercase tracking-wider text-[10px] mb-1">Your Response:</p>
                              <p className="bg-white p-3 rounded-lg border border-gray-200 leading-relaxed text-gray-800">
                                {answers[i] || <span className="italic text-gray-400">No response provided.</span>}
                              </p>
                            </div>
                            {scoreObj.good && (
                              <div>
                                <p className="font-bold text-green-700 uppercase tracking-wider text-[10px] mb-0.5">What was good:</p>
                                <p className="leading-relaxed">{scoreObj.good}</p>
                              </div>
                            )}
                            {scoreObj.improve && (
                              <div>
                                <p className="font-bold text-amber-700 uppercase tracking-wider text-[10px] mb-0.5">What was missing / can improve:</p>
                                <p className="leading-relaxed">{scoreObj.improve}</p>
                              </div>
                            )}
                            {scoreObj.tip && (
                              <div>
                                <p className="font-bold text-blue-700 uppercase tracking-wider text-[10px] mb-0.5">Better answer example / expert tip:</p>
                                <p className="bg-blue-50/40 p-3 rounded-lg border border-blue-100/50 leading-relaxed italic">{scoreObj.tip}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={resetAll}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-[#E0E0E0] text-black font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={16} /> Try New Topic
              </button>
              <button
                type="button"
                onClick={() => navigate('/applications')}
                className="flex-1 py-3.5 rounded-xl bg-black text-white font-semibold text-sm hover:bg-black/90 transition-all flex items-center justify-center gap-2 shadow-sm"
              >
                <Briefcase size={16} /> View Applications tracker
              </button>
            </div>
          </div>
        )}
      </div>
    </ChatLayout>
  );
};

export default InterviewPage;
