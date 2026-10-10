import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import useUserStore from "../store/useUserStore";
import useUIStore from "../store/useUIStore";
import api from "../lib/api";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Phone,
  ArrowRight,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Briefcase,
  Building2,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { DemoRoleModal } from "../components/DemoRoleModal";
import { motion, AnimatePresence } from "framer-motion";
import OTPVerification from "../components/auth/OTPVerification";

function InputRow({
  icon: Icon,
  type,
  name,
  placeholder,
  value,
  onChange,
  required,
  minLength,
  autoFocus,
  tabIndex,
}) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/[0.1] bg-[#111111] px-4 py-3.5 transition-all duration-200 focus-within:border-[#1F1F1F] focus-within:bg-[#111111] focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]">
      <Icon className="h-4 w-4 shrink-0 text-white/30 transition-colors duration-200 group-focus-within:text-white" />
      <input
        type={type}
        name={name}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        className="min-w-0 flex-1 bg-transparent text-sm leading-none text-white placeholder:text-white/25 focus:outline-none"
      />
    </div>
  );
}

function RolePicker({ role, onChange }) {
  return (
    <div className="mb-1 grid grid-cols-2 gap-2">
      {[
        { value: "job_seeker", label: "Job Seeker", icon: Briefcase, desc: "I'm looking for a job" },
        { value: "recruiter", label: "Recruiter", icon: Building2, desc: "I'm hiring talent" },
      ].map(({ value, label, icon: Icon, desc }) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all duration-200 ${
            role === value
              ? "border-[#1F1F1F] bg-[#111111] text-white"
              : "border-white/10 bg-[#111111] text-white/50 hover:border-white/20 hover:text-white/80"
          }`}
        >
          <Icon className={`h-5 w-5 ${role === value ? "text-white" : "text-white/40"}`} />
          <span className="text-xs font-semibold">{label}</span>
          <span className="text-[10px] text-white/30">{desc}</span>
        </button>
      ))}
    </div>
  );
}

export default function Auth() {
  const { login, signup, isLoading, setDemoMode } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const defaultMode = location.pathname.startsWith("/register") ? "signup" : "signin";
  const [mode, setMode] = useState(defaultMode);
  const [emailStep, setEmailStep] = useState("idle");
  const [phoneStep, setPhoneStep] = useState("idle");
  const [role, setRole] = useState("job_seeker");
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState(null);
  const [otpArray, setOtpArray] = useState(Array(6).fill(""));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setOtp(otpArray.join(""));
  }, [otpArray]);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { showToast } = useUIStore();
  const emailInputRef = useRef(null);
  const API = import.meta.env.VITE_API_URL ?? "/api";
  const authBaseUrl = import.meta.env.VITE_APP_URL?.replace(/\/$/, "") || window.location.origin;
  const demoEnabled = true;

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSendingReset(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      showToast("Reset link sent to your email");
      setForgotPasswordMode(false);
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not send password reset email.");
    } finally {
      setIsSendingReset(false);
    }
  };

  useEffect(() => {
    // Keep internal mode state in sync with route path
    setMode(location.pathname.startsWith("/register") ? "signup" : "signin");
  }, [location.pathname]);

  useEffect(() => {
    if (phoneStep !== "idle" || emailStep !== "form") return;
    const frame = window.requestAnimationFrame(() => {
      emailInputRef.current?.focus();
      emailInputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [emailStep, phoneStep]);

  const reset = (newMode) => {
    setMode(newMode);
    setEmailStep("idle");
    setPhoneStep("idle");
    setForgotPasswordMode(false);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
    setPhone("");
    setOtp("");
    setOtpArray(Array(6).fill(""));
    navigate(newMode === "signup" ? "/register" : "/login");
  };

  const redirectAfterAuth = () => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");
    const redirectState = (location.state as any)?.redirectAfter;
    if (redirectState) {
      navigate(redirectState);
    } else if (redirect) {
      navigate(redirect);
    } else {
      navigate("/chat");
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (mode === "signin") {
        const res = await login(email, password);
        if (res.success) {
          redirectAfterAuth();
        } else {
          setError(res.error || "Login failed. Please check your credentials.");
        }
      } else {
        const res = await signup(name, email, password);
        if (res.success) {
          redirectAfterAuth();
        } else {
          setError(res.error || "Signup failed. Please check your inputs.");
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    const roleQuery = mode === "signup" ? `?role=${role}` : "";
    window.location.href = `${API}/auth/google${roleQuery}`;
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }
    setError("");
    setOtpHint(null);
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to send OTP.");
      setPhoneStep("enter_otp");
      if (data?.otp) setOtpHint(`Dev OTP: ${data.otp}`);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP.");
    }
  };

  const handlePhoneVerifySuccess = (token: string, user: any) => {
    localStorage.setItem("token", token);
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    // Update state in Zustand store
    useAuthStore.setState({
      user: user,
      token: token,
      isAuthenticated: true,
      isDemoMode: false
    });

    // Sync user details to user profile store
    const nameVal = user?.name || '';
    const [firstName = 'User', ...rest] = nameVal.split(' ').filter(Boolean);
    const lastName = rest.join(' ');
    useUserStore.getState().setUser({
      ...user,
      firstName,
      lastName,
      initials: `${firstName[0] || ''}${lastName[0] || firstName[0] || 'U'}`.toUpperCase(),
      demoMode: false
    });

    redirectAfterAuth();
  };


  const handleDemoSelect = (demoRole) => {
    setDemoLoading(true);
    setDemoMode();
    setDemoLoading(false);
    setDemoModalOpen(false);
    redirectAfterAuth();
  };

  if (phoneStep === "enter_otp") {
    return (
      <OTPVerification
        phone={phone}
        onVerify={handlePhoneVerifySuccess}
        onResend={() => handleSendOtp()}
      />
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#111111] p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-[20%] h-[500px] w-[500px] rounded-full bg-[#111111] blur-[120px]" />
        <div className="absolute bottom-[15%] right-[10%] h-[400px] w-[400px] rounded-full bg-[#111111] blur-[100px]" />
        <div className="absolute left-[60%] top-[60%] h-[300px] w-[300px] rounded-full bg-[#111111] blur-[80px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative z-10 mb-8">
        <a href="/" className="block cursor-pointer transition-opacity hover:opacity-80">
          <Logo size="md" />
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative z-10 w-full max-w-[400px]"
      >
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111111] shadow-[0_32px_64px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
          <div className="flex border-b border-white/[0.07]">
            {["signin", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => reset(m)}
                className={`relative flex-1 py-4 text-sm font-semibold transition-all duration-200 ${mode === m ? "text-white" : "text-white/40 hover:text-white/70"}`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
                {mode === m && <motion.div layoutId="auth-tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-white to-white" />}
              </button>
            ))}
          </div>

          <div className="p-7">
            <div className="mb-5 text-center">
              <h1 className="font-display text-[1.4rem] font-bold leading-tight text-white">
                {mode === "signin" ? "Welcome back" : "Get started free"}
              </h1>
              <p className="mt-1.5 text-sm text-white/40">
                {mode === "signin" ? "Sign in to your AI career assistant" : "Your AI-powered job search starts here"}
              </p>
            </div>



            <AnimatePresence>
              {error && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden rounded-xl border border-[#1F1F1F] bg-[#111111] px-4 py-3 text-sm text-white"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4">
              {phoneStep === "idle" ? (
                <>
                  {/* Email & Password Form (Always visible at the top by default) or Forgot Password Form */}
                  {forgotPasswordMode ? (
                    <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                      <div className="group flex items-center gap-3 rounded-xl border border-white/[0.1] bg-[#111111] px-4 py-3.5 transition-all duration-200 focus-within:border-[#1F1F1F] focus-within:bg-[#111111] focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]">
                        <Mail className="h-4 w-4 shrink-0 text-white/30 transition-colors duration-200 group-focus-within:text-white" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="Email address"
                          className="min-w-0 flex-1 bg-transparent text-sm leading-none text-white placeholder:text-white/25 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSendingReset}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-white to-white py-3.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-200 hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSendingReset ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send Reset Link <ArrowRight className="h-4 w-4" /></>}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setForgotPasswordMode(false);
                          setError("");
                        }}
                        className="w-full py-1 text-center text-xs text-white/30 transition-colors hover:text-white/50"
                      >
                        ← Back to login
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleEmailSubmit} className="space-y-3">
                      {mode === "signup" && (
                        <InputRow
                          icon={User}
                          type="text"
                          name="name"
                          placeholder="Full name"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          required
                        />
                      )}

                      <div className="group flex items-center gap-3 rounded-xl border border-white/[0.1] bg-[#111111] px-4 py-3.5 transition-all duration-200 focus-within:border-[#1F1F1F] focus-within:bg-[#111111] focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]">
                        <Mail className="h-4 w-4 shrink-0 text-white/30 transition-colors duration-200 group-focus-within:text-white" />
                        <input
                          ref={emailInputRef}
                          type="email"
                          name="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="Email"
                          autoFocus={mode === "signin"}
                          className="min-w-0 flex-1 bg-transparent text-sm leading-none text-white placeholder:text-white/25 focus:outline-none"
                        />
                      </div>

                      <InputRow
                        icon={Lock}
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />

                      {mode === "signin" && (
                        <div className="text-left mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setForgotPasswordMode(true);
                              setError("");
                            }}
                            className="text-xs text-white transition-colors hover:text-white"
                          >
                            Forgot password?
                          </button>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-white to-white py-3.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-200 hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mode === "signin" ? "Sign In" : "Create Account"} <ArrowRight className="h-4 w-4" /></>}
                      </button>
                    </form>
                  )}

                  {/* Or continue with Divider */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="h-px flex-1 bg-[#111111]" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-white/25">or continue with</span>
                    <div className="h-px flex-1 bg-[#111111]" />
                  </div>

                  {/* Google and Phone Buttons */}
                  <div className="space-y-3">
                    <button
                      onClick={handleGoogleLogin}
                      disabled={googleLoading}
                      className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#111111] py-3.5 text-sm font-semibold text-white shadow-[0_2px_12px_rgba(0,0,0,0.3)] transition-all duration-200 hover:bg-black hover:text-black active:bg-[#111111]"
                    >
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#999999" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#999999" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FFFFFF" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#999999" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continue with Google
                      {googleLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-white0" />}
                    </button>

                    <div className="w-full flex flex-col items-center">
                      <button
                        disabled={true}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-[#111111] py-3.5 text-sm font-medium text-white/40 cursor-not-allowed"
                      >
                        <Phone className="h-4 w-4 shrink-0 text-white" />
                        Continue with Phone
                        <Lock className="h-3.5 w-3.5 shrink-0 text-white fill-white/10 ml-1.5" />
                      </button>
                      <span className="text-[10px] text-white/30 mt-1">Coming soon</span>
                    </div>
                  </div>
                </>
              ) : (
                /* Phone Authentication Sub-Form */
                <AnimatePresence mode="wait">
                  {phoneStep === "enter_phone" && (
                    <motion.form
                      key="phone-input"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      onSubmit={handleSendOtp}
                      className="space-y-2.5"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <button type="button" onClick={() => { setPhoneStep("idle"); setError(""); }} className="shrink-0 px-1 text-xs text-white/30 transition-colors hover:text-white/60">
                          ×
                        </button>
                        <span className="text-xs font-medium text-white/40">Phone OTP</span>
                      </div>
                      <InputRow icon={Phone} type="tel" name="phone" placeholder="+91 98765 43210" value={phone} onChange={e => setPhone(e.target.value)} required autoFocus />
                      <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-black hover:text-black">
                        Send OTP <ArrowRight className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => { setPhoneStep("idle"); setError(""); }} className="w-full py-1 text-center text-xs text-white/30 transition-colors hover:text-white/50">
                        ← Back to email sign in
                      </button>
                    </motion.form>
                  )}

                  {phoneStep === "enter_otp" && (
                    <motion.div
                      key="otp-input"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="space-y-6 text-center"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-1.5 h-6 bg-[#111111] rounded-full mb-4 animate-pulse" />
                        <h2 className="text-xl font-bold text-white tracking-tight">Let's verify your number</h2>
                        <p className="mt-2 text-xs text-white/40 leading-relaxed max-w-[280px] mx-auto">
                          We've sent a 6-digit code to your phone. It'll auto-verify once entered.
                        </p>
                        {otpHint && (
                          <div className="mt-2.5 px-3 py-1.5 rounded bg-[#111111] border border-[#1F1F1F] text-[11px] font-medium text-white">
                            {otpHint}
                          </div>
                        )}
                      </div>

                      {/* Six OTP input boxes */}
                      <div className="flex justify-center gap-2 py-2">
                        {otpArray.map((digit, idx) => (
                          <motion.input
                            key={idx}
                            ref={(el) => (otpRefs.current[idx] = el)}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={digit}
                            onChange={(e) => handleOtpChange(e.target.value, idx)}
                            onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                            whileFocus={{
                              scale: 1.08,
                              borderColor: "#999999",
                              boxShadow: "0 0 15px rgba(255,255,255, 0.35)"
                            }}
                            animate={digit ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className="w-11 h-14 bg-[#111111] border border-white/10 rounded-xl text-center text-xl font-mono font-bold text-white focus:outline-none transition-all"
                          />
                        ))}
                      </div>

                      <div className="text-xs text-white/40">
                        Didn't receive the code?{" "}
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          className="font-bold text-white hover:text-white transition-colors"
                        >
                          Resend
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setPhoneStep("enter_phone");
                          setError("");
                        }}
                        className="text-xs text-white/30 hover:text-white/50 transition-colors block w-full py-1"
                      >
                        ← Back to phone entry
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {demoEnabled && mode === "signup" && phoneStep === "idle" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mt-5 text-center">
                <button onClick={() => setDemoModalOpen(true)} className="group inline-flex items-center gap-1.5 text-sm text-white/30 transition-colors hover:text-white/60">
                  <Sparkles className="h-3.5 w-3.5 text-white transition-colors group-hover:text-white" />
                  Try Demo First
                </button>
              </motion.div>
            )}
          </div>

          <div className="px-7 pb-6 text-center">
            <p className="text-xs leading-relaxed text-white/25">
              By continuing, you agree to HirenextAI's{" "}
              <a href="/terms" className="text-white/50 underline underline-offset-2 transition-colors hover:text-primary">Terms</a>
              {" "}and{" "}
              <a href="/privacy-policy" className="text-white/50 underline underline-offset-2 transition-colors hover:text-primary">Privacy Policy</a>
            </p>
          </div>
        </div>

        <DemoRoleModal open={demoModalOpen} onClose={() => setDemoModalOpen(false)} onSelect={handleDemoSelect} loading={demoLoading} />

        <p className="mt-5 text-center text-sm text-white/30">
          {mode === "signin" ? (
            <>New here?{" "}<button onClick={() => reset("signup")} className="font-medium text-white transition-colors hover:text-white">Create a free account</button></>
          ) : (
            <>Already have an account?{" "}<button onClick={() => reset("signin")} className="font-medium text-white transition-colors hover:text-white">Sign in</button></>
          )}
        </p>
      </motion.div>
    </div>
  );
}
