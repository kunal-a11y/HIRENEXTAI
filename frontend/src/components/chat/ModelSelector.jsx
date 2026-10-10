import { useEffect } from 'react';
import { ChevronDown, Check, Lock } from 'lucide-react';
import { canUseModel } from '../../lib/modelAccess';
import useUserStore from '../../store/useUserStore';
import useUIStore from '../../store/useUIStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

export const AI_MODELS = [
  { id: 'hirenext-0.1', name: 'HirenextAI 0.1', description: 'Balanced for everyday tasks' },
  { id: 'hirenext-flash', name: 'HirenextAI Flash ⚡', description: 'Fastest responses' },
  { id: 'hirenext-pro', name: 'HirenextAI Pro 🚀', description: 'Highest quality responses' }
];

const ModelSelector = ({ selectedModel, onSelect, open, onOpenChange }) => {
  const { t } = useTranslation();
  const user = useUserStore(s => s.user);

  const current = AI_MODELS.find((m) => m.id === selectedModel) || AI_MODELS[0];

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-model-selector]')) onOpenChange(false);
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [open, onOpenChange]);

  return (
    <div className="relative" data-model-selector>
      <button
        type="button"
        aria-label="Choose AI model"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className={` flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full text-[12px] font-medium border transition-all duration-200 ${open ? 'bg-gray-100 border-[#E0E0E0] text-black' : 'bg-white border-[#E0E0E0] text-gray-700 hover:bg-gray-50'} `}
      >
        <span className="max-w-[120px] truncate">{current.name}</span>
        <ChevronDown
          size={14}
          className={`text-gray-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full left-0 mb-2 z-[200] origin-bottom-left w-[280px]"
          >
            <div className="rounded-2xl border border-[#E0E0E0] bg-white shadow-2xl overflow-hidden p-1.5 space-y-1">
              <div className="px-3 py-1 border-b border-gray-100/50 shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Select Model</p>
              </div>
              <div className="space-y-0.5">
                {AI_MODELS.map((model) => {
                  const isSelected = selectedModel === model.id;
                  const locked = !canUseModel(model.id, user);
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        if (locked) { useUIStore.getState().setPricingModalOpen(true); onOpenChange(false); return; }
                        onSelect(model.id);
                        onOpenChange(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start justify-between gap-2.5 transition-colors ${
                        isSelected
                          ? 'bg-[#F7F7F7] font-medium text-black'
                          : 'hover:bg-gray-50 text-gray-700 hover:text-black'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold leading-tight">{model.name}</p>
                        <p className="text-[11px] text-gray-500 mt-1 leading-normal font-normal">{model.description}</p>
                        {locked && <span className="inline-flex items-center gap-1 text-xs text-blue-700 mt-1"><Lock size={12} /> Pro plan required</span>}
                      </div>
                      {isSelected && (
                        <Check size={14} className="text-black shrink-0 mt-0.5" strokeWidth={2.5} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModelSelector;
