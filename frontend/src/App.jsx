import WorkspaceBoundary from './components/WorkspaceBoundary';
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, Shield } from 'lucide-react';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import About from './pages/About';
import Contact from './pages/Contact';
import Cookies from './pages/Cookies';
import Features from './pages/Features';
import HelpCenter from './pages/HelpCenter';
import Pricing from './pages/Pricing';
import PrivacyPolicy from './pages/PrivacyPolicy';
import RefundPolicy from './pages/RefundPolicy';
import Terms from './pages/Terms';
import Updates from './pages/Updates';
import V1Preview from './pages/V1Preview';
import LoginSuccess from './pages/LoginSuccess';
import NotFound from './pages/NotFound';
import ChatPage from './pages/ChatPage';
import ChatsPage from './pages/ChatsPage';
import ApplicationsPage from './pages/ApplicationsPage';
import InterviewPage from './pages/InterviewPage';
import FilesPage from './pages/FilesPage';
import ConnectAccounts from './pages/ConnectAccounts';
import ResetPassword from './pages/ResetPassword';
import VerifyEmailPage from './pages/VerifyEmailPage';
import AdminPanel from './pages/AdminPanel';
import AuthCallback from './pages/AuthCallback';
import Extension from './pages/Extension';
import SharedChatPage from './pages/SharedChatPage';
import PricingModal from './components/modals/PricingModal';
import ScrollToTop from './components/ScrollToTop';
import { CookieConsent } from './components/layout/CookieConsent';
import useUIStore from './store/useUIStore';
import useSettingsStore from './store/useSettingsStore';
import useAuthStore from './store/useAuthStore';
import useUserStore from './store/useUserStore';

const ENABLE_EXTENSION = false;

const Toast = () => {
  const { toast } = useUIStore();

  const getToastConfig = () => {
    if (!toast) return null;
    const lowerMsg = toast.toLowerCase();

    const isError = lowerMsg.includes('fail') ||
                    lowerMsg.includes('err') ||
                    lowerMsg.includes('wrong') ||
                    lowerMsg.includes('incorrect') ||
                    lowerMsg.includes('invalid') ||
                    lowerMsg.includes('not found') ||
                    lowerMsg.includes('denied') ||
                    lowerMsg.includes('expire') ||
                    lowerMsg.includes('unable');

    const isSuccess = lowerMsg.includes('success') ||
                      lowerMsg.includes('sent') ||
                      lowerMsg.includes('save') ||
                      lowerMsg.includes('copi') ||
                      lowerMsg.includes('creat') ||
                      lowerMsg.includes('update') ||
                      lowerMsg.includes('complet') ||
                      lowerMsg.includes('verifi') ||
                      lowerMsg.includes('log') ||
                      lowerMsg.includes('welcome');

    if (isError) {
      return {
        icon: <AlertTriangle className="w-4 h-4 text-black shrink-0" />,
        border: 'border-[#E0E0E0]',
        glow: 'shadow-[0_8px_30px_rgba(255,255,255,0.15)]',
        text: 'text-black'
      };
    } else if (isSuccess) {
      return {
        icon: <CheckCircle2 className="w-4 h-4 text-black shrink-0" />,
        border: 'border-[#E0E0E0]',
        glow: 'shadow-[0_8px_30px_rgba(255,255,255,0.15)]',
        text: 'text-black'
      };
    } else {
      return {
        icon: <Info className="w-4 h-4 text-black shrink-0" />,
        border: 'border-[#E0E0E0]',
        glow: 'shadow-[0_8px_30px_rgba(255,255,255,0.15)]',
        text: 'text-black'
      };
    }
  };

  const config = getToastConfig();

  return (
    <AnimatePresence>
      {toast && config && (
        <motion.div
          initial={{ opacity: 0, x: 100, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          className="fixed top-24 right-6 z-[9999] pointer-events-auto"
        >
          <div className={`bg-[#F7F7F7] backdrop-blur-md border ${config.border} rounded-2xl px-5 py-3.5 ${config.glow} flex items-center gap-3 max-w-sm whitespace-pre-wrap`}>
            {config.icon}
            <span className={`text-[13px] font-medium leading-tight ${config.text}`}>
              {toast}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

function PublicRoute({ children }) {
  const { isAuthenticated, isDemoMode, user, isValidatingSession } = useAuthStore();
  if (isValidatingSession) return <p role="status" className="p-8">Checking your session…</p>;
  const token = localStorage.getItem('token');
  if (token || (isAuthenticated && !isDemoMode)) {
    return <Navigate to={user?.role === "admin" || user?.role === "owner" ? "/admin" : "/chat"} replace />;
  }
  return children;
}

function PrivateRoute({ children }) {
  const location = useLocation();
  const validating = useAuthStore(s => s.isValidatingSession);
  if (validating) return <p role="status" className="p-8">Checking your session…</p>;
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to={"/login?redirect=" + encodeURIComponent(location.pathname + location.search)} replace />;
  return children ? children : <Outlet />;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const { user, isValidatingSession } = useAuthStore();
  if (isValidatingSession) return <p role="status" className="p-8">Checking your session…</p>;
  
  const params = new URLSearchParams(window.location.search);
  const otpSent = params.get('otp_sent') === 'true';
  const email = params.get('email');

  // If no token exists, only allow access if they are in the active 2FA OTP verification flow
  if (!token) {
    if (otpSent && email) {
      return children;
    }
    return <Navigate to="/admin/login" replace />;
  }

  // Reject non-admin role tokens
  if (user?.role !== 'admin' && user?.role !== 'owner') {
    return <Navigate to="/chat" replace />;
  }

  return children;
}

export default function App() {
  const { interfaceLanguage, fetchSettings } = useSettingsStore();
  const { fetchMe, token } = useAuthStore();

  useEffect(() => {
    let savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'system') {
      savedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    if (token || localStorage.getItem('token')) {
      fetchMe();

    }
    const refresh = () => { if (localStorage.getItem('token') && !['/demo', '/preview'].includes(window.location.pathname)) fetchMe(); };
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  useEffect(() => {
    if (interfaceLanguage === 'ar') {
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = 'ar';
    } else {
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = interfaceLanguage;
    }
  }, [interfaceLanguage]);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <WorkspaceBoundary><Routes>
        {/* Public Landing & Content Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/features" element={<Features />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/help-center" element={<HelpCenter />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/refund" element={<Navigate to="/refund-policy" replace />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/updates" element={<Updates />} />
        <Route path="/v1-preview" element={<V1Preview />} />

        {/* Authentication Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Auth />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Auth />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Auth />
            </PublicRoute>
          }
        />
        <Route path="/login-success" element={<LoginSuccess />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        {/* Demo chat — no login required */}
        <Route path="/demo" element={<ChatPage demo />} />
        <Route path="/preview" element={<Navigate to="/demo" replace />} />
        <Route path="/share/:shareId" element={<SharedChatPage />} />
        <Route path="/share/chat/:shareId" element={<SharedChatPage />} />
        {ENABLE_EXTENSION ? (
          <Route path="/extension" element={<Extension />} />
        ) : (
          <Route path="/extension" element={<Navigate to="/" replace />} />
        )}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/admin/login" element={<PublicRoute><Auth adminMode /></PublicRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />

        {/* Authenticated Dashboard Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:chatId" element={<ChatPage />} />
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/interview" element={<InterviewPage />} />
          <Route path="/mock-interview" element={<Navigate to="/interview" replace />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/connect-accounts" element={<ConnectAccounts />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes></WorkspaceBoundary>
      <PricingModal />
      <Toast />
      <CookieConsent />
    </BrowserRouter>
  );
}
