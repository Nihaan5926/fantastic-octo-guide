import { create } from 'zustand';
import type { User } from '../types';
import api from '../api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requires2FA: boolean;
  tempToken: string | null;
  loginEmail: string;

  login: (email: string, password: string) => Promise<void>;
  login2FA: (totpCode: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  clear2FA: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
  error: null,
  requires2FA: false,
  tempToken: null,
  loginEmail: '',

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      if (data.requires2FA) {
        set({
          requires2FA: true,
          tempToken: data.tempToken,
          loginEmail: email,
          isLoading: false,
        });
        return;
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('loginTime', String(Date.now()));;
      localStorage.setItem('loginTime', String(Date.now()));
      set({ user: data.user, isAuthenticated: true, isLoading: false, requires2FA: false, tempToken: null });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Login failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  login2FA: async (totpCode) => {
    set({ isLoading: true, error: null });
    try {
      const tempToken = useAuthStore.getState().tempToken;
      const { data } = await api.post('/auth/login-2fa', { tempToken, totpCode });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken)
      localStorage.setItem('loginTime', String(Date.now()));;
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        requires2FA: false,
        tempToken: null,
        loginEmail: '',
      });
    } catch (err: any) {
      const message = err.response?.data?.error || '2FA verification failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { data: res } = await api.post('/auth/register', data);
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('refreshToken', res.refreshToken)
      localStorage.setItem('loginTime', String(Date.now()));;
      set({ user: res.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.error || 'Registration failed';
      set({ error: message, isLoading: false });
      throw new Error(message);
    }
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false, error: null, requires2FA: false, tempToken: null, loginEmail: '' });
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, isAuthenticated: true });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false, requires2FA: false, tempToken: null });
    }
  },

  clearError: () => set({ error: null }),
  clear2FA: () => set({ requires2FA: false, tempToken: null, loginEmail: '' }),
}));