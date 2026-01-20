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

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any existing session to prevent stale state issues
    sessionStorage.clear();

    const queryRole = searchParams.get('role');
    if (queryRole) setRole(queryRole);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // We pass the role to the login function in case the backend wants to verify it
      await login(email, password, role);
      navigate('/dashboard');
    } catch (err) {
      alert('Login failed: ' + (err.response?.data?.message || 'Invalid credentials'));
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${config.API_URL}/auth/forgot-password`, { email: forgotEmail });
      alert('Password reset link has been sent to your email.');
      setShowForgot(false);
    } catch (error) {
      alert(error.response?.data?.message || 'Error sending password reset email');
    }
  };

  const roles = [
    { id: 'student', label: 'Student', emoji: '👨‍🎓', color: 'blue' },
    { id: 'teacher', label: 'Teacher', emoji: '👨‍🏫', color: 'green' },
    { id: 'parent', label: 'Parent', emoji: '👨‍👩‍👦', color: 'purple' },
    { id: 'admin', label: 'Admin', emoji: '⚙️', color: 'red' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white bg-opacity-90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300 relative">
        <Link
          to="/"
          className="absolute top-6 left-6 text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1 text-sm font-semibold group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back
        </Link>
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg overflow-hidden p-1 border-2 border-blue-100">
            <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Portal Login</h2>

          <div className="flex justify-center gap-4 mb-4 mt-4">
            {roles.map((r) => {
              const isActive = role === r.id;
              const activeStyles = {
                blue: 'bg-blue-100 border-blue-500 shadow-blue-200 text-blue-700',
                green: 'bg-green-100 border-green-500 shadow-green-200 text-green-700',
                purple: 'bg-purple-100 border-purple-500 shadow-purple-200 text-purple-700',
                red: 'bg-red-100 border-red-500 shadow-red-200 text-red-700'
              };

              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRole(r.id)}
                  className={`flex flex-col items-center group transition-all duration-200 ${isActive ? 'scale-110' : 'opacity-50 grayscale hover:opacity-100 hover:grayscale-0'}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md border-2 transition-all ${isActive ? activeStyles[r.color] : 'bg-gray-50 border-gray-200 text-gray-400'
                    }`}>
                    {r.emoji}
                  </div>
                  <span className={`text-[10px] font-bold mt-1.5 uppercase tracking-tighter ${isActive ? activeStyles[r.color].split(' ').pop() : 'text-gray-400'
                    }`}>
                    {r.label}
                  </span>
                  {isActive && (
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 animate-pulse ${r.color === 'blue' ? 'bg-blue-500' :
                      r.color === 'green' ? 'bg-green-500' :
                        r.color === 'purple' ? 'bg-purple-500' : 'bg-red-500'
                      }`}></div>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-gray-500 text-sm">Sign in to your <span className="font-bold capitalize text-gray-700">{role}</span> account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors duration-300 bg-gray-50"
              required
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">📧</span>
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors duration-300 bg-gray-50"
              required
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔒</span>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
          >
            Sign In
          </button>
        </form>

        <div className="flex justify-between items-center mt-6 text-sm">
          <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-300">
            Create Account
          </Link>
          <button
            onClick={() => setShowForgot(true)}
            className="text-purple-600 hover:text-purple-800 font-medium transition-colors duration-300"
          >
            Forgot Password?
          </button>
        </div>

        {showForgot && (
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
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
                  Send Reset Email
                </button>
                <button
                  onClick={() => setShowForgot(false)}
                  className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
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
