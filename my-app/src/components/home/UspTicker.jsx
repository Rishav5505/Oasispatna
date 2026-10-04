import React from 'react';
import { Ticker } from './fx';

const USPS = [
  'Small batches of 25-30',
  'IIT-JEE focused faculty',
  'Regular topic tests',
  'Smart ERP parent portal',
  '100% doubt clearing',
  'Up to 100% scholarship',
  'AC smart classrooms',
  'Bio-metric attendance',
  'Free demo class',
];

const EXAMS = ['JEE Main', 'JEE Advanced', 'NEET', 'NTSE', 'Science Olympiad', 'Maths Olympiad', 'Board Exams'];

// Two crossing tickers — an energetic break between sections.
const UspTicker = ({ bottomClass = 'bg-white' }) => (
  <div className={`relative py-10 md:py-14 overflow-hidden ${bottomClass}`} aria-label="Why students choose Oasis">
    <div className="absolute inset-x-[-5%] top-1/2 -translate-y-1/2 rotate-[2.5deg] bg-ink-950 py-3 md:py-3.5" aria-hidden="true">
      <Ticker
        items={EXAMS}
        reverse
        duration={40}
        separator="●"
        itemClassName="text-white/70 text-xs md:text-sm font-bold uppercase tracking-[0.2em]"
      />
    </div>
    <div className="relative -rotate-[2deg] bg-brand-gradient py-3.5 md:py-4 shadow-brand-glow mx-[-5%]">
      <Ticker
        items={USPS}
        duration={34}
        separator="✦"
        itemClassName="text-white text-sm md:text-lg font-extrabold uppercase tracking-wide"
      />
    </div>
  </div>
);

export default UspTicker;
