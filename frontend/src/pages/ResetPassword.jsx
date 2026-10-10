import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import api from '../lib/api';
import useUIStore from '../store/useUIStore';
import { Logo } from '../components/Logo';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = useUIStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (password.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/api/auth/reset-password', { token, newPassword: password });
      showToast('Password reset successful');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Link expired or invalid');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#F7F7F7] p-4">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[15%] top-[20%] h-[500px] w-[500px] rounded-full bg-[#F7F7F7] blur-[120px]" />
        <div className="absolute bottom-[15%] right-[10%] h-[400px] w-[400px] rounded-full bg-[#F7F7F7] blur-[100px]" />
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
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#F7F7F7] shadow-[0_32px_64px_rgba(0,0,0,0.5)] backdrop-blur-2xl p-7">
          <div className="mb-6 text-center">
            <h1 className="font-display text-xl font-bold leading-tight text-black">
              Reset Password
            </h1>
            <p className="mt-1.5 text-xs text-[#777777]">
              Enter your new password below to secure your HirenextAI account.
            </p>
          </div>

          {error ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#E0E0E0] bg-[#F7F7F7] p-4 text-center">
                <AlertTriangle className="h-8 w-8 text-black mx-auto mb-2" />
                <p className="text-sm font-semibold text-black">{error}</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full rounded-xl bg-[#F7F7F7] py-3 text-sm font-semibold text-black transition-all hover:bg-[#F2F2F2] hover:text-black flex items-center justify-center gap-2"
              >
                Request new link <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="group flex items-center gap-3 rounded-xl border border-white/[0.1] bg-[#F7F7F7] px-4 py-3.5 transition-all focus-within:border-[#E0E0E0] focus-within:bg-[#F7F7F7] focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]">
                <Lock className="h-4 w-4 shrink-0 text-[#888888] group-focus-within:text-black" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New Password (min 8 characters)"
                  className="min-w-0 flex-1 bg-transparent text-sm leading-none text-black placeholder:text-black/25 focus:outline-none"
                />
              </div>

              <div className="group flex items-center gap-3 rounded-xl border border-white/[0.1] bg-[#F7F7F7] px-4 py-3.5 transition-all focus-within:border-[#E0E0E0] focus-within:bg-[#F7F7F7] focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]">
                <Lock className="h-4 w-4 shrink-0 text-[#888888] group-focus-within:text-black" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  className="min-w-0 flex-1 bg-transparent text-sm leading-none text-black placeholder:text-black/25 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-white to-white py-3.5 text-sm font-semibold text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:opacity-90 active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Reset Password <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
