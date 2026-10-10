import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2 } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      const user = result.user || JSON.parse(localStorage.getItem('user') || 'null');
      if (user?.role === 'admin' || user?.role === 'owner') {
        navigate('/admin');
      } else {
        navigate('/chat');
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-[#F7F7F7] text-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="font-syne text-2xl font-extrabold text-black no-underline">
            HirenextAI
          </Link>
          <p className="mt-2 text-sm text-black/45">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="card-dark space-y-4">
          {error && (
            <div className="rounded-lg border border-[#E0E0E0] bg-[#F7F7F7] px-4 py-3 text-sm text-black">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#777777]">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888888]" />
              <input
                type="email"
                className="input-dark pl-10"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#777777]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888888]" />
              <input
                type="password"
                className="input-dark pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-solid w-full mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-black/45">
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-black hover:underline">
            Sign up
          </Link>
        </p>

        <p className="mt-3 text-center">
          <Link to="/" className="text-sm text-black/35 hover:text-[#555555]">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
