import React from 'react';
import { Reveal } from '../ui/Motion';

// Section heading with a small brand eyebrow label used across the Home page.
const SectionHeading = ({ eyebrow, title, highlight, subtitle, align = 'center', dark = false, action, className = '' }) => {
  const centered = align === 'center';
  return (
    <Reveal
      className={`mb-10 md:mb-14 flex flex-col gap-5 ${centered ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'} ${className}`}
    >
      <div className={centered ? 'max-w-2xl' : 'max-w-2xl'}>
        {eyebrow && (
          <span
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.18em] mb-4 ${
              dark ? 'bg-white/10 text-brand-300 border border-white/10' : 'bg-brand-50 text-brand-600 border border-brand-100 dark:bg-brand-500/10 dark:border-brand-500/20'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            {eyebrow}
          </span>
        )}
        <h2
          className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1] ${
            dark ? 'text-white' : 'text-gray-900 dark:text-white'
          }`}
        >
          {title} {highlight && <span className="ui-gradient-text">{highlight}</span>}
        </h2>
        {subtitle && (
          <p className={`mt-4 text-base md:text-lg font-medium ${dark ? 'text-white/70' : 'text-gray-600 dark:text-gray-400'}`}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </Reveal>
  );
};

export default SectionHeading;
