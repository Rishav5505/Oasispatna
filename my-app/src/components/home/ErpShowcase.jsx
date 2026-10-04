import React, { useEffect, useState } from 'react';
import Ico from './Ico';
import { Link } from 'react-router-dom';
import { FiCheckCircle, FiUsers, FiBell, FiPieChart, FiDownload, FiCreditCard, FiArrowRight, FiFileText } from 'react-icons/fi';
import SectionHeading from './SectionHeading';
import { Wave } from './fx';
import { prefersReducedMotion } from '../ui/motionUtils';

/* Decorative, number-free product mockups */
const MockFrame = ({ title, children }) => (
  <div className="relative">
    <div className="absolute -inset-4 md:-inset-6 rounded-[2rem] bg-brand-gradient opacity-15 blur-2xl" />
    <div className="relative ui-card overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-white/5">
        <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-brand-400" />
        <span className="ml-3 text-[11px] font-bold uppercase tracking-widest text-gray-400 truncate">{title}</span>
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </div>
  </div>
);

const AttendanceMock = () => (
  <MockFrame title="Attendance · Today">
    <div className="space-y-3">
      {['Physics', 'Chemistry', 'Mathematics'].map((s, i) => (
        <div key={s} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 rounded-full bg-brand-gradient text-white text-sm font-bold flex items-center justify-center">{s[0]}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s}</p>
              <div className="ui-skeleton !animate-none h-2 w-20 mt-1.5" />
            </div>
          </div>
          <span className={`ui-badge ${i === 2 ? 'bg-brand-50 text-brand-600' : 'bg-green-50 text-green-700'}`}>{i === 2 ? 'Upcoming' : 'Present'}</span>
        </div>
      ))}
      <div className="flex items-center gap-3 p-3 rounded-xl border border-brand-200 bg-brand-50/60 dark:bg-brand-500/10 animate-fade-up">
        <span className="w-9 h-9 rounded-full bg-ink-900 text-white flex items-center justify-center"><FiBell /></span>
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">SMS alert sent to parent</p>
      </div>
    </div>
  </MockFrame>
);

const AnalyticsMock = () => (
  <MockFrame title="Parent Dashboard · Progress">
    <div className="flex items-end gap-2 md:gap-3 h-40">
      {[40, 55, 48, 68, 62, 80, 92].map((h, i) => (
        <div key={i} className="flex-1 h-full flex items-end">
          <div
            className={`w-full rounded-t-lg ${i === 6 ? 'bg-brand-gradient shadow-brand-soft' : 'bg-brand-100 dark:bg-brand-500/20'}`}
            style={{ height: `${h}%` }}
          />
        </div>
      ))}
    </div>
    <div className="mt-4 grid grid-cols-3 gap-2">
      {['Attendance', 'Tests', 'Fees'].map((l) => (
        <div key={l} className="p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{l}</p>
          <div className="ui-skeleton !animate-none h-2 w-10 mx-auto mt-2" />
        </div>
      ))}
    </div>
  </MockFrame>
);

const ResourcesMock = () => (
  <MockFrame title="Study Material & Fees">
    <div className="space-y-3">
      {['Physics — Chapter Notes', 'Daily Practice Paper', 'Mock Test Solutions'].map((f) => (
        <div key={f} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5">
          <span className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><FiFileText /></span>
          <p className="flex-1 min-w-0 text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{f}</p>
          <FiDownload className="text-gray-400" />
        </div>
      ))}
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-ink-900 text-white">
        <span className="flex items-center gap-2 text-sm font-semibold"><FiCreditCard className="text-brand-400" /> Fee receipt</span>
        <span className="ui-badge bg-green-500/15 text-green-400">Paid</span>
      </div>
    </div>
  </MockFrame>
);

