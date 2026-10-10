import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Megaphone, Rocket } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/Logo";
import { useState } from "react";
import { tForLanguage, type TranslationKey } from "@/lib/i18n";

const t = (key: TranslationKey) => tForLanguage("en", key);

const navLinks = [
  { href: "/", label: t("home") },
  { href: "/features", label: t("features") },
  { href: "/pricing", label: t("pricing") },
  { href: "/updates", label: t("updates"), highlight: true },
  { href: "/about", label: t("about") },
  { href: "/contact", label: t("contact") },
];

export function Navbar() {
  const { isAuthenticated } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed inset-x-0 top-0 z-50 border-b border-[#E0E0E0] bg-[#F7F7F7] backdrop-blur-xl"
    >
      <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Logo size="xs" className="text-black" />
          <span className="hidden select-none items-center gap-1.5 rounded-full border border-[#E0E0E0] bg-gradient-to-r from-white to-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black sm:inline-flex">
            <Rocket className="h-3 w-3" />
            V2 Live
          </span>
        </Link>

        <div className="hidden items-center gap-5 md:flex">
          <div className="flex items-center gap-6">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="group relative py-2 text-sm font-medium text-[#666666] transition-colors duration-200 hover:text-black"
              >
                <span className="inline-flex items-center gap-1.5">
                  {item.href === "/updates" && <Megaphone className="h-3.5 w-3.5 text-black" />}
                  {item.label}
                  {item.highlight && (
                    <span className="rounded-full bg-[#F7F7F7] px-1.5 py-0.5 text-[9px] font-bold leading-none text-black">
                      NEW
                    </span>
                  )}
                </span>
                <span className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-gradient-to-r from-[#999999] to-[#999999] transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </div>

          <div className="h-6 w-px bg-[#F7F7F7]" />

          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary h-10 px-5 text-sm">
              {t("go_dashboard")}
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="rounded-full px-3 py-2 text-sm font-medium text-black/76 transition-colors hover:text-black">
                {t("sign_in")}
              </Link>
              <Link href="/register" className="btn-primary h-10 px-5 text-sm transition-all hover:shadow-[0_0_24px_rgba(255,255,255,0.35)]">
                {t("get_started")}
              </Link>
            </div>
          )}
        </div>

        <button
          className="rounded-xl p-2 text-[#444444] transition-colors hover:bg-[#F2F2F2] hover:text-black hover:text-black md:hidden"
          onClick={() => setMobileOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 border-t border-[#E0E0E0] bg-[#F7F7F7] px-4 py-5 backdrop-blur-xl md:hidden"
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#E0E0E0] bg-gradient-to-r from-white to-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
              <Rocket className="h-3 w-3" />
              V2 Live
            </div>

            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                onClick={() => setMobileOpen(false)}
                className="block rounded-2xl px-3 py-2.5 text-sm font-medium text-[#555555] transition-all hover:bg-[#F2F2F2] hover:text-black hover:text-black"
              >
                <span className="inline-flex items-center gap-2">
                  {item.href === "/updates" && <Megaphone className="h-4 w-4 text-black" />}
                  {item.label}
                  {item.highlight && (
                    <span className="rounded-full bg-[#F7F7F7] px-1.5 py-0.5 text-[9px] font-bold text-black">NEW</span>
                  )}
                </span>
              </Link>
            ))}

            <div className="h-px bg-[#F7F7F7]" />

            {isAuthenticated ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block btn-primary px-5 py-2.5 text-center text-sm">
                {t("go_dashboard")}
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileOpen(false)} className="block rounded-2xl px-3 py-2.5 text-sm font-medium text-[#555555] transition-all hover:bg-[#F2F2F2] hover:text-black hover:text-black">
                  {t("sign_in")}
                </Link>
                <Link href="/register" onClick={() => setMobileOpen(false)} className="block btn-primary px-5 py-2.5 text-center text-sm">
                  {t("get_started")}
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
