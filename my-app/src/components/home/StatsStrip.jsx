import React from 'react';
import Ico from './Ico';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiAward, FiUsers, FiCheckCircle, FiActivity, FiUser, FiBookOpen, FiSettings } from 'react-icons/fi';
import { AnimatedNumber, Reveal } from '../ui/Motion';
import { useInView } from '../ui/motionUtils';

const STATS = [
  { value: 15, suffix: '+', label: 'Years Experience', icon: FiAward, emoji: '🏛️' },
  { value: 500, suffix: '+', label: 'JEE Selections', icon: FiUsers, emoji: '🎯' },
  { value: 1000, suffix: '+', label: 'Student Success', icon: FiCheckCircle, emoji: '🚀' },
  { value: 100, suffix: '%', label: 'Doubt Clearing', icon: FiActivity, emoji: '💡' },
];

const R = 26;
const C = 2 * Math.PI * R;

// Icon wrapped in a ring that sweeps closed as the stat counts up.
const RingIcon = ({ icon, active, delay }) => (
  <div className="relative shrink-0 w-16 h-16 md:w-[4.5rem] md:h-[4.5rem]">
    <svg viewBox="0 0 60 60" className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx="30" cy="30" r={R} fill="none" strokeWidth="4" className="home-ring-track" />
      <circle
        cx="30" cy="30" r={R} fill="none" strokeWidth="4" strokeLinecap="round" stroke="url(#home-ring-grad)"
        className="home-ring"
        style={{ strokeDasharray: C, strokeDashoffset: active ? 0 : C, transitionDelay: `${delay}ms` }}
      />
    </svg>
    <div className="absolute inset-[9px] rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xl group-hover:bg-brand-gradient group-hover:text-white group-hover:rotate-12 transition-all duration-300">
      <Ico as={icon} />
    </div>
  </div>
);

const PORTALS = [
  { role: 'student', label: 'Student Portal', desc: 'Tests, notes & live classes', icon: FiUser },
  { role: 'teacher', label: 'Teacher Portal', desc: 'Attendance, marks & content', icon: FiBookOpen },
  { role: 'parent', label: 'Parent Portal', desc: 'Progress, fees & alerts', icon: FiUsers },
  { role: 'admin', label: 'Admin Portal', desc: 'Manage the institute', icon: FiSettings },
];

const StatsStrip = () => {
  const [ref, inView] = useInView();
  return (
    <section id="portal-login" className="relative z-20 bg-white">
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <linearGradient id="home-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbad78" />
            <stop offset="100%" stopColor="#e15814" />
          </linearGradient>
        </defs>
      </svg>

      <div className="-mt-20 md:-mt-24 px-4 sm:px-6">
        <div ref={ref} className="max-w-6xl mx-auto rounded-[1.75rem] bg-white p-2 sm:p-3 shadow-card-hover ring-1 ring-black/5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100 rounded-2xl overflow-hidden">
            {STATS.map(({ value, suffix, label, icon, emoji }, i) => (
              <div key={label} className="group relative flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-4 md:p-6 text-center sm:text-left bg-white hover:bg-brand-50/60 transition-colors">
                <RingIcon icon={icon} active={inView} delay={i * 150} />
                <div>
                  <p className="text-2xl md:text-4xl font-black text-ink-950 tracking-tight leading-none">
                    <AnimatedNumber value={value} suffix={suffix} duration={1600} />
                  </p>
                  <p className="mt-1.5 text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500">{label}</p>
                </div>
                <span className="absolute top-2 right-3 text-base opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all" aria-hidden="true">{emoji}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Portal shortcuts */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 md:pt-12 pb-12 md:pb-16">
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="h-px w-8 bg-gray-200" />
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">Already with us? Jump into your portal</span>
          <span className="h-px w-8 bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {PORTALS.map(({ role, label, desc, icon }, i) => (
            <Reveal key={role} delay={i * 70}>
              <Link
                to={`/login?role=${role}`}
                className="group h-full flex items-center gap-3 p-3 md:p-4 rounded-2xl bg-white border border-gray-100 shadow-card hover:shadow-brand-soft hover:border-brand-200 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="shrink-0 w-10 h-10 md:w-11 md:h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-lg group-hover:bg-brand-gradient group-hover:text-white group-hover:-rotate-6 transition-all duration-300">
                  <Ico as={icon} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[13px] sm:text-sm text-gray-900 leading-tight">{label}</p>
                  <p className="hidden sm:block text-xs text-gray-500 truncate">{desc}</p>
                </div>
                <FiArrowRight className="hidden md:block text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsStrip;
