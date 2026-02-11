
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('demo@demo.com');
  const [password, setPassword] = useState('demo');
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
      setError(err.message || 'Invalid email or password.');
      setLoading(false); // Stop loading on error
    } finally {
      // Only stop loading if we are NOT switching to 2FA mode (handled above) 
      // and NOT successful (handled by navigation, though component unmounts)
      // Actually we should stop loading if error or if we are done.
      // But if we switch to 2FA, we stopped loading manually.
      if (!show2FA && error) setLoading(false);
    }
  };

  const setDemoCreds = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('demo');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl text-white font-bold text-xl mb-4">
            M
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{show2FA ? 'Two-Factor Authentication' : 'Welcome Back'}</h2>
          <p className="text-gray-500 mt-2">{show2FA ? 'Enter the code from your authenticator app' : 'Please sign in to continue'}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {!show2FA ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Authentication Code</label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center text-2xl tracking-widest"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
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

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 font-medium hover:underline">
              Sign Up
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-3 text-center">LOGIN AS:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button onClick={() => setDemoCreds('demo@demo.com')} className="p-2 bg-gray-50 hover:bg-gray-100 rounded text-gray-600">Admin</button>
            <button onClick={() => setDemoCreds('manager@demo.com')} className="p-2 bg-gray-50 hover:bg-gray-100 rounded text-gray-600">Manager</button>
            <button onClick={() => setDemoCreds('accountant@demo.com')} className="p-2 bg-gray-50 hover:bg-gray-100 rounded text-gray-600">Accountant</button>
            <button onClick={() => setDemoCreds('auditor@demo.com')} className="p-2 bg-gray-50 hover:bg-gray-100 rounded text-gray-600">Auditor</button>
          </div>
          <p className="mt-2 text-center text-xs text-gray-400">Password: demo</p>
        </div>
      </div>
    </div>
  );
};
