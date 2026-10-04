import React from 'react';
import Ico from './home/Ico';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaTwitter, FaYoutube, FaInstagram } from 'react-icons/fa';
import { FiMapPin, FiPhone, FiGlobe, FiClock, FiArrowRight, FiArrowUp, FiNavigation } from 'react-icons/fi';
import oasisBannerLogo from '../assets/oasis_banner_new.png';
import { scrollToTop } from './home/scroll';

const SOCIALS = [
  { icon: FaFacebookF, path: '#', label: 'Facebook' },
  { icon: FaTwitter, path: '#', label: 'Twitter' },
  { icon: FaYoutube, path: 'https://youtube.com/@OASISJEECLASSES2.0', label: 'YouTube' },
  { icon: FaInstagram, path: '#', label: 'Instagram' },
];

const QUICK_LINKS = ['Home', 'About', 'Courses', 'Faculty', 'Results', 'Contact'];

const PROGRAMS = [
  'GROUND ZERO (Class 7)',
  'NURTURE (Class 8)',
  'SHAKSHAM (Class 9)',
  'DAKSH (Class 10)',
  'ABHYAAS (Class 11)',
  'TARGET (Class 12)',
  'Online Test Series',
];

const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Union+Bank+building+near+saguna+more+Danapur+Patna+801503';

const ColumnTitle = ({ children }) => (
  <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-white mb-6 flex items-center gap-2">
    <span className="w-4 h-0.5 rounded-full bg-brand-500" />
    {children}
  </h4>
);

const Footer = ({ showCta = true }) => {
  return (
    <footer className="relative bg-ink-950 text-white overflow-hidden">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-500 to-transparent" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[40rem] max-w-full h-80 rounded-full bg-brand-500/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        {/* CTA strip (Home renders its own final CTA) */}
        {showCta && (
        <div className="py-10 md:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-white/10">
          <div>
            <p className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Ready to start your <span className="ui-gradient-text">JEE journey?</span>
            </p>
            <p className="mt-2 text-gray-400">Book a free demo class and meet our faculty.</p>
          </div>
          <a href="/#demo-form" className="ui-btn-primary self-start md:self-auto px-6 py-3.5 rounded-2xl shadow-brand-glow group">
            Book Free Demo <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
        )}

        <div className={`${showCta ? 'py-12 md:py-16' : 'pt-14 md:pt-20 pb-12 md:pb-16'} grid grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-12 lg:gap-12`}>
          {/* Brand */}
          <div className="col-span-2 lg:col-span-4">
            <Link to="/" className="inline-block mb-6 group" aria-label="Oasis JEE Classes home">
              <span className="inline-block p-1.5 bg-white rounded-2xl">
                <img
                  src={oasisBannerLogo}
                  alt="Oasis JEE Classes"
                  loading="lazy"
                  className="h-14 md:h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </span>
            </Link>
            <p className="text-gray-400 leading-relaxed mb-8 max-w-sm">
              Patna&apos;s premier coaching institute for IIT-JEE &amp; Foundation. Empowering minds, transforming futures since 2009.
            </p>
            <div className="flex gap-3">
              {SOCIALS.map(({ icon, path, label }) => (
                <a
                  key={label}
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:text-white hover:bg-brand-gradient hover:border-transparent hover:-translate-y-1 hover:shadow-brand-glow transition-all duration-300"
                >
                  <Ico as={icon} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <ColumnTitle>Quick Links</ColumnTitle>
            <ul className="space-y-3">
              {QUICK_LINKS.map((item) => (
                <li key={item}>
                  <Link
                    to={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                    className="group inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <FiArrowRight className="w-3.5 h-3.5 -ml-5 opacity-0 group-hover:ml-0 group-hover:opacity-100 text-brand-500 transition-all" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Programs */}
          <div className="lg:col-span-3">
            <ColumnTitle>Our Programs</ColumnTitle>
            <ul className="space-y-3">
              {PROGRAMS.map((course) => (
                <li key={course}>
                  <Link to="/courses" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm sm:text-base">
                    <span className="w-1 h-1 rounded-full bg-brand-500 shrink-0" />
                    {course}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 lg:col-span-3">
            <ColumnTitle>Contact Us</ColumnTitle>
            <ul className="space-y-4 text-gray-400 text-sm">
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-brand-400 flex items-center justify-center"><FiMapPin /></span>
                <span>Union Bank building near saguna more<br />Danapur patna -801503</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-brand-400 flex items-center justify-center"><FiPhone /></span>
                <span>
                  <a href="tel:+919905424369" className="hover:text-white transition-colors">9905424369</a>,{' '}
                  <a href="tel:+918825198919" className="hover:text-white transition-colors">8825198919</a>
                </span>
              </li>
              <li className="flex items-center gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-brand-400 flex items-center justify-center"><FiGlobe /></span>
                <span>www.oasisjeeclasses.com</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="shrink-0 w-9 h-9 rounded-lg bg-white/5 border border-white/10 text-brand-400 flex items-center justify-center"><FiClock /></span>
                <span>Mon-Sat: 08:00 AM <br />to 08:00 PM</span>
              </li>
            </ul>
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-white hover:bg-white/10 hover:border-brand-500/50 transition-all"
            >
              <FiNavigation className="text-brand-400" /> Get Directions
            </a>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-5 text-sm">
          <p className="text-gray-500 text-center md:text-left">
            &copy; 2026 Oasis JEE Classes. All rights reserved.
            <span className="mx-2 hidden sm:inline text-white/10">|</span>
            <span className="hover:text-brand-400 cursor-pointer block sm:inline mt-2 sm:mt-0 transition-colors">Privacy Policy</span>
            <span className="mx-2 hidden sm:inline text-white/10">|</span>
            <span className="hover:text-brand-400 cursor-pointer block sm:inline mt-2 sm:mt-0 transition-colors">Terms of Service</span>
          </p>
          <div className="flex items-center gap-4">
            <span className="text-gray-600 text-xs">Made with ❤️ for the future engineers of India</span>
            <button
              type="button"
              onClick={scrollToTop}
              aria-label="Back to top"
              className="shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-300 hover:bg-brand-gradient hover:text-white hover:border-transparent transition-all"
            >
              <FiArrowUp />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
