import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import useUIStore from '../../store/useUIStore';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';
export default function PricingModal() {
  const { pricingModalOpen, setPricingModalOpen } = useUIStore();
  return <Dialog open={pricingModalOpen} onOpenChange={setPricingModalOpen}><DialogContent className="max-w-md rounded-2xl bg-white p-8 z-[1200] text-slate-800"><span className="eyebrow"><Sparkles size={16} /> Your next step</span><DialogTitle className="text-2xl">Room to do more.</DialogTitle><DialogDescription className="text-sm leading-relaxed text-slate-500">Compare Free, Plus and Pro, with clear monthly and yearly totals before you choose.</DialogDescription><ul className="space-y-3 text-sm text-slate-600 py-3">{['More AI preparation requests', 'Resume and interview tools', 'One-time purchases without automatic renewal'].map(item => <li key={item} className="flex gap-2"><Check size={18} className="text-teal-600 shrink-0" />{item}</li>)}</ul><Link to="/pricing" onClick={() => setPricingModalOpen(false)} className="refined-button">Compare plans <ArrowRight size={18} /></Link></DialogContent></Dialog>;
}
