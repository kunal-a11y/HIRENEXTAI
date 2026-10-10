import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import useUIStore from '../store/useUIStore';
import useAuthStore from '../store/useAuthStore';
import { Logo } from '../components/Logo';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { fetchMe } = useAuthStore();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token provided.');
      return;
    }

    const verifyToken = async () => {
      try {
        await api.get(`/api/auth/verify-email?token=${token}`);
        setStatus('success');
        showToast('Email verified successfully');

        // Sync user details to local state
        await fetchMe();

        // Auto redirect to chat after 2.5 seconds
        setTimeout(() => {
          navigate('/chat');
        }, 2500);
      } catch (err) {
        setStatus('error');
        setErrorMsg(err.response?.data?.error || 'Verification link expired or invalid.');
      }
    };

    verifyToken();
  }, [token]);

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
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#F7F7F7] shadow-[0_32px_64px_rgba(0,0,0,0.5)] backdrop-blur-2xl p-7 text-center">

          {status === 'verifying' && (
            <div className="py-6 space-y-4">
              <Loader2 className="h-10 w-10 text-black animate-spin mx-auto" />
              <h2 className="text-lg font-bold text-black">Verifying email address...</h2>
              <p className="text-xs text-[#777777]">Please wait while we activate your account.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-6 space-y-4">
              <CheckCircle2 className="h-12 w-12 text-black mx-auto" />
              <h2 className="text-lg font-bold text-black">Email Verified! 🎉</h2>
              <p className="text-xs text-[#777777]">Your account is active. Redirecting you to dashboard...</p>
              <button
                onClick={() => navigate('/chat')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-white to-white py-3.5 text-sm font-semibold text-black transition-all hover:opacity-90 active:opacity-80"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-6 space-y-4">
              <XCircle className="h-12 w-12 text-black mx-auto" />
              <h2 className="text-lg font-bold text-black">Verification Failed</h2>
              <p className="text-xs text-black px-2">{errorMsg}</p>
              <button
                onClick={() => navigate('/login')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E0E0E0] bg-[#F7F7F7] py-3.5 text-sm font-medium text-[#222222] hover:bg-[#F2F2F2] hover:text-black"
              >
                Back to Login
              </button>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
}
