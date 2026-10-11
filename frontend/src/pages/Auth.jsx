import { safeAuthRedirect } from '../lib/authRedirect';
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import useUserStore from "../store/useUserStore";
import useUIStore from "../store/useUIStore";
import api from "../lib/api";
import {
  Loader2, Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff,
  Sparkles, Shield, Globe, CheckCircle
} from "lucide-react";
import { Logo } from "../components/Logo";
import { DemoRoleModal } from "../components/DemoRoleModal";
import { motion, AnimatePresence } from "framer-motion";
import CareerIllustration from '../components/auth/CareerIllustration';
import OTPVerification from "../components/auth/OTPVerification";

function InputRow({ icon: Icon, type, name, placeholder, value, onChange, required, minLength, autoFocus, rightElement }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-[#EAEAEA] bg-[#FFFFFF] px-4 py-3 transition-all duration-300 focus-within:border-black focus-within:shadow-[0_0_0_3px_rgba(0,0,0,0.05)]">
      <Icon className="h-4 w-4 shrink-0 text-black/60 transition-colors duration-300 group-focus-within:text-black" />
      <input
        type={type}
        name={name}
        id={`auth-${name}`}
        aria-label={name === "password" ? "Password" : name === "confirmPassword" ? "Confirm password" : name === "email" ? "Email address" : placeholder}
        autoComplete={name === "email" ? "email" : name === "password" ? "current-password" : name === "name" ? "name" : undefined}
        required={required}
        minLength={minLength}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent text-sm leading-none text-black placeholder:text-[#AAAAAA] focus:outline-none"
      />
      {rightElement}
    </div>
  );
}

export default function Auth({ adminMode = false }) {
  const { login, signup, isLoading, setDemoMode } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const defaultMode = ["/register", "/signup"].includes(location.pathname) ? "signup" : "signin";
  const [mode, setMode] = useState(defaultMode);
  const [phoneStep, setPhoneStep] = useState("idle");
  const [role] = useState("job_seeker");
  const [adminEmail, setAdminEmail] = useState("");
  const [isAdmin2FA, setIsAdmin2FA] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpHint, setOtpHint] = useState(null);
  const [otpArray, setOtpArray] = useState(Array(6).fill(""));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [agreeTerms, setAgreeTerms] = useState(false);

  useEffect(() => { setOtp(otpArray.join("")); }, [otpArray]);
  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { showToast } = useUIStore();
  const API = import.meta.env.VITE_API_URL ?? "/api";
  const demoEnabled = true;
  useEffect(() => {
    const reason = new URLSearchParams(location.search).get('error');
    if (reason) setError(reason === 'email_unavailable' ? 'Admin email verification is not configured yet. Please contact the site owner.' : 'Sign-in could not be completed. Please try again or use email and password.');
  }, [location.search]);

  // Password strength calculator
  useEffect(() => {
    if (!password) { setPasswordStrength(0); return; }
    let score = 0;
    if (password.length >= 8) score += 25;
    if (password.length >= 10) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 20;
    setPasswordStrength(Math.min(score, 100));
  }, [password]);

  const strengthLabel = passwordStrength <= 25 ? "Weak" : passwordStrength <= 50 ? "Fair" : passwordStrength <= 75 ? "Good" : "Strong";
  const strengthColor = passwordStrength <= 25 ? "#DC2626" : passwordStrength <= 50 ? "#EA580C" : passwordStrength <= 75 ? "#EAB308" : "#16A34A";

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSendingReset(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
      showToast("Reset link sent to your email");
      setForgotPasswordMode(false);
    } catch (err) {
      setError(err.response?.data?.error || "Could not send password reset email.");
    } finally {
      setIsSendingReset(false);
    }
  };

  useEffect(() => {
    setMode(["/register", "/signup"].includes(location.pathname) ? "signup" : "signin");
  }, [location.pathname]);

  const reset = (newMode) => {
    setMode(newMode);
    setPhoneStep("idle");
    setForgotPasswordMode(false);
    setError("");
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAgreeTerms(false);
    setPhone("");
    setOtp("");
    setOtpArray(Array(6).fill(""));
    navigate(newMode === "signup" ? "/register" : "/login");
  };

  const redirectAfterAuth = () => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect");
    const redirectState = location.state?.redirectAfter;
    
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
    const isAdmin = storedUser?.role === 'admin' || storedUser?.role === 'owner';

    window.location.replace(isAdmin ? '/admin' : safeAuthRedirect(redirectState || redirect));
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!agreeTerms) {
        setError("You must agree to the Terms and Privacy Policy.");
        return;
      }
    }

    try {
      if (mode === "signin") {
        const res = await login(email, password);
        if (res.success) {
          if (res.requiresOTP) {
            setAdminEmail(res.email);
            setIsAdmin2FA(true);
          } else {
            redirectAfterAuth();
          }
        }
        else setError(res.error || "Login failed. Please check your credentials.");
      } else {
        const res = await signup(name, email, password);
        if (res.success) redirectAfterAuth();
        else setError(res.error || "Signup failed. Please check your inputs.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  const handleProviderLogin = async provider => {
    setError(''); setGoogleLoading(true);
    try {
      const { data } = await api.get('/auth/providers');
      if (!data[provider]) throw new Error(`${provider === 'google' ? 'Google' : 'LinkedIn'} sign-in is not available yet. Please use email and password.`);
      window.location.assign(`${API}/auth/${provider}`);
    } catch (err) { setError(err.message || 'Sign-in could not start. Please try again.'); setGoogleLoading(false); }
  };
  const handleGoogleLogin = () => handleProviderLogin('google');


  const handleSendOtp = async (e) => {
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
    } catch (err) {
      setError(err.message || "Failed to send OTP.");
    }
  };

  const handlePhoneVerifySuccess = (token, user) => {
    localStorage.setItem("token", token);
    if (user) localStorage.setItem("user", JSON.stringify(user));
    useAuthStore.setState({ user, token, isAuthenticated: true, isDemoMode: false });
    const nameVal = user?.name || '';
    const [firstName = 'User', ...rest] = nameVal.split(' ').filter(Boolean);
    useUserStore.getState().setUser({
      ...user, firstName, lastName: rest.join(' '),
      initials: `${firstName[0] || ''}${rest[0]?.[0] || firstName[0] || 'U'}`.toUpperCase(),
      demoMode: false
    });
    redirectAfterAuth();
  };

  const handleDemoSelect = (demoRole) => {
    setDemoLoading(true);
    setDemoMode();
    setDemoLoading(false);
    setDemoModalOpen(false);
    navigate("/demo");
  };

  if (phoneStep === "enter_otp") {
    return <OTPVerification phone={phone} onVerify={handlePhoneVerifySuccess} onResend={() => handleSendOtp()} />;
  }

  if (isAdmin2FA) {
    return (
      <OTPVerification
        email={adminEmail}
        isAdminFlow={true}
        onVerify={handlePhoneVerifySuccess}
        onResend={async () => {
          try {
            await api.post('/api/admin/send-otp', { email: adminEmail });
            showToast("2FA Code resent to your email.");
          } catch (err) {
            showToast(err.response?.data?.error || "Resend failed.");
          }
        }}
      />
    );
  }

  return (
    <div className="auth-refined relative flex flex-col lg:flex-row w-full min-h-screen lg:overflow-hidden bg-white text-black">
      
      {/* Top Left Logo Branding */}
      <div className="absolute top-6 left-6 md:top-8 md:left-8 z-30">
        <motion.a
          href="/"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-block text-black hover:text-black/80 font-syne"
        >
          <Logo size="sm" showText={true} />
        </motion.a>
      </div>

      <CareerIllustration />

      {/* Right Panel - Form Container */}
      <div className="flex-1 flex flex-col items-center py-12 px-6 lg:px-16 lg:py-16 bg-white relative z-20 min-h-[65vh] lg:h-screen lg:overflow-y-auto">
        <div className="w-full max-w-[420px] flex flex-col my-auto">
          
          {/* Header */}
          <div className="mb-6 text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#8B5CF6]/5 border border-[#8B5CF6]/10 text-[#7C3AED] text-[10px] font-bold tracking-wider uppercase mb-3.5">
              {mode === "signin" ? "WELCOME BACK" : "GET STARTED"}
            </span>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-black leading-tight">
              {adminMode ? "Admin sign in" : mode === "signin" ? "Welcome back." : "Your next chapter starts here."}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500 font-light">
              {mode === "signin" 
                ? "Access your AI-powered career workspace." 
                : "Create your personal career workspace."}
            </p>
          </div>

          {/* Form Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-[20px] border border-[#EAEAEA] bg-[#FAFAFA]/40 p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.01)] backdrop-blur-md"
          >
            {adminMode && <p className="auth-status">Enter the email linked to your approved admin account. We verify your role and email before opening the dashboard.</p>}
            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  key="error" role="alert"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-xl border border-red-200 bg-red-50/50 px-4 py-3 text-xs text-red-600 mb-4 font-semibold"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {forgotPasswordMode ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444444] ml-1">Email Address</label>
                  <InputRow icon={Mail} type="email" name="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                
                <motion.button 
                  type="submit" 
                  disabled={isSendingReset}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-sm font-semibold text-white transition-all hover:bg-black/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                >
                  {isSendingReset ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>Send Reset Link <ArrowRight className="h-4 w-4" /></>
                  )}
                </motion.button>
                
                <button type="button" onClick={() => { setForgotPasswordMode(false); setError(""); }} className="w-full py-1 text-center text-xs text-gray-500 hover:text-black transition-colors focus:outline-none cursor-pointer">
                  ← Back to login
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#444444] ml-1">Full Name</label>
                    <InputRow icon={User} type="text" name="name" placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444444] ml-1">Email Address</label>
                  <InputRow icon={Mail} type="email" name="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#444444] ml-1">Password</label>
                  <InputRow
                    icon={Lock}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    rightElement={
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-black/40 hover:text-black transition-colors focus:outline-none">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    }
                  />
                </div>

                {/* Confirm Password (Signup only) */}
                {mode === "signup" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#444444] ml-1">Confirm Password</label>
                    <InputRow
                      icon={Lock}
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      minLength={mode === "signup" ? 8 : undefined}
                      rightElement={
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-black/40 hover:text-black transition-colors focus:outline-none">
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      }
                    />
                  </div>
                )}

                {/* Password strength bar for signup */}
                {mode === "signup" && password.length > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${passwordStrength}%`, background: strengthColor }} />
                    </div>
                    <span className="text-[10px] font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}

                {/* Options (Login only) */}
                {mode === "signin" && (
                  <div className="flex items-center justify-between mt-1 px-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-500 hover:text-black">
                      <input type="checkbox" className="rounded border-gray-300 text-black focus:ring-black h-3.5 w-3.5" />
                      Remember Me
                    </label>
                    <button type="button" onClick={() => { setForgotPasswordMode(true); setError(""); }} className="text-xs text-gray-500 hover:text-black transition-colors focus:outline-none font-medium">
                      Forgot Password?
                    </button>
                  </div>
                )}

                {/* Terms checkbox (Signup only) */}
                {mode === "signup" && (
                  <label className="flex items-start gap-2.5 cursor-pointer select-none text-xs text-gray-500 hover:text-black mt-1 px-1">
                    <input 
                      type="checkbox" 
                      checked={agreeTerms} 
                      onChange={e => setAgreeTerms(e.target.checked)} 
                      required 
                      className="rounded border-gray-300 text-black focus:ring-black h-3.5 w-3.5 mt-0.5" 
                    />
                    <span>
                      I agree to the{" "}
                      <a href="/terms" className="text-black font-semibold hover:underline">Terms</a>
                      {" "}and{" "}
                      <a href="/privacy-policy" className="text-black font-semibold hover:underline">Privacy Policy</a>
                    </span>
                  </label>
                )}

                {/* Submit button */}
                <motion.button 
                  type="submit" 
                  disabled={isLoading}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3.5 text-sm font-semibold text-white transition-all hover:bg-black/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 mt-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>{mode === "signin" ? "Sign In" : "Create Free Account"} <ArrowRight className="h-4 w-4" /></>
                  )}
                </motion.button>
              </form>
            )}

            {/* Divider */}
            <div className="flex items-center gap-3 py-3">
              <div className="h-px flex-1 bg-[#EAEAEA]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">or</span>
              <div className="h-px flex-1 bg-[#EAEAEA]" />
            </div>

            {/* Social Logins */}
            <div className="space-y-2">
              <motion.button 
                onClick={handleGoogleLogin} 
                disabled={googleLoading}
                whileHover={{ scale: 1.01, y: -0.5 }}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E0E0E0] bg-white py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-[#C4C4C4] cursor-pointer"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
                {googleLoading && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
              </motion.button>

              <motion.button 
                disabled aria-label="LinkedIn sign-in coming soon"
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E0E0E0] bg-white py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-[#C4C4C4] cursor-pointer"
              >
                <svg className="h-4 w-4 shrink-0 text-[#0A66C2] fill-[#0A66C2]" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                LinkedIn · Coming soon
              </motion.button>
            </div>

            {demoEnabled && mode === "signup" && (
              <div className="mt-4 text-center">
                <button onClick={() => setDemoModalOpen(true)} className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-black transition-colors focus:outline-none cursor-pointer">
                  <Sparkles className="h-3 w-3 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  Try Demo First
                </button>
              </div>
            )}
          </motion.div>

          {/* Switch Mode Footer */}
          <div className="mt-5 text-center text-sm">
            {mode === "signin" ? (
              <p className="text-gray-500 text-xs">
                Don't have an account?{" "}
                <button onClick={() => reset("signup")} className="font-bold text-[#8B5CF6] hover:underline cursor-pointer focus:outline-none">
                  Create Account
                </button>
              </p>
            ) : (
              <p className="text-gray-500 text-xs">
                Already have an account?{" "}
                <button onClick={() => reset("signin")} className="font-bold text-[#8B5CF6] hover:underline cursor-pointer focus:outline-none">
                  Sign In
                </button>
              </p>
            )}
          </div>

          {/* Trust Row */}
          <div className="mt-10 border-t border-[#EAEAEA] pt-6">
            <div className="grid grid-cols-2 gap-y-3 gap-x-4">
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                <span className="text-[#8B5CF6] font-bold">✓</span> Secure Authentication
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                <span className="text-[#8B5CF6] font-bold">✓</span> Privacy First
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                <span className="text-[#8B5CF6] font-bold">✓</span> Protected Data
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
                <span className="text-[#8B5CF6] font-bold">✓</span> Free To Start
              </div>
            </div>
          </div>

        </div>
      </div>

      <DemoRoleModal open={demoModalOpen} onClose={() => setDemoModalOpen(false)} onSelect={handleDemoSelect} loading={demoLoading} />
    </div>
  );
}
