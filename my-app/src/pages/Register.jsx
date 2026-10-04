import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiUser, FiMail, FiPhone, FiLock, FiKey, FiCheckCircle, FiArrowLeft } from 'react-icons/fi';
import oasisLogo from '../assets/oasis_logo.png';
import config from '../config';
import AuthField, { AuthShell, Spinner } from '../components/ui/AuthField';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '', role: 'student' });
  const [photoFile] = useState(null);
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const handleSendOtp = async () => {
    if (!form.email) return toast.error('Please enter your email first');
    setSendingOtp(true);
    try {
      await axios.post(`${config.API_URL}/auth/send-signup-otp`, { email: form.email });
      setIsOtpSent(true);
      toast.success('OTP sent to your email!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return toast.error('Please enter the OTP');
    setVerifyingOtp(true);
    try {
      await axios.post(`${config.API_URL}/auth/verify-signup-otp`, { email: form.email, otp });
      setIsVerified(true);
      toast.success('Email verified successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isVerified) return toast.error('Please verify your email with OTP first');

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => formData.append(key, form[key]));
      if (photoFile) formData.append('profilePhoto', photoFile);

      await axios.post(`${config.API_URL}/auth/register`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const roles = [
    { id: 'student', label: 'Student', emoji: '👨‍🎓' },
    { id: 'parent', label: 'Parent', emoji: '👨‍👩‍👦' },
  ];

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
          <div className="w-16 h-16 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg p-2 border border-brand-100">
            <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Create your account</h2>
          <p className="text-sm text-gray-500 mt-1">Join Oasis and start your JEE journey</p>
        </div>

        {/* Role selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl mb-5">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setForm({ ...form, role: r.id })}
              className={`py-2.5 rounded-xl text-sm font-bold transition-all ${form.role === r.id ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <span className="mr-1.5">{r.emoji}</span>{r.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <AuthField icon={FiUser} placeholder="Full Name" value={form.name} onChange={update('name')} autoComplete="name" required />

          <div className="flex gap-2">
            <div className="flex-1">
              <AuthField
                icon={FiMail}
                type="email"
                placeholder="Email Address"
                value={form.email}
                onChange={update('email')}
                disabled={isVerified}
                autoComplete="email"
                className={isVerified ? '!bg-green-50 !border-green-200 !text-green-700' : ''}
                required
              />
            </div>
            {isVerified ? (
              <span className="shrink-0 bg-green-50 text-green-600 px-3.5 rounded-2xl text-xs font-bold border border-green-200 flex items-center gap-1.5">
                <FiCheckCircle /> Verified
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp || !form.email}
                className="shrink-0 min-w-[96px] bg-brand-500 text-white px-4 rounded-2xl text-xs font-bold hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-brand-500/20 active:scale-95 flex items-center justify-center"
              >
                {sendingOtp ? <Spinner /> : isOtpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            )}
          </div>

          {isOtpSent && !isVerified && (
            <div className="flex gap-2 animate-fade-in-up">
              <div className="flex-1">
                <AuthField
                  icon={FiKey}
                  inputMode="numeric"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="tracking-[0.3em] placeholder:tracking-normal"
                  maxLength={6}
                  autoComplete="one-time-code"
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otp.length < 4}
                className="shrink-0 min-w-[96px] bg-gray-900 text-white px-4 rounded-2xl text-xs font-bold hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center"
              >
                {verifyingOtp ? <Spinner /> : 'Verify'}
              </button>
            </div>
          )}

          <AuthField icon={FiPhone} type="tel" inputMode="numeric" placeholder="Phone Number" value={form.phone} onChange={update('phone')} autoComplete="tel" required />
          <AuthField icon={FiLock} type="password" placeholder="Create Password" value={form.password} onChange={update('password')} autoComplete="new-password" required />

          {form.role === 'student' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in-up">
              <AuthField icon={FiUser} placeholder="Father's Name" value={form.fatherName || ''} onChange={update('fatherName')} />
              <AuthField icon={FiUser} placeholder="Mother's Name" value={form.motherName || ''} onChange={update('motherName')} />
            </div>
          )}

          <button
            type="submit"
            disabled={!isVerified || submitting}
            className={`w-full py-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${isVerified ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 active:translate-y-0' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            {submitting ? <><Spinner /> Creating account...</> : isVerified ? 'Create My Account' : 'Verify Email to Continue'}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-gray-500">
          Already a member?
          <Link to="/login" className="text-brand-500 hover:text-brand-700 font-bold ml-1">
            Login here
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default Register;
