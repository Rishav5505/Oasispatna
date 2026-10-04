import React, { useState } from 'react';
import { FiPlus, FiArrowRight } from 'react-icons/fi';
import { Reveal } from '../ui/Motion';
import SectionHeading from './SectionHeading';

const FAQS = [
  { q: 'Is scholarship available for meritorious students?', a: 'Yes, we offer up to 100% scholarship based on our entrance test results and academic performance in school/board exams.' },
  { q: 'What is the average batch size at Oasis?', a: 'We maintain a small batch size of 25-30 students to ensure personalized attention and better doubt clearing for every individual.' },
  { q: 'Are there separate batches for JEE and NEET?', a: 'Yes, we have completely dedicated batches for JEE (Engineering) and NEET (Medical) with specialized faculty for each stream.' },
  { q: 'Do you provide study material and test series?', a: 'Absolutely. We provide comprehensive study modules, daily practice papers (DPP), and a structured All India Test Series.' },
  { q: "Can parents track their child's progress?", a: 'Yes, through our Smart ERP Parent Portal, you can track real-time attendance, test scores, and performance analytics.' },
];

const FaqItem = ({ q, a, open, onToggle, id, index }) => (
  <div className={`rounded-2xl border transition-all duration-300 ${open ? 'bg-white dark:bg-ink-900 border-brand-200 dark:border-brand-500/30 shadow-brand-soft' : 'bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-brand-100'}`}>
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={`${id}-panel`}
      className="w-full flex items-center justify-between gap-4 px-5 md:px-6 py-5 text-left rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <span className="flex items-start gap-3">
        <span className={`shrink-0 mt-0.5 text-xs font-black tabular-nums ${open ? 'text-brand-500' : 'text-gray-300'}`}>{String(index + 1).padStart(2, '0')}</span>
        <span className={`font-bold text-base md:text-lg transition-colors ${open ? 'text-brand-600' : 'text-gray-900 dark:text-white'}`}>{q}</span>
      </span>
      <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${open ? 'bg-brand-gradient text-white rotate-45' : 'bg-brand-50 dark:bg-brand-500/10 text-brand-600'}`}>
        <FiPlus />
      </span>
    </button>
    <div
      id={`${id}-panel`}
      role="region"
      className={`grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
    >
      <div className="overflow-hidden">
        <p className="pl-12 md:pl-[3.25rem] pr-5 md:pr-6 pb-6 text-gray-600 dark:text-gray-400 leading-relaxed">{a}</p>
      </div>
    </div>
  </div>
);

const FaqAccordion = () => {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <section className="py-14 md:py-20 w-full bg-[#fffaf5] relative overflow-hidden">
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-brand-200/40 blur-3xl pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-28">
          <SectionHeading align="left" className="!mb-6" eyebrow="Got Questions?" title="Sawal aapke," highlight="Jawab hamare" />
          {/* Chat-bubble character */}
          <Reveal className="hidden sm:block space-y-3 max-w-sm">
            <div className="flex items-end gap-2">
              <span className="shrink-0 w-9 h-9 rounded-full bg-ink-950 text-white flex items-center justify-center text-lg" aria-hidden="true">🧑‍🎓</span>
              <p className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-white shadow-card text-sm font-semibold text-gray-700">Sir, scholarship milegi kya? 🥺</p>
            </div>
            <div className="flex items-end gap-2 justify-end">
              <p className="px-4 py-2.5 rounded-2xl rounded-br-md bg-brand-gradient text-white shadow-brand-soft text-sm font-semibold">Haan bilkul — up to 100%! 💯</p>
              <span className="shrink-0 w-9 h-9 rounded-full bg-white border border-brand-100 flex items-center justify-center text-lg" aria-hidden="true">👨‍🏫</span>
            </div>
          </Reveal>
          <a
            href="https://wa.me/919905424369"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-ink-900 hover:text-brand-600 group"
          >
            Still have a question? Ask us on WhatsApp <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
        <Reveal className="lg:col-span-7 space-y-3">
          {FAQS.map((faq, idx) => (
            <FaqItem
              key={faq.q}
              id={`faq-${idx}`}
              index={idx}
              q={faq.q}
              a={faq.a}
              open={openIdx === idx}
              onToggle={() => setOpenIdx(openIdx === idx ? -1 : idx)}
            />
          ))}
        </Reveal>
      </div>
    </section>
  );
};

export default FaqAccordion;
