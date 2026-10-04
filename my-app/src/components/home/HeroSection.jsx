import React, { useEffect, useRef, useState } from 'react';
import Ico from './Ico';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiAward, FiBookOpen, FiUsers, FiTarget } from 'react-icons/fi';
import { Magnetic } from './fx';
import { prefersReducedMotion } from '../ui/motionUtils';

const WORDS = ['JEE.', 'NEET.', 'Olympiads.', 'NTSE.'];
const SLIDE_MS = 5000;

const RotatingWord = () => {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="relative inline-block [perspective:600px]" aria-live="off">
      <span key={i} className="home-word ui-gradient-text pb-2">{WORDS[i]}</span>
      <span className="sr-only">JEE, NEET, Olympiads and NTSE</span>
    </span>
  );
};

// Decorative maths/physics symbols drifting in the background.
const SYMBOLS = [
  { t: '∫', cls: 'top-[14%] left-[46%] text-5xl', d: '10s', r: '-12deg', delay: '0s', mobile: false },
  { t: 'π', cls: 'top-[8%] right-[8%] text-4xl', d: '8s', r: '8deg', delay: '-2s', mobile: true },
  { t: 'Δ', cls: 'bottom-[30%] right-[42%] text-4xl', d: '11s', r: '0deg', delay: '-4s', mobile: false },
  { t: 'λ', cls: 'top-[38%] right-[4%] text-5xl', d: '9s', r: '14deg', delay: '-1s', mobile: true },
  { t: 'E=mc²', cls: 'top-[10%] right-[30%] text-2xl font-black', d: '12s', r: '-6deg', delay: '-3s', mobile: true },
  { t: 'Σ', cls: 'bottom-[12%] left-[38%] text-4xl', d: '10s', r: '10deg', delay: '-5s', mobile: false },
  { t: '√x', cls: 'top-[56%] left-[52%] text-3xl', d: '13s', r: '-8deg', delay: '-6s', mobile: false },
];

