import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      localStorage.setItem('token', token);

      // Update state in Zustand store
      useAuthStore.setState({
        token: token,
        isAuthenticated: true,
        isDemoMode: false
      });

      // Hydrate user profile info
      useAuthStore.getState().fetchMe();

      navigate('/chat');
    } else {
      navigate('/login?error=' + (error || 'auth_failed'));
    }
  }, [params, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-[#666666]">Completing sign in...</p>
    </div>
  );
}
