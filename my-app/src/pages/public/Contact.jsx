import React, { useState } from 'react';
import axios from 'axios';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaWhatsapp, FaQuestionCircle, FaChevronDown, FaPaperPlane } from 'react-icons/fa';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', course: '' });
  const [activeFaq, setActiveFaq] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://oasis-fdpj.onrender.com/api/leads', form);
      alert('Your enquiry has been received. Our team will contact you shortly.');
      setForm({ name: '', email: '', phone: '', message: '', course: '' });
    } catch (error) {
      alert('Something went wrong. Please call us directly.');
    }
  };

  const contactMethods = [
    {
      icon: <FaPhoneAlt />,
      title: 'Call Support',
      details: ['+91-0612-250XXXX', '+91-98765 43210'],
      sub: 'Mon-Sat, 9AM-6PM',
      color: 'bg-blue-600',
      shadow: 'shadow-blue-200'
    },
    {
      icon: <FaEnvelope />,
      title: 'Email Address',
      details: ['info@oasisjeeclasses.com', 'admissions@oasis.com'],
      sub: '24/7 Response Time',
      color: 'bg-purple-600',
      shadow: 'shadow-purple-200'
    },
    {
      icon: <FaMapMarkerAlt />,
      title: 'Campus Location',
      details: ['Above Corporation Bank,', 'Saguna More, Patna - 800001'],
      sub: 'Visit for Admission',
      color: 'bg-emerald-600',
      shadow: 'shadow-emerald-200'
    }
  ];

  const faqs = [
    { q: "How can I book a free demo class?", a: "You can book a demo by filling out the form on this page or calling our admissions desk directly. Demo classes are held every weekend." },
    { q: "What is the scholarship process?", a: "We conduct the Oasis Talent Search Exam (OTSE) twice a year. Students can get up to 100% scholarship based on their performance." },
    { q: "Do you provide hostel facilities?", a: "Yes, we have tie-ups with premium hostels near our campus that provide a safe and study-focused environment for outstation students." },
    { q: "What is the average batch size?", a: "To ensure individual attention, we maintain a strict limit of 30-35 students per batch." }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-blue-500/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-indigo-500/20 rounded-full blur-[120px]"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold tracking-widest uppercase mb-6">
            Get In Touch
          </span>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight">
            How Can We <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Help You?</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Have questions about admissions, batches, or scholarships? Our expert counselors are ready to help you navigate your IIT journey.
          </p>
        </div>
      </section>

      {/* Quick Contact Bar */}
      <section className="relative z-20 -mt-12 mb-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {contactMethods.map((method, idx) => (
              <div key={idx} className="bg-white p-6 rounded-[1.5rem] shadow-xl border border-gray-100 hover:-translate-y-1 transition-all duration-300 group">
                <div className={`w-12 h-12 ${method.color} text-white rounded-xl flex items-center justify-center text-xl mb-4 shadow-md ${method.shadow} group-hover:scale-105 transition-transform`}>
                  {method.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{method.title}</h3>
                <div className="space-y-0.5 mb-3">
                  {method.details.map((detail, dIdx) => (
                    <p key={dIdx} className="text-sm text-gray-600 font-medium truncate">{detail}</p>
                  ))}
                </div>
                <div className="pt-3 border-t border-gray-50">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{method.sub}</span>
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
                <h2 className="text-4xl font-black text-gray-900 mb-6">Our Support <br /><span className="text-blue-600">Headquarters</span></h2>
                <p className="text-lg text-gray-600 leading-relaxed mb-8">
                  Visit our state-of-the-art campus in the heart of Patna. Our doors are always open for parents and students who want to experience the
                  <span className="text-indigo-600 font-bold"> Oasis Advantage</span> first-hand.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="bg-gradient-to-br from-indigo-900 to-blue-900 p-8 rounded-[2rem] text-white shadow-2xl overflow-hidden relative group">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                  <FaWhatsapp className="absolute bottom-[-10%] right-[-5%] text-[10rem] opacity-10 group-hover:scale-110 transition-transform duration-500" />
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-4">Instant Support</h3>
                    <p className="text-blue-100 mb-8 max-w-xs">Chat with our admission experts directly on WhatsApp for immediate queries.</p>
                    <a href="https://wa.me/919876543210" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#128C7E] px-8 py-4 rounded-2xl font-black transition-all shadow-xl hover:-translate-y-1 active:scale-95">
                      <FaWhatsapp className="text-2xl" /> Message WhatsApp
                    </a>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 p-8 rounded-[2rem] flex items-center gap-6 group hover:bg-white hover:border-blue-200 transition-colors">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                    🕒
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-gray-900">Office Hours</h4>
                    <p className="text-gray-500">Mon - Sat: 09:00 AM - 07:00 PM</p>
                    <p className="text-gray-500">Sunday: Closed (Available via Chat)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Premium Form Card */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] p-10 md:p-14 border border-gray-100 relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-bl-[100px] pointer-events-none"></div>

                <div className="mb-12">
                  <h2 className="text-3xl font-black text-gray-900 mb-3">Enquiry Form</h2>
                  <p className="text-gray-500 text-lg">Send us a message and we'll get back within 24 hours.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Your Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-blue-500 transition-all outline-none"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="10 Digit Number"
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-blue-500 transition-all outline-none"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="example@mail.com"
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-blue-500 transition-all outline-none"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Target Course</label>
                      <select
                        className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-blue-500 transition-all outline-none appearance-none"
                        value={form.course}
                        onChange={(e) => setForm({ ...form, course: e.target.value })}
                      >
                        <option value="">Choose a program</option>
                        <option value="JEE Foundation">JEE Foundation (9th/10th)</option>
                        <option value="JEE Main">JEE Main (11th/12th)</option>
                        <option value="JEE Advanced">JEE Advanced Intensive</option>
                        <option value="Repeater">Repeater/Dropper Batch</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Your Message</label>
                    <textarea
                      placeholder="Ask us anything..."
                      rows="4"
                      className="w-full bg-gray-50 border-2 border-transparent rounded-2xl p-5 focus:bg-white focus:border-blue-500 transition-all outline-none resize-none"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xl py-5 rounded-[2rem] transition-all shadow-2xl shadow-blue-200 flex items-center justify-center gap-3 active:scale-95 group"
                  >
                    Send Enquiry <FaPaperPlane className="group-hover:translate-x-2 group-hover:-translate-y-2 transition-transform duration-300" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map & FAQs Centerpieces */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-20">
            {/* Map Column */}
            <div className="order-2 lg:order-1">
              <div className="mb-10">
                <h2 className="text-3xl font-black text-gray-900 mb-4 flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                  Locate Campus
                </h2>
                <p className="text-gray-500">Find us at Saguna More - central to Patna's learning hub.</p>
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
                <h2 className="text-3xl font-black text-gray-900 mb-4 flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-purple-600 rounded-full"></div>
                  Common Questions
                </h2>
                <p className="text-gray-500">Quick answers to frequently asked admission queries.</p>
              </div>

              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm">
                    <button
                      className="w-full flex items-center justify-between p-7 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    >
                      <span className="font-bold text-gray-800 text-lg pr-4">{faq.q}</span>
                      <FaChevronDown className={`text-blue-600 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180' : ''}`} />
                    </button>
                    <div className={`transition-all duration-300 overflow-hidden ${activeFaq === idx ? 'max-h-60 p-7 pt-0 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <p className="text-gray-600 leading-relaxed border-t border-gray-50 pt-5">{faq.a}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a href="/#demo-form" className="mt-10 p-8 bg-blue-600 rounded-[2rem] text-white shadow-xl flex items-center justify-between group hover:bg-blue-700 transition-all cursor-pointer">
                <div>
                  <h4 className="font-black text-xl mb-1">Still confused?</h4>
                  <p className="text-blue-100 opacity-90">Call us for a 1-on-1 counselor session.</p>
                </div>
                <div className="text-4xl translate-x-0 group-hover:translate-x-2 transition-transform duration-300">
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
