import React from 'react';
import { FiCheck, FiPhoneCall, FiSend, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { Reveal } from '../ui/Motion';

const PERKS = [
  'Free demo class with our expert faculty',
  'Small batches of 25-30 students',
  'Up to 100% scholarship for meritorious students',
  'Smart ERP portal for parents',
];

const STEPS = [
  { title: 'Book Demo', emoji: '📝' },
  { title: 'Attend Demo', emoji: '🎓' },
  { title: 'Admission', emoji: '✅' },
  { title: 'Success', emoji: '🏆' },
];

const Label = ({ htmlFor, children }) => (
  <label htmlFor={htmlFor} className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
    {children}
  </label>
);

// Presentational only: state + submission logic live in Home.jsx.
const DemoForm = ({ formData, onChange, onSubmit, isSubmitting, formStatus, flashKey = 0 }) => (
  <section id="demo-form" className="py-14 md:py-20 w-full bg-white bg-brand-mesh scroll-mt-24">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      <Reveal>
        <div className="grid lg:grid-cols-5 rounded-[2rem] overflow-hidden shadow-card-hover bg-white dark:bg-ink-900 border border-gray-100 dark:border-white/5">
          {/* Pitch */}
          <div className="lg:col-span-2 relative p-7 sm:p-10 bg-brand-sunset text-white overflow-hidden">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl animate-float-slow" />
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '18px 18px' }}
            />
            <div className="relative">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-bold uppercase tracking-[0.18em]">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Free Demo
              </span>
              <h2 className="mt-5 text-3xl md:text-4xl font-black tracking-tight leading-tight">Book Your Free Demo Class <span className="home-wiggle" aria-hidden="true">🚀</span></h2>
              <p className="mt-3 text-white/80 text-base">Take the first step towards your IIT dream</p>
              <ul className="mt-8 space-y-3.5">
                {PERKS.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm font-medium">
                    <span className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-white text-brand-600 flex items-center justify-center text-xs"><FiCheck /></span>
                    {p}
                  </li>
                ))}
              </ul>
              <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="How it works">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="text-center">
                    <span className="mx-auto w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-lg" aria-hidden="true">{step.emoji}</span>
                    <span className="mt-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/60">Step {i + 1}</span>
                    <span className="block text-xs font-bold leading-tight">{step.title}</span>
                  </li>
                ))}
              </ol>
              <a href="tel:+918825198919" className="mt-8 inline-flex items-center gap-3 group">
                <span className="w-11 h-11 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-brand-600 transition-colors">
                  <FiPhoneCall />
                </span>
                <span>
                  <span className="block text-[11px] uppercase tracking-widest text-white/60 font-bold">Prefer to talk?</span>
                  <span className="block font-bold">9905424369, 8825198919</span>
                </span>
              </a>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="lg:col-span-3 p-6 sm:p-10 space-y-5">
            <div>
              <Label htmlFor="demo-name">Full Name *</Label>
              <input id="demo-name" type="text" name="name" value={formData.name} onChange={onChange} required className="ui-input dark:text-white" placeholder="Enter your full name" autoComplete="name" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="demo-email">Email *</Label>
                <input id="demo-email" type="email" name="email" value={formData.email} onChange={onChange} required className="ui-input dark:text-white" placeholder="your@email.com" autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="demo-phone">Phone Number *</Label>
                <input id="demo-phone" type="tel" name="phone" value={formData.phone} onChange={onChange} required pattern="[0-9]{10}" inputMode="numeric" className="ui-input dark:text-white" placeholder="10-digit number" autoComplete="tel" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="demo-course">Course Interest</Label>
                <select key={flashKey} id="demo-course" name="course" value={formData.course} onChange={onChange} className={`ui-input dark:text-white ${flashKey ? 'home-pop ring-4 ring-brand-500/30 border-brand-400' : ''}`}>
                  <option value="GROUND ZERO">GROUND ZERO (Class 7)</option>
                  <option value="NURTURE">NURTURE (Class 8)</option>
                  <option value="SHAKSHAM">SHAKSHAM (Class 9)</option>
                  <option value="DAKSH">DAKSH (Class 10)</option>
                  <option value="ABHYAAS">ABHYAAS (Class 11)</option>
                  <option value="TARGET">TARGET (Class 12)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="demo-batch">Preferred Batch</Label>
                <select id="demo-batch" name="batchTiming" value={formData.batchTiming} onChange={onChange} className="ui-input dark:text-white">
                  <option value="Morning">Morning (6 AM - 9 AM)</option>
                  <option value="Day">Day (9 AM - 12 PM)</option>
                  <option value="Evening">Evening (4 PM - 7 PM)</option>
                  <option value="Weekend">Weekend</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="demo-message">Message (Optional)</Label>
              <textarea id="demo-message" name="message" value={formData.message} onChange={onChange} rows="3" className="ui-input dark:text-white resize-none" placeholder="Any specific queries or requirements?" />
            </div>

            <button type="submit" disabled={isSubmitting} className="ui-btn-primary w-full py-4 text-base rounded-2xl">
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <FiSend /> Request Free Demo Class
                </>
              )}
            </button>

            {formStatus.message && (
              <div
                role="status"
                className={`flex items-start gap-3 p-4 rounded-2xl text-sm font-semibold animate-fade-up ${
                  formStatus.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20'
                    : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20'
                }`}
              >
                {formStatus.type === 'success' ? <FiCheckCircle className="shrink-0 mt-0.5 text-lg" /> : <FiAlertCircle className="shrink-0 mt-0.5 text-lg" />}
                <span>{formStatus.message}</span>
              </div>
            )}

          </form>
        </div>
      </Reveal>
    </div>
  </section>
);

export default DemoForm;
