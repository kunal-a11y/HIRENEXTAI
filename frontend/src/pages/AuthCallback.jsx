import api from '../lib/api';
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get('code');
    window.history.replaceState({}, '', '/auth/callback');
    const error = params.get('error');
    const linkedin = params.get('linkedin');

    const finish = async () => {
      if (linkedin === 'connected') {
        await useAuthStore.getState().fetchMe();
        navigate('/connect-accounts?linkedin=connected', { replace: true });
        return;
      }

      if (!code) {
        navigate('/login?error=' + (error || 'auth_failed'), { replace: true });
        return;
      }

      const { data } = await api.post('/auth/exchange', { code }, { withCredentials: true });
      const token = data.token;
      localStorage.setItem('token', token);

      // Update state in Zustand store
      useAuthStore.setState({
        token: token,
        isAuthenticated: true,
        isDemoMode: false
      });

      // Hydrate user profile info
      await useAuthStore.getState().fetchMe();

      const user = useAuthStore.getState().user;
      const isAdmin = user?.role === 'admin' || user?.role === 'owner';

      if (isAdmin) {
        window.location.replace('/admin');
      } else {
        window.location.replace('/chat');
      }
    };

    finish().catch(() => navigate('/login?error=auth_failed', { replace: true }));
  }, [params, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-500">Completing sign in...</p>
    </div>
  );
}
