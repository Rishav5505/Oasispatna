import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiRotateCw } from 'react-icons/fi';
import { Reveal } from '../ui/Motion';
import SectionHeading from './SectionHeading';

const FacultyCard = ({ member }) => {
  const [failed, setFailed] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const subjects = String(member.subjects || '').split(',').map((s) => s.trim()).filter(Boolean);

  return (
    <div className={`home-flip aspect-[4/5] ${flipped ? 'is-flipped' : ''}`}>
      <div className="home-flip-inner">
        {/* Front */}
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="home-flip-face text-left rounded-3xl overflow-hidden bg-ink-900 shadow-card focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
          aria-label={`${member.name} — show details`}
        >
          {member.photo && !failed ? (
            <img
              src={member.photo}
              alt={member.name}
              loading="lazy"
              onError={() => setFailed(true)}
              className="absolute inset-0 w-full h-full object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-6xl bg-brand-sunset">{member.icon}</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
          <span className="absolute top-4 left-4 ui-badge bg-white/15 text-white backdrop-blur-md border border-white/20">{member.classes}</span>
          <span className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white flex items-center justify-center" aria-hidden="true">
            <FiRotateCw />
          </span>
          <div className="absolute inset-x-0 bottom-0 p-6">
            <h3 className="text-2xl font-extrabold text-white tracking-tight">{member.name}</h3>
            <p className="mt-1 text-brand-300 font-semibold text-sm">{member.subjects}</p>
            <div className="mt-4 h-1 w-10 rounded-full bg-brand-500" />
          </div>
        </button>

        {/* Back */}
        <div className="home-flip-face home-flip-back rounded-3xl overflow-hidden bg-brand-sunset text-white p-6 flex flex-col">
          <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          <div className="relative flex items-center gap-3">
            <span className="w-14 h-14 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-3xl" aria-hidden="true">{member.icon}</span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">{member.classes}</p>
              <h3 className="text-xl font-extrabold leading-tight">{member.name}</h3>
            </div>
          </div>
          <p className="relative mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Teaches</p>
          <div className="relative mt-2 flex flex-wrap gap-2">
            {subjects.map((s) => (
              <span key={s} className="px-3 py-1.5 rounded-full bg-white text-brand-600 text-sm font-bold">{s}</span>
            ))}
          </div>
          <p className="relative mt-6 text-white/85 text-sm leading-relaxed">
            Sit in a real class with {member.name.split(' ')[0]} — book a free demo and see the Oasis way of teaching.
          </p>
          <div className="relative mt-auto flex items-center gap-2">
            <a href="#demo-form" className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white text-brand-600 font-bold text-sm hover:bg-ink-950 hover:text-white transition-colors">
              Book a demo <FiArrowRight />
            </a>
            <button
              type="button"
              onClick={() => setFlipped(false)}
              className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center hover:bg-white/25"
              aria-label="Flip back"
            >
              <FiRotateCw />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FacultySection = ({ members }) => (
  <section className="py-14 md:py-20 w-full bg-white relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <SectionHeading
        align="left"
        className="!mb-8 md:!mb-10"
        eyebrow="Meet the Mentors"
        title="Our Expert"
        highlight="Faculty"
        subtitle="Learn from IIT alumni and experienced educators. Hover (or tap) a card to say hi 👋"
        action={
          <Link to="/faculty" className="ui-btn-secondary self-start md:self-auto px-5 py-3 rounded-2xl group">
            View All Faculty <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        }
      />
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-x-auto sm:overflow-visible snap-x snap-mandatory home-noscroll -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
        {members.map((member, i) => (
          <Reveal key={member.id} delay={i * 120} className="shrink-0 w-[78%] sm:w-auto snap-center">
            <FacultyCard member={member} />
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default FacultySection;
