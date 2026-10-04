import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FiX, FiHome, FiEdit3, FiInfo, FiBookOpen, FiUsers, FiAward, FiImage, FiPhone, FiArrowRight, FiLogIn, FiPhoneCall,
} from 'react-icons/fi';
import oasisBannerLogo from '../assets/oasis_banner_new.png';
import { getScrollY, subscribeScroll } from './home/scroll';

const NAV_LINKS = [
  { name: 'Home', path: '/', icon: FiHome },
  { name: 'About', path: '/about', icon: FiInfo },
  { name: 'Courses', path: '/courses', icon: FiBookOpen },
  { name: 'Admission', path: '/admission', icon: FiEdit3 },
  { name: 'Faculty', path: '/faculty', icon: FiUsers },
  { name: 'Results', path: '/results', icon: FiAward },
  { name: 'Gallery', path: '/gallery', icon: FiImage },
  { name: 'Contact', path: '/contact', icon: FiPhone },
];

// Height of the announcement bar the navbar rests beneath before scrolling.
const TOP_OFFSET = 32;

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const { pathname } = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrollY(getScrollY());
    handleScroll();
    return subscribeScroll(handleScroll);
  }, []);

  // Lock body scroll + close on Escape while the mobile drawer is open.
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setIsOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const scrolled = scrollY > 10;
  const top = Math.max(0, TOP_OFFSET - scrollY);
  const isActive = (path) => (path === '/' ? pathname === '/' : pathname.startsWith(path));

  return (
    <>
      <nav
        style={{ top }}
        className={`fixed left-0 w-full z-[100] transition-[background-color,box-shadow,border-color] duration-500 ${
          scrolled
            ? 'ui-glass !border-x-0 !border-t-0 border-b shadow-card'
            : 'bg-white dark:bg-ink-950 border-b border-gray-100 dark:border-white/5'
        }`}
      >
        <div className="w-full max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-10 h-16 md:h-20 flex justify-between items-center gap-4">
          <Link to="/" className="group flex items-center shrink-0" aria-label="Oasis JEE Classes home">
            <div className="p-1 md:p-1.5 bg-white rounded-xl shadow-sm border border-gray-100 group-hover:shadow-brand-soft transition-all duration-300">
              <img src={oasisBannerLogo} alt="Oasis JEE Classes" className="h-9 md:h-12 w-auto object-contain" />
            </div>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {NAV_LINKS.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  aria-current={active ? 'page' : undefined}
                  className={`relative px-2 xl:px-2.5 2xl:px-4 py-2 rounded-xl text-sm whitespace-nowrap font-semibold transition-colors duration-300 group/nav ${
                    active ? 'text-brand-600' : 'text-gray-700 dark:text-gray-200 hover:text-brand-600 hover:bg-brand-50/70 dark:hover:bg-white/5'
                  }`}
                >
                  {link.name}
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 -bottom-0.5 h-1 rounded-full bg-brand-gradient transition-all duration-300 ${
                      active ? 'w-5 opacity-100' : 'w-0 opacity-0 group-hover/nav:w-3 group-hover/nav:opacity-60'
                    }`}
                  />
                </Link>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            <Link to="/login" className="ui-btn-secondary rounded-xl px-3 xl:px-4 py-2.5 whitespace-nowrap" aria-label="Student Login">
              <FiLogIn /> <span className="hidden xl:inline">Student Login</span>
            </Link>
            <a href="/#demo-form" className="ui-btn-primary rounded-xl px-4 xl:px-5 py-2.5 shadow-brand-glow group whitespace-nowrap">
              <span className="xl:hidden">Free Demo</span><span className="hidden xl:inline">Book Free Demo</span>
              <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center gap-1.5 lg:hidden">
            <a href="/#demo-form" className="ui-btn-primary rounded-xl px-3.5 py-2 text-xs">
              Free Demo
            </a>
            <button
              type="button"
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-brand-50 transition-colors"
              onClick={() => setIsOpen(true)}
              aria-label="Open menu"
              aria-expanded={isOpen}
              aria-controls="mobile-drawer"
            >
              <span className="w-5 flex flex-col gap-1.5">
                <span className="block h-0.5 w-full bg-current rounded-full" />
                <span className="block h-0.5 w-3/4 bg-current rounded-full" />
                <span className="block h-0.5 w-full bg-current rounded-full" />
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Backdrop (outside <nav> so backdrop-filter never traps fixed children) */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Side Navigation Drawer */}
      <aside
        id="mobile-drawer"
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
        className={`fixed top-0 right-0 h-[100dvh] w-[86vw] max-w-sm bg-white dark:bg-ink-950 z-[130] shadow-2xl lg:hidden flex flex-col transition-[transform,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full invisible'
        }`}
      >
        <div className="relative px-5 pt-5 pb-6 bg-brand-sunset text-white overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="p-1 bg-white rounded-xl">
              <img src={oasisBannerLogo} alt="Oasis JEE Classes" className="h-9 w-auto object-contain" />
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              aria-label="Close menu"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
          <p className="relative mt-4 text-sm text-white/80">Patna&apos;s trusted institute for JEE &amp; NEET.</p>
        </div>

        <nav className="flex-1 overflow-y-auto ui-scrollbar p-4 space-y-1">
          {NAV_LINKS.map((link, i) => {
            const active = isActive(link.path);
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`ui-nav-item ${active ? 'ui-nav-item-active' : ''} ${isOpen ? 'animate-slide-in-right' : ''}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{link.name}</span>
                {!active && <FiArrowRight className="w-4 h-4 opacity-40" />}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-white/5 space-y-2.5">
          <a href="/#demo-form" onClick={() => setIsOpen(false)} className="ui-btn-primary w-full py-3.5 rounded-2xl text-base">
            Book Free Demo <FiArrowRight />
          </a>
          <Link to="/login" onClick={() => setIsOpen(false)} className="ui-btn-dark w-full py-3.5 rounded-2xl text-base">
            <FiLogIn /> Student Login
          </Link>
          <a href="tel:+918825198919" className="flex items-center justify-center gap-2 pt-2 text-sm font-semibold text-gray-500 hover:text-brand-600">
            <FiPhoneCall /> 8825198919
          </a>
        </div>
      </aside>
    </>
  );
};

export default Navbar;
