import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import oasisLogo from '../assets/oasis_logo.png';

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', password: '', role: 'student' });
  const [photoFile, setPhotoFile] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      Object.keys(form).forEach(key => formData.append(key, form[key]));
      if (photoFile) formData.append('profilePhoto', photoFile);

      await axios.post('https://oasispatna.onrender.com/api/auth/register', formData, {
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
      <div className="bg-white bg-opacity-90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md transform hover:scale-105 transition-transform duration-300">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg overflow-hidden p-2">
            <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Join Oasis Jee Classes</h2>
          <p className="text-gray-600">Create your account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors duration-300 bg-gray-50"
              required
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">👤</span>
          </div>

          <div className="relative">
            <input
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors duration-300 bg-gray-50"
              required
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">📧</span>
          </div>

          <div className="relative">
            <input
              type="tel"
              placeholder="Phone Number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors duration-300 bg-gray-50"
              required
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">📱</span>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors duration-300 bg-gray-50"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🏠</span>
          </div>

          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files[0])}
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors duration-300 bg-gray-50"
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">📷</span>
          </div>

          <div className="relative">
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors duration-300 bg-gray-50"
              required
            />
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔒</span>
          </div>

          <div className="relative">
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors duration-300 bg-gray-50 appearance-none"
            >
              <option value="student">Student</option>
              <option value="parent">Parent</option>
            </select>
            <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🎓</span>
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">▼</span>
          </div>

          {form.role === 'student' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Father's Name"
                  value={form.fatherName || ''}
                  onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                  className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors duration-300 bg-gray-50"
                />
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">👨</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Mother's Name"
                  value={form.motherName || ''}
                  onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                  className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors duration-300 bg-gray-50"
                />
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">👩</span>
              </div>
              <div className="relative">
                <input
                  type="date"
                  value={form.dob || ''}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  className="w-full p-4 pl-12 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors duration-300 bg-gray-50 uppercase text-xs text-gray-400"
                />
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">📅</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white p-4 rounded-xl font-semibold hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg"
          >
            Create Account
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-gray-600">
            Already have an account?
            <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium ml-1 transition-colors duration-300">
              Sign In
            </Link>
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm">Join thousands of successful students at Oasis Jee Classes</p>
        </div>
      </div>
    </div>
  );
};

export default Register;

