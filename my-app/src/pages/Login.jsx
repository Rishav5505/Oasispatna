import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import oasisLogo from '../assets/oasis_logo.png';
import config from '../config';

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
      alert('Login failed: ' + (err.response?.data?.message || 'Invalid credentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${config.API_URL}/auth/forgot-password`, { email: forgotEmail });
      alert('OTP has been sent to your email.');
      setResetStep(2);
    } catch (error) {
      alert(error.response?.data?.message || 'Error sending OTP');
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${config.API_URL}/auth/reset-password`, {
        email: forgotEmail,
        otp,
        newPassword
      });
      alert('Password has been reset successfully. Please login.');
      setShowForgot(false);
      setResetStep(1);
      setOtp('');
      setNewPassword('');
    } catch (error) {
      alert(error.response?.data?.message || 'Error resetting password');
    }
  };

  const roles = [
    { id: 'student', label: 'Student', emoji: '👨‍🎓', color: 'orange' },
    { id: 'teacher', label: 'Teacher', emoji: '👨‍🏫', color: 'gray' },
    { id: 'parent', label: 'Parent', emoji: '👨‍👩‍👦', color: 'amber' },
    { id: 'admin', label: 'Admin', emoji: '⚙️', color: 'red' }
  ];

  return (
    <div className="min-h-screen bg-black bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-[0_0_50px_rgba(243,112,33,0.3)] p-8 w-full max-w-md transform transition-all duration-300 relative border border-orange-500/10">
        <Link
          to="/"
          className="absolute top-6 left-6 text-gray-400 hover:text-[#f37021] transition-colors flex items-center gap-1 text-xs font-black uppercase tracking-widest group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Home
        </Link>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg overflow-hidden p-1 border-2 border-orange-100">
            <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight">Portal Login</h2>

          <div className="flex justify-center gap-4 mb-4 mt-6">
            {roles.map((r) => {
              const isActive = role === r.id;
              const activeStyles = {
                orange: 'bg-orange-100 border-[#f37021] shadow-orange-200 text-[#f37021]',
                gray: 'bg-gray-100 border-gray-900 shadow-gray-200 text-gray-900',
                amber: 'bg-amber-100 border-amber-600 shadow-amber-200 text-amber-600',
                red: 'bg-red-100 border-red-600 shadow-red-200 text-red-600'
              };

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`flex flex-col items-center group transition-all duration-200 ${isActive ? 'scale-110' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-md border-2 transition-all ${isActive ? activeStyles[r.color] : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}>
                    {r.emoji}
                  </div>
                  <span className={`text-[9px] font-black mt-2 uppercase tracking-tight ${isActive ? activeStyles[r.color].split(' ').pop() : 'text-gray-400'
                    }`}>
                    {r.label}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Sign in as <span className="text-[#f37021]">{role}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 border border-gray-100 rounded-2xl focus:border-[#f37021] focus:ring-4 focus:ring-orange-500/10 focus:outline-none bg-gray-50 text-sm font-semibold transition-all"
              required
            />
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 border border-gray-100 rounded-2xl focus:border-[#f37021] focus:ring-4 focus:ring-orange-500/10 focus:outline-none bg-gray-50 text-sm font-semibold transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-gradient-to-r from-[#f37021] to-black text-white p-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 ${isLoading ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.02] shadow-xl shadow-orange-500/20'}`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              'Sign In Now'
            )}
          </button>
        </form>

        <div className="flex justify-between items-center mt-6 text-xs font-bold">
          <Link to="/register" className="text-gray-500 hover:text-[#f37021] transition-colors uppercase tracking-tight">
            New Student? Register
          </Link>
          <button
            onClick={() => setShowForgot(true)}
            className="text-gray-500 hover:text-[#f37021] transition-colors uppercase tracking-tight"
          >
            Forgot Password?
          </button>
        </div>

        {showForgot && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
            {resetStep === 1 ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  required
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-500 to-teal-600 text-white p-3 rounded-lg font-semibold hover:from-green-600 hover:to-teal-700 transition-all duration-300"
                  >
                    Send OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgot(false)}
                    className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  required
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors duration-300"
                  required
                  minLength={6}
                />
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-3 rounded-lg font-semibold hover:from-purple-600 hover:to-indigo-700 transition-all duration-300"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-300"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">Secure login powered by Oasis Jee Classes</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
