import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { Reveal, FAQSection, CareerCTA } from '../components/marketing/Refinements';
import useAuthStore from '../store/useAuthStore';
import api from '../lib/api';
let checkoutLoader;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutLoader) checkoutLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = resolve;
    script.onerror = () => { checkoutLoader = null; script.remove(); reject(new Error('Checkout could not load. Please try again.')); };
    document.body.appendChild(script);
  });
  return checkoutLoader;
}
const format = amount => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(amount / 100);
const questions = [
  { q: 'What is the difference between monthly and yearly?', a: 'Monthly purchases provide 30 days of access. Yearly purchases provide 365 days, paid upfront at the total displayed on the card. These are one-time purchases and do not renew automatically. Renewing the same plan extends its remaining time. Choosing a different plan replaces it and starts a new access period.' },
  { q: 'When does my plan become active?', a: 'After the payment provider confirms a captured payment and our server verifies it. A failed or cancelled payment does not activate a plan.' },
  { q: 'How do AI limits work?', a: 'Daily request limits depend on your plan and selected model. Resume, cover letter and interview limits are tracked separately. AI tools also need an available provider connection.' },
  { q: 'Where can I ask about a payment?', a: 'Contact the team with your order reference. You can read the Refund Policy from the footer before making a purchase.' },
];
export default function Pricing() {
  const [annual, setAnnual] = useState(false);
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(null);
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  const { isAuthenticated, user, updateUser, fetchMe } = useAuthStore();
  const navigate = useNavigate();
  useEffect(() => {
    let current = true; setError('');
    api.get('/payment/catalog').then(({ data }) => { if (current) setCatalog(data); }).catch(() => { if (current) setError('Pricing could not load. Please try again.'); });
    return () => { current = false; };
  }, [retry]);
  const pay = async plan => {
    setError(''); setMessage('');
    if (plan.name === 'free') { navigate(isAuthenticated ? '/chat' : '/register'); return; }
    if (!isAuthenticated) { navigate('/register', { state: { redirectAfter: '/pricing' } }); return; }
    setPaying(plan.name);
    try {
      const { data: order } = await api.post('/payment/create-order', { planId: plan.id, billing: annual ? 'annual' : 'monthly', currency: 'INR' });
      await loadCheckout();
      const checkout = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
        name: 'Hirenext', description: `${plan.title} - ${annual ? '365 days' : '30 days'}`,
        prefill: { name: user?.name || '', email: user?.email || '' }, theme: { color: '#2563eb' },
        handler: async response => {
          try {
            const { data } = await api.post('/payment/verify', response);
            await fetchMe(); setMessage(`Your ${plan.title} plan is active. Your workspace is ready.`);
          } catch (err) { setError(`We could not confirm this payment yet. Keep order reference ${order.orderId} and contact support if you were charged.`); }
          finally { setPaying(null); }
        },
        modal: { ondismiss: () => { setPaying(null); setMessage('Checkout closed. Your plan has not changed.'); } },
      });
      checkout.on('payment.failed', () => { setError('Payment was not completed. You can retry in checkout or close it to choose again.'); });
      checkout.open();
    } catch (err) { setError(err.response?.data?.error || err.message || 'Checkout could not start.'); setPaying(null); }
  };
  return <div className="refined-page"><Navbar /><main>
    <div className="page-halo"><header className="refined-hero"><span className="eyebrow">A plan for your next step</span><h1>Small investment.<br /><span className="accent-text">Room to grow.</span></h1><p>Start free. Choose more support when your search needs it. Clear prices, with no automatic renewals.</p><div className="pricing-toggle" aria-label="Billing period">{[false, true].map(yearly => <button key={String(yearly)} aria-pressed={annual === yearly} onClick={() => setAnnual(yearly)}>{annual === yearly && <motion.div className="toggle-active" layoutId="billing-toggle" transition={{ type: 'spring', stiffness: 350, damping: 30 }} />}<span>{yearly ? 'Yearly' : 'Monthly'}{yearly && <small>Save ~20%</small>}</span></button>)}</div></header></div>
    <section className="section-wrap" style={{ paddingTop: 12 }}>
      {error && <div role="alert" className="form-error" style={{ textAlign: 'center', marginBottom: 25 }}>{error}{!catalog && <button onClick={() => setRetry(x => x + 1)} className="text-link" style={{ marginLeft: 12 }}>Retry</button>}</div>}
      {message && <p role="status" className="checkout-note" style={{ marginBottom: 25, color: '#137461' }}>{message}</p>}
      {!catalog && !error && <p role="status" className="alerts-empty">Loading plans...</p>}
      <div className="pricing-grid">{catalog?.plans.map((plan, i) => <Reveal key={plan.id} delay={i * .06} className={`plan-card ${plan.name === 'plus' ? 'featured' : ''}`}>{plan.name === 'plus' && <span className="plan-badge">A balanced next step</span>}<h2>{plan.title}</h2><p>{plan.tagline}</p><div className="plan-price"><span>₹</span><strong>{format(annual ? plan.annual / 12 : plan.monthly)}</strong><span>/ month</span></div><div className="plan-billing">{plan.name === 'free' ? 'Free to start. No payment needed.' : annual ? `₹${format(plan.annual)} paid once for 365 days` : `₹${format(plan.monthly)} paid once for 30 days`}</div><ul>{plan.features.map(feature => <li key={feature}><Check size={17} />{feature}</li>)}</ul><button className="refined-button" disabled={paying !== null || (plan.name !== 'free' && !catalog.configured)} onClick={() => pay(plan)}>{paying === plan.name ? <><Loader2 size={17} className="animate-spin" />Opening checkout...</> : plan.name === 'free' ? <>Get started free <ArrowRight size={17} /></> : !catalog.configured ? 'Payments coming soon' : <>Choose {plan.title}<ArrowRight size={17} /></>}</button></Reveal>)}</div>
      <p className="checkout-note"><ShieldCheck size={16} className="inline mr-1" />{catalog?.configured ? 'Checkout is handled by Razorpay. The total shown is the amount sent to checkout.' : 'Paid checkout is not available yet. You can still create a free account and explore Hirenext.'}</p>
    </section><FAQSection questions={questions} />
  </main><Footer /></div>;
}
