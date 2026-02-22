import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { FaGraduationCap, FaAward, FaChalkboardTeacher, FaLightbulb, FaUserShield, FaBrain } from 'react-icons/fa';

const Faculty = () => {
  const facultyList = [
    {
      name: 'Praveen Kumar',
      subject: 'Mathematics',
      qualification: 'M.Sc (Mathematics)',
      experience: '10+ Years of Experience',
      achievements: 'Founder & CEO of Oasis JEE Classes',
      imageBackground: 'bg-blue-600',
      icon: <FaGraduationCap />
    },
    {
      name: 'Priyawat Kumar',
      subject: 'Physics',
      qualification: 'B.Sc (Physics)',
      experience: '5+ Years of Experience',
      achievements: 'Expert in Conceptual Physics',
      imageBackground: 'bg-indigo-600',
      icon: <FaAward />
    },
    {
      name: 'Abhishek Rahul',
      subject: 'Geography & General Science',
      qualification: 'M.Sc (Geography), B.Sc (Geo+Phy+chem+Bio)',
      experience: '10+ Years of Experience',
      achievements: 'Multi-disciplinary Science Expert',
      imageBackground: 'bg-purple-600',
      icon: <FaChalkboardTeacher />
    },
    {
      name: 'Kartikesh Jha',
      subject: 'Chemistry',
      qualification: 'B.Sc (Chemistry)',
      experience: '5+ Years of Experience',
      achievements: 'Specialist in Organic & Inorganic Chemistry',
      imageBackground: 'bg-pink-600',
      icon: <FaLightbulb />
    },
    {
      name: 'Ajeet Kumar',
      subject: 'English',
      qualification: 'M.A (English)',
      experience: '5+ Years of Experience',
      achievements: 'Communication & Language Expert',
      imageBackground: 'bg-orange-600',
      icon: <FaAward />
    },
    {
      name: 'Swati Kumari',
      subject: 'Biology',
      qualification: 'B.Sc (Biology)',
      experience: '3+ Years of Experience',
      achievements: 'NEET Specialist & Biology Mentor',
      imageBackground: 'bg-green-600',
      icon: <FaChalkboardTeacher />
    }
  ];

  const philosophies = [
    {
      icon: <FaBrain />,
      title: "Conceptual Clarity",
      desc: "We don't believe in rote learning. Every formula is derived and explained from its root origin."
    },
    {
      icon: <FaLightbulb />,
      title: "Problem Solving",
      desc: "Teaching students 'how to think' rather than 'what to think' during complex JEE problems."
    },
    {
      icon: <FaUserShield />,
      title: "Individual Mentorship",
      desc: "Personalized focus on every student's weak areas through one-on-one doubt clearing sessions."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-28 bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <span className="inline-block py-1.5 px-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
            Meet Our Experts
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
            Learn from the <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Best Minds</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Our faculty consists of IIT alumni and industry veterans dedicated to nurturing the next generation of engineers.
          </p>
        </div>
      </section>

      {/* Faculty Grid */}
      <section className="py-24 relative -mt-16 z-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {facultyList.map((faculty, index) => (
              <div key={index} className="group bg-white rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col">
                <div className={`h-48 ${faculty.imageBackground} flex items-center justify-center relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]"></div>
                  <div className="text-7xl text-white/90 transform group-hover:scale-110 transition-transform duration-500 z-10">
                    {faculty.icon}
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2 text-center">
                      <span className="text-white text-xs font-bold tracking-widest uppercase">Senior Faculty</span>
                    </div>
                  </div>
                </div>
                <div className="p-8 flex flex-col flex-grow text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{faculty.name}</h3>
                  <p className="text-indigo-600 font-semibold text-sm mb-6 uppercase tracking-wider">{faculty.subject}</p>

                  <div className="space-y-4 text-sm text-gray-600 text-left mb-8 flex-grow">
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></div>
                      <span><strong>Education:</strong> {faculty.qualification}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></div>
                      <span><strong>Experience:</strong> {faculty.experience}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0"></div>
                      <span><strong>Track Record:</strong> {faculty.achievements}</span>
                    </div>
                  </div>

                  <button className="w-full py-3 bg-gray-50 border border-gray-100 text-gray-900 font-bold rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-300">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teaching Philosophy */}
      <section className="py-24 bg-white overflow-hidden relative">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
            <div>
              <span className="text-indigo-600 font-bold tracking-widest uppercase text-xs mb-4 block">Our Methodology</span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-8 leading-tight">
                More than just Teaching, <span className="text-indigo-600">Pure Mentorship.</span>
              </h2>
              <div className="space-y-8">
                {philosophies.map((p, idx) => (
                  <div key={idx} className="flex gap-6 group">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 flex-shrink-0 shadow-sm">
                      {p.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-2">{p.title}</h4>
                      <p className="text-gray-500 leading-relaxed">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <h3 className="text-3xl font-bold mb-8 relative z-10">Join the Best</h3>
                <p className="text-indigo-100 text-lg mb-10 leading-relaxed relative z-10">
                  Become a part of the most successful JEE community in Patna. Our doors are always open for dedicated students who dream big.
                </p>
                <a
                  href="/#demo-form"
                  className="inline-block px-8 py-4 bg-white text-indigo-900 font-extrabold rounded-2xl hover:bg-indigo-50 transition-all duration-300 shadow-xl relative z-10"
                >
                  Book a Counselor Session
                </a>
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-20"></div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Faculty;
