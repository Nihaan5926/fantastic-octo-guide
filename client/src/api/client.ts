import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let redirecting = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token!);
  });
  failedQueue = [];
}

function redirectToLogin() {
  if (redirecting) return;
  // Don't redirect if already on auth pages
  if (window.location.pathname === '/login' || window.location.pathname === '/forgot-password' || window.location.pathname === '/reset-password') {
    return;
  }
  // Don't redirect if we just logged in (within last 10 seconds)
  const loginTime = localStorage.getItem('loginTime');
  if (loginTime && (Date.now() - parseInt(loginTime)) < 10000) {
    return;
  }
  // Don't redirect more than once every 30 seconds
  const lastRedirect = sessionStorage.getItem('lastRedirect');
  if (lastRedirect && (Date.now() - parseInt(lastRedirect)) < 30000) {
    return;
  }
  redirecting = true;
  sessionStorage.setItem('lastRedirect', String(Date.now()));
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.replace('/login');
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Never retry these auth endpoints — they are the authority
    const skipUrls = ['/auth/refresh', '/auth/login', '/auth/me', '/auth/register'];
    if (skipUrls.some(url => original.url === url)) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      if (redirecting) return Promise.reject(error);

      if (isRefreshing) {
        return new Promise<string>((resolve) => {
          failedQueue.push({ resolve, reject: () => {} });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }).catch(() => {
          return Promise.reject(error);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          localStorage.setItem('loginTime', String(Date.now()));
          processQueue(null, data.accessToken);
          isRefreshing = false;
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          processQueue(new Error('Refresh failed'), null);
          isRefreshing = false;
          redirectToLogin();
          return Promise.reject(error);
        }
      }

      isRefreshing = false;
      redirectToLogin();
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default api;
