import React from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { FaTrophy, FaMedal, FaStar, FaQuoteLeft, FaFire, FaChartBar } from 'react-icons/fa';

const Results = () => {
  const toppers = [
    {
      name: 'Karan Kr Sharma',
      rank: 'Maths-100, Sci-98',
      exam: 'Board Achievement',
      score: 'Outstanding Performance',
      icon: <FaMedal className="text-yellow-400" />,
      gradient: 'from-blue-900 via-blue-800 to-indigo-900',
      badge: 'Gold Tier'
    },
    {
      name: 'Harsh Raj',
      rank: 'Maths-99, Sci-100',
      exam: 'Board Achievement',
      score: 'Outstanding Performance',
      icon: <FaMedal className="text-yellow-400" />,
      gradient: 'from-indigo-900 via-indigo-800 to-purple-900',
      badge: 'Gold Tier'
    },
    {
      name: 'Riya Rai',
      rank: 'Maths-100, Sci-95',
      exam: 'Board Achievement',
      score: 'Outstanding Performance',
      icon: <FaMedal className="text-yellow-400" />,
      gradient: 'from-purple-900 via-purple-800 to-pink-900',
      badge: 'Gold Tier'
    },
    {
      name: 'Aditya Pandey',
      rank: 'Maths-98, Sci-95',
      exam: 'Board Achievement',
      score: 'Outstanding Performance',
      icon: <FaStar className="text-yellow-400" />,
      gradient: 'from-slate-900 via-slate-800 to-blue-900',
      badge: 'Star Performer'
    }
  ];

  const stats = [
    { label: 'Successful Students', value: '1000+', icon: <FaTrophy />, color: 'text-yellow-400' },
    { label: 'Success Rate', value: '95%', icon: <FaFire />, color: 'text-orange-500' },
    { label: 'Years of Trust', value: '15+', icon: <FaStar />, color: 'text-purple-400' },
    { label: 'Expert Faculty', value: '10+', icon: <FaChartBar />, color: 'text-indigo-400' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Hall of Fame Hero */}
      <section className="relative py-28 bg-[#0f172a] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[150px] translate-y-1/2 -translate-x-1/2"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <span className="inline-block py-1.5 px-4 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm font-bold mb-6 tracking-widest uppercase">
            Legacy of Excellence
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight">
            Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500">Hall of Fame</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Every year, our students break records and redefine success. Meet the warriors who conquered the toughest exam in the world.
          </p>
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-20 bg-white shadow-2xl relative z-20 -mt-10 overflow-hidden rounded-[4rem] max-w-7xl mx-auto mx-4 sm:mx-6 md:mx-auto">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center group p-4">
                <div className={`text-4xl mb-4 flex justify-center ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                  {stat.icon}
                </div>
                <div className="text-4xl md:text-5xl font-black text-gray-900 mb-2">{stat.value}</div>
                <div className="text-sm font-bold text-gray-500 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Toppers Spotlight */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Elite Performers 2024</h2>
            <p className="text-gray-500 text-lg">Leading the way to premier engineering institutions</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {toppers.map((topper, index) => (
              <div key={index} className="group relative">
                <div className={`bg-gradient-to-br ${topper.gradient} rounded-[2.5rem] p-8 text-white h-full relative overflow-hidden transition-all duration-500 transform group-hover:-translate-y-4 shadow-2xl`}>
                  {/* Decorative Overlay */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8"></div>

                  <div className="text-6xl mb-8 flex justify-center transform group-hover:scale-125 transition-transform duration-500">
                    {topper.icon}
                  </div>
                  <div className="text-center relative z-10">
                    <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 text-white/80">
                      {topper.badge}
                    </span>
                    <h3 className="text-2xl font-bold mb-1">{topper.name}</h3>
                    <p className="text-blue-200 text-sm mb-6">{topper.exam}</p>

                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/10">
                      <div className="text-sm text-blue-100 mb-1">JEE RANK</div>
                      <div className="text-4xl font-black tracking-tight">{topper.rank}</div>
                      <div className="h-px bg-white/20 my-3"></div>
                      <div className="text-xs text-blue-200">Score: {topper.score}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stories of Triumph */}
      <section className="py-24 bg-[#0f172a] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-gray-50 to-transparent opacity-100"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-extrabold text-white mb-4">From Aspirants to Achievers</h2>
            <p className="text-gray-400">Real stories from the classrooms of Oasis</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {[
              {
                name: "Vikram Kumar",
                rank: "AIR 234 (2023)",
                msg: "Oasis is not just a coaching center; it's a family. The individual attention I received in my weak topics (Inorganic Chem) was the turning point for my AIR.",
                col: "from-blue-600 to-indigo-700"
              },
              {
                name: "Anjali Kumari",
                rank: "AIR 567 (2023)",
                msg: "The test series at Oasis are identical to the actual JEE level. It removed my exam fear completely. I would recommend Oasis to every serious aspirant in Bihar.",
                col: "from-purple-600 to-indigo-700"
              }
            ].map((t, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 p-10 rounded-[3rem] backdrop-blur-sm relative group hover:bg-white/10 transition-all duration-300">
                <FaQuoteLeft className="text-4xl text-indigo-500/30 absolute top-8 left-8" />
                <div className="pl-10">
                  <p className="text-xl text-gray-300 italic mb-8 leading-relaxed">"{t.msg}"</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${t.col} flex items-center justify-center text-white font-bold text-xl`}>
                      {t.name[0]}
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-lg">{t.name}</h4>
                      <p className="text-indigo-400 text-sm font-semibold">{t.rank}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <a
              href="/#demo-form"
              className="inline-block px-10 py-5 bg-white text-indigo-900 font-extrabold rounded-2xl text-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              Be the Next Topper
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Results;
