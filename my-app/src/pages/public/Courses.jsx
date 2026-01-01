import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { FaBookmark, FaClock, FaCheckCircle, FaRocket, FaGraduationCap, FaAngleRight } from 'react-icons/fa';

const Courses = () => {
  const courses = [
    {
      title: 'JEE Foundation',
      duration: '2 Years (Class 9th & 10th)',
      description: 'Building a rock-solid foundation for future JEE aspirants. We focus on conceptual depth in Science and Math.',
      features: ['NCERT + Olympiad Prep', 'Weekly Mental Ability Tests', 'Monthly Parent Meetings', 'Basic Concept Workshops'],
      price: '₹45,000 /year',
      icon: <FaGraduationCap />,
      gradient: 'from-blue-600 to-indigo-600',
      popular: false
    },
    {
      title: 'JEE Main + Advanced',
      duration: '2 Years (Class 11th & 12th)',
      description: 'Our flagship intensive program designed to take you from basics to the peak of IIT JEE preparation.',
      features: ['Daily Practice Papers (DPP)', 'All India Test Series', '24/7 Doubt Support', 'Personal Mentorship'],
      price: '₹1,25,000 /year',
      icon: <FaRocket />,
      gradient: 'from-indigo-600 to-purple-700',
      popular: true
    },
    {
      title: 'JEE Repeater Batch',
      duration: '1 Year (Tenth Passed)',
      description: 'A focused, fast-track program for students dedicated to cracking JEE in their second attempt.',
      features: ['Strict Academic Schedule', 'Advanced Problem Solving', 'Mental Resilience Sessions', 'Performance Analytics'],
      price: '₹95,000 /year',
      icon: <FaBookmark />,
      gradient: 'from-purple-600 to-pink-600',
      popular: false
    }
  ];

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
                  <a
                    href="/#demo-form"
                    className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 ${course.popular ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                  >
                    Enroll Now <FaAngleRight className="group-hover:translate-x-1 transition-transform" />
                  </a>
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

      <Footer />
    </div>
  );
};

export default Courses;
