import React, { useEffect, useRef } from 'react';
import Ico from './Ico';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiClock, FiSun, FiSunrise, FiMoon, FiCalendar } from 'react-icons/fi';
import { Reveal } from '../ui/Motion';
import SectionHeading from './SectionHeading';
import { TiltCard } from './fx';
import { CLASSES, classOfCourse } from './programs';

const BATCHES = [
  { label: 'Morning', time: '6 AM - 9 AM', icon: FiSunrise },
  { label: 'Day', time: '9 AM - 12 PM', icon: FiSun },
  { label: 'Evening', time: '4 PM - 7 PM', icon: FiMoon },
  { label: 'Weekend', time: 'SAT & SUN', icon: FiCalendar },
];

const CourseSkeleton = () => (
  <div className="shrink-0 w-[82%] sm:w-[60%] md:w-auto snap-center rounded-3xl bg-white p-6 space-y-4 shadow-card">
    <div className="ui-skeleton h-24 w-full" />
    <div className="ui-skeleton h-4 w-3/4" />
    <div className="ui-skeleton h-4 w-2/3" />
    <div className="ui-skeleton h-11 w-full" />
  </div>
);

const ClassPicker = ({ selected, onSelect }) => (
  <div className="w-full md:w-auto">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-2.5">👋 I&apos;m in class…</p>
    <div className="flex gap-2 overflow-x-auto home-noscroll -mx-4 px-4 md:mx-0 md:px-0 pb-1" role="radiogroup" aria-label="Pick your class">
      {CLASSES.map((c) => {
        const active = selected === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(active ? null : c)}
            className={`shrink-0 min-w-[3.25rem] h-12 px-4 rounded-2xl font-black text-lg transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
              active
                ? 'bg-brand-gradient text-white shadow-brand-glow scale-105'
                : 'bg-white text-ink-900 border border-brand-100 hover:border-brand-400 hover:-translate-y-0.5'
            }`}
          >
            {c}<sup className="text-[10px] font-bold ml-0.5">th</sup>
          </button>
        );
      })}
    </div>
  </div>
);

const CourseCard = ({ course, cls, state, onEnroll }) => {
  const highlighted = state === 'on';
  return (
    <TiltCard
      className={`h-full rounded-3xl transition-[opacity,box-shadow] duration-500 ${
        highlighted ? 'shadow-brand-glow ring-4 ring-brand-500/80' : 'shadow-card hover:shadow-card-hover'
      } ${state === 'dim' ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="h-full flex flex-col rounded-3xl bg-white overflow-hidden">
        <div className="relative px-6 pt-6 pb-5 bg-ink-950 text-white overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-brand-500/40 blur-3xl" />
          {cls && (
            <span
              className="absolute right-4 -bottom-6 text-[6.5rem] leading-none font-black text-transparent select-none"
              style={{ WebkitTextStroke: '2px rgba(243,112,33,0.55)' }}
              aria-hidden="true"
            >
              {String(cls).padStart(2, '0')}
            </span>
          )}
          {highlighted && (
            <span className="home-pop absolute top-4 right-4 z-10 ui-badge bg-white text-brand-600 shadow-lg">👉 Your batch</span>
          )}
          <p className="relative text-[11px] font-bold uppercase tracking-[0.2em] text-brand-300">{cls ? `Class ${cls}` : 'Program'}</p>
          <h3 className="relative mt-1 text-2xl font-black tracking-tight uppercase">{course.name}</h3>
          {course.duration && (
            <span className="relative mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider">
              <FiClock /> {course.duration}
            </span>
          )}
        </div>
        <div className="p-6 flex flex-col flex-grow">
          {course.description && <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">{course.description}</p>}
          {Array.isArray(course.features) && course.features.length > 0 && (
            <ul className="space-y-2 mb-6">
              {course.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs"><FiCheck /></span>
                  {feature}
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => onEnroll(course.name)} className="home-shine ui-btn-primary mt-auto w-full py-3 group/btn">
            Enroll Now <FiArrowRight className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </TiltCard>
  );
};

const CoursesSection = ({ courses, selectedClass, onSelectClass, onEnroll }) => {
  const trackRef = useRef(null);

  // On the mobile carousel, glide the matching card into view (horizontal only — no page jump).
  useEffect(() => {
    const track = trackRef.current;
    if (!track || selectedClass == null || track.scrollWidth <= track.clientWidth) return;
    const card = track.querySelector(`[data-class="${selectedClass}"]`);
    if (!card) return;
    const tr = track.getBoundingClientRect();
    const cr = card.getBoundingClientRect();
    track.scrollTo({ left: track.scrollLeft + (cr.left - tr.left) - (tr.width - cr.width) / 2, behavior: 'smooth' });
  }, [selectedClass, courses.length]);

  return (
    <section id="courses" className="relative py-14 md:py-20 w-full bg-[#fffaf5] overflow-hidden">
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-200/40 blur-3xl pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
        <SectionHeading
          align="left"
          className="!mb-8 md:!mb-10"
          eyebrow="Our Programs"
          title="Courses &"
          highlight="Batches"
          subtitle="Comprehensive programs designed for JEE success — pick your class to find your batch."
          action={<ClassPicker selected={selectedClass} onSelect={onSelectClass} />}
        />

        <div
          ref={trackRef}
          className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory home-noscroll -mx-4 px-4 md:mx-0 md:px-0 pt-2 pb-4"
        >
          {courses.length === 0
            ? [0, 1, 2].map((i) => <CourseSkeleton key={i} />)
            : courses.map((course, i) => {
              const cls = classOfCourse(course);
              const state = selectedClass == null ? 'idle' : cls === selectedClass ? 'on' : 'dim';
              return (
                <Reveal
                  key={course.id ?? course._id ?? i}
                  delay={(i % 3) * 90}
                  className="shrink-0 w-[82%] sm:w-[60%] md:w-auto snap-center h-auto"
                >
                  <div data-class={cls ?? ''} className="h-full">
                    <CourseCard course={course} cls={cls} state={state} onEnroll={onEnroll} />
                  </div>
                </Reveal>
              );
            })}
        </div>

        <Reveal className="mt-6 md:mt-8 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6 p-4 md:p-5 rounded-3xl bg-white border border-brand-100 shadow-card">
          <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">⏰ Batch timings</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
            {BATCHES.map(({ label, time, icon }) => (
              <div key={label} className="group flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#fffaf5] hover:bg-brand-50 transition-colors">
                <Ico as={icon} className="shrink-0 text-brand-500 text-lg group-hover:rotate-12 transition-transform" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{time}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/courses" className="shrink-0 inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700 group">
            View all course details <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
};

export default CoursesSection;
