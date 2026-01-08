import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import oasisLogo from '../assets/oasis_logo.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://oasispatna.onrender.com/api/auth/forgot-password', { email });
      alert('Reset email sent! Check your inbox.');
    } catch (err) {
      alert('Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white bg-opacity-90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md transform hover:scale-105 transition-transform duration-300">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg overflow-hidden p-2">
            <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Reset Password</h2>
          <p className="text-gray-600">Enter your email to receive a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:outline-none transition-colors duration-300 bg-gray-50"
              required
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">📧</span>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white p-4 rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
          >
            Send Reset Link
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            Remember your password?
            <Link to="/login" className="text-orange-600 hover:text-orange-800 font-medium ml-1 transition-colors duration-300">
              Sign In
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">Secure password recovery for Oasis Jee Classes</p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

