import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import {
  RotateCcw, Clock3, Wallet, Ban, ShieldCheck, Mail, Sparkles, CheckCircle, AlertTriangle, ArrowRight, Globe, Lock, CreditCard, Info, ChevronDown, XCircle
} from "lucide-react";
import { Link } from "react-router-dom";

function FadeUp({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const sections = [
  {
    icon: Clock3,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Time Limit",
    title: "48-Hour Refund Window",
    points: [
      "You can request a full refund within 48 hours of your original subscription purchase — no questions asked.",
      "Refund requests submitted after the 48-hour window are not eligible for a cash refund.",
      "After 48 hours, you can still cancel your subscription at any time to stop future renewals.",
      "The 48-hour window starts from the exact time of your payment, not the calendar day.",
    ],
  },
  {
    icon: Wallet,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Usage Rules",
    title: "Usage-Based Refund Logic",
    points: [
      "If AI credits or paid features have already been consumed, we deduct the value of usage before processing any refund.",
      "If the full purchased quota has been used within 48 hours, no refund will be issued.",
      "If only part of the quota has been used, any approved refund will be based on the unused portion only.",
      "We calculate usage fairly and transparently — you can view your usage history in Dashboard → Usage.",
    ],
  },
  {
    icon: Ban,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "After Window",
    title: "After 48 Hours",
    points: [
      "Refunds are not available after 48 hours from the time of purchase.",
      "Cancelling after 48 hours will only stop billing from the next renewal cycle.",
      "Your current billing period remains active and accessible until it expires naturally.",
      "This policy applies to all paid plans including Pro and Premium.",
    ],
  },
  {
    icon: ShieldCheck,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Cancellation",
    title: "Cancellation Policy",
    points: [
      "You can cancel your subscription at any time from Dashboard → Subscription → Cancel Plan.",
      "Cancellation does not remove access immediately — your plan stays active until the end of the billing period.",
      "Approved cancellations with refunds are only processed if within the 48-hour window and meet usage rules.",
      "There are no cancellation fees. Cancel anytime, no questions asked.",
    ],
  },
  {
    icon: Globe,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Global",
    title: "International Payments",
    points: [
      "All payments are processed in USD via Stripe. Local currency display is for reference only.",
      "Refunds are returned to the original payment method used at the time of purchase.",
      "International bank processing times for refunds may vary between 5–10 business days depending on your bank.",
      "Currency conversion differences are not refundable as they are determined by your bank or card provider.",
    ],
  },
  {
    icon: Mail,
    color: "text-white",
    bg: "bg-[#111111] border-[#E0E0E0]",
    tag: "Support",
    title: "How to Request a Refund",
    points: [
      "To request a refund, visit our Contact page and submit a refund request within 48 hours of purchase.",
      "Please include your registered email address, payment date, and transaction reference in your request.",
      "We aim to process all eligible refund requests within 2 business days of receiving them.",
      "For faster processing, mark your subject as: REFUND REQUEST — [your email]",
    ],
  },
];

export default function RefundPolicy() {
  const [openSection, setOpenSection] = useState(0);

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', width: '100%' }} className="bg-background relative">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[15%] top-[-60px] h-[600px] w-[600px] rounded-full bg-[#F7F7F7] blur-[160px]" />
        <div className="absolute bottom-[10%] right-[-60px] h-[400px] w-[400px] rounded-full bg-[#F7F7F7] blur-[130px]" />
        <div className="absolute bottom-[20%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[#F7F7F7] blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.5) 1px,transparent 0)", backgroundSize: "40px 40px" }}
        />
      </div>

      <Navbar />

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-16 pt-40">
        <div className="mb-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] mb-4"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span className="text-[#222222] text-sm font-medium">Refund & Cancellation</span>
          </motion.div>

          <motion.div
            animate={{ rotate: [0, -360] }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="w-16 h-16 rounded-2xl bg-[#F7F7F7] border border-[#E0E0E0] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            <RotateCcw className="w-8 h-8 text-black" />
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-display font-extrabold mb-3 text-black">Refund Policy</h1>
          <p className="text-black/35 text-sm mb-4">Last updated: May 2026</p>
          <p className="text-black/55 max-w-2xl mx-auto text-sm leading-relaxed font-light">
            We keep our refund and cancellation policy simple and fair. You have a full 48-hour money-back guarantee on all new paid subscriptions — no questions asked.
          </p>

          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#F7F7F7] border border-[#E0E0E0] mt-6">
            <CheckCircle className="w-5 h-5 text-black shrink-0" />
            <div className="text-left">
              <p className="text-black font-bold text-sm">48-Hour Money-Back Guarantee</p>
              <p className="text-black text-xs mt-0.5">Full refund on all new paid plans within 48 hours of purchase</p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#555555] text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5 text-black" />
              <span>No Questions Asked</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#555555] text-xs font-medium">
              <XCircle className="w-3.5 h-3.5 text-black" />
              <span>Cancel Anytime</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#555555] text-xs font-medium">
              <Globe className="w-3.5 h-3.5 text-black" />
              <span>Global Coverage</span>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05, y: -2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#555555] text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-black" />
              <span>Secure Payments</span>
            </motion.div>
          </div>
        </div>

        {/* Quick Summary Bar */}
        <FadeUp>
          <div className="glass-card p-6 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <motion.div whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 300 }} className="relative">
              <div className="text-2xl font-display font-extrabold text-black">48 Hours</div>
              <div className="text-xs text-[#777777] mt-1">Full refund window</div>
              <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-0 h-8 border-r border-[#E0E0E0]" />
            </motion.div>

            <motion.div whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 300 }} className="relative">
              <div className="text-2xl font-display font-extrabold text-black">2 Days</div>
              <div className="text-xs text-[#777777] mt-1">Refund processing time</div>
              <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-0 h-8 border-r border-[#E0E0E0]" />
            </motion.div>

            <motion.div whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 300 }} className="relative">
              <div className="text-2xl font-display font-extrabold text-black">0 Fees</div>
              <div className="text-xs text-[#777777] mt-1">No cancellation charges</div>
              <div className="hidden md:block absolute top-1/2 -translate-y-1/2 right-0 h-8 border-r border-[#E0E0E0]" />
            </motion.div>

            <motion.div whileHover={{ scale: 1.04 }} transition={{ type: "spring", stiffness: 300 }}>
              <div className="text-2xl font-display font-extrabold text-black">24/7</div>
              <div className="text-xs text-[#777777] mt-1">Support available</div>
            </motion.div>
          </div>
        </FadeUp>

        {/* Important Info Card */}
        <FadeUp>
          <div className="glass-card p-5 mb-6 border border-[#E0E0E0] bg-[#F7F7F7] flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-black mt-0.5 shrink-0" />
            <div>
              <p className="text-black font-semibold text-sm mb-1">Important: 48-Hour Window Starts at Payment Time</p>
              <p className="text-[#666666] text-xs leading-relaxed font-light">
                Your refund window begins at the exact moment your payment is processed — not at the start of the next calendar day. Check your payment confirmation email for the exact timestamp.
              </p>
            </div>
          </div>
        </FadeUp>

        {/* Accordion Cards */}
        <div className="space-y-4">
          {sections.map((section, i) => {
            const IconComponent = section.icon;
            return (
              <FadeUp key={i} delay={i * 0.06}>
                <motion.div
                  id={`section-${i}`}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="glass-card overflow-hidden cursor-pointer group"
                >
                  <div
                    onClick={() => setOpenSection(openSection === i ? null : i)}
                    className="flex items-center justify-between p-6 select-none"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 ${section.bg}`}>
                        <IconComponent className={`w-5 h-5 ${section.color}`} />
                      </div>
                      <div className="flex items-center">
                        <h2 className="text-base font-bold text-black">{section.title}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-[#F7F7F7] border border-[#E0E0E0] text-[#888888] text-[10px] ml-3">
                          {section.tag}
                        </span>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: openSection === i ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="shrink-0"
                    >
                      <ChevronDown className="w-4 h-4 text-[#777777]" />
                    </motion.div>
                  </div>

                  <AnimatePresence initial={false}>
                    {openSection === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[#E0E0E0] px-6 pb-6 pt-5">
                          <ul className="space-y-3">
                            {section.points.map((point, j) => (
                              <li key={j} className="flex items-start gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 bg-current ${section.color}`} />
                                {i === 5 && j === 0 ? (
                                  <p className="text-[#555555] text-sm leading-relaxed font-light">
                                    <span>To request a refund, </span>
                                    <Link to="/contact" className="text-black hover:text-black underline underline-offset-4 transition-colors font-medium">
                                      visit our Contact page
                                    </Link>
                                    <span> and submit a refund request within 48 hours of purchase.</span>
                                  </p>
                                ) : (
                                  <p className="text-[#555555] text-sm leading-relaxed font-light">{point}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </FadeUp>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="mt-16">
          <FadeUp>
            <div className="glass-card p-10 text-center relative overflow-hidden max-w-3xl mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-white to-[#999999]/6 pointer-events-none" />

              <motion.div
                animate={{ rotate: [0, -360] }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="inline-flex mb-4"
              >
                <RotateCcw className="w-8 h-8 text-black" />
              </motion.div>

              <h2 className="text-2xl font-display font-bold text-black mb-3 relative z-10">Need a Refund or Have a Billing Question?</h2>
              <p className="text-black/55 text-sm mb-6 max-w-lg mx-auto relative z-10 font-light">
                Our support team is available 24/7 to help with refund requests, billing queries, and cancellations. We aim to respond within 24 hours.
              </p>

              <div className="mb-6 relative z-10">
                <Link to="/contact" className="btn-primary py-3 px-8 inline-flex items-center gap-2 text-black font-semibold">
                  <ArrowRight className="w-4 h-4" />
                  <span>Contact Support</span>
                </Link>
              </div>

              <div className="flex flex-wrap gap-4 justify-center mt-5 relative z-10">
                <div className="flex items-center gap-1.5 text-black/35 text-xs">
                  <Clock3 className="w-3.5 h-3.5 text-black" />
                  <span>Refunds within 48 hours</span>
                </div>
                <div className="flex items-center gap-1.5 text-black/35 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-black" />
                  <span>No questions asked</span>
                </div>
                <div className="flex items-center gap-1.5 text-black/35 text-xs">
                  <Globe className="w-3.5 h-3.5 text-black" />
                  <span>24/7 support</span>
                </div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      <Footer />
    </div>
  );
}
