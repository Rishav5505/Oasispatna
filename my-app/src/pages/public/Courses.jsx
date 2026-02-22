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
      gradient: 'from-blue-600 to-indigo-600',
      popular: false
    },
    {
      title: 'NURTURE',
      duration: '1 Year (Class 8th)',
      description: 'For students going to class 8. This course focuses on school excellence and selection in competitive exams like NTSE and Junior Science Olympiads.',
      features: ['School Examination Excellence', 'NTSE Selection focus', 'Junior Science Olympiad', 'Maths Olympiad Prep'],
      price: 'Contact for Fee',
      icon: <FaRocket />,
      gradient: 'from-indigo-600 to-purple-700',
      popular: false
    },
    {
      title: 'SHAKSHAM',
      duration: '1 Year (Class 9th)',
      description: 'A comprehensive course for class 9 students to build a solid foundation for grabbing top ranks in JEE, NEET & Higher Olympiads.',
      features: ['Higher Science Olympiad', 'NTSE Selection focus', 'Maths Olympiad Prep', 'Solid JEE/NEET Foundation'],
      price: 'Contact for Fee',
      icon: <FaCheckCircle />,
      gradient: 'from-green-600 to-emerald-600',
      popular: false
    },
    {
      title: 'DAKSH',
      duration: '1 Year (Class 10th)',
      description: 'Empowering class 10 students for board exam excellence while building a solid foundation for top ranks in JEE, NEET & Olympiads.',
      features: ['Board Exam Excellence', 'Science & Maths Olympiads', 'JEE/NEET Foundation', 'Higher Level Problem Solving'],
      price: 'Contact for Fee',
      icon: <FaBookmark />,
      gradient: 'from-purple-600 to-pink-600',
      popular: false
    },
    {
      title: 'ABHYAAS',
      duration: '1 Year (Class 11th)',
      description: 'Our intensive course for class 11 aspirants. Focuses on scoring high marks in school exams and achieving top ranks in JEE Main & Advanced.',
      features: ['Top Ranks in JEE Main/Adv', 'School Exam Excellence', 'Solid JEE/NEET/Olympiad Foundation', 'Advanced Study Material'],
      price: 'Contact for Fee',
      icon: <FaRocket />,
      gradient: 'from-orange-600 to-red-600',
      popular: true
    },
    {
      title: 'TARGET',
      duration: '1 Year (Class 12th)',
      description: 'The final milestone course for class 12 students. Dedicated to grabbing top ranks in JEE Main, Advanced, and NEET with absolute precision.',
      features: ['JEE Main & Advanced Mastery', 'High School Exam Marks', 'Top Rank Strategy', 'JEE/NEET/Olympiad Success'],
      price: 'Contact for Fee',
      icon: <FaRocket />,
      gradient: 'from-red-600 to-orange-600',
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-28 bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold mb-6">
            Explore Our Programs
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            Transform Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">IIT Journey</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Industry-leading mentorship combined with technology-driven learning to ensure your success in JEE.
          </p>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-24 relative -mt-16 z-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {courses.map((course, index) => (
              <div key={index} className={`relative group bg-white rounded-[2.5rem] p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col ${course.popular ? 'ring-2 ring-indigo-600 ring-offset-4 ring-offset-gray-50' : ''}`}>
                {course.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-1 rounded-full text-sm font-bold shadow-lg">
                    Most Popular
                  </div>
                )}

                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${course.gradient} flex items-center justify-center text-3xl text-white mb-8 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {course.icon}
                </div>

                <h3 className="text-3xl font-bold text-gray-900 mb-3">{course.title}</h3>
                <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-6">
                  <FaClock className="text-sm" />
                  <span>{course.duration}</span>
                </div>
                <p className="text-gray-600 mb-8 leading-relaxed">
                  {course.description}
                </p>

                <div className="space-y-4 mb-10 flex-grow">
                  {course.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex items-center gap-3">
                      <FaCheckCircle className="text-indigo-500 flex-shrink-0" />
                      <span className="text-gray-700 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto border-t border-gray-100 pt-8 text-center sm:text-left">
                  <div className="mb-6">
                    <span className="text-sm text-gray-400 font-medium uppercase tracking-wider block mb-1">Fee Structure</span>
                    <span className="text-3xl font-extrabold text-gray-900">{course.price}</span>
                  </div>
                  <button
                    onClick={() => handleEnrollClick(course.title)}
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${course.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                  >
                    Enroll Now <FaAngleRight className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enrolment Process */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">How to Join Oasis</h2>
              <p className="text-gray-500 text-lg">Your step-by-step path to excellence</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                { step: "01", title: "Enquiry", desc: "Talk to our counselors" },
                { step: "02", title: "Demo Class", desc: "Experience our teaching" },
                { step: "03", title: "Admission", desc: "Submit documentation" },
                { step: "04", title: "Batch Start", desc: "Begin your journey" }
              ].map((s, idx) => (
                <div key={idx} className="relative text-center">
                  <div className="text-6xl font-black text-gray-50 mb-[-1.5rem] select-none">{s.step}</div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2 relative z-10">{s.title}</h4>
                  <p className="text-gray-600 text-sm">{s.desc}</p>
                  {idx < 3 && <div className="hidden md:block absolute top-[20%] -right-4 text-indigo-200 text-2xl">→</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enquiry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
              >
                <FaTimes size={24} />
              </button>
              <h3 className="text-3xl font-bold mb-2">Admission Enquiry</h3>
              <p className="text-indigo-100">Course: <span className="font-bold text-white">{selectedCourseName}</span></p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    pattern="[0-9]{10}"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit number"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Course Selected</label>
                  <select
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
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
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Preferred Batch</label>
                  <select
                    name="batchTiming"
                    value={formData.batchTiming}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Day">Day</option>
                    <option value="Evening">Evening</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 ml-1">Message (Optional)</label>
                <textarea
                  name="message"
                  rows="2"
                  value={formData.message}
                  onChange={handleInputChange}
                  placeholder="Any questions?"
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-300 shadow-lg ${isSubmitting ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'}`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Enquiry'}
              </button>

              {formStatus.message && (
                <div className={`p-4 rounded-xl text-center text-sm font-bold ${formStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
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

