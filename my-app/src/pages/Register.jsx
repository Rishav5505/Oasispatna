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
    <div className="min-h-screen bg-black bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-[0_0_50px_rgba(243,112,33,0.3)] p-8 w-full max-w-md transform transition-all duration-300 border border-orange-500/10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg overflow-hidden p-2 border border-orange-100">
            <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-1 uppercase tracking-tight">Join Oasis</h2>
          <p className="text-sm text-gray-500 font-medium tracking-wide">Enter your details to register</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-4 border border-gray-100 rounded-2xl focus:border-[#f37021] focus:ring-4 focus:ring-orange-500/10 focus:outline-none bg-gray-50 text-sm font-semibold transition-all"
              required
            />
          </div>

          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <input
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={isVerified}
                className={`w-full p-4 border border-gray-100 rounded-2xl focus:border-[#f37021] focus:ring-4 focus:ring-orange-500/10 focus:outline-none bg-gray-50 text-sm font-semibold transition-all ${isVerified ? 'bg-green-50 border-green-200 text-green-700' : ''}`}
                required
              />
            </div>
            {!isVerified && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || !form.email}
                className="bg-[#f37021] text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-orange-600 disabled:opacity-50 transition-all shadow-md active:scale-95"
              >
                {sendingOtp ? '...' : (isOtpSent ? 'Resend' : 'OTP')}
              </button>
            )}
            {isVerified && (
              <span className="bg-green-100 text-green-600 px-4 py-2 rounded-2xl text-xs font-bold border border-green-200 flex items-center">
                ✓ Verified
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
                  className="w-full p-4 border border-gray-100 rounded-2xl focus:border-[#f37021] focus:ring-4 focus:ring-orange-500/10 focus:outline-none bg-gray-50 text-sm font-semibold"
                  maxLength="6"
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || !otp}
                className="bg-black text-white px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-900 disabled:opacity-50 transition-all"
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
              className="w-full p-4 border border-gray-100 rounded-2xl focus:border-[#f37021] focus:ring-4 focus:ring-orange-500/10 focus:outline-none bg-gray-50 text-sm font-semibold"
              required
            />
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-4 border border-gray-100 rounded-2xl focus:border-[#f37021] focus:ring-4 focus:ring-orange-500/10 focus:outline-none bg-gray-50 text-sm font-semibold"
              required
            />
          </div>

          <div className="relative">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full p-4 border border-gray-100 rounded-2xl focus:border-[#f37021] focus:ring-4 focus:ring-orange-500/10 focus:outline-none bg-gray-50 text-sm font-semibold appearance-none cursor-pointer"
            >
              <option value="student">Student Account</option>
              <option value="parent">Parent Account</option>
            </select>
          </div>

          {form.role === 'student' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <input
                type="text"
                placeholder="Father's Name"
                value={form.fatherName || ''}
                onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                className="w-full p-4 border border-gray-100 rounded-2xl focus:border-[#f37021] focus:ring-4 focus:ring-orange-500/10 focus:outline-none bg-gray-50 text-sm font-semibold"
              />
              <input
                type="text"
                placeholder="Mother's Name"
                value={form.motherName || ''}
                onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                className="w-full p-4 border border-gray-100 rounded-2xl focus:border-[#f37021] focus:ring-4 focus:ring-orange-500/10 focus:outline-none bg-gray-50 text-sm font-semibold"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!isVerified}
            className={`w-full p-5 rounded-2xl font-black text-sm uppercase tracking-widest transform transition-all duration-300 shadow-xl ${isVerified ? 'bg-gradient-to-r from-[#f37021] to-black text-white hover:scale-[1.02] shadow-orange-500/30' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            {isVerified ? 'Create My Account' : 'Verify Email to Proceed'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500 font-bold">
            Already a member?
            <Link to="/login" className="text-[#f37021] hover:text-orange-700 ml-1">
              LOGIN HERE
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
