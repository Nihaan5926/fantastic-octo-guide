import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, login2FA, register, logout, fetchProfile, clearError, error } =
    useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchProfile();
    }
  }, [isAuthenticated, user, fetchProfile]);

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    const state = useAuthStore.getState();
    if (!state.requires2FA) {
      navigate('/dashboard');
    }
  };

  const handleLogin2FA = async (totpCode: string) => {
    await login2FA(totpCode);
    navigate('/dashboard');
  };

  const handleRegister = async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    await register(data);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    login2FA: handleLogin2FA,
    register: handleRegister,
    logout: handleLogout,
    clearError,
  };
}
