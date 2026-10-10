import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useEffect } from "react";
function ToastItem({ id, title, description, variant, onDismiss }) {
    useEffect(() => {
        const t = setTimeout(() => onDismiss(id), 4500);
        return () => clearTimeout(t);
    }, [id, onDismiss]);
    const isError = variant === "destructive";
    const isSuccess = !isError && (String(title).toLowerCase().includes("success") || String(title).includes("🎉") || String(title).includes("✅") || String(title).includes("sent") || String(title).includes("saved") || String(title).includes("created"));
    const isWarning = !isError && !isSuccess && (String(title).toLowerCase().includes("warn") || String(title).toLowerCase().includes("limit") || String(title).toLowerCase().includes("cancel"));
    const config = isError ? { icon: XCircle, iconCls: "text-red-500", border: "border-neutral-800", bg: "bg-[#111111]", bar: "bg-red-500" }
        : isSuccess ? { icon: CheckCircle2, iconCls: "text-emerald-500", border: "border-neutral-800", bg: "bg-[#111111]", bar: "bg-emerald-500" }
            : isWarning ? { icon: AlertTriangle, iconCls: "text-amber-500", border: "border-neutral-800", bg: "bg-[#111111]", bar: "bg-amber-500" }
                : { icon: Info, iconCls: "text-blue-500", border: "border-neutral-800", bg: "bg-[#111111]", bar: "bg-blue-500" };
    const Icon = config.icon;
    return (<motion.div initial={{ opacity: 0, y: -16, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12, scale: 0.96 }} transition={{ type: "spring", stiffness: 380, damping: 28 }} className={`relative flex items-start gap-3 w-full max-w-sm rounded-2xl border ${config.border} ${config.bg} backdrop-blur-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden`}>
      {/* Progress bar */}
      <motion.div className={`absolute bottom-0 left-0 h-0.5 ${config.bar}`} initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 4.5, ease: "linear" }}/>

      <div className={`mt-0.5 shrink-0 ${config.iconCls}`}>
        <Icon className="w-4.5 h-4.5"/>
      </div>

      <div className="flex-1 min-w-0">
        {title && <p className="text-sm font-semibold text-white leading-snug">{title}</p>}
        {description && <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{description}</p>}
      </div>

      <button onClick={() => onDismiss(id)} className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[#888888] hover:text-white hover:bg-neutral-800 transition-all">
        <X className="w-3 h-3"/>
      </button>
    </motion.div>);
}
export function Toaster() {
    const { toasts, dismiss } = useToast();
    return (<div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="sync">
        {toasts.filter(t => t.open !== false).map(toast => (<div key={toast.id} className="pointer-events-auto">
            <ToastItem id={toast.id} title={toast.title} description={toast.description} variant={toast.variant ?? undefined} onDismiss={dismiss}/>
          </div>))}
      </AnimatePresence>
    </div>);
}
