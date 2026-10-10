import React, { useMemo, useRef, useState } from 'react';
import { Search, Check, ChevronDown, ArrowUpRight } from 'lucide-react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Reveal, UpdateSubscriptionForm } from '../components/marketing/Refinements';
import { ScrollTimelineTrack, TimelineNode } from '../components/ui/timeline';
const releases = [
  { version: 'Product update', date: 'October 9, 2026', category: 'Design', title: 'A little more clarity. A little more colour.', intro: 'A familiar Hirenext, with a more considered experience from the homepage to your career workspace.', items: ['A continuous brand row with consistent logo spacing and a pause control.', 'Refined feature cards, clearer monthly and yearly pricing, and a more readable FAQ.', 'A calmer chat workspace, polished account screens and a dedicated Alerts view for admins.'] },
  { version: 'Security update', date: 'October 9, 2026', category: 'Security', title: 'Stronger checks behind every sign-in.', intro: 'Account access and payment confirmation are checked on the server.', items: ['Admin access is restricted to approved accounts with email verification.', 'Session revocation, login limits and single-use password reset links.', 'Payment orders are tied to an account and checked against the provider before activation.'] },
  { version: 'Stay connected', date: 'October 9, 2026', category: 'Product', title: 'Product updates, in one place.', intro: 'A refreshed release timeline and a simple way to register for future log alerts.', items: ['Timeline markers activate when the progress line reaches them.', 'Subscription emails are saved to the admin Alerts section.', 'The Chrome extension remains paused while the website continues to improve.'] },
  { version: 'Milestone', date: '2025', category: 'Company', title: 'Angel backing for the next chapter.', intro: 'Hirenext received backing from an angel investor in 2025, supporting the work to build a better career platform.', items: ['The investor identity and investment amount remain private.', 'Our focus continues to be practical tools for job seekers.'] },
];
export default function Updates() {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({ 'Product update': true });
  const containerRef = useRef(null);
  const filtered = useMemo(() => releases.filter(item => (category === 'All' || item.category === category) && `${item.title} ${item.intro} ${item.items.join(' ')}`.toLowerCase().includes(search.toLowerCase())), [category, search]);
  return <div className="refined-page"><Navbar /><main>
    <div className="page-halo"><header className="refined-hero"><span className="eyebrow">The Hirenext changelog <ArrowUpRight size={15} /></span><h1>Always moving<br /><span className="accent-text">a little forward.</span></h1><p>New ideas, thoughtful improvements and the milestones shaping your career workspace.</p></header></div>
    <div className="update-controls"><div className="filter-pills" aria-label="Filter updates">{['All', 'Design', 'Security', 'Product', 'Company'].map(item => <button key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div><label className="update-search"><Search size={17} /><input type="search" aria-label="Search updates" placeholder="Search the changelog" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
    {filtered.length ? <div ref={containerRef} className="updates-timeline"><ScrollTimelineTrack containerRef={containerRef} lineXClass="left-[34px] md:left-[48px]" topOffset={23} bottomOffset={60} />{filtered.map(item => <article key={item.version} className="update-entry"><TimelineNode containerRef={containerRef} nodeClass="left-6 top-[12px]" /><Reveal className="update-card"><div className="update-meta"><span className="update-version">{item.version}</span><time>{item.date}</time><span className="update-category">{item.category}</span></div><h2>{item.title}</h2><p>{item.intro}</p><button className="update-details-toggle" aria-expanded={!!expanded[item.version]} aria-controls={`release-${item.category}`} onClick={() => setExpanded(s => ({ ...s, [item.version]: !s[item.version] }))}>{expanded[item.version] ? 'Hide details' : 'See what changed'}<ChevronDown size={15} className={expanded[item.version] ? 'rotate-180' : ''} /></button>{expanded[item.version] && <ul id={`release-${item.category}`}>{item.items.map(text => <li key={text}><Check size={15} />{text}</li>)}</ul>}</Reveal></article>)}</div> : <p className="alerts-empty" role="status">No matching updates. Try another search or category.</p>}
    <section className="section-wrap"><UpdateSubscriptionForm /></section>
  </main><Footer /></div>;
}
