import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, Plus, Pause, Play, Check, Sparkles } from 'lucide-react';
import api from '../../lib/api';

export function Reveal({ children, className = '', delay = 0 }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} initial={reduced ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }} transition={{ duration: .45, delay }}>{children}</motion.div>;
}

export function BrandMarquee({ partners }) {
  const [paused, setPaused] = useState(false);
  return <section className="brand-strip" aria-label="Supported by">
    <div className="brand-strip-label">SUPPORTED BY <span>Across the job search ecosystem</span></div>
    <div className={`brand-window ${paused ? 'is-paused' : ''}`}>
      <div className="brand-track">{[0, 1].map(copy => <div className="brand-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>{partners.map((partner, index) => <div className="brand-cell" key={partner.name || index} title={partner.name} role="img" aria-label={partner.name}>{partner.component || partner.logo || partner.icon || partner.name}</div>)}</div>)}</div>
    </div>
    <button className="brand-pause" onClick={() => setPaused(!paused)} aria-label={paused ? 'Play brand animation' : 'Pause brand animation'} aria-pressed={paused}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
  </section>;
}

export const commonQuestions = [
  { q: 'What can I do with Hirenext?', a: 'Bring your job search into one workspace: prepare a resume, explore roles, track applications and practise interview answers with AI assistance.' },
  { q: 'Can I try it before signing up?', a: 'Yes. Open the interactive demo to explore the workspace. Create an account when you want to save your own work.' },
  { q: 'Does Hirenext guarantee a job or an ATS score?', a: 'No. Hirenext helps you prepare and organise your search. Hiring decisions belong to employers, and screening systems vary. Always review AI suggestions before using them.' },
  { q: 'How are my account and payments protected?', a: 'Accounts use hashed passwords and checked sessions. Admin access requires an approved role and email verification. Payments are verified on the server before a paid plan is activated.' },
  { q: 'Is the Chrome extension available?', a: 'The extension is currently paused. You can continue to use the website and its career workspace.' },
  { q: 'Where can I get help?', a: 'Visit Contact to send the team a message, or open the Help Center for guidance on the workspace.' },
];

export function FAQSection({ questions = commonQuestions }) {
  const [open, setOpen] = useState(null);
  const id = useId();
  const reduced = useReducedMotion();
  return <section id="faq" className="refined-faq section-wrap">
    <Reveal className="faq-intro"><span className="eyebrow">A little clarity</span><h2>Good questions.<br /><span className="accent-text">Straight answers.</span></h2><p>Frequently asked questions about your next step with Hirenext.</p><Link to="/contact" className="text-link">Still need a hand? <ArrowRight size={17} /></Link></Reveal>
    <div className="faq-list">{questions.map((item, i) => <div className={`faq-item ${open === i ? 'is-open' : ''}`} key={item.q}>
      <h3><button aria-expanded={open === i} aria-controls={`${id}-${i}`} onClick={() => setOpen(open === i ? null : i)}>{item.q}<Plus size={20} className={open === i ? 'rotate-45' : ''} /></button></h3>
      <AnimatePresence initial={false}>{open === i && <motion.div id={`${id}-${i}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduced ? 0 : .22 }} className="faq-answer"><p>{item.a}</p></motion.div>}</AnimatePresence>
    </div>)}</div>
  </section>;
}

export function CareerCTA() {
  return <section id="cta" className="section-wrap career-cta"><Reveal className="career-cta-inner"><div><span className="eyebrow"><Sparkles size={15} /> Your next chapter</span><h2>Ready to accelerate<br />your career?</h2><p>One workspace. A clearer next step. Start with Hirenext.</p></div><div className="cta-actions"><Link to="/register" className="refined-button light">Get started free <ArrowRight size={18} /></Link><Link to="/demo" className="cta-demo">Explore the demo</Link><span>No card needed to start</span></div></Reveal></section>;
}

export function UpdateSubscriptionForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const id = useId();
  const submit = async event => {
    event.preventDefault();
    if (status === 'saving') return;
    setStatus('saving'); setError('');
    try { await api.post('/updates/subscribe', { email }); setStatus('success'); setEmail(''); }
    catch (err) { setError(err.response?.data?.error || 'We could not save your email. Please try again.'); setStatus('idle'); }
  };
  return <div className="subscribe-card"><div><span className="eyebrow">Keep in the loop</span><h2>Subscribe to get log alerts.</h2><p>Product improvements, new releases and the occasional milestone.</p></div>
    {status === 'success' ? <p role="status" className="subscribe-success"><Check size={22} /> Thank you for subscribing.</p> : <form onSubmit={submit}><label htmlFor={id}>Your email address</label><div className="subscribe-fields"><input id={id} type="email" maxLength={254} required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} aria-describedby={`${id}-note`} /><button className="refined-button" disabled={status === 'saving'}>{status === 'saving' ? 'Subscribing…' : 'Subscribe'}<ArrowRight size={17} /></button></div><p id={`${id}-note`} className="form-note">By subscribing, you agree to receive product updates. See our <Link to="/privacy-policy">Privacy Policy</Link>.</p>{error && <p role="alert" className="form-error">{error}</p>}</form>}
  </div>;
}
