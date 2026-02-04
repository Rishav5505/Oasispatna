import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { FaGraduationCap, FaChalkboardTeacher, FaUserGraduate, FaTrophy, FaRocket, FaLightbulb, FaAtom, FaArrowRight } from 'react-icons/fa';
import { IoIosPeople } from 'react-icons/io';
import { BiWorld } from 'react-icons/bi';

const Home = () => {
  return (
    <div className="min-h-screen bg-white selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Modern Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-[#000000] overflow-hidden pt-20">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-orange-600/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-[#f37021]/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#f37021] text-sm font-medium tracking-wide animate-fade-in-up">
            🚀 Admissions Open for 2025 Batch
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-8 tracking-tight leading-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Master <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-[#f37021] to-orange-600">JEE</span> with <br />
            <span className="relative inline-block mt-2">
              <span className="relative z-10">Excellence</span>
              <div className="absolute bottom-2 left-0 w-full h-4 bg-orange-600/50 -rotate-2 blur-sm z-0"></div>
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            India's most innovative coaching platform, tailored for the dreamers, the thinkers, and the future IITians.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <button className="group relative px-8 py-4 bg-[#f37021] text-white font-bold rounded-2xl shadow-xl hover:shadow-orange-500/30 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
              <span className="relative z-10 flex items-center gap-2">
                Start Learning Now <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all duration-300 hover:scale-105">
              View Success Stories
            </button>
          </div>

          {/* Floating Stats Card */}
          <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 w-full max-w-5xl mx-auto hidden md:block animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <div className="grid grid-cols-4 gap-4 p-4 bg-white rounded-3xl shadow-2xl border border-gray-100">
              {[
                { icon: FaUserGraduate, count: "5000+", label: "Students", color: "text-orange-600", bg: "bg-orange-50" },
                { icon: FaTrophy, count: "95%", label: "Selection Rate", color: "text-amber-500", bg: "bg-amber-50" },
                { icon: FaChalkboardTeacher, count: "50+", label: "Expert Faculty", color: "text-gray-900", bg: "bg-gray-100" },
                { icon: BiWorld, count: "10+", label: "Years Impact", color: "text-orange-600", bg: "bg-orange-50" },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center justify-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors cursor-default group">
                  <div className={`w-12 h-12 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center text-2xl group-hover:scale-110 transition-transform`}>
                    <stat.icon />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-gray-900">{stat.count}</h3>
                    <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Spacing for floating stats */}
      <div className="h-32 bg-gray-50 hidden md:block"></div>

      {/* Features Section - Bento Grid Style */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-[#f37021] font-bold tracking-wide uppercase text-sm mb-3">Why Choose Oasis</h2>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Reinventing Exam Prep</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">We don't just teach; we transform potential into performance through technology and mentorship.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="md:col-span-2 group relative bg-white rounded-[2rem] p-10 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <FaAtom className="text-9xl text-orange-600 rotate-12" />
              </div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6 text-orange-600 text-3xl">
                  <FaChalkboardTeacher />
                </div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">World-Class Mentorship</h3>
                <p className="text-gray-600 text-lg leading-relaxed max-w-lg">
                  Learn directly from IITians and industry experts. Our faculty doesn't just deliver lectures; they mentor you through every doubt and difficulty, ensuring concepts are crystal clear.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-[2rem] p-10 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="mb-6 bg-white/20 w-fit p-4 rounded-2xl backdrop-blur-sm">
                <FaRocket className="text-3xl text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Proven Results</h3>
              <p className="text-indigo-100 leading-relaxed">
                Consistency is our signature. With over 1500+ IIT selections in the last decade, our results speak for our methodology.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-[2rem] p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group">
              <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mb-6 text-pink-600 text-3xl group-hover:scale-110 transition-transform">
                <FaLightbulb />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Smart Learning</h3>
              <p className="text-gray-600">AI-driven analytics to track your weak points and turn them into strengths.</p>
            </div>

            {/* Feature 4 */}
            <div className="md:col-span-2 bg-white rounded-[2rem] p-10 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6 text-green-600 text-3xl">
                    <IoIosPeople />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Community & Peer Learning</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Join a community of ambitious aspirants. Weekly group discussions, peer problem solving, and a competitive yet supportive environment that pushes you to be your best.
                  </p>
                </div>
                <div className="flex-1 bg-gray-100 rounded-xl p-6 w-full text-center">
                  {/* Placeholder for a chart or graphic */}
                  <div className="text-3xl font-bold text-gray-300 py-8">Peer Graph UI</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials - Scrolling Cards */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-6 mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-3">Testimonials</h2>
            <h2 className="text-4xl font-bold text-gray-900">Student Success Stories</h2>
          </div>
          <button className="hidden md:flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition">
            Read all stories <FaArrowRight />
          </button>
        </div>

        <div className="flex overflow-x-auto pb-10 gap-8 px-6 no-scrollbar snap-x">
          {[
            { name: "Amit Kumar", rank: "AIR 156", college: "IIT Bombay", quote: "Oasis changed my approach to problem-solving. The teachers are simply the best.", color: "from-blue-500 to-cyan-500" },
            { name: "Priya Sharma", rank: "AIR 892", college: "IIT Delhi", quote: "The mock tests were harder than the actual exam, which made JEE feel like a breeze.", color: "from-purple-500 to-pink-500" },
            { name: "Rahul Singh", rank: "AIR 543", college: "IIT Kanpur", quote: "Personalized attention is not just a marketing term here; it's a reality.", color: "from-orange-500 to-red-500" },
            { name: "Disu Singh", rank: "AIR 1043", college: "IIT Kanpur", quote: "Personalized attention is not just a marketing term here; it's a reality.", color: "from-orange-500 to-red-500" },
          ].map((student, idx) => (
            <div key={idx} className="min-w-[350px] md:min-w-[400px] bg-white rounded-3xl p-8 border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 snap-center">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${student.color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                  {student.name[0]}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-lg">{student.name}</h4>
                  <p className="text-sm font-semibold text-indigo-600">{student.rank} • {student.college}</p>
                </div>
              </div>
              <p className="text-gray-600 italic leading-relaxed text-lg">"{student.quote}"</p>
              <div className="mt-6 flex text-yellow-400 text-sm">
                {'★'.repeat(5)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#0f172a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"></div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-5xl font-bold text-white mb-8">Ready to Crack JEE?</h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Don't just dream about IITs. Make it happen with the best guidance and technology at your fingertips.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg transition-all shadow-lg hover:shadow-indigo-600/50">
              Apply for Scholarship
            </button>
            <button className="px-10 py-4 bg-transparent border-2 border-gray-600 hover:border-white text-gray-300 hover:text-white font-bold rounded-xl text-lg transition-all">
              Contact Counselor
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;
