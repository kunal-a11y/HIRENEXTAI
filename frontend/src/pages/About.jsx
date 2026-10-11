import React from 'react';
import { Linkedin, Github, Instagram, Compass, Heart, Sparkles, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Reveal, CareerCTA } from '../components/marketing/Refinements';
import { Link } from 'react-router-dom';
export default function About() {
  return <div className="refined-page"><Navbar /><main>
    <div className="page-halo"><header className="refined-hero"><span className="eyebrow">A career is a journey</span><h1>Built for the person<br /><span className="accent-text">behind the resume.</span></h1><p>Hirenext brings preparation, practice and organisation into one place, so your next career move feels a little more manageable.</p></header></div>
    <section className="section-wrap about-story"><Reveal><span className="eyebrow">Why we're here</span><h2>Less time juggling tools.<br />More room for your next step.</h2><p>A job search can mean rewriting your resume, preparing for interviews and keeping track of every application. We are building a workspace that connects those steps.</p><p>AI can help with a first draft or a fresh perspective. Your experience, your judgement and your voice still come first. Hirenext is a tool to support your decisions.</p><Link to="/features" className="text-link">Explore the workspace <ArrowUpRight size={17} /></Link></Reveal><Reveal className="about-note" delay={.08}><Compass size={35} color="#2563eb" /><h3>A clearer direction, at your pace.</h3><p>Prepare a resume that reflects your work. Practise explaining what you do best. Keep the details of your search together.</p><span className="status-pill">Prepare · Practise · Progress</span></Reveal></section>
    <section className="section-wrap" style={{ paddingTop: 0 }}><div className="about-values">{[{ Icon: Heart, title: 'People before promises', text: 'Useful support without invented success rates, user counts or guarantees of a job.' }, { Icon: Sparkles, title: 'AI with your judgement', text: 'Use suggestions as a starting point. Review details and make every application your own.' }, { Icon: ShieldCheck, title: 'Careful by design', text: 'Checked sessions, restricted admin access and server-side payment verification are part of how we build.' }].map(({ Icon, title, text }, i) => <Reveal key={title} delay={i * .06}><article><Icon size={25} /><h3>{title}</h3><p>{text}</p></article></Reveal>)}</div></section>
    <section className="section-wrap founder-section" aria-labelledby="founder-heading"><Reveal className="founder-card">
      <div className="founder-portrait"><img src="/kunal-logo.jpg" alt="Kunal Purohit’s personal logo" width="240" height="240" loading="lazy" /><span className="status-pill">Founder · Hirenext</span></div>
      <div className="founder-copy"><span className="eyebrow">The person behind Hirenext</span><h2 id="founder-heading">Kunal Purohit</h2><p>I'm building Hirenext to bring the moving parts of a job search into one thoughtful workspace — from preparing a resume to practising for the next interview.</p><p>Have an idea, a question or feedback? Find me and the community below.</p>
        <div className="founder-socials">
          <a className="founder-social founder-social-discord" href="https://discord.gg/ZRB3CgVg2B" target="_blank" rel="noopener noreferrer" aria-label="Join Kunal’s Discord community (opens a new tab)"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.3 4.4A20 20 0 0 0 15.5 3l-.6 1.2a18 18 0 0 0-5.8 0L8.5 3a20 20 0 0 0-4.8 1.4C.7 9 .1 13.5.5 18a20 20 0 0 0 5.9 3l1.2-2a13 13 0 0 1-1.9-.9l.5-.4a16 16 0 0 0 11.6 0l.5.4a13 13 0 0 1-1.9.9l1.2 2a20 20 0 0 0 5.9-3c.5-5.2-.9-9.7-3.2-13.6ZM8.3 15.4c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Zm7.4 0c-1.1 0-1.9-1-1.9-2.2s.8-2.2 1.9-2.2 1.9 1 1.9 2.2-.8 2.2-1.9 2.2Z" /></svg></a>
          <a className="founder-social founder-social-instagram" href="https://www.instagram.com/kun_alpurohit/" target="_blank" rel="noopener noreferrer" aria-label="Kunal on Instagram (opens a new tab)"><Instagram size={23} aria-hidden="true" /></a>
          <a className="founder-social founder-social-github" href="https://github.com/kunal-a11y" target="_blank" rel="noopener noreferrer" aria-label="Kunal on GitHub (opens a new tab)"><Github size={23} aria-hidden="true" /></a>
          <a className="founder-social founder-social-linkedin" href="https://www.linkedin.com/in/kunal-purohit-74a0933b6/" target="_blank" rel="noopener noreferrer" aria-label="Kunal on LinkedIn (opens a new tab)"><Linkedin size={23} aria-hidden="true" /></a>
        </div>
      </div>
    </Reveal></section>

  </main><Footer /></div>;
}
