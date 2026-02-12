
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { ArrowLeft, Mail, Lock, ShieldCheck } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Email, 2: OTP & Reset
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleRequestOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            await api.auth.forgotPassword(email);
            setMessage('A reset code has been sent to your email.');
            setStep(2);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset code.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await api.auth.resetPassword({ email, otp, newPassword });
            alert('Password reset successful! Please log in with your new password.');
            navigate('/login');
        } catch (err: any) {
            setError(err.message || 'Failed to reset password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="mb-6">
                    <Link to="/login" className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 transition-colors">
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Login
                    </Link>
                </div>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-xl mb-4 text-2xl font-bold">
                        {step === 1 ? <Mail size={24} /> : <ShieldCheck size={24} />}
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        {step === 1 ? 'Forgot Password?' : 'Reset Password'}
                    </h2>
                    <p className="text-gray-500 mt-2">
                        {step === 1
                            ? "No worries, we'll send you reset instructions."
                            : "Enter the code and your new password below."}
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 font-medium text-center">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100 font-medium text-center">
                        {message}
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleRequestOTP} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    placeholder="name@company.com"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200"
                        >
                            {loading ? 'Sending Code...' : 'Send Reset Code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Verification Code</label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                placeholder="000000"
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-center text-3xl font-bold tracking-[0.5em]"
                                value={otp}
                                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || otp.length !== 6}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-blue-200"
                        >
                            {loading ? 'Resetting Password...' : 'Reset Password'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-center text-sm text-gray-500 hover:text-blue-600"
                        >
                            Didn't receive code? Send again
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};
