import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiKey, FiArrowLeft } from 'react-icons/fi';
import oasisLogo from '../assets/oasis_logo.png';
import config from '../config';
import AuthField, { AuthShell, Spinner } from '../components/ui/AuthField';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(searchParams.get('role') || 'student');
  const [forgotEmail, setForgotEmail] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any existing session to prevent stale state issues
    sessionStorage.clear();

    const queryRole = searchParams.get('role');
    if (queryRole) setRole(queryRole);
  }, [searchParams]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // We pass the role to the login function in case the backend wants to verify it
      await login(email, password, role);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const [resetLoading, setResetLoading] = useState(false);

  const handleForgot = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await axios.post(`${config.API_URL}/auth/forgot-password`, { email: forgotEmail });
      toast.success('OTP has been sent to your email.');
      setResetStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error sending OTP');
    } finally {
      setResetLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await axios.post(`${config.API_URL}/auth/reset-password`, {
        email: forgotEmail,
        otp,
        newPassword
      });
      toast.success('Password reset successfully. Please login.');
      setShowForgot(false);
      setResetStep(1);
      setOtp('');
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error resetting password');
    } finally {
      setResetLoading(false);
    }
  };

  const roles = [
    { id: 'student', label: 'Student', emoji: '👨‍🎓' },
    { id: 'teacher', label: 'Teacher', emoji: '👨‍🏫' },
    { id: 'parent', label: 'Parent', emoji: '👨‍👩‍👦' },
    { id: 'admin', label: 'Admin', emoji: '⚙️' }
  ];

  const secondaryBtn = 'px-4 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors';
  const primaryBtn = 'flex-1 bg-brand-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-brand-600 disabled:opacity-60 transition-all flex items-center justify-center gap-2';

  return (
    <AuthShell>
      <div className="relative bg-white rounded-3xl shadow-[0_0_60px_rgba(243,112,33,0.25)] p-7 sm:p-8 border border-brand-500/10">
        <Link
          to="/"
          className="absolute top-6 left-6 text-gray-400 hover:text-brand-500 transition-colors flex items-center gap-1 text-xs font-bold uppercase tracking-wider group"
        >
          <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Home
        </Link>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg p-1.5 border border-brand-100">
            <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Welcome back</h2>
          <p className="text-sm text-gray-500 mt-1">Sign in to your Oasis portal</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-gray-100 rounded-2xl mb-5">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRole(r.id)}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${role === r.id ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <span className={`text-lg transition-all ${role === r.id ? '' : 'grayscale opacity-60'}`}>{r.emoji}</span>
              <span className="text-[11px] font-bold">{r.label}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <AuthField icon={FiMail} type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <AuthField icon={FiLock} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgot((v) => !v)}
              className="text-xs font-bold text-gray-500 hover:text-brand-500 transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 active:translate-y-0'}`}
          >
            {isLoading ? <><Spinner /> Signing in...</> : <>Sign in as {role}</>}
          </button>
        </form>

        {showForgot && (
          <div className="mt-5 p-4 bg-brand-50/60 rounded-2xl border border-brand-100 animate-fade-in-up">
            <p className="text-sm font-bold text-gray-800 mb-3">
              {resetStep === 1 ? 'Reset your password' : 'Enter OTP & new password'}
            </p>
            {resetStep === 1 ? (
              <form onSubmit={handleForgot} className="space-y-3">
                <AuthField icon={FiMail} type="email" placeholder="Enter your email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required />
                <div className="flex gap-2">
                  <button type="submit" disabled={resetLoading} className={primaryBtn}>
                    {resetLoading ? <Spinner /> : 'Send OTP'}
                  </button>
                  <button type="button" onClick={() => setShowForgot(false)} className={secondaryBtn}>Cancel</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-3">
                <AuthField icon={FiKey} inputMode="numeric" placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)} autoComplete="one-time-code" required />
                <AuthField icon={FiLock} type="password" placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required minLength={6} />
                <div className="flex gap-2">
                  <button type="submit" disabled={resetLoading} className={primaryBtn}>
                    {resetLoading ? <Spinner /> : 'Reset Password'}
                  </button>
                  <button type="button" onClick={() => setResetStep(1)} className={secondaryBtn}>Back</button>
                </div>
              </form>
            )}
          </div>
        )}

        <p className="text-center mt-6 text-sm text-gray-500">
          New student?
          <Link to="/register" className="text-brand-500 hover:text-brand-700 font-bold ml-1">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default Login;
