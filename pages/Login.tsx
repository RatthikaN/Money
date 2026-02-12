
import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Pass code if we are in 2FA mode
      const response = await api.auth.login(email, password, show2FA ? code : undefined);

      if (response.twoFactorRequired) {
        setShow2FA(true);
        setLoading(false);
        return;
      }

      // Save the actual token from the backend
      localStorage.setItem('token', response.token);

      localStorage.setItem('userRole', response.user.role);
      localStorage.setItem('userName', response.user.name);

      // Redirect based on role
      if (response.user.role === 'Accountant') {
        navigate('/expenses');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      if (err.needsVerification) {
        setError('Please verify your email before logging in.');
        // Optionally redirect or show verification UI
      } else {
        setError(err.message || 'Invalid email or password.');
      }
      setLoading(false);
    } finally {
      if (!show2FA && error) setLoading(false);
    }
  };

  const setQuickLogin = () => {
    setEmail('');
    setPassword('');
    setCode('');
    setError('');
    setShow2FA(false);
    emailInputRef.current?.focus();
  };


  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    try {
      await api.auth.resendOTP(email);
      alert('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl text-white font-bold text-xl mb-4">
            M
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{show2FA ? 'Verify Identity' : 'Welcome Back'}</h2>
          <p className="text-gray-500 mt-2">{show2FA ? 'Enter the 6-digit code sent to your email' : 'Please sign in to continue'}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {!show2FA ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  ref={emailInputRef}
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <Link to="/forgot-password" size="sm" className="text-xs text-blue-600 hover:underline font-medium">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center text-3xl font-bold tracking-[0.5em]"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="w-full mt-4 text-sm text-gray-500 hover:text-blue-600 transition-colors"
              >
                Didn't receive the code? Resend OTP
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (show2FA ? 'Verifying...' : 'Signing In...') : (show2FA ? 'Verify Code' : 'Sign In')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 font-medium hover:underline">
              Create Account
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3 text-center uppercase tracking-widest">Quick Access</p>
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <button onClick={setQuickLogin} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-bold border border-gray-100 transition-all active:scale-95">
              Admin
            </button>
            <button onClick={setQuickLogin} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-bold border border-gray-100 transition-all active:scale-95">
              Manager
            </button>
            <button onClick={setQuickLogin} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-bold border border-gray-100 transition-all active:scale-95">
              Accountant
            </button>
            <button onClick={setQuickLogin} className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-bold border border-gray-100 transition-all active:scale-95">
              Auditor
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
