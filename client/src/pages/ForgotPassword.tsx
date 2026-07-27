import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import api from '../api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } catch {}
    setSubmitted(true);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/20 mb-4">
            <Shield className="text-accent" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Reset Password</h1>
          <p className="text-sm text-text-muted mt-1">
            Enter your email to receive a reset link
          </p>
        </div>

        <div className="card">
          {submitted ? (
            <div className="text-center py-4">
              <div className="text-green-500 text-lg mb-2">Check your email</div>
              <p className="text-sm text-text-secondary mb-6">
                If an account exists for {email}, you will receive a password reset link shortly.
              </p>
              <Link to="/login" className="btn-primary inline-flex justify-center">
                Back to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center">
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-4 pt-4 border-t border-border text-center">
            <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary inline-flex items-center gap-1">
              <ArrowLeft size={14} />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
