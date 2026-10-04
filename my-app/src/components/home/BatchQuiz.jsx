import React, { useState } from 'react';
import { FiArrowRight, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import { Reveal } from '../ui/Motion';
import { Wave } from './fx';
import { CLASSES, PROGRAM_BY_CLASS } from './programs';

const GOALS = [
  { id: 'jee', emoji: '⚙️', label: 'Engineer (JEE)' },
  { id: 'neet', emoji: '🩺', label: 'Doctor (NEET)' },
  { id: 'olympiad', emoji: '🏅', label: 'Olympiads / NTSE' },
  { id: 'boards', emoji: '📚', label: 'Top school marks' },
];

// Copy is built only from what the programs/FAQ already promise.
const pitch = (cls, goal) => {
  if (goal === 'neet') {
    return cls >= 11
      ? 'Dedicated NEET batch with specialised faculty, regular topic tests and 100% doubt clearing.'
      : 'Build a rock-solid Science foundation now so NEET feels easy in Class 11 & 12.';
  }
  if (goal === 'jee') {
    return cls >= 11
      ? 'Focused on top ranks in JEE Main & Advanced, with in-depth Physics, Chemistry & Maths.'
      : 'Early JEE foundation in small batches — the head start toppers swear by.';
  }
  if (goal === 'olympiad') return 'Olympiad & NTSE focused practice alongside your school syllabus.';
  return 'School & board exam excellence with regular tests and personal mentoring.';
};

const Step = ({ n, title, children }) => (
  <div className="home-pop">
    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">Question {n} of 2</p>
    <h3 className="mt-1.5 text-xl md:text-2xl font-extrabold text-ink-950">{title}</h3>
    <div className="mt-5">{children}</div>
  </div>
);

const BatchQuiz = ({ onPick, topFill = '#fffaf5', bottomFill = '#ffffff' }) => {
  const [cls, setCls] = useState(null);
  const [goal, setGoal] = useState(null);
  const program = cls ? PROGRAM_BY_CLASS[cls] : null;
  const step = !cls ? 1 : !goal ? 2 : 3;

  const reset = () => { setCls(null); setGoal(null); };

  return (
    <section id="batch-quiz" className="relative w-full bg-brand-gradient text-white overflow-hidden scroll-mt-24">
      <Wave fill={topFill} flip className="relative z-10 -mt-px" />
      <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/15 blur-3xl home-orb pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-ink-950/25 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
        <Reveal>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/25 text-[11px] font-bold uppercase tracking-[0.18em]">
            <span className="home-wiggle" aria-hidden="true">🤔</span> Batch finder
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight leading-[1.1] text-balance">
            Which batch is <span className="underline decoration-white/40 decoration-4 underline-offset-8">right for me?</span>
          </h2>
          <p className="mt-4 text-white/85 text-base md:text-lg max-w-md">
            Two quick taps. We&apos;ll point you to your program and book a free demo with it pre-filled.
          </p>
          <div className="mt-6 flex items-center gap-2" aria-hidden="true">
            {[1, 2, 3].map((s) => (
              <span key={s} className={`h-2 rounded-full transition-all duration-500 ${s <= step ? 'w-10 bg-white' : 'w-4 bg-white/30'}`} />
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative rounded-[1.75rem] bg-white text-ink-950 p-6 md:p-8 shadow-2xl min-h-[17rem]" aria-live="polite">
            {step === 1 && (
              <Step n={1} title="Which class are you going to?">
                <div className="grid grid-cols-3 gap-2.5">
                  {CLASSES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCls(c)}
                      className="h-14 rounded-2xl border-2 border-brand-100 bg-[#fffaf5] font-black text-xl hover:border-brand-500 hover:bg-brand-50 hover:-translate-y-0.5 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      {c}<sup className="text-[10px] ml-0.5">th</sup>
                    </button>
                  ))}
                </div>
              </Step>
            )}

            {step === 2 && (
              <Step n={2} title="What's the big dream?">
                <div className="grid grid-cols-2 gap-2.5">
                  {GOALS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(g.id)}
                      className="group flex flex-col items-start gap-1.5 p-3.5 rounded-2xl border-2 border-brand-100 bg-[#fffaf5] text-left hover:border-brand-500 hover:bg-brand-50 hover:-translate-y-0.5 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                    >
                      <span className="text-2xl group-hover:scale-125 transition-transform" aria-hidden="true">{g.emoji}</span>
                      <span className="font-bold text-sm">{g.label}</span>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setCls(null)} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-600">
                  <FiArrowLeft /> Change class
                </button>
              </Step>
            )}

            {step === 3 && (
              <div className="home-pop">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">🎉 Your perfect match</p>
                <div className="mt-3 flex items-center gap-4">
                  <span className="shrink-0 w-16 h-16 rounded-2xl bg-ink-950 text-white flex flex-col items-center justify-center leading-none">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-brand-300">Class</span>
                    <span className="text-2xl font-black">{cls}</span>
                  </span>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-black tracking-tight ui-gradient-text">{program}</h3>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">1 Year program</p>
                  </div>
                </div>
                <p className="mt-4 text-gray-600 leading-relaxed">{pitch(cls, goal)}</p>
                <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                  <button type="button" onClick={() => onPick(program, cls)} className="home-shine ui-btn-primary flex-1 py-3.5 rounded-2xl text-base group">
                    Book free demo for {program} <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button type="button" onClick={reset} className="ui-btn-secondary py-3.5 rounded-2xl" aria-label="Start the quiz again">
                    <FiRefreshCw /> Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      </div>
      <Wave fill={bottomFill} className="relative z-10 -mb-px" />
    </section>
  );
};

export default BatchQuiz;
