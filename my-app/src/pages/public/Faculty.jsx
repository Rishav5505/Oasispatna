import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { FaGraduationCap, FaAward, FaChalkboardTeacher, FaLightbulb, FaUserShield, FaBrain, FaArrowRight } from 'react-icons/fa';

// Faculty Photos
import praveenPhoto from '../../assets/praveen_sir.jpeg';
import kalpanaPhoto from '../../assets/kalpana_rani.jpg';
import raviPhoto from '../../assets/Ravi SIR.jpeg';

const Faculty = () => {
  const facultyList = [
    {
      name: 'Praveen Kumar',
      subject: 'Mathematics',
      qualification: 'M.Sc (Mathematics)',
      experience: '10+ Years of Experience',
      achievements: 'Founder & CEO of Oasis JEE Classes',
      imageBackground: 'bg-orange-600',
      icon: <FaGraduationCap />,
      photo: praveenPhoto
    },
    {
      name: 'Priyawat Kumar',
      subject: 'Physics',
      qualification: 'B.Sc (Physics)',
      experience: '5+ Years of Experience',
      achievements: 'Expert in Conceptual Physics',
      imageBackground: 'bg-slate-900',
      icon: <FaAward />
    },
    {
      name: 'Abhishek Rahul',
      subject: 'Geography & General Science',
      qualification: 'M.Sc (Geography), B.Sc (Geo+Phy+chem+Bio)',
      experience: '10+ Years of Experience',
      achievements: 'Multi-disciplinary Science Expert',
      imageBackground: 'bg-orange-700',
      icon: <FaChalkboardTeacher />
    },
    {
      name: 'Kartikesh Jha',
      subject: 'Chemistry',
      qualification: 'B.Sc (Chemistry)',
      experience: '5+ Years of Experience',
      achievements: 'Specialist in Organic & Inorganic Chemistry',
      imageBackground: 'bg-slate-800',
      icon: <FaLightbulb />
    },
    {
      name: 'Ajeet Kumar',
      subject: 'English',
      qualification: 'M.A (English)',
      experience: '5+ Years of Experience',
      achievements: 'Communication & Language Expert',
      imageBackground: 'bg-orange-500',
      icon: <FaAward />
    },
    {
      name: 'Swati Kumari',
      subject: 'Biology',
      qualification: 'B.Sc (Biology)',
      experience: '3+ Years of Experience',
      achievements: 'NEET Specialist & Biology Mentor',
      imageBackground: 'bg-slate-700',
      icon: <FaChalkboardTeacher />
    },
    {
      name: 'Kalpana Rani',
      subject: 'English',
      qualification: 'M.A (English)',
      experience: '5+ Years of Experience',
      achievements: 'Subject Expert in Language & Literature',
      imageBackground: 'bg-orange-500',
      icon: <FaAward />,
      photo: kalpanaPhoto
    },
    {
      name: 'Ravi Shekhar',
      subject: 'Physics',
      qualification: 'M.Sc (Physics) + B.Ed',
      experience: '8+ Years of Experience',
      achievements: 'Senior Physics Mentor & Expert Faculty',
      imageBackground: 'bg-orange-600',
      icon: <FaChalkboardTeacher />,
      photo: raviPhoto
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
      desc: "Personalized focus on every student's weak areas through one-on-one doubt sessions."
    }
  ];

  return (
    <div className="min-h-screen bg-[#fffaf5] flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative py-20 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-6 block bg-orange-600/10 w-fit mx-auto px-4 py-1.5 rounded-full border border-orange-600/20">
            Meet Our Brain Trust
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Learn from the <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">Best Minds</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Our faculty consists of industry veterans and academic experts dedicated to nurturing the next generation of engineers.
          </p>
        </div>
      </section>

      {/* Faculty Grid */}
      <section className="py-16 relative -mt-12 z-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {facultyList.map((faculty, index) => (
              <div key={index} className="group bg-white rounded-[2rem] overflow-hidden shadow-2xl hover:shadow-orange-200/50 transition-all duration-500 border border-orange-100 flex flex-col h-full transform hover:-translate-y-2">
                <div className={`h-64 ${faculty.imageBackground} flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-700`}>
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                  {faculty.photo ? (
                    <img
                      src={faculty.photo}
                      alt={faculty.name}
                      className="w-full h-full object-cover object-top absolute inset-0 z-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-6xl text-white transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 z-10 drop-shadow-2xl">
                      {faculty.icon}
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 right-4 z-10">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-2 text-center">
                      <span className="text-white text-[9px] font-bold tracking-widest uppercase">Academic Expert</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 flex flex-col flex-grow text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-1 tracking-tight uppercase">{faculty.name}</h3>
                  <p className="text-orange-600 font-bold text-[10px] mb-4 uppercase tracking-widest underline decoration-2 decoration-orange-600/20 underline-offset-4">{faculty.subject}</p>

                  <div className="space-y-3 text-xs text-gray-600 text-left mb-6 flex-grow font-medium leading-relaxed">
                    <div className="flex items-start gap-3 group/item">
                      <div className="w-5 h-5 rounded-lg bg-orange-50 flex items-center justify-center group-hover/item:bg-orange-500 transition-colors flex-shrink-0">
                        <FaGraduationCap className="text-orange-500 group-hover/item:text-white transition-colors text-[10px]" />
                      </div>
                      <span><strong className="text-gray-900">Education:</strong><br />{faculty.qualification}</span>
                    </div>
                    <div className="flex items-start gap-3 group/item">
                      <div className="w-5 h-5 rounded-lg bg-orange-50 flex items-center justify-center group-hover/item:bg-orange-500 transition-colors flex-shrink-0">
                        <FaAward className="text-orange-500 group-hover/item:text-white transition-colors text-[10px]" />
                      </div>
                      <span><strong className="text-gray-900">Experience:</strong><br />{faculty.experience}</span>
                    </div>
                  </div>

                  <button className="w-full py-3 bg-slate-900 text-white font-bold uppercase tracking-widest text-[10px] rounded-[1rem] hover:bg-orange-600 transition-all duration-500 shadow-xl shadow-slate-900/10">
                    Connect with Mentor
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teaching Philosophy */}
      <section className="py-20 bg-white overflow-hidden relative border-t border-orange-50">
        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center max-w-7xl mx-auto">
            <div>
              <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-4 block">Our Methodology</span>
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-10 leading-tight tracking-tight">
                More than just Teaching, <span className="text-orange-600">Pure Mentorship.</span>
              </h2>
              <div className="space-y-10">
                {philosophies.map((p, idx) => (
                  <div key={idx} className="flex gap-6 group">
                    <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-2xl text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all duration-500 flex-shrink-0 shadow-xl shadow-orange-950/5 group-hover:rotate-6">
                      {p.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-gray-900 mb-1 tracking-tight uppercase">{p.title}</h4>
                      <p className="text-gray-500 leading-relaxed font-medium text-base">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border border-white/5">
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] animate-pulse"></div>
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-600/20 rounded-full blur-[80px]"></div>

                <h3 className="text-3xl font-bold mb-6 relative z-10 tracking-tight leading-tight">Unlock Your <br /><span className="text-orange-500">True Potential</span></h3>
                <p className="text-gray-400 text-lg mb-8 leading-relaxed relative z-10 font-medium">
                  Become a part of the most successful education community in Bihar. Our doors are always open for dedicated students who dream big.
                </p>
                <a
                  href="/#demo-form"
                  className="inline-flex items-center gap-4 px-10 py-6 bg-orange-600 text-white font-bold rounded-2xl text-[11px] uppercase tracking-widest shadow-2xl shadow-orange-900/40 relative z-10"
                >
                  Book Counselor Session <FaArrowRight />
                </a>
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-orange-500 rounded-full blur-[100px] opacity-20"></div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Faculty;
