import React from 'react';
import Ico from './Ico';
import { FiBookOpen, FiAward, FiCheckCircle, FiCast, FiShield, FiSmartphone, FiClock, FiPieChart, FiArrowRight } from 'react-icons/fi';
import { Reveal } from '../ui/Motion';
import SectionHeading from './SectionHeading';

const ITEMS = [
  { title: 'Study Material', desc: 'Comprehensive and well-researched study material designed by subject experts', icon: FiBookOpen },
  { title: 'Topic Tests', desc: 'Regular assessment with topic-wise tests to ensure conceptual clarity', icon: FiCheckCircle },
  { title: 'Smart Class', desc: 'Comfortable learning environment with fully air-conditioned smart classrooms', icon: FiCast },
  { title: 'CCTV Safety', desc: '24/7 security and monitoring to ensure a safe learning environment', icon: FiShield },
  { title: 'Bio-metric', desc: 'Precise attendance tracking with instant notification to parents', icon: FiSmartphone },
  { title: 'Doubt Clearing', desc: 'Dedicated sessions for one-on-one doubt resolution with faculty', icon: FiClock },
];

const BentoCard = ({ title, desc, icon, className = '' }) => (
  <div className={`group relative h-full overflow-hidden rounded-3xl p-4 sm:p-6 bg-white dark:bg-ink-900 border border-gray-100 dark:border-white/5 shadow-card hover:shadow-card-hover hover:-translate-y-1 hover:border-brand-200 transition-all duration-500 ${className}`}>
    <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-brand-500/0 group-hover:bg-brand-500/10 group-hover:scale-150 transition-all duration-700" />
    <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center text-lg sm:text-xl mb-3 sm:mb-5 group-hover:bg-brand-gradient group-hover:text-white group-hover:rotate-6 group-hover:scale-110 transition-all duration-300">
      <Ico as={icon} />
    </div>
    <h3 className="relative text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 sm:mb-2">{title}</h3>
    <p className="relative text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
  </div>
);

const WhyOasisBento = () => (
  <section className="py-14 md:py-20 w-full bg-white relative overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
      <SectionHeading eyebrow="Why Oasis?" title="Everything you need to" highlight="Succeed" />

      <div className="grid grid-cols-2 lg:grid-cols-4 lg:auto-rows-fr gap-3 sm:gap-4 md:gap-5">
        {/* Hero tile */}
        <Reveal className="col-span-2 lg:row-span-2">
          <div className="group relative h-full min-h-[14rem] sm:min-h-[18rem] overflow-hidden rounded-3xl p-7 md:p-9 bg-brand-dark text-white shadow-card-hover flex flex-col justify-between">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-brand-500/30 blur-3xl group-hover:scale-125 transition-transform duration-700" />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '18px 18px' }}
            />
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-brand-gradient flex items-center justify-center text-2xl shadow-brand-glow mb-6 group-hover:rotate-6 transition-transform">
                <FiAward />
              </div>
              <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3">Top Faculty</h3>
              <p className="text-white/70 leading-relaxed max-w-md">
                Learning from highly qualified faculty with years of experience in JEE/NEET
              </p>
            </div>
            <div className="relative mt-8 flex flex-wrap gap-2">
              {['IIT-JEE Focused', 'Small Batches', 'Personal Mentoring'].map((t) => (
                <span key={t} className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-semibold">{t}</span>
              ))}
            </div>
          </div>
        </Reveal>

        {ITEMS.map((item, i) => (
          <Reveal key={item.title} delay={(i % 4) * 80}>
            <BentoCard {...item} />
          </Reveal>
        ))}

        {/* Wide tile */}
        <Reveal className="col-span-2" delay={160}>
          <div className="group relative h-full overflow-hidden rounded-3xl p-6 md:p-7 bg-brand-gradient text-white shadow-brand-glow flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/15 blur-2xl group-hover:scale-125 transition-transform duration-700" />
            <div className="relative shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
              <FiPieChart />
            </div>
            <div className="relative flex-1">
              <h3 className="text-lg md:text-xl font-bold mb-1">Performance Tracking</h3>
              <p className="text-white/85 text-sm leading-relaxed">Regular performance analysis and personalized feedback for improvement</p>
            </div>
            <a href="#demo-form" className="relative shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-brand-600 font-bold text-sm hover:bg-ink-900 hover:text-white transition-colors self-start sm:self-auto">
              Try a demo <FiArrowRight />
            </a>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

export default WhyOasisBento;
