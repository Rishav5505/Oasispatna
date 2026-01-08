import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import oasisLogo from '../assets/oasis_logo.png';
import config from '../config';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '', role: 'student' });
  const [photoFile, setPhotoFile] = useState(null);
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = async () => {
    if (!form.email) return alert('Please enter your email first');
    setSendingOtp(true);
    try {
      await axios.post(`${config.API_URL}/auth/send-signup-otp`, { email: form.email });
      setIsOtpSent(true);
      alert('OTP sent to your email!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return alert('Please enter the OTP');
    setVerifyingOtp(true);
    try {
      await axios.post(`${config.API_URL}/auth/verify-signup-otp`, { email: form.email, otp });
      setIsVerified(true);
      alert('Email verified successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isVerified) return alert('Please verify your email with OTP first');

    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => formData.append(key, form[key]));
      if (photoFile) formData.append('profilePhoto', photoFile);

      await axios.post(`${config.API_URL}/auth/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed. Please try again.';
      alert(errorMsg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-500 flex items-center justify-center p-4">
      <div className="bg-white bg-opacity-90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md transform transition-all duration-300">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg overflow-hidden p-2">
            <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Join Oasis Jee Classes</h2>
          <p className="text-sm text-gray-600">Create your account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-gray-50 text-sm"
              required
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">👤</span>
          </div>

          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={isVerified}
                className={`w-full p-3 pl-10 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-gray-50 text-sm ${isVerified ? 'bg-green-50 border-green-200' : ''}`}
                required
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">📧</span>
            </div>
            {!isVerified && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || !form.email}
                className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {sendingOtp ? '...' : (isOtpSent ? 'Resend' : 'Send OTP')}
              </button>
            )}
            {isVerified && (
              <span className="bg-green-100 text-green-600 px-3 py-2 rounded-xl text-xs font-bold border border-green-200 flex items-center">
                ✓
              </span>
            )}
          </div>

          {isOtpSent && !isVerified && (
            <div className="relative flex gap-2 animate-in slide-in-from-top-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-gray-50 text-sm"
                  maxLength="6"
                />
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔑</span>
              </div>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || !otp}
                className="bg-green-600 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
              >
                {verifyingOtp ? '...' : 'Verify'}
              </button>
            </div>
          )}

          <div className="relative">
            <input
              type="tel"
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-gray-50 text-sm"
              required
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">📱</span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-gray-50 text-sm"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🏠</span>
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-gray-50 text-sm"
              required
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔒</span>
          </div>

          <div className="relative">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-gray-50 text-sm appearance-none"
            >
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🎓</span>
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">▼</span>
          </div>

          {form.role === 'student' && (
            <div className="space-y-3 animate-in fade-in duration-300">
              <input
                type="text"
                placeholder="Father's Name"
                value={form.fatherName || ''}
                onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-gray-50 text-sm"
              />
              <input
                type="text"
                placeholder="Mother's Name"
                value={form.motherName || ''}
                onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-gray-50 text-sm"
              />
              <input
                type="date"
                value={form.dob || ''}
                onChange={(e) => setForm({ ...form, dob: e.target.value })}
                className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:border-green-500 focus:outline-none bg-gray-50 text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!isVerified}
            className={`w-full p-4 rounded-xl font-bold transform transition-all duration-300 shadow-lg ${isVerified ? 'bg-gradient-to-r from-green-500 to-blue-600 text-white hover:scale-105 shadow-green-500/25' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {isVerified ? 'Create Account' : 'Please Verify Email First'}
          </button>
        </form>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-600">
            Already have an account?
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-bold ml-1">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