const ROWS = [
  {
    mock: AttendanceMock,
    kicker: 'Never miss a class',
    emoji: '📍',
    heading: 'Attendance & alerts, in real time',
    features: [
      { title: 'Real-Time Attendance', desc: 'Track student attendance instantly with automated SMS alerts to parents', icon: FiCheckCircle },
      { title: 'Live Notifications', desc: 'Instant updates on exams, results, notices, and important announcements', icon: FiBell },
    ],
  },
  {
    mock: AnalyticsMock,
    kicker: 'Total transparency',
    emoji: '📊',
    heading: 'Parents see the full picture',
    features: [
      { title: 'Parent Dashboard', desc: 'Complete visibility into performance, attendance, fees, and progress reports', icon: FiUsers },
      { title: 'Performance Analytics', desc: 'Detailed insights and visualizations to track academic progress over time', icon: FiPieChart },
    ],
  },
  {
    mock: ResourcesMock,
    kicker: 'Learn anywhere',
    emoji: '📚',
    heading: 'Resources & fees, one tap away',
    features: [
      { title: 'Online Study Material', desc: 'Access notes, practice papers, and resources anytime from student portal', icon: FiDownload },
      { title: 'Fee Management', desc: 'Transparent fee tracking with online payment options and instant receipts', icon: FiCreditCard },
    ],
  },
];

const ErpShowcase = () => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Auto-advance the tabs until the visitor interacts.
  useEffect(() => {
    if (paused || prefersReducedMotion()) return undefined;
    const t = setInterval(() => setActive((a) => (a + 1) % ROWS.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  const row = ROWS[active];

  return (
    <section id="erp-system" className="relative w-full bg-ink-950 text-white overflow-hidden">
      <Wave fill="#ffffff" flip className="relative z-10 -mt-px" />
      <div className="absolute top-1/4 -left-40 w-[30rem] h-[30rem] rounded-full bg-brand-500/20 blur-[120px] home-orb pointer-events-none" />
      <div className="absolute bottom-0 -right-32 w-96 h-96 rounded-full bg-brand-700/20 blur-[110px] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <SectionHeading
          dark
          align="left"
          className="!mb-8 md:!mb-12"
          eyebrow="Smart ERP System"
          title="Technology-driven coaching for"
          highlight="modern learning"
          subtitle="Every student, parent and teacher gets their own portal — built right into Oasis."
          action={
            <Link to="/login?role=parent" className="home-shine self-start md:self-auto inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-ink-950 font-bold text-sm hover:bg-brand-500 hover:text-white transition-colors group">
              Open Parent Portal <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
            </Link>
          }
        />

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          <div className="lg:col-span-5 space-y-3" role="tablist" aria-label="ERP features" onMouseEnter={() => setPaused(true)}>
            {ROWS.map(({ kicker, heading, emoji }, i) => {
              const on = i === active;
              return (
                <button
                  key={heading}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => { setActive(i); setPaused(true); }}
                  className={`w-full text-left rounded-2xl p-4 md:p-5 border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${
                    on ? 'bg-white/10 border-brand-500/60 shadow-brand-glow' : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${on ? 'bg-brand-gradient scale-110 rotate-6' : 'bg-white/10'}`} aria-hidden="true">{emoji}</span>
                    <div className="min-w-0">
                      <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${on ? 'text-brand-300' : 'text-white/50'}`}>{kicker}</p>
                      <p className="font-extrabold text-base md:text-lg leading-snug">{heading}</p>
                    </div>
                  </div>
                  {on && (
                    <div className="home-pop mt-4 grid sm:grid-cols-2 gap-3">
                      {row.features.map(({ title, desc, icon }) => (
                        <div key={title} className="flex gap-3">
                          <Ico as={icon} className="shrink-0 mt-0.5 text-brand-400 text-lg" />
                          <div>
                            <p className="font-bold text-sm">{title}</p>
                            <p className="mt-0.5 text-xs text-white/60 leading-relaxed">{desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {on && !paused && <span key={active} className="home-fill mt-4 block h-0.5 rounded-full bg-brand-500/80" style={{ '--dur': '6000ms' }} />}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7">
            <div key={active} className="animate-fade-up">
              <Ico as={row.mock} />
            </div>
          </div>
        </div>
      </div>
      <Wave fill="#fffaf5" className="relative z-10 -mb-px" />
    </section>
  );
};

export default ErpShowcase;