const Atom = ({ className = '' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
    <ellipse cx="50" cy="50" rx="44" ry="16" />
    <ellipse cx="50" cy="50" rx="44" ry="16" transform="rotate(60 50 50)" />
    <ellipse cx="50" cy="50" rx="44" ry="16" transform="rotate(120 50 50)" />
    <circle cx="50" cy="50" r="6" fill="currentColor" />
  </svg>
);

const STICKERS = [
  { icon: FiAward, title: '500+ JEE Selections', sub: 'A legacy of toppers', pos: 'bottom-[30%] right-[6%]', delay: '0s' },
  { icon: FiUsers, title: 'Small batches of 25-30', sub: 'Personal attention for every student', pos: 'bottom-[12%] right-[22%]', delay: '1.4s' },
];

const HeroSection = ({ images }) => {
  const [current, setCurrent] = useState(0);
  const sectionRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((prev) => (prev + 1) % images.length), SLIDE_MS);
    return () => clearInterval(timer);
  }, [images.length, current]);

  // Cursor-follow glow: write CSS variables directly (no re-render per mouse move).
  const onMouseMove = (e) => {
    const el = sectionRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMouseMove}
      className="relative mt-16 md:mt-20 w-full min-h-[calc(100svh-96px)] md:min-h-[calc(100vh-112px)] flex items-end lg:items-center overflow-hidden bg-ink-950"
    >
      {/* Background slideshow — faces stay visible on the right */}
      {images.map((img, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 transition-[opacity,transform] duration-[1400ms] ease-out ${idx === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
          aria-hidden={idx !== current}
        >
          <img
            src={img}
            alt={idx === 0 ? 'Happy students at Oasis JEE Classes, Patna' : ''}
            loading={idx === 0 ? 'eager' : 'lazy'}
            fetchPriority={idx === 0 ? 'high' : undefined}
            className="w-full h-full object-cover object-[60%_20%] lg:object-[center_25%]"
          />
        </div>
      ))}
      <div className="absolute inset-0 home-hero-overlay" />
      <div className="absolute inset-0 home-cursor-glow pointer-events-none" />

      {/* Gradient orbs */}
      <div className="home-orb absolute -top-24 -left-24 w-[22rem] h-[22rem] md:w-[30rem] md:h-[30rem] rounded-full bg-brand-500/30 blur-[110px] pointer-events-none" />
      <div className="home-orb absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-brand-700/25 blur-[100px] pointer-events-none" style={{ animationDelay: '-5s' }} />

      {/* Floating symbols */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        {SYMBOLS.map((s) => (
          <span
            key={s.t}
            className={`home-symbol absolute ${s.cls} ${s.mobile ? '' : 'hidden lg:block'} font-serif text-white/20`}
            style={{ '--d': s.d, '--r': s.r, '--delay': s.delay }}
          >
            {s.t}
          </span>
        ))}
        <span className="home-symbol absolute top-[6%] left-[40%] hidden lg:block text-brand-400/40" style={{ '--d': '14s' }}>
          <Atom className="w-16 h-16 animate-spin-slow" />
        </span>
      </div>

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-28 md:pt-16 md:pb-36 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 animate-fade-up">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-gradient text-white text-[11px] font-extrabold uppercase tracking-[0.16em] shadow-brand-glow">
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-75 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-white" />
              </span>
              Admissions Open 2026-27
            </span>
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 text-white text-xs font-bold">
              <span className="home-wiggle" aria-hidden="true">🔥</span> 1,000+ students trust Oasis
            </span>
          </div>

          <h1 className="mt-6 text-[2.75rem] leading-[1] sm:text-6xl md:text-7xl xl:text-[5.5rem] font-black text-white tracking-tight">
            Dream Big.
            <br />
            Crack <RotatingWord />
          </h1>

          <p className="mt-5 text-white/80 text-base sm:text-lg md:text-xl font-medium max-w-xl leading-relaxed">
            Patna&apos;s most trusted institute for <span className="text-white font-bold">JEE &amp; NEET</span> preparation.
            Join the legacy of toppers today.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Magnetic className="w-full sm:w-auto">
              <a href="#demo-form" className="home-shine ui-btn-primary w-full group px-7 py-4 text-base rounded-2xl shadow-brand-glow">
                Book Free Demo
                <FiArrowRight className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </Magnetic>
            <Link
              to="/courses"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl font-bold text-base text-white bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white hover:text-ink-950 transition-all duration-300 active:scale-[0.98]"
            >
              <FiBookOpen /> Explore Courses
            </Link>
          </div>

          <a href="#batch-quiz" className="group mt-6 inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white">
            <span className="w-7 h-7 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-brand-300"><FiTarget /></span>
            Not sure which batch? <span className="text-brand-300 underline decoration-brand-500/60 underline-offset-4 group-hover:decoration-brand-300">Take the 10-second quiz</span>
          </a>

          {/* Slide indicators with progress */}
          <div className="mt-8 flex items-center gap-2" role="tablist" aria-label="Hero slides">
            {images.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrent(idx)}
                aria-label={`Show slide ${idx + 1}`}
                aria-selected={idx === current}
                role="tab"
                className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-500 ${idx === current ? 'w-12 bg-white/25' : 'w-4 bg-white/30 hover:bg-white/60'}`}
              >
                {idx === current && <span key={current} className="home-fill absolute inset-0 bg-brand-500 rounded-full" style={{ '--dur': `${SLIDE_MS}ms` }} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stickers over the lower photo area (desktop) */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none z-10">
        {STICKERS.map(({ icon, title, sub, pos, delay }) => (
          <div key={title} className={`absolute ${pos} animate-float-slow`} style={{ animationDelay: delay }}>
            <div className="flex items-center gap-3 pl-2.5 pr-5 py-2.5 rounded-2xl bg-white/95 shadow-2xl animate-slide-in-right">
              <div className="w-11 h-11 rounded-xl bg-brand-gradient text-white flex items-center justify-center text-lg shadow-brand-glow">
                <Ico as={icon} />
              </div>
              <div>
                <p className="text-ink-950 font-extrabold leading-tight text-sm">{title}</p>
                <p className="text-gray-500 text-xs font-medium mt-0.5">{sub}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HeroSection;
