import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { FiSun, FiMoon, FiX } from 'react-icons/fi';
import oasisLogo from '../assets/oasis_logo.png';
import oasisBannerLogo from '../assets/oasis_banner_new.png';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) { // Adjust scroll threshold as needed
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ease-in-out ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-indigo-50' : 'bg-white border-b border-gray-100'}`}>
      <div className="w-full px-6 md:px-12 lg:px-16 h-16 md:h-20 flex justify-between items-center">
        <Link to="/" className="group flex items-center">
          <div className="relative p-1.5 md:p-2 bg-white rounded-2xl shadow-lg border border-gray-100/50 group-hover:shadow-indigo-500/10 transition-all duration-300 transform group-hover:-translate-y-0.5">
            <img
              src={oasisBannerLogo}
              alt="Oasis IIT JEE"
              className="h-10 md:h-14 w-auto object-contain"
            />
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex space-x-8 items-center">
          {[
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about' },
            { name: 'Courses', path: '/courses' },
            { name: 'Faculty', path: '/faculty' },
            { name: 'Results', path: '/results' },
            { name: 'Gallery', path: '/gallery' },
            { name: 'Contact', path: '/contact' },
          ].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="relative text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-300 font-bold text-sm uppercase tracking-tight group/nav"
            >
              <span className="relative z-10">{link.name}</span>
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300 group-hover/nav:w-full rounded-full"></span>
            </Link>
          ))}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300 focus:outline-none"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? (
              <FiMoon className="w-5 h-5 text-gray-600" />
            ) : (
              <FiSun className="w-5 h-5 text-yellow-500" />
            )}
          </button>

          <Link to="/login" className="relative group overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white px-8 py-3.5 rounded-2xl transition-all duration-300 text-sm font-black shadow-xl shadow-indigo-500/20 transform hover:-translate-y-1 hover:shadow-indigo-500/40 active:scale-95">
            <span className="relative z-10">Student Login</span>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          </Link>
        </div>

        {/* Mobile Controls */}
        <div className="flex items-center gap-4 lg:hidden">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-300 focus:outline-none"
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? (
              <FiMoon className="w-5 h-5 text-gray-600" />
            ) : (
              <FiSun className="w-5 h-5 text-yellow-500" />
            )}
          </button>

          <button
            className="z-50 relative text-gray-900 dark:text-white p-2 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle Menu"
          >
            <div className="w-6 h-6 flex flex-col justify-center gap-1.5">
              <span className={`block w-full h-0.5 bg-gray-900 dark:bg-white rounded-full transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
              <span className={`block w-full h-0.5 bg-gray-900 dark:bg-white rounded-full transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
              <span className={`block w-full h-0.5 bg-gray-900 dark:bg-white rounded-full transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-[60] lg:hidden transition-opacity duration-300 backdrop-blur-sm ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />

      {/* Side Navigation Drawer */}
      <div className={`fixed top-0 right-0 h-screen w-72 bg-white dark:bg-black z-[70] shadow-2xl transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'translate-x-0' : 'translate-x-full'} lg:hidden flex flex-col border-l border-gray-100 dark:border-gray-800`}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
          <span className="text-lg font-black text-gray-800 dark:text-gray-100 tracking-tight">Navigation</span>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
          >
            <FiX className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-1">
          {[
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about' },
            { name: 'Courses', path: '/courses' },
            { name: 'Faculty', path: '/faculty' },
            { name: 'Results', path: '/results' },
            { name: 'Gallery', path: '/gallery' },
            { name: 'Contact', path: '/contact' },
          ].map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="block px-4 py-4 rounded-2xl text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-sm uppercase tracking-tight transition-all"
              onClick={() => setIsOpen(false)}
            >
              <div className="flex items-center justify-between">
                <span>{link.name}</span>
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </Link>
          ))}

          <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
            <Link
              to="/login"
              className="block w-full text-center bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-6 py-5 rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
              onClick={() => setIsOpen(false)}
            >
              Student Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
