import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaYoutube, FaInstagram, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaClock } from 'react-icons/fa';
import oasisLogo from '../assets/oasis_logo.png';
import oasisBannerLogo from '../assets/oasis_banner_new.png';

const Footer = () => {
  return (
    <footer className="bg-[#0f172a] text-white pt-24 pb-12 overflow-hidden relative">
      {/* Background Decorative Element */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-50"></div>

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 mb-12 lg:mb-20">

          {/* Brand Section */}
          <div className="lg:col-span-4">
            <Link to="/" className="inline-block mb-8 group">
              <img
                src={oasisBannerLogo}
                alt="Oasis IIT JEE"
                className="h-16 md:h-24 w-auto object-contain transition-all duration-300 group-hover:scale-105 rounded-xl shadow-lg border border-white/5"
              />
            </Link>
            <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-sm">
              Patna's premier coaching institute for IIT-JEE & Foundation. Empowering minds, transforming futures since 2014.
            </p>
            <div className="flex space-x-4">
              {[
                { icon: <FaFacebookF />, path: '#', color: 'hover:bg-blue-600' },
                { icon: <FaTwitter />, path: '#', color: 'hover:bg-sky-500' },
                { icon: <FaYoutube />, path: '#', color: 'hover:bg-red-600' },
                { icon: <FaInstagram />, path: '#', color: 'hover:bg-pink-600' }
              ].map((social, idx) => (
                <a
                  key={idx}
                  href={social.path}
                  className={`w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-xl transition-all duration-300 ${social.color} hover:shadow-2xl hover:-translate-y-1`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="text-xl font-bold mb-8">Quick Links</h4>
            <ul className="space-y-4">
              {['Home', 'About', 'Courses', 'Faculty', 'Results', 'Contact'].map((item) => (
                <li key={item}>
                  <Link
                    to={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                    className="text-gray-400 hover:text-white transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 scale-0 group-hover:scale-100 transition-transform"></div>
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Popular Courses */}
          <div className="lg:col-span-3">
            <h4 className="text-xl font-bold mb-8">Our Programs</h4>
            <ul className="space-y-4 text-gray-400">
              {[
                'JEE Foundation (9th-10th)',
                'JEE Main (11th-12th)',
                'JEE Advanced Intensive',
                'Repeater/Dropper Batch',
                'Scholarship Test (OTSE)',
                'Online Test Series'
              ].map((course) => (
                <li key={course} className="hover:text-white transition-colors cursor-pointer flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-indigo-500"></div>
                  {course}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="lg:col-span-3">
            <h4 className="text-xl font-bold mb-8">Contact Us</h4>
            <ul className="space-y-6 text-gray-400">
              <li className="flex items-start gap-4">
                <div className="p-3 bg-white/5 rounded-xl text-indigo-400"><FaMapMarkerAlt /></div>
                <span className="text-sm">Above Corporation Bank, <br />Saguna More, Patna - 801503</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl text-indigo-400"><FaPhoneAlt /></div>
                <span className="text-sm">+91-0612-XXXXXXX</span>
              </li>
              <li className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-xl text-indigo-400"><FaEnvelope /></div>
                <span className="text-sm">info@oasisjee.com</span>
              </li>
              <li className="flex items-start gap-4">
                <div className="p-3 bg-white/5 rounded-xl text-indigo-400"><FaClock /></div>
                <span className="text-sm">Mon-Sat: 09:00 AM <br />to 08:00 PM</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:row items-center justify-between gap-8">
          <p className="text-gray-500 text-sm text-center">
            &copy; 2025 Oasis JEE Classes. All rights reserved.
            <span className="mx-2 hidden sm:inline">|</span>
            <span className="hover:text-indigo-400 cursor-pointer block sm:inline mt-2 sm:mt-0 transition-colors">Privacy Policy</span>
            <span className="mx-2 hidden sm:inline">|</span>
            <span className="hover:text-indigo-400 cursor-pointer block sm:inline mt-2 sm:mt-0 transition-colors">Terms of Service</span>
          </p>
          <div className="flex items-center gap-2 text-gray-600 text-xs italic">
            Made with ❤️ for the future engineers of India
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
