import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ShieldCheck, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";

const OTP_LENGTH = 6;

export default function OTPVerification({ phone, email, isAdminFlow = false, onVerify, onResend }) {
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [activeOtpIndex, setActiveOtpIndex] = useState(0);
  const [step, setStep] = useState("idle"); // idle -> verifying -> tilting -> merging -> dropping -> success
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 480;
  const boxWidth = isMobile ? 40 : 56;
  const gapSize = isMobile ? 8 : 16;
  const stepSize = boxWidth + gapSize;
  const POSITIONS = Array.from({ length: OTP_LENGTH }, (_, i) => (i - 2.5) * stepSize);

  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [wrongCodeCooldown, setWrongCodeCooldown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(25); // Starts disabled for 25 seconds

  useEffect(() => {
    let interval = null;
    if (wrongCodeCooldown > 0) {
      interval = setInterval(() => {
        setWrongCodeCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [wrongCodeCooldown]);

  useEffect(() => {
    let interval = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleOnChange = (e, index) => {
    const { value } = e.target;
    if (!value) return;

    // Only numeric digits
    if (!/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);
    setError("");

    if (index < OTP_LENGTH - 1) {
      setActiveOtpIndex(index + 1);
    } else {
      // Completed all inputs
      if (newOtp.every((v) => v !== "")) {
        setActiveOtpIndex(-1);
        inputRefs.current[index]?.blur();
        handleVerify(newOtp.join(""));
      }
    }
  };

  const handleOnKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      const newOtp = [...otp];
      if (newOtp[index]) {
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        setActiveOtpIndex(index - 1);
        newOtp[index - 1] = "";
        setOtp(newOtp);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      setActiveOtpIndex(index - 1);
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      setActiveOtpIndex(index + 1);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData
      .getData("text/plain")
      .slice(0, OTP_LENGTH)
      .replace(/\D/g, "");
    if (!pastedData) return;

    const newOtp = [...otp];
    let lastIndex = activeOtpIndex;
    for (let i = 0; i < pastedData.length; i++) {
      if (activeOtpIndex + i < OTP_LENGTH) {
        newOtp[activeOtpIndex + i] = pastedData[i];
        lastIndex = activeOtpIndex + i;
      }
    }
    setOtp(newOtp);

    if (newOtp.every((v) => v !== "")) {
      setActiveOtpIndex(-1);
      handleVerify(newOtp.join(""));
    } else {
      setActiveOtpIndex(lastIndex < OTP_LENGTH - 1 ? lastIndex + 1 : lastIndex);
    }
  };

  const handleVerify = async (code) => {
    setStep("verifying");
    setLoading(true);
    try {
      const API = import.meta.env.VITE_API_URL ?? "/api";
      const url = isAdminFlow ? `${API}/admin/verify-otp` : `${API}/auth/verify-otp`;
      const body = isAdminFlow ? { email, otp: code } : { phone, otp: code };

      const response = await fetch(url, {
        credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      
      if (data.success) {
        // Wait slightly for the verifying wiggle to finish before launching drop animations
        setTimeout(() => {
          setStep("tilting");
          // Proceed to trigger onVerify after the animations complete
          setTimeout(() => {
            onVerify(data.token, data.user);
          }, 2000); // matches the total duration of tilting -> merging -> dropping -> success
        }, 1000);
      } else {
        setTimeout(() => {
          setError(data.message || data.error || "Invalid verification code. Please try again.");
          setOtp(Array(OTP_LENGTH).fill(""));
          setStep("idle");
          setActiveOtpIndex(0);
          setLoading(false);
          if (isAdminFlow && response.status === 429) {
            setWrongCodeCooldown(300);
          }
        }, 1000);
      }
    } catch (err) {
      setTimeout(() => {
        setError("Network error. Please try again.");
        setOtp(Array(OTP_LENGTH).fill(""));
        setStep("idle");
        setActiveOtpIndex(0);
        setLoading(false);
      }, 1000);
    }
  };

  useEffect(() => {
    if (step === "idle" && activeOtpIndex >= 0 && wrongCodeCooldown === 0) {
      inputRefs.current[activeOtpIndex]?.focus();
    }
  }, [activeOtpIndex, step, wrongCodeCooldown]);

  useEffect(() => {
    if (step === "tilting") {
      const timer = setTimeout(() => setStep("merging"), 400);
      return () => clearTimeout(timer);
    } else if (step === "merging") {
      const timer = setTimeout(() => setStep("dropping"), 400);
      return () => clearTimeout(timer);
    } else if (step === "dropping") {
      const timer = setTimeout(() => setStep("success"), 600);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleReset = () => {
    setOtp(Array(OTP_LENGTH).fill(""));
    setStep("idle");
    setActiveOtpIndex(0);
    setError("");
    setLoading(false);
  };

  const renderContent = () => (
    <>
      <div className="header-section mb-8 min-h-[90px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {step !== "success" ? (
            <motion.div
              key="header-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E0E0E0] bg-white">
                <ShieldCheck className="h-6 w-6 text-black" />
              </div>
              <h2 className={`font-display font-bold text-black tracking-tight mb-2 ${isAdminFlow ? "text-xl" : "text-2xl"}`}>Admin Verification Required</h2>
              <p className={`leading-relaxed text-[#555555] ${isAdminFlow ? "text-xs" : "text-sm"}`}>
                A verification code has been sent to your email:
                <br />
                <span className="font-semibold text-black">{email}</span>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="header-success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <h2 className={`font-display font-bold text-black tracking-tight ${isAdminFlow ? "text-xl" : "text-2xl"}`}>Verified Successfully</h2>
              <p className={`mt-1 text-[#555555] ${isAdminFlow ? "text-xs" : "text-sm"}`}>Accessing your career dashboard...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Wrapper */}
      <div className="otp-wrapper relative mx-auto my-6 flex h-12 sm:h-16 w-full items-center justify-center">
        {otp.map((digit, i) => (
          <motion.input
            key={i}
            ref={(el) => (inputRefs.current[i] = el)}
            value={digit}
            onChange={(e) => handleOnChange(e, i)}
            onKeyDown={(e) => handleOnKeyDown(e, i)}
            onPaste={handlePaste}
            onFocus={(e) => e.target.select()}
            disabled={step !== "idle" || wrongCodeCooldown > 0}
            animate={{
              x: step === "idle" || step === "verifying" || step === "tilting" ? POSITIONS[i] : 0,
              rotate:
                step === "verifying"
                  ? [0, -12, 12, -12, 12, -12, 12, -12, 12, 0]
                  : step === "tilting" || step === "merging"
                    ? i < 3
                      ? 15
                      : -15
                    : 0,
              opacity: step === "dropping" || step === "success" ? 0 : 1,
              scale: step === "dropping" || step === "success" ? 0 : step === "merging" ? 0.5 : 1,
              backgroundColor: step === "merging" ? "#10b981" : "#FFFFFF",
              color: step === "merging" ? "transparent" : "#111827",
              borderRadius: step === "merging" ? "50%" : "16px",
            }}
            transition={{
              x: { type: "spring", stiffness: 400, damping: 35 },
              rotate:
                step === "verifying"
                  ? { duration: 1.2, ease: "easeInOut" }
                  : { type: "spring", stiffness: 300, damping: 20 },
              opacity: { duration: 0.1 },
              scale: { duration: 0.3 },
              backgroundColor: { duration: 0.3 },
              borderRadius: { duration: 0.3 },
            }}
            className={`absolute input-box ${digit ? "filled" : ""}`}
            style={{
              left: "50%",
              marginLeft: isMobile ? -20 : -28,
              width: boxWidth,
              height: boxWidth,
              fontSize: isMobile ? 16 : 20,
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
          />
        ))}

        {/* Droplet & Status Circle */}
        <motion.div
          initial={{ opacity: 0, scale: 0.4, y: 0 }}
          animate={{
            opacity: step === "dropping" || step === "success" ? 1 : 0,
            scale: step === "success" ? 1 : step === "dropping" ? 0.4 : 0.4,
            y: step === "dropping" ? [0, -60, 0] : 0,
            backgroundColor: step === "success" ? "#10b981" : "#10b981",
            boxShadow:
              step === "success"
                ? "0 10px 30px -5px rgba(16, 185, 129, 0.4)"
                : step === "dropping"
                  ? "0 10px 20px -5px rgba(16, 185, 129, 0.2)"
                  : "none",
          }}
          transition={{
            opacity: { duration: 0.1 },
            y:
              step === "dropping"
                ? { duration: 0.6, times: [0, 0.5, 1], ease: ["easeOut", "easeIn"] }
                : { type: "spring", stiffness: 400, damping: 30 },
            scale: { type: "spring", stiffness: 400, damping: 25 },
            backgroundColor: { duration: 0.4 },
          }}
          className="absolute left-1/2 top-1/2 -ml-8 -mt-8 flex h-16 w-16 items-center justify-center rounded-full z-10"
          style={{ left: "50%", top: "50%" }}
        >
          <AnimatePresence>
            {step === "success" && (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.1 }}
              >
                <Check color="#ffffff" strokeWidth={3.5} size={32} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Submit Button */}
      {step === "idle" && (
        <button
          onClick={() => {
            if (otp.every((v) => v !== "")) {
              handleVerify(otp.join(""));
            } else {
              setError("Please enter the complete 6-digit code.");
            }
          }}
          disabled={loading || otp.some((v) => v === "")}
          className="w-full mt-4 h-12 bg-black text-white hover:bg-[#222222] active:scale-[0.98] transition-all font-semibold rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
        >
          {loading ? "Verifying..." : "Verify Code"}
        </button>
      )}

      {/* Action / Error section */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          {wrongCodeCooldown > 0 ? (
            <motion.p
              key="lockout-text"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`font-semibold text-red-600 mb-4 animate-pulse ${isAdminFlow ? "text-xs" : "text-sm"}`}
            >
              Invalid Verification Code. Locked for {wrongCodeCooldown}s
            </motion.p>
          ) : error ? (
            <motion.p
              key="error-text"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`font-medium text-red-600 mb-4 ${isAdminFlow ? "text-xs" : "text-sm"}`}
            >
              {error}
            </motion.p>
          ) : null}
        </AnimatePresence>

        {step === "idle" && (
          <div className="flex flex-col items-center gap-3">
            {resendCooldown > 0 ? (
              <p className={`text-[#555555] font-medium bg-gray-100/50 border border-gray-200/50 px-3 py-1.5 rounded-lg select-none ${isAdminFlow ? "text-xs" : "text-sm"}`}>
                Resend available in {resendCooldown}s
              </p>
            ) : (
              <p className={`text-[#555555] ${isAdminFlow ? "text-xs" : "text-sm"}`}>
                Didn't receive the code?{" "}
                <button
                  onClick={async () => {
                    if (onResend) {
                      await onResend();
                    }
                    setResendCooldown(25);
                    setError("");
                  }}
                  className="font-semibold text-black underline underline-offset-4 hover:text-[#333333] cursor-pointer"
                >
                  Resend Code
                </button>
              </p>
            )}
            
            <button
              onClick={handleReset}
              className={`flex items-center gap-1.5 text-[#555555] hover:text-black transition-colors cursor-pointer ${isAdminFlow ? "text-[11px]" : "text-xs"}`}
            >
              Clear & Restart
            </button>

            <button
              onClick={() => {
                logout();
                sessionStorage.removeItem('admin_pin_verified');
                navigate('/login', { replace: true });
              }}
              className={`flex items-center gap-1 font-semibold text-red-600 hover:text-red-700 transition-colors cursor-pointer border border-red-200/40 bg-red-50/20 px-3 py-1.5 rounded-lg ${isAdminFlow ? "text-[11px] mt-2" : "text-xs mt-3"}`}
            >
              <X size={12} /> Cancel & Logout
            </button>
          </div>
        )}
      </div>
    </>
  );

  if (isAdminFlow) {
    return (
      <div className="w-full text-center">
        {renderContent()}
        <style>{`
          .otp-wrapper {
            position: relative;
            width: 100%;
          }
          .input-box {
            border-radius: 16px;
            border: 2px solid #e5e7eb;
            background-color: #ffffff;
            text-align: center;
            font-weight: 600;
            color: #111827;
            outline: none;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.006);
          }
          .input-box:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 4px 6px -1px rgba(59, 130, 246, 0.05);
          }
          .input-box.filled {
            border-color: #9ca3af;
          }
          @media (max-width: 480px) {
            .input-box {
              border-radius: 12px;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
      <motion.div
        className="w-full max-w-md overflow-hidden rounded-[28px] border border-[#E0E0E0] bg-[#F7F7F7] p-8 text-center shadow-[0_32px_100px_rgba(0,0,0,0.85)] sm:p-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {renderContent()}
      </motion.div>

      <style>{`
        .otp-wrapper {
          position: relative;
          width: 100%;
        }
        .input-box {
          border-radius: 16px;
          border: 2px solid #e5e7eb;
          background-color: #ffffff;
          text-align: center;
          font-weight: 600;
          color: #111827;
          outline: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.006);
        }
        .input-box:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1), 0 4px 6px -1px rgba(59, 130, 246, 0.05);
        }
        .input-box.filled {
          border-color: #9ca3af;
        }
        @media (max-width: 480px) {
          .input-box {
            border-radius: 12px;
          }
        }
      `}</style>
    </div>
  );
}
