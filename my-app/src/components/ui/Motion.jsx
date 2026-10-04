import React, { useEffect, useState } from 'react';
import { useInView, prefersReducedMotion } from './motionUtils';

// Counts up from 0 to `value` once visible. Non-numeric values render as-is.
export const AnimatedNumber = ({ value, duration = 1200, prefix = '', suffix = '', decimals = 0, className = '' }) => {
  const [ref, inView] = useInView();
  const target = Number(value);
  const [display, setDisplay] = useState(0);

  const reduced = prefersReducedMotion();

  useEffect(() => {
    if (!inView || !Number.isFinite(target) || reduced) return;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.max(0, Math.min((now - start) / duration, 1));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(target * eased);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, target, duration, reduced]);

  if (!Number.isFinite(target)) return <span className={className}>{value ?? '—'}</span>;
  const formatted = (reduced ? target : display).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span ref={ref} className={className}>{prefix}{formatted}{suffix}</span>;
};

// Fades/slides children in when scrolled into view.
export const Reveal = ({ children, delay = 0, className = '', as = 'div' }) => {
  const [ref, inView] = useInView();
  return React.createElement(as, {
    ref,
    className: `transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'} ${className}`,
    style: { transitionDelay: `${delay}ms` },
  }, children);
};

const TONES = {
  brand: 'from-brand-400 to-brand-600 text-white shadow-brand-soft',
  dark: 'from-gray-800 to-black text-white',
  green: 'from-emerald-400 to-emerald-600 text-white',
  amber: 'from-amber-400 to-orange-500 text-white',
  red: 'from-rose-400 to-red-600 text-white',
};

// Dashboard stat tile with icon chip, count-up value and optional trend/hint.
export const StatCard = ({ icon: Icon, label, value, prefix, suffix, decimals, hint, tone = 'brand', onClick, className = '' }) => (
  <div
    onClick={onClick}
    className={`ui-card ui-card-hover group relative overflow-hidden p-5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
  >
    <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-brand-500/5 group-hover:bg-brand-500/10 group-hover:scale-125 transition-all duration-500" />
    <div className="relative flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="mt-2 text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </p>
        {hint && <p className="mt-1 text-xs font-medium text-gray-500">{hint}</p>}
      </div>
      {Icon && (
        <div className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${TONES[tone] || TONES.brand} flex items-center justify-center text-xl group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300`}>
          <Icon />
        </div>
      )}
    </div>
  </div>
);

// Gradient welcome/hero banner for dashboard tops.
export const GradientBanner = ({ title, subtitle, children, right, className = '' }) => (
  <div className={`relative overflow-hidden rounded-3xl bg-brand-sunset text-white p-6 md:p-8 shadow-brand-glow animate-fade-up ${className}`}>
    <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl animate-float-slow" />
    <div className="absolute -bottom-20 left-1/3 w-72 h-72 rounded-full bg-black/20 blur-3xl" />
    <div
      className="absolute inset-0 opacity-[0.08]"
      style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '18px 18px' }}
    />
    <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-white/80 text-sm md:text-base">{subtitle}</p>}
        {children && <div className="mt-4">{children}</div>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  </div>
);

// Section heading used inside dashboard tabs.
export const SectionHeader = ({ title, subtitle, action, icon: Icon }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center text-lg">
          <Icon />
        </div>
      )}
      <div>
        <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);
