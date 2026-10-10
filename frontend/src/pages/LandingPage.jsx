import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, LayoutDashboard, Mic, Search, Target, Zap } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

const features = [
  { title: 'AI Job Search', icon: Search, description: 'AI finds jobs from LinkedIn & Indeed using your connected accounts.' },
  { title: 'Smart Matching', icon: Target, description: 'Match percentage score shows which jobs suit your profile best.' },
  { title: 'Auto Apply', icon: Zap, description: 'Chrome extension fills application forms automatically for you.' },
  { title: 'Mock Interview', icon: Mic, description: 'Practice with AI before real interviews and get instant feedback.' },
  { title: 'Job Tracker', icon: LayoutDashboard, description: 'Track all your applications and statuses in one clean dashboard.' },
  { title: 'Global Jobs', icon: Globe, description: 'Find jobs from 50+ countries in your preferred language.' }
];

const plans = [
  { name: 'Free', price: '$0', period: '/month', button: 'Start Free', tone: 'light', features: ['10 AI messages / day', '5 job searches / day', 'Basic match score'] },
  { name: 'Pro', price: '$9', period: '/month', button: 'Get Pro', tone: 'featured', badge: 'Most Popular', features: ['Unlimited AI messages', 'Unlimited job searches', 'AI auto apply'] },
  { name: 'Max', price: '$19', period: '/month', button: 'Upgrade to Max', tone: 'light', features: ['Everything in Pro', 'Priority matching', 'Global language support'] },
  { name: 'Business', price: 'Custom', period: '', button: 'Contact Sales', tone: 'light', features: ['Team workspace', 'Recruiter workflows', 'Dedicated support'] }
];

const sectionIdFor = (label) => ({
  Home: 'hero',
  Features: 'features',
  Pricing: 'pricing',
  Updates: 'updates',
  About: 'about',
  Contact: 'contact'
}[label] || 'hero');

