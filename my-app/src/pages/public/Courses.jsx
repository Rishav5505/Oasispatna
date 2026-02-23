import React, { useState } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { FaBookmark, FaClock, FaCheckCircle, FaRocket, FaGraduationCap, FaAngleRight, FaTimes } from 'react-icons/fa';
import config from '../../config';

const Courses = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourseName, setSelectedCourseName] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    course: '',
    batchTiming: 'Morning',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({ message: '', type: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const courses = [
    {
      title: 'GROUND ZERO',
      duration: '1 Year (Class 7th)',
      description: 'Specially designed for students going to class 7. We focus on scoring high marks in school exams and selection in NTSE & Junior Science Olympiads.',
      features: ['High School Exam Marks', 'NTSE Selection focus', 'Junior Science Olympiad', 'Maths Olympiad Prep'],
      price: 'Contact for Fee',
      icon: <FaGraduationCap />,
      gradient: 'from-orange-500 to-orange-600',
      popular: false
    },
    {
      title: 'NURTURE',
      duration: '1 Year (Class 8th)',
      description: 'For students going to class 8. This course focuses on school excellence and selection in competitive exams like NTSE and Junior Science Olympiads.',
      features: ['School Examination Excellence', 'NTSE Selection focus', 'Junior Science Olympiad', 'Maths Olympiad Prep'],
      price: 'Contact for Fee',
      icon: <FaRocket />,
      gradient: 'from-slate-800 to-slate-900',
      popular: false
    },
    {
      title: 'SHAKSHAM',
      duration: '1 Year (Class 9th)',
      description: 'A comprehensive course for class 9 students to build a solid foundation for grabbing top ranks in JEE, NEET & Higher Olympiads.',
      features: ['Higher Science Olympiad', 'NTSE Selection focus', 'Maths Olympiad Prep', 'Solid JEE/NEET Foundation'],
      price: 'Contact for Fee',
      icon: <FaCheckCircle />,
      gradient: 'from-orange-600 to-orange-700',
      popular: false
    },
    {
      title: 'DAKSH',
      duration: '1 Year (Class 10th)',
      description: 'Empowering class 10 students for board exam excellence while building a solid foundation for top ranks in JEE, NEET & Olympiads.',
      features: ['Board Exam Excellence', 'Science & Maths Olympiads', 'JEE/NEET Foundation', 'Higher Level Problem Solving'],
      price: 'Contact for Fee',
      icon: <FaBookmark />,
      gradient: 'from-slate-700 to-slate-800',
      popular: false
    },
    {
      title: 'ABHYAAS',
      duration: '1 Year (Class 11th)',
      description: 'Our intensive course for class 11 aspirants. Focuses on scoring high marks in school exams and achieving top ranks in JEE Main & Advanced.',
      features: ['Top Ranks in JEE Main/Adv', 'School Exam Excellence', 'Solid JEE/NEET/Olympiad Foundation', 'Advanced Study Material'],
      price: 'Contact for Fee',
      icon: <FaRocket />,
      gradient: 'from-orange-500 to-yellow-500',
      popular: true
    },
    {
      title: 'TARGET',
      duration: '1 Year (Class 12th)',
      description: 'The final milestone course for class 12 students. Dedicated to grabbing top ranks in JEE Main, Advanced, and NEET with absolute precision.',
      features: ['JEE Main & Advanced Mastery', 'High School Exam Marks', 'Top Rank Strategy', 'JEE/NEET/Olympiad Success'],
      price: 'Contact for Fee',
      icon: <FaRocket />,
      gradient: 'from-orange-600 to-orange-800',
      popular: true
    }
  ];

  const handleEnrollClick = (courseTitle) => {
    setSelectedCourseName(courseTitle);
    setFormData({ ...formData, course: courseTitle });
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ message: '', type: '' });
    setIsSubmitting(true);

    try {
      const response = await fetch(`${config.API_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setFormStatus({ message: '✨ Success! Your enquiry has been submitted. We will contact you soon.', type: 'success' });
        setTimeout(() => {
          setIsModalOpen(false);
          setFormStatus({ message: '', type: '' });
          setFormData({ name: '', email: '', phone: '', course: '', batchTiming: 'Morning', message: '' });
        }, 3000);
      } else {
        setFormStatus({ message: data.message || 'Submission failed. Please try again.', type: 'error' });
      }
    } catch (err) {
      setFormStatus({ message: '❌ Connection error. Please try again later.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffaf5] flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-32 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-6 block bg-orange-600/10 w-fit mx-auto px-4 py-1.5 rounded-full border border-orange-600/20">
            Explore Our Programs
          </span>
          <h1 className="text-5xl md:text-8xl font-bold text-white mb-8 leading-tight tracking-tight">
            Transform Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-400">IIT Journey</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Industry-leading mentorship combined with technology-driven learning to ensure your success in JEE.
          </p>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-24 relative -mt-20 z-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {courses.map((course, index) => (
              <div key={index} className={`relative group bg-white rounded-[3rem] p-10 shadow-2xl hover:shadow-orange-200/50 transition-all duration-500 border border-orange-100 flex flex-col h-full ${course.popular ? 'ring-4 ring-orange-500 ring-offset-8 ring-offset-[#fffaf5]' : ''}`}>
                {course.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl border border-white/10">
                    ⭐ Most Popular
                  </div>
                )}

                <div className={`w-20 h-20 rounded-[1.5rem] bg-gradient-to-br ${course.gradient} flex items-center justify-center text-4xl text-white mb-10 shadow-xl shadow-orange-900/10 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                  {course.icon}
                </div>

                <h3 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight uppercase">{course.title}</h3>
                <div className="flex items-center gap-2 text-orange-600 font-bold mb-8 text-[11px] uppercase tracking-widest">
                  <FaClock className="text-sm" />
                  <span>{course.duration}</span>
                </div>

                <p className="text-gray-600 mb-8 leading-relaxed font-medium">
                  {course.description}
                </p>

                <div className="space-y-4 mb-12 flex-grow">
                  {course.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex items-center gap-4 group/item">
                      <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center group-hover/item:bg-orange-500 transition-colors">
                        <FaCheckCircle className="text-orange-500 group-hover/item:text-white transition-colors text-xs" />
                      </div>
                      <span className="text-gray-700 font-bold text-sm tracking-tight">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto border-t border-orange-50 pt-10">
                  <div className="mb-8 flex items-baseline justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-1">Fee Structure</span>
                      <span className="text-2xl font-bold text-gray-900 tracking-tight">{course.price}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEnrollClick(course.title)}
                    className={`w-full py-5 rounded-[1.5rem] font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 transition-all duration-500 ${course.popular ? 'bg-orange-600 text-white hover:bg-orange-700 shadow-2xl shadow-orange-900/20' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'}`}
                  >
                    Enroll Now <FaAngleRight className="group-hover:translate-x-2 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enrolment Process */}
      <section className="py-32 bg-white relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-20">
              <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-3 block">Admission Guide</span>
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 tracking-tight">How to <span className="text-orange-600 underline decoration-8 decoration-orange-600/20">Join Oasis</span></h2>
              <p className="text-gray-500 text-xl font-medium">Your step-by-step path to academic excellence</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
              {/* Connector line for desktop */}
              <div className="hidden md:block absolute top-[25%] left-0 w-full h-0.5 bg-orange-100 -z-0"></div>
              {[
                { step: "01", title: "Enquiry", desc: "Talk to our expert counselors" },
                { step: "02", title: "Demo Class", desc: "Experience our IIT alumni teaching" },
                { step: "03", title: "Admission", desc: "Submit documentation & fees" },
                { step: "04", title: "Batch Start", desc: "Begin your success journey" }
              ].map((s, idx) => (
                <div key={idx} className="relative text-center group">
                  <div className="w-16 h-16 bg-white border-2 border-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 text-xl font-bold text-orange-600 shadow-xl group-hover:bg-orange-600 group-hover:text-white transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 z-10 relative">
                    {s.step}
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3 tracking-tight uppercase tracking-widest text-[11px]">{s.title}</h4>
                  <p className="text-gray-500 text-sm font-medium leading-relaxed px-4">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-500 border border-orange-100">
            <div className="bg-slate-900 p-10 text-white relative border-b border-white/5 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/20 rounded-full blur-[40px]"></div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
              >
                <FaTimes size={20} />
              </button>
              <h3 className="text-4xl font-bold mb-2 tracking-tight">Admission Enquiry</h3>
              <p className="text-gray-400 font-medium uppercase tracking-widest text-[10px]">Course: <span className="text-orange-500">{selectedCourseName}</span></p>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-bold placeholder:font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    pattern="[0-9]{10}"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit number"
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-bold placeholder:font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-bold placeholder:font-medium"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Course Selected</label>
                  <select
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-bold appearance-none"
                  >
                    <option value="GROUND ZERO">GROUND ZERO (Class 7)</option>
                    <option value="NURTURE">NURTURE (Class 8)</option>
                    <option value="SHAKSHAM">SHAKSHAM (Class 9)</option>
                    <option value="DAKSH">DAKSH (Class 10)</option>
                    <option value="ABHYAAS">ABHYAAS (Class 11)</option>
                    <option value="TARGET">TARGET (Class 12)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Preferred Batch</label>
                  <select
                    name="batchTiming"
                    value={formData.batchTiming}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-bold appearance-none"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Day">Day</option>
                    <option value="Evening">Evening</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Message (Optional)</label>
                <textarea
                  name="message"
                  rows="2"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Any questions?"
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all resize-none font-bold placeholder:font-medium"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-5 rounded-[1.5rem] font-bold uppercase tracking-widest text-[11px] text-white transition-all duration-500 shadow-2xl ${isSubmitting ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700 active:scale-95 shadow-orange-950/20'}`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
              </button>

              {formStatus.message && (
                <div className={`p-5 rounded-2xl text-center text-[10px] font-bold uppercase tracking-widest animate-in slide-in-from-top duration-300 ${formStatus.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {formStatus.message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Courses;

