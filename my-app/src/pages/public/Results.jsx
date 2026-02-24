import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { FaTrophy, FaMedal, FaStar, FaQuoteLeft, FaFire, FaChartBar, FaArrowRight } from 'react-icons/fa';

const Counter = ({ end, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      const easedPower = 1 - Math.pow(1 - percentage, 4);

      setCount(Math.floor(easedPower * end));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count}{suffix}</span>;
};

const Results = () => {
  const toppers = [
    {
      name: 'Karan Kr Sharma',
      rank: 'Maths-100, Sci-98',
      exam: 'Board Achievement',
      score: 'Outstanding Performance',
      icon: <FaMedal className="text-yellow-400" />,
      gradient: 'from-orange-600 via-orange-500 to-orange-700',
      badge: 'Gold Tier'
    },
    {
      name: 'Harsh Raj',
      rank: 'Maths-99, Sci-100',
      exam: 'Board Achievement',
      score: 'Outstanding Performance',
      icon: <FaMedal className="text-yellow-400" />,
      gradient: 'from-slate-800 via-slate-900 to-black',
      badge: 'Gold Tier'
    },
    {
      name: 'Riya Rai',
      rank: 'Maths-100, Sci-95',
      exam: 'Board Achievement',
      score: 'Outstanding Performance',
      icon: <FaMedal className="text-yellow-400" />,
      gradient: 'from-orange-500 via-orange-600 to-orange-400',
      badge: 'Gold Tier'
    },
    {
      name: 'Aditya Pandey',
      rank: 'Maths-98, Sci-95',
      exam: 'Board Achievement',
      score: 'Outstanding Performance',
      icon: <FaStar className="text-yellow-400" />,
      gradient: 'from-slate-700 via-slate-800 to-slate-900',
      badge: 'Star Performer'
    }
  ];

  const stats = [
    { label: 'Successful Students', value: 1000, suffix: '+', icon: <FaTrophy />, color: 'text-orange-600' },
    { label: 'Success Rate', value: 95, suffix: '%', icon: <FaFire />, color: 'text-orange-500' },
    { label: 'Years of Trust', value: 15, suffix: '+', icon: <FaStar />, color: 'text-orange-400' },
    { label: 'Expert Faculty', value: 10, suffix: '+', icon: <FaChartBar />, color: 'text-slate-900' }
  ];

  return (
    <div className="min-h-screen bg-[#fffaf5] flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* Hall of Fame Hero */}
      <section className="relative py-20 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/2"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-6 block bg-orange-600/10 w-fit mx-auto px-4 py-1.5 rounded-full border border-orange-600/20">
            Legacy of Excellence
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-yellow-500">Hall of Fame</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed font-medium">
            Every year, our students break records and redefine success. Meet the warriors who conquered the toughest exams with precision.
          </p>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-20 bg-white shadow-2xl relative z-20 -mt-16 overflow-hidden rounded-[4rem] max-w-7xl mx-auto mx-4 sm:mx-6 md:mx-auto border border-orange-100">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center group p-3 border-r border-orange-50 last:border-0">
                <div className={`text-3xl mb-3 flex justify-center ${stat.color} group-hover:scale-110 group-hover:rotate-12 transition-all duration-300`}>
                  {stat.icon}
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1 tracking-tight">
                  <Counter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Toppers Spotlight */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-3 block">Champions League</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight uppercase tracking-tight">Elite Performers <span className="text-orange-600">2024</span></h2>
            <p className="text-gray-500 text-base font-medium">Leading the way to premier institutions across India</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {toppers.map((topper, index) => (
              <div key={index} className="group relative">
                <div className={`bg-gradient-to-br ${topper.gradient} rounded-[2rem] p-6 text-white h-full relative overflow-hidden transition-all duration-500 transform group-hover:-translate-y-4 shadow-2xl shadow-orange-950/20`}>
                  {/* Decorative Overlay */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 blur-[15px]"></div>
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full -ml-8 -mb-8 blur-[15px]"></div>

                  <div className="text-5xl mb-6 flex justify-center transform group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 drop-shadow-2xl">
                    {topper.icon}
                  </div>
                  <div className="text-center relative z-10">
                    <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-bold tracking-widest uppercase mb-4 text-white border border-white/20">
                      {topper.badge}
                    </span>
                    <h3 className="text-2xl font-bold mb-1 tracking-tight uppercase">{topper.name}</h3>
                    <p className="text-orange-100 text-[10px] font-bold uppercase tracking-widest mb-6">{topper.exam}</p>

                    <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-4 border border-white/10">
                      <div className="text-[9px] text-white/60 font-bold uppercase tracking-widest mb-1">Academic Record</div>
                      <div className="text-xl font-bold tracking-tight">{topper.rank}</div>
                      <div className="h-0.5 bg-gradient-to-r from-transparent via-white/20 to-transparent my-3"></div>
                      <div className="text-[9px] text-orange-400 font-bold uppercase tracking-widest">{topper.score}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stories of Triumph */}
      <section className="py-20 bg-slate-900 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#fffaf5] to-transparent z-0"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-12 mt-6">
            <span className="text-orange-500 font-bold uppercase tracking-widest text-[11px] mb-3 block">Testimonials</span>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight leading-tight">From Aspirants to <span className="text-orange-500">Achievers</span></h2>
            <p className="text-gray-400 text-lg font-medium">Real stories from the classrooms of Oasis</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Vikram Kumar",
                rank: "AIR 234 (2023)",
                msg: "Oasis is not just a coaching center; it's a family. The individual attention I received in my weak topics (Inorganic Chem) was the turning point for my success.",
                col: "from-orange-500 to-orange-700"
              },
              {
                name: "Anjali Kumari",
                rank: "AIR 567 (2023)",
                msg: "The test series at Oasis are identical to the actual exam level. It removed my exam fear completely. I would recommend Oasis to every serious aspirant.",
                col: "from-slate-700 to-slate-900"
              }
            ].map((t, idx) => (
              <div key={idx} className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-md relative group hover:bg-white/10 transition-all duration-500 transform hover:scale-[1.02]">
                <FaQuoteLeft className="text-4xl text-orange-500/20 absolute top-8 left-8" />
                <div className="relative z-10">
                  <p className="text-lg text-gray-300 mb-8 leading-relaxed font-medium">"{t.msg}"</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${t.col} flex items-center justify-center text-white font-bold text-xl shadow-xl shadow-orange-950/50`}>
                      {t.name[0]}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg tracking-tight uppercase">{t.name}</h4>
                      <p className="text-orange-500 font-bold uppercase tracking-widest text-[9px]">{t.rank}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-24 text-center">
            <a
              href="/#demo-form"
              className="inline-flex items-center gap-4 px-12 py-5 bg-orange-600 text-white font-bold rounded-2xl text-sm shadow-2xl shadow-orange-950/40 hover:bg-orange-700 hover:-translate-y-1 transition-all duration-500 uppercase tracking-widest"
            >
              Be the Next Topper <FaArrowRight />
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Results;