export default function LandingPage() {
  const navigate = useNavigate();
  const rootRef = useRef(null);

  const goToSection = (label) => {
    const root = rootRef.current;
    if (!root) return;
    const target = root.querySelector(`#${sectionIdFor(label)}`);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div ref={rootRef} className="hn-landing">
      <style>{`
        .hn-landing {
          min-height: 100vh;
          overflow-x: hidden;
          background: #FFFFFF;
          color: #000000;
          font-family: 'DM Sans', sans-serif;
          scroll-behavior: smooth;
        }
        .hn-landing * { box-sizing: border-box; }
        .hn-heading, .hn-section-title, .hn-card-title, .hn-plan-name, .hn-plan-price {
          font-family: 'Syne', sans-serif;
        }
        .hn-hero {
          min-height: 100vh;
          padding: 120px 48px 72px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hn-hero-inner { max-width: 800px; text-align: center; }
        .hn-heading {
          font-size: clamp(48px, 8vw, 72px);
          font-weight: 800;
          letter-spacing: -3px;
          line-height: 1.05;
          margin: 0 0 20px;
        }
        .hn-subtitle {
          font-size: 18px;
          color: rgba(0,0,0,0.55);
          line-height: 1.6;
          margin: 0 auto 32px;
          max-width: 520px;
        }
        .hn-hero-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .hn-primary-button, .hn-secondary-button {
          border: none; cursor: pointer; font-size: 15px; font-weight: 600;
          padding: 14px 28px; border-radius: 10px; transition: all 0.2s;
        }
        .hn-primary-button { background: #000; color: #fff; }
        .hn-primary-button:hover { background: #111111; transform: translateY(-1px); }
        .hn-secondary-button { background: transparent; color: #000; border: 1px solid rgba(0,0,0,0.15); }
        .hn-secondary-button:hover { border-color: #000; }
        .hn-section { padding: 96px 48px; max-width: 1180px; margin: 0 auto; }
        .hn-section-label {
          font-size: 11px; font-weight: 600; letter-spacing: 0.12em;
          color: rgba(0,0,0,0.35); text-transform: uppercase; margin-bottom: 12px;
        }
        .hn-section-title { font-size: 42px; font-weight: 800; letter-spacing: -1px; margin: 0 0 48px; }
        .hn-feature-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .hn-feature-card {
          border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 32px;
          transition: all 0.2s;
        }
        .hn-feature-card:hover { border-color: rgba(0,0,0,0.2); transform: translateY(-2px); }
        .hn-icon-box {
          width: 40px; height: 40px; border-radius: 10px; background: #000; color: #fff;
          display: flex; align-items: center; justify-content: center; margin-bottom: 20px;
        }
        .hn-card-title { font-size: 18px; font-weight: 700; margin: 0 0 10px; }
        .hn-card-description { font-size: 14px; color: rgba(0,0,0,0.55); line-height: 1.6; margin: 0; }
        .hn-pricing-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .hn-plan-card {
          border: 1px solid rgba(0,0,0,0.08); border-radius: 16px; padding: 28px;
        }
        .hn-plan-card.featured { background: #000; color: #fff; border-color: #000; }
        .hn-plan-name { font-size: 16px; font-weight: 700; margin-bottom: 8px; }
        .hn-plan-price { font-size: 36px; font-weight: 800; margin-bottom: 20px; }
        .hn-plan-features { list-style: none; padding: 0; margin: 0 0 24px; }
        .hn-plan-features li { font-size: 13px; color: rgba(0,0,0,0.55); margin-bottom: 8px; }
        .hn-plan-card.featured .hn-plan-features li { color: rgba(255,255,255,0.6); }
        .hn-plan-button {
          width: 100%; padding: 12px; border-radius: 8px; border: none; cursor: pointer;
          font-size: 14px; font-weight: 600;
        }
        .hn-cta {
          background: #000; color: #fff; padding: 96px 48px; text-align: center;
        }
        .hn-cta-title { font-family: 'Syne', sans-serif; font-size: 48px; font-weight: 800; margin: 0 0 16px; }
        .hn-cta-subtitle { color: rgba(255,255,255,0.55); margin: 0 0 32px; font-size: 16px; }
        .hn-light-button {
          background: #fff; color: #000; padding: 14px 32px; border-radius: 10px;
          border: none; font-size: 15px; font-weight: 600; cursor: pointer;
        }
        @media (max-width: 768px) {
          .hn-hero, .hn-section { padding-left: 22px; padding-right: 22px; }
          .hn-feature-grid, .hn-pricing-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <Navbar onNavClick={goToSection} />

      <main>
        <section id="hero" className="hn-hero">
          <div className="hn-hero-inner">
            <h1 className="hn-heading">Find Your Dream Job<br />with AI</h1>
            <p className="hn-subtitle">
              Connect your accounts. AI finds the best matching jobs. Apply in one click.
            </p>
            <div className="hn-hero-actions">
              <button type="button" className="hn-primary-button" onClick={() => navigate('/signup')}>
                Get Started Free
              </button>
              <button type="button" className="hn-secondary-button" onClick={() => goToSection('Features')}>
                See How It Works
              </button>
            </div>
          </div>
        </section>

        <section id="features" className="hn-section">
          <div className="hn-section-label">FEATURES</div>
          <h2 className="hn-section-title">Everything you need to land your dream job</h2>
          <div className="hn-feature-grid">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className="hn-feature-card">
                  <div className="hn-icon-box"><Icon size={18} /></div>
                  <h3 className="hn-card-title">{f.title}</h3>
                  <p className="hn-card-description">{f.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="pricing" className="hn-section">
          <div className="hn-section-label">PRICING</div>
          <h2 className="hn-section-title">Simple, transparent pricing</h2>
          <div className="hn-pricing-grid">
            {plans.map((plan) => (
              <div key={plan.name} className={`hn-plan-card ${plan.tone === 'featured' ? 'featured' : ''}`}>
                <div className="hn-plan-name">{plan.name}</div>
                <div className="hn-plan-price">{plan.price}<span style={{ fontSize: 14 }}>{plan.period}</span></div>
                <ul className="hn-plan-features">
                  {plan.features.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <button type="button" className="hn-plan-button" onClick={() => navigate('/signup')}>
                  {plan.button}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section id="updates" className="hn-cta">
          <h2 className="hn-cta-title">Start finding jobs with AI today</h2>
          <p className="hn-cta-subtitle">Join thousands of job seekers who landed their dream job with HirenextAI</p>
          <button type="button" className="hn-light-button" onClick={() => navigate('/signup')}>Get Started Free</button>
        </section>
      </main>

      <Footer
        scrollRef={rootRef}
        onNavClick={goToSection}
        onLinkClick={(label) => {
          const normalized = label.toLowerCase();
          if (normalized.includes('privacy')) navigate('/privacy');
          else if (normalized.includes('terms')) navigate('/terms');
          else if (normalized.includes('contact')) goToSection('Contact');
          else if (normalized.includes('help')) goToSection('Contact');
        }}
      />
    </div>
  );
}
