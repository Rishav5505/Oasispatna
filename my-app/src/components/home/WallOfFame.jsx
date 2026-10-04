import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaQuoteLeft } from 'react-icons/fa';
import { FiArrowRight } from 'react-icons/fi';
import { Reveal } from '../ui/Motion';
import SectionHeading from './SectionHeading';
import { TiltCard } from './fx';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '★';

// Splits "JEE Advanced AIR 247, IIT Delhi" into a big headline + institute line.
const splitAchievement = (a = '') => {
  const [rank, ...rest] = String(a).split(',');
  return { rank: rank.trim(), place: rest.join(',').trim() };
};

const FameCard = ({ t, index }) => {
  const rating = Math.max(0, Math.min(5, Math.round(Number(t.rating) || 0)));
  const { rank, place } = splitAchievement(t.achievement);
  const student = t.studentName || t.parentName;
  return (
    <TiltCard className="h-full rounded-[1.75rem] shadow-card hover:shadow-brand-glow transition-shadow duration-500">
      <figure className="h-full flex flex-col rounded-[1.75rem] overflow-hidden bg-white">
        {/* Topper "photo" panel */}
        <div className={`relative h-44 overflow-hidden ${index % 2 ? 'bg-ink-950' : 'bg-brand-sunset'}`}>
          <div className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
          <div className="absolute -right-10 -bottom-16 w-48 h-48 rounded-full bg-white/10 blur-xl" />
          <span className="absolute top-4 left-4 ui-badge bg-white/15 text-white border border-white/20 backdrop-blur-md">🏆 Topper</span>
          {rating > 0 && (
            <span className="absolute top-4 right-4 flex gap-0.5 text-amber-300 text-xs" aria-label={`${rating} out of 5 stars`}>
              {Array.from({ length: rating }).map((_, i) => <FaStar key={i} />)}
            </span>
          )}
          <div className="absolute left-5 bottom-5 right-5 flex items-end gap-4">
            <span className="shrink-0 w-20 h-20 rounded-3xl bg-white text-brand-600 text-3xl font-black flex items-center justify-center shadow-2xl rotate-[-6deg]">
              {initials(student)}
            </span>
            <div className="min-w-0 text-white pb-1">
              <p className="font-extrabold text-lg leading-tight truncate">{student}</p>
              {place && <p className="text-white/75 text-xs font-semibold truncate">{place}</p>}
            </div>
          </div>
        </div>
        <div className="p-6 flex-1 flex flex-col">
          {rank && <p className="text-2xl font-black tracking-tight ui-gradient-text leading-tight">{rank}</p>}
          <blockquote className="relative mt-3 text-gray-600 text-sm leading-relaxed flex-1">
            <FaQuoteLeft className="inline mr-2 -mt-1 text-brand-200" aria-hidden="true" />
            {t.quote}
          </blockquote>
          <figcaption className="mt-5 pt-4 border-t border-gray-100 text-xs font-bold text-gray-500">
            — {t.parentName}{t.studentName ? `, parent of ${t.studentName.split(' ')[0]}` : ''}
          </figcaption>
        </div>
      </figure>
    </TiltCard>
  );
};

const WallOfFame = ({ testimonials }) => (
  <section className="py-14 md:py-20 w-full bg-[#fffaf5] overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <SectionHeading
        align="left"
        className="!mb-8 md:!mb-10"
        eyebrow="Wall of Fame"
        title="Toppers &"
        highlight="proud parents"
        subtitle="Real results and real experiences from Oasis families."
        action={
          <Link to="/results" className="ui-btn-dark self-start md:self-auto px-5 py-3 rounded-2xl group">
            See all results <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        }
      />
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory home-noscroll -mx-4 px-4 md:mx-0 md:px-0 pt-2 pb-4">
        {testimonials.map((t, i) => (
          <Reveal key={t.id ?? t._id ?? i} delay={(i % 3) * 110} className="shrink-0 w-[85%] sm:w-[60%] md:w-auto snap-center">
            <FameCard t={t} index={i} />
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

export default WallOfFame;
