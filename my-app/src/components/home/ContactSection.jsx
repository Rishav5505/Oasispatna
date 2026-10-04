import React from 'react';
import Ico from './Ico';
import { FiMapPin, FiPhone, FiGlobe, FiClock, FiArrowRight, FiPhoneCall } from 'react-icons/fi';
import { Reveal } from '../ui/Motion';
import SectionHeading from './SectionHeading';
import { Magnetic } from './fx';

const INFO = [
  { label: 'Address', icon: FiMapPin, body: <>Union Bank building near saguna more<br />Danapur patna -801503</> },
  { label: 'Phone', icon: FiPhone, body: <>9905424369, 8825198919</> },
  { label: 'Website', icon: FiGlobe, body: <>www.oasisjeeclasses.com</> },
  { label: 'Office Hours', icon: FiClock, body: <>Mon - Sat: 9:00 AM - 6:00 PM<br /><span className="text-gray-500 font-medium text-sm">Sunday: By Appointment</span></> },
];

export const ContactSection = () => (
  <section className="py-14 md:py-20 w-full bg-white">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <SectionHeading align="left" className="!mb-8 md:!mb-10" eyebrow="Contact" title="Visit" highlight="Us" subtitle="We're here to help you succeed" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Reveal>
          <div className="ui-card p-4 sm:p-6 h-full grid grid-cols-1 sm:grid-cols-2 gap-3">
            {INFO.map(({ label, icon, body }) => (
              <div key={label} className="group p-5 rounded-2xl bg-gray-50 dark:bg-white/5 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-brand-gradient text-white flex items-center justify-center text-lg shadow-brand-soft group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <Ico as={icon} />
                </div>
                <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-brand-600">{label}</p>
                <p className="mt-1 text-gray-900 dark:text-white font-semibold leading-relaxed break-words">{body}</p>
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="ui-card overflow-hidden h-[340px] sm:h-[420px] lg:h-full lg:min-h-[420px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115132.8610724376!2d85.07414841793748!3d25.608175608759363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39f32168923a1005%3A0xf69c5e3943a4e9b9!2sPatna%2C%20Bihar!5e0!3m2!1sen!2sin!4v1740465800000!5m2!1sen!2sin"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              title="Oasis JEE Classes Location"
              className="w-full h-full grayscale-[30%] hover:grayscale-0 transition-all duration-500"
            />
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

// The one final conversion band (footer CTA strip is hidden on Home).
export const FinalCta = () => (
  <section className="relative w-full bg-ink-950 text-white overflow-hidden">
    <div className="absolute -top-32 left-1/4 w-[30rem] h-[30rem] rounded-full bg-brand-500/30 blur-[120px] home-orb pointer-events-none" />
    <div className="absolute -bottom-40 -right-20 w-[26rem] h-[26rem] rounded-full bg-brand-700/30 blur-[110px] pointer-events-none" />
    <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
    <span className="home-symbol absolute top-10 right-[8%] text-6xl font-serif text-white/10 pointer-events-none select-none" aria-hidden="true">∫</span>
    <span className="home-symbol absolute bottom-8 left-[6%] text-5xl font-serif text-white/10 pointer-events-none select-none" style={{ '--delay': '-3s' }} aria-hidden="true">π</span>

    <Reveal className="relative max-w-5xl mx-auto px-4 sm:px-6 py-16 md:py-24 text-center">
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-300">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" /> Admissions Open 2026-27
      </span>
      <h2 className="mt-5 text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.05]">
        Ready to start your <span className="ui-gradient-text">JEE journey?</span> <span className="home-wiggle" aria-hidden="true">🚀</span>
      </h2>
      <p className="mt-4 text-white/70 text-base md:text-lg max-w-xl mx-auto">
        Book a free demo class and meet our faculty — or talk to a counsellor today.
      </p>
      <div className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <Magnetic>
          <a href="#demo-form" className="home-shine ui-btn-primary w-full px-8 py-4 text-base rounded-2xl shadow-brand-glow group">
            Book Free Demo <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
          </a>
        </Magnetic>
        <a href="tel:+918825198919" className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl border border-white/20 bg-white/5 font-bold hover:bg-white hover:text-ink-950 transition-all">
          <FiPhoneCall /> Call 8825198919
        </a>
      </div>
    </Reveal>
  </section>
);

export default ContactSection;
