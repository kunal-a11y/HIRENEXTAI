import React from "react";
import { Link } from "react-router-dom";
import { Logo } from "../Logo";
import { Github, Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { Linkedin, Instagram, Twitter, Youtube } from "./socialIcons";
import { motion } from "framer-motion";

const companyLinks = [
  { label: "About Us", href: "/about" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Updates", href: "/updates" },
];

const supportLinks = [
  { label: "Help Center", href: "/help" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Cookie Policy", href: "/cookies" },
  { label: "Refund Policy", href: "/refund-policy" },
];

const socials = [
  { icon: Github, href: "https://github.com/kunal-a11y/HIRENEXTAI-", label: "GitHub", color: "#24292F" },
  { icon: Linkedin, href: "#", label: "LinkedIn", color: "#0A66C2" },
  { icon: Instagram, href: "#", label: "Instagram", color: "#E1306C" },
  { icon: Twitter, href: "#", label: "Twitter", color: "#000000" },
  { icon: Youtube, href: "#", label: "YouTube", color: "#FF0000" },
];

function FooterLink({ href, label }) {
  return (
    <Link
      to={href}
      className="inline-flex items-center text-[#555555] hover:text-black text-[13px] font-semibold transition-colors duration-300 group py-0.5"
    >
      <span className="relative">
        {label}
        <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-black origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100" />
      </span>
      <ArrowUpRight className="w-3.5 h-3.5 ml-1.5 opacity-0 -translate-x-1 translate-y-0.5 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300 text-black shrink-0" />
    </Link>
  );
}

function ContactItem({
  icon: Icon,
  eyebrow,
  children,
  glowColorClass,
  delay = 0,
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: "easeOut", delay }}
      className={`group flex items-center gap-3 rounded-xl border border-[#EAEAEA] bg-[#FAFAFA] px-3.5 py-3 transition-all duration-300 hover:-translate-y-[5px] hover:border-neutral-300 ${glowColorClass}`}
    >
      <div className="w-8 h-8 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center transition-all duration-300 group-hover:bg-black group-hover:border-black shrink-0">
        <Icon className="w-3.5 h-3.5 transition-colors duration-300 text-black group-hover:text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-[#888888] uppercase font-bold tracking-wide">{eyebrow}</p>
        {children}
      </div>
    </motion.div>
  );
}

function FooterColumn({ title, links, delay = 0 }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
      className="rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C4C4C4] hover:bg-neutral-50 hover:shadow-sm"
    >
      <h4 className="text-black text-[11px] font-bold uppercase tracking-widest mb-3">{title}</h4>
      <ul className="space-y-2">
        {links.map(({ label, href }) => (
          <li key={label}>
            <FooterLink href={href} label={label} />
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export function Footer() {
  return (
    <footer id="contact" className="bg-[#FFFFFF] border-t border-[#EAEAEA] relative z-10 overflow-hidden mt-auto backdrop-blur-xl">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#EAEAEA] to-transparent" />
      <div className="absolute -top-32 left-1/2 h-56 w-[760px] -translate-x-1/2 rounded-full bg-neutral-50 blur-[90px] pointer-events-none opacity-50" />
      <div className="absolute bottom-0 right-[-8%] h-48 w-72 rounded-full bg-neutral-50 blur-[90px] pointer-events-none opacity-50" />

      <div className="max-w-7xl mx-auto px-6 pt-7 pb-5 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.35fr_0.85fr_0.85fr_0.85fr] gap-5 lg:gap-7 mb-5">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="space-y-3 rounded-2xl border border-[#EAEAEA] bg-[#FAFAFA] p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C4C4C4] hover:bg-neutral-50 hover:shadow-sm"
          >
            <Link to="/" className="inline-block transition-opacity hover:opacity-80 text-black">
              <Logo size="sm" />
            </Link>
            <p className="text-[#555555] text-[13px] leading-relaxed max-w-[260px]">
              The intelligent hiring ecosystem powering the next generation of careers and recruiting.
            </p>
            <div className="flex items-center gap-2.5">
              {socials.map(({ icon: Icon, href, label, color }) => (
                <motion.a
                  key={label}
                  href={href}
                  aria-label={label}
                  whileHover={{ scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className="w-8 h-8 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center text-black transition-all duration-300 relative group overflow-hidden"
                >
                  {/* Hover brand fill */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
                    style={{ 
                      background: label === "Instagram" 
                        ? "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" 
                        : color 
                    }}
                  />
                  {/* Icon */}
                  <Icon className="w-3.5 h-3.5 relative z-10 transition-colors duration-300 text-black group-hover:text-white" />
                  
                  {/* Soft glow on hover */}
                  <div 
                    className="absolute -inset-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-[8px] -z-10 rounded-full"
                    style={{ 
                      background: label === "Instagram" 
                        ? "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)" 
                        : color 
                      }}
                  />
                </motion.a>
              ))}
            </div>
          </motion.div>

          <FooterColumn title="Company" links={companyLinks} delay={0.05} />
          <FooterColumn title="Support" links={supportLinks} delay={0.1} />
          <FooterColumn title="Legal" links={legalLinks} delay={0.15} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 rounded-2xl bg-[#FAFAFA] border border-[#EAEAEA] p-2 mb-4">
          <ContactItem icon={Mail} eyebrow="Email" glowColorClass="hover:shadow-[0_10px_35px_rgba(59,130,246,0.12)]" delay={0.05}>
            <a href="mailto:support@hirenextai.com" className="text-[13px] text-black hover:text-neutral-700 transition-colors font-medium">support@hirenextai.com</a>
          </ContactItem>
          <ContactItem icon={Phone} eyebrow="Phone" glowColorClass="hover:shadow-[0_10px_35px_rgba(34,197,94,0.12)]" delay={0.1}>
            <a href="tel:+918287742269" className="text-[13px] text-black hover:text-neutral-700 transition-colors font-medium">+91 82877 42269</a>
          </ContactItem>
          <ContactItem icon={MapPin} eyebrow="Location" glowColorClass="hover:shadow-[0_10px_35px_rgba(139,92,246,0.12)]" delay={0.15}>
            <p className="text-[13px] text-black truncate font-medium">Greater Noida, India</p>
          </ContactItem>
        </div>

        <div className="pt-4 border-t border-[#EAEAEA] flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
          <p className="text-[#888888] text-[12px] w-full sm:w-auto font-medium">
            Copyright 2026 HireNextAI. All rights reserved.
          </p>
          <div className="flex items-center justify-center gap-2 text-[#888888] font-medium">
            <Link to="/privacy-policy" className="text-[#888888] text-[12px] hover:text-black transition-colors duration-300">Privacy</Link>
            <span>&bull;</span>
            <Link to="/terms" className="text-[#888888] text-[12px] hover:text-black transition-colors duration-300">Terms</Link>
            <span>&bull;</span>
            <Link to="/contact" className="text-[#888888] text-[12px] hover:text-black transition-colors duration-300">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
