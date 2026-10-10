import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function VerificationCodeInput({
  value,
  onChange,
  disabled = false,
  error = false,
  loading = false,
  masked = false,
  className = "",
}) {
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!disabled) {
      const emptyIndex = value.findIndex((digit) => !digit);
      inputRefs.current[emptyIndex < 0 ? value.length - 1 : emptyIndex]?.focus();
    }
  }, [disabled, value]);

  const setDigit = (digit, index) => {
    if (disabled || !/^\d?$/.test(digit)) return;
    const next = [...value];
    next[index] = digit.slice(-1);
    onChange(next);
    if (digit && index < value.length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      const next = [...value];
      next[index - 1] = "";
      onChange(next);
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowRight" && index < value.length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, value.length);
    if (!digits) return;
    const next = Array(value.length).fill("");
    digits.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    onChange(next);
    inputRefs.current[Math.min(digits.length, value.length) - 1]?.focus();
  };

  return (
    <motion.div
      animate={error ? { x: [-8, 8, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
      className={`flex items-center justify-center gap-2 sm:gap-3 ${className}`}
    >
      {value.map((digit, index) => (
        <motion.input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          type={masked ? "password" : "text"}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onFocus={(event) => event.target.select()}
          onPaste={handlePaste}
          onChange={(event) => setDigit(event.target.value, index)}
          onKeyDown={(event) => handleKeyDown(event, index)}
          animate={loading ? { rotate: [0, -7, 7, -7, 7, 0] } : { rotate: 0 }}
          transition={loading ? { duration: 0.8, delay: index * 0.05 } : { duration: 0.2 }}
          className={`h-14 w-11 rounded-2xl border-2 bg-white text-center text-xl font-bold text-black outline-none transition-all sm:h-16 sm:w-14 ${ error ? "border-white/40" : digit ? "border-white bg-[#F7F7F7] shadow-[0_0_0_4px_rgba(255,255,255,0.06)]" : "border-[#E0E0E0] focus:border-white focus:shadow-[0_0_0_4px_rgba(255,255,255,0.06)]" } disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label={`Verification digit ${index + 1}`}
        />
      ))}
    </motion.div>
  );
}
