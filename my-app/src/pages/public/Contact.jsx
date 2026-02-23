import React, { useState } from 'react';
import axios from 'axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaWhatsapp, FaQuestionCircle, FaChevronDown, FaPaperPlane } from 'react-icons/fa';
import config from '../../config';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', course: '' });
  const [activeFaq, setActiveFaq] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus({ message: '', type: '' });
    try {
      await axios.post(`${config.API_URL}/leads`, form);
      setStatus({ message: '✨ Success! We have received your inquiry and sent a confirmation email.', type: 'success' });
      setForm({ name: '', email: '', phone: '', message: '', course: '' });
      setTimeout(() => setStatus({ message: '', type: '' }), 8000);
    } catch (error) {
      console.error('Submission error:', error);
      setStatus({ message: '❌ Failed to send enquiry. Please try again or call us.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: <FaPhoneAlt />,
      title: 'Call Support',
      details: ['9905424369', '8825198919'],
      sub: 'Mon-Sat, 9AM-6PM',
      color: 'bg-orange-600',
      shadow: 'shadow-orange-200'
    },
    {
      icon: <FaEnvelope />,
      title: 'Email Address',
      details: ['www.oasisjeeclasses.com', 'admission@oasisjeeclasses.com'],
      sub: '24/7 Response Time',
      color: 'bg-slate-900',
      shadow: 'shadow-slate-200'
    },
    {
      icon: <FaMapMarkerAlt />,
      title: 'Campus Location',
      details: ['Union Bank building near saguna more,', 'Danapur patna - 801503'],
      sub: 'Visit for Admission',
      color: 'bg-orange-700',
      shadow: 'shadow-orange-200'
    }
  ];

  const faqs = [
    { q: "How can I book a free demo class?", a: "You can book a demo by filling out the form on this page or calling our admissions desk directly. Demo classes are held every weekend." },
    { q: "What is the scholarship process?", a: "We conduct the Oasis Talent Search Exam (OTSE) twice a year. Students can get up to 100% scholarship based on their performance." },
    { q: "Do you provide hostel facilities?", a: "Yes, we have tie-ups with premium hostels near our campus that provide a safe and study-focused environment for outstation students." },
    { q: "What is the average batch size?", a: "To ensure individual attention, we maintain a strict limit of 30-35 students per batch." }
  ];

  return (
    <div className="min-h-screen bg-[#fffaf5] flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 bg-slate-900 overflow-hidden text-center">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-orange-600/10 border border-orange-600/20 text-orange-400 text-xs font-bold tracking-widest uppercase mb-6">
            Get In Touch
          </span>
          <h1 className="text-5xl md:text-8xl font-bold text-white mb-8 leading-tight tracking-tight">
            How Can We <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">Help You?</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Have questions about admissions, batches, or scholarships? Our expert counselors are ready to help you navigate your IIT journey.
          </p>
        </div>
      </section>

      {/* Quick Contact Bar */}
      <section className="relative z-20 -mt-20 mb-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {contactMethods.map((method, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-orange-100 hover:-translate-y-2 transition-all duration-500 group">
                <div className={`w-14 h-14 ${method.color} text-white rounded-2xl flex items-center justify-center text-2xl mb-6 shadow-xl ${method.shadow} group-hover:scale-110 transition-transform`}>
                  {method.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2 truncate">{method.title}</h3>
                <div className="space-y-1 mb-6">
                  {method.details.map((detail, dIdx) => (
                    <p key={dIdx} className="text-sm text-gray-600 font-medium truncate">{detail}</p>
                  ))}
                </div>
                <div className="pt-4 border-t border-orange-50">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{method.sub}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Support Section */}
      <section className="pb-24">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid lg:grid-cols-12 gap-16 items-start">

            {/* Left: Detailed Info & Engagement */}
            <div className="lg:col-span-5 space-y-12">
              <div>
                <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Our Support <br /><span className="text-orange-600">Headquarters</span></h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-8 font-medium">
                  Visit our state-of-the-art campus in the heart of Patna. Our doors are always open for parents and students who want to experience the
                  <span className="text-orange-600 font-bold"> Oasis Advantage</span> first-hand.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl overflow-hidden relative group border border-white/5">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <FaWhatsapp className="absolute bottom-[-10%] right-[-5%] text-[10rem] opacity-5 group-hover:scale-110 transition-transform duration-500" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-4 tracking-tight">Instant Support</h3>
                    <p className="text-gray-400 mb-8 max-w-xs font-medium">Chat with our admission experts directly on WhatsApp for immediate queries.</p>
                    <a href="https://wa.me/919905424369" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] px-8 py-4 rounded-2xl font-bold transition-all shadow-xl hover:-translate-y-1 active:scale-95 text-sm uppercase tracking-widest">
                      <FaWhatsapp className="text-2xl" /> Message WhatsApp
                    </a>
                  </div>
                </div>

                <div className="bg-white border border-orange-100 p-8 rounded-[2.5rem] shadow-xl flex items-center gap-6 group hover:bg-orange-600 hover:border-orange-600 transition-all duration-500">
                  <div className="w-16 h-16 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-white group-hover:text-orange-600 transition-all shadow-lg shadow-orange-900/5">
                    🕒
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900 group-hover:text-white transition-colors">Office Hours</h4>
                    <p className="text-gray-500 group-hover:text-orange-50 transition-colors font-medium">Mon - Sat: 09:00 AM - 07:00 PM</p>
                    <p className="text-gray-500 group-hover:text-orange-50 transition-colors font-medium">Sunday: Closed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Premium Form Card */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-[3rem] shadow-2xl p-10 md:p-14 border border-orange-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50/50 rounded-bl-[100px] pointer-events-none"></div>

                <div className="mb-12">
                  <h2 className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">Enquiry Form</h2>
                  <p className="text-gray-500 text-lg font-medium">Send us a message and we'll get back within 24 hours.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-[#fffaf5] border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-orange-500 transition-all outline-none font-medium shadow-inner"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="10 Digit Number"
                        className="w-full bg-[#fffaf5] border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-orange-500 transition-all outline-none font-medium shadow-inner"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="example@mail.com"
                        className="w-full bg-[#fffaf5] border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-orange-500 transition-all outline-none font-medium shadow-inner"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Target Course</label>
                      <select
                        className="w-full bg-[#fffaf5] border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-orange-500 transition-all outline-none appearance-none font-medium shadow-inner"
                        value={form.course}
                        onChange={(e) => setForm({ ...form, course: e.target.value })}
                      >
                        <option value="">Choose a program</option>
                        <option value="GROUND ZERO">GROUND ZERO (Class 7)</option>
                        <option value="NURTURE">NURTURE (Class 8)</option>
                        <option value="SHAKSHAM">SHAKSHAM (Class 9)</option>
                        <option value="DAKSH">DAKSH (Class 10)</option>
                        <option value="ABHYAAS">ABHYAAS (Class 11)</option>
                        <option value="TARGET">TARGET (Class 12)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">Your Message</label>
                    <textarea
                      placeholder="Ask us anything..."
                      rows="4"
                      className="w-full bg-[#fffaf5] border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-orange-500 transition-all outline-none resize-none font-medium shadow-inner"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                    ></textarea>
                  </div>

                  {status.message && (
                    <div className={`p-4 rounded-2xl text-center font-bold animate-in fade-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                      {status.message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full font-bold text-sm uppercase tracking-widest py-6 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 group ${isSubmitting
                      ? 'bg-gray-400 text-white cursor-not-allowed shadow-none'
                      : 'bg-orange-600 hover:bg-orange-700 text-white shadow-orange-900/40'
                      }`}
                  >
                    {isSubmitting ? 'Sending Enquiry...' : 'Send Message'}
                    {!isSubmitting && <FaPaperPlane className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-300" />}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map & FAQs Centerpieces */}
      <section className="py-24 bg-[#fffaf5] border-t border-orange-50">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-20">
            {/* Map Column */}
            <div className="order-2 lg:order-1">
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-4 tracking-tight">
                  <div className="w-1.5 h-8 bg-orange-600 rounded-full"></div>
                  Locate Campus
                </h2>
                <p className="text-gray-500 font-medium">Find us at Saguna More - central to Patna's learning hub.</p>
              </div>
              <div className="rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white h-[450px] relative">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115132.861072441!2d85.0730018441406!3d25.608175600000004!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39ed58376999b793%3A0xc3f92d43e579294!2sSaguna%20More%2C%20Danapur%20Nizamat%2C%20Patna%2C%20Bihar!5e0!3m2!1sen!2sin!4v1710000000000!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Oasis Location"
                ></iframe>
              </div>
            </div>

            {/* FAQ Column */}
            <div className="order-1 lg:order-2">
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-4 tracking-tight">
                  <div className="w-1.5 h-8 bg-slate-900 rounded-full"></div>
                  Common Questions
                </h2>
                <p className="text-gray-500 font-medium">Quick answers to frequently asked admission queries.</p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
                    <button
                      className="w-full flex items-center justify-between p-7 text-left hover:bg-orange-50 transition-colors"
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    >
                      <span className="font-bold text-gray-800 text-lg pr-4">{faq.q}</span>
                      <FaChevronDown className={`text-orange-600 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`transition-all duration-300 overflow-hidden ${activeFaq === idx ? 'max-h-60 p-7 pt-0 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <p className="text-gray-600 leading-relaxed border-t border-gray-50 pt-5">{faq.a}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a href="/#demo-form" className="mt-10 p-8 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl flex items-center justify-between group hover:bg-orange-600 transition-all duration-500 cursor-pointer border border-white/5">
                <div>
                  <h4 className="font-bold text-xl mb-1 tracking-tight">Still confused?</h4>
                  <p className="text-gray-400 group-hover:text-orange-50 transition-colors font-medium">Call us for a 1-on-1 counselor session.</p>
                </div>
                <div className="text-4xl translate-x-0 group-hover:translate-x-2 transition-transform duration-500 text-orange-500 group-hover:text-white">
                  →
                </div>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Contact;

