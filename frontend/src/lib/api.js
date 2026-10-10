import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Prevent double '/api' when baseURL already includes '/api'
  const baseURLStr = (config.baseURL || '').replace(/\/$/, '');
  if (baseURLStr.endsWith('/api') && config.url && config.url.startsWith('/api/')) {
    config.url = config.url.replace(/^\/api/, '');
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const isAuthPage = path === '/admin/login' || path === '/login' || path === '/signup' || path === '/register';
      const isDemoPage = path === '/demo' || path === '/preview';
      if (!isAuthPage && !isDemoPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('auth-storage');
        const loginPath = path.startsWith('/admin') ? '/admin/login' : '/login';
        window.location.replace(loginPath + '?redirect=' + encodeURIComponent(path + window.location.search));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
