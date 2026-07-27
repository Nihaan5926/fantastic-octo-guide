import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';
import { Shield, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, register, login2FA, error, isLoading, clearError } = useAuth();
  const requires2FA = useAuthStore((s) => s.requires2FA);
  const loginEmail = useAuthStore((s) => s.loginEmail);
  const clear2FA = useAuthStore((s) => s.clear2FA);
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<'login' | 'register'>('login');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);
  const [firstName, setFirstName] = React.useState('');
  const [lastName, setLastName] = React.useState('');
  const [totpCode, setTotpCode] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ email, password, firstName, lastName });
      }
    } catch {}
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login2FA(totpCode);
      navigate('/dashboard');
    } catch {}
  };

  const handleBackToLogin = () => {
    clear2FA();
    setTotpCode('');
  };

  if (requires2FA) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-4">
              <Shield className="text-accent" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Two-Factor Authentication</h1>
            <p className="text-sm text-text-muted mt-1">
              Enter the code from your authenticator app
            </p>
          </div>

          <div className="card">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-accent-danger/20 border border-accent-danger/30 text-accent-danger text-sm">
                {error}
              </div>
            )}

            <p className="text-sm text-text-secondary mb-4 text-center">
              A 6-digit code is required for <strong>{loginEmail}</strong>
            </p>

            <form onSubmit={handle2FA} className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Verification Code</label>
                <input
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input text-center text-2xl tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>

              <button type="submit" disabled={isLoading || totpCode.length !== 6} className="btn-primary w-full justify-center">
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : 'Verify'}
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-border text-center">
              <button onClick={handleBackToLogin} className="text-sm text-text-muted hover:text-text-secondary flex items-center justify-center gap-1 mx-auto">
                <ArrowLeft size={14} /> Back to login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-4">
            <Shield className="text-accent" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Intel Platform</h1>
          <p className="text-sm text-text-muted mt-1">
            Intelligence Collection & Management Platform
          </p>
        </div>

        <div className="card">
          <div className="flex mb-6 bg-bg-primary rounded-lg p-1">
            <button
              onClick={() => { setMode('login'); clearError(); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'login' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); clearError(); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'register' ? 'bg-accent text-white' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-accent-danger/20 border border-accent-danger/30 text-accent-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="analyst@agency.gov"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder={mode === 'register' ? 'Min. 8 characters' : 'Enter password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center"
            >
              {isLoading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 pt-4 border-t border-border space-y-2">
              <Link to="/forgot-password" className="block text-center text-xs text-accent hover:text-accent-hover">
                Forgot password?
              </Link>
              <p className="text-xs text-text-muted text-center">
                Demo: admin@intel.local / admin123!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
