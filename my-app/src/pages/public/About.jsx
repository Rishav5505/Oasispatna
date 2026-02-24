import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import {
  FaRocket, FaChartLine, FaBell, FaClipboardCheck, FaCalendarAlt,
  FaTachometerAlt, FaUserGraduate, FaTrophy, FaChalkboardTeacher,
  FaLightbulb, FaUsers, FaStar, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaQuoteLeft, FaArrowRight
} from 'react-icons/fa';
import { BiWorld } from 'react-icons/bi';
import oasisLogo from '../../assets/oasis_logo.png';

const Counter = ({ end, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function: easeOutQuart
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

const About = () => {
  return (
    <div className="min-h-screen bg-[#fffaf5] selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* Hero Section with Brand Story */}
      <section className="relative py-20 flex items-center justify-center bg-slate-900 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-orange-600/20 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-orange-800/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-[20%] right-[20%] w-[20rem] h-[20rem] bg-orange-500/10 rounded-full blur-[80px] animate-bounce" style={{ animationDuration: '3s' }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-orange-400 text-[10px] font-bold uppercase tracking-widest animate-fade-in-up">
            ✨ 10+ Years of Excellence in JEE Coaching
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight animate-fade-in-up flex flex-col items-center justify-center gap-4" style={{ animationDelay: '0.1s' }}>
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl overflow-hidden p-2 mb-2 rotate-3 group hover:rotate-0 transition-transform duration-500">
              <img src={oasisLogo} alt="Oasis Logo" className="w-full h-full object-contain" />
            </div>
            <span>About <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400">Oasis JEE Classes</span></span>
          </h1>

          <p className="text-lg md:text-xl text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed animate-fade-in-up font-medium" style={{ animationDelay: '0.2s' }}>
            Founded in 2014, we've been transforming dreams into reality. Providing world-class education that makes IIT dreams achievable for every aspiring student in Bihar.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {[
              { icon: FaUserGraduate, count: 5000, suffix: "+", label: "Students", color: "from-orange-500 to-orange-400" },
              { icon: FaTrophy, count: 95, suffix: "%", label: "Success Rate", color: "from-orange-600 to-orange-500" },
              { icon: FaChalkboardTeacher, count: 50, suffix: "+", label: "Faculty", color: "from-orange-500 to-yellow-500" },
              { icon: BiWorld, count: 1500, suffix: "+", label: "IIT Selections", color: "from-orange-600 to-yellow-600" },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition-all duration-300 transform hover:scale-105 group shadow-2xl shadow-orange-950/20">
                <div className={`text-3xl mb-2 bg-gradient-to-r ${stat.color} text-transparent bg-clip-text`}>
                  <stat.icon className="mx-auto group-hover:scale-110 transition-transform" style={{ filter: 'drop-shadow(0 0 8px rgba(249,115,22,0.3))' }} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-1 tracking-tight">
                  <Counter end={stat.count} suffix={stat.suffix} />
                </h3>
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Journey - Timeline Section */}
      <section className="py-16 bg-[#fffaf5] relative">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-3 block">Our Journey</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">A Decade of <span className="text-orange-600">Innovation</span></h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg font-medium">From a small coaching center to Bihar's leading JEE institute</p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { year: "2014", title: "The Foundation", description: "Started with a vision to revolutionize JEE coaching in Patna with just 50 students and 5 dedicated faculty members.", color: "from-orange-500 to-orange-600", icon: FaRocket },
                { year: "2018", title: "Rapid Growth", description: "Achieved 90% success rate, expanded to 500+ students, and built a team of 20+ expert faculty from IITs.", color: "from-orange-600 to-orange-700", icon: FaChartLine },
                { year: "2021", title: "Digital Innovation", description: "Launched advanced ERP platform with real-time tracking, online doubt resolution, and parent portal.", color: "from-slate-800 to-slate-900", icon: FaTachometerAlt },
                { year: "2024", title: "Excellence Milestone", description: "Celebrating 5000+ successful students, 95% selection rate, and 1500+ IIT admissions.", color: "from-orange-600 to-orange-800", icon: FaTrophy },
              ].map((milestone, idx) => (
                <div key={idx} className="relative group">
                  <div className="bg-white rounded-[2rem] p-8 shadow-xl hover:shadow-orange-200/50 transition-all duration-500 transform hover:-translate-y-2 border border-orange-100 flex flex-col justify-between h-full">
                    <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${milestone.color} rounded-l-2xl`}></div>
                    <div>
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${milestone.color} text-white text-2xl mb-4 shadow-xl shadow-orange-900/20`}>
                        <milestone.icon />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-1 italic tracking-tighter">{milestone.year}</h3>
                      <h4 className="text-lg font-black text-orange-600 mb-3 italic tracking-tight">{milestone.title}</h4>
                      <p className="text-gray-600 leading-relaxed font-medium text-sm">"{milestone.description}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Cards */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-3 block">Our Purpose</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 tracking-tight">Mission & <span className="text-orange-600">Vision</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="group relative bg-slate-900 text-white rounded-[2.5rem] p-10 shadow-2xl hover:shadow-orange-900/20 transition-all duration-500 transform hover:scale-[1.02] overflow-hidden border border-white/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full -mr-32 -mt-32 blur-[80px]"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full -ml-32 -mb-32 blur-[80px]"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-orange-600/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 text-5xl shadow-inner border border-white/10 group-hover:scale-110 transition-transform">
                  🎯
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                  <span className="text-white">Our </span><br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-300">Mission</span>
                </h3>
                <p className="text-gray-400 leading-relaxed text-base font-medium">
                  To transform aspiring students into confident achievers by providing holistic, technology-enabled JEE coaching that goes beyond traditional teaching. We are committed to nurturing not just academic excellence, but critical thinking, problem-solving abilities, and the resilience needed to crack JEE. Through personalized mentorship and unwavering support, we bridge the gap between dreams and IITs.
                </p>
              </div>
            </div>

            <div className="group relative bg-orange-600 text-white rounded-[2.5rem] p-10 shadow-2xl hover:shadow-orange-400/30 transition-all duration-500 transform hover:scale-[1.02] overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-[60px]"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-[60px]"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 text-5xl shadow-inner border border-white/10 group-hover:scale-110 transition-transform">
                  🚀
                </div>
                <h3 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
                  <span className="text-white">Our </span><br />
                  <span className="text-slate-900 border-b-4 border-slate-900">Vision</span>
                </h3>
                <p className="text-orange-50 leading-relaxed text-base font-bold">
                  "To be the leading JEE coaching institute in Bihar, recognized nationally for innovation in teaching methodology, student success rates, and consistently producing top rankers who shape the future of engineering."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Coaching Features (ERP-Based) */}
      <section className="py-16 bg-[#fffaf5]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-3 block">Smart Coaching</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">ERP-Powered <span className="text-orange-600">Learning</span></h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg font-medium">Technology meets education - track, analyze, and excel</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {[
              { icon: FaClipboardCheck, title: "Real-Time Attendance", description: "Automated attendance tracking with instant parent notifications via SMS and app", color: "from-orange-500 to-orange-600" },
              { icon: FaChartLine, title: "Performance Analytics", description: "Advanced analytics dashboard showing progress, weak areas, and improvement trends", color: "from-slate-800 to-slate-900" },
              { icon: FaBell, title: "Smart Notifications", description: "Automated alerts for tests, assignments, results, and important announcements", color: "from-orange-600 to-orange-700" },
              { icon: FaUsers, title: "Doubt Resolution Portal", description: "24/7 online doubt clearing through dedicated portal with faculty response within 2 hours", color: "from-orange-500 to-yellow-500" },
              { icon: FaCalendarAlt, title: "Intelligent Scheduling", description: "AI-powered test scheduling based on syllabus completion and student readiness", color: "from-slate-700 to-slate-800" },
              { icon: FaTachometerAlt, title: "Progress Dashboard", description: "Comprehensive dashboard for students and parents to track all academic metrics", color: "from-orange-600 to-orange-500" },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-[2.5rem] p-10 shadow-xl hover:shadow-orange-200/50 transition-all duration-500 transform hover:-translate-y-2 border border-orange-100 group">
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-[1.5rem] flex items-center justify-center text-white text-3xl mb-8 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-xl shadow-orange-900/10`}>
                  <feature.icon />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3 italic tracking-tight uppercase tracking-tighter">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed font-medium">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Faculty Philosophy Section */}
      <section className="py-24 bg-white relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-3 block">Our Approach</span>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Faculty <span className="text-orange-600">Philosophy</span></h2>
                <h3 className="text-2xl font-bold text-gray-700 mb-8 uppercase tracking-widest text-xs border-l-4 border-orange-600 pl-4">Mentorship Over Teaching</h3>

                <div className="space-y-6 mb-10">
                  <div className="flex items-start gap-6 group">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm group-hover:bg-orange-600 transition-colors">
                      <FaChalkboardTeacher className="text-orange-600 group-hover:text-white transition-colors text-2xl" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 mb-1 uppercase tracking-widest text-[10px]">IIT Alumni Faculty</h4>
                      <p className="text-gray-600 font-medium">Learn from those who've conquered JEE themselves - all our senior faculty are IIT graduates who understand the journey</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-6 group">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm group-hover:bg-slate-900 transition-colors">
                      <FaUsers className="text-slate-900 group-hover:text-white transition-colors text-2xl" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 mb-1 uppercase tracking-widest text-[10px]">Small Batch Advantage</h4>
                      <p className="text-gray-600 font-medium">Maximum 30 students per batch ensures every student gets personalized attention and doubt resolution</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-6 group">
                    <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-sm group-hover:bg-orange-600 transition-colors">
                      <FaLightbulb className="text-orange-600 group-hover:text-white transition-colors text-2xl" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 mb-1 uppercase tracking-widest text-[10px]">Conceptual Clarity First</h4>
                      <p className="text-gray-600 font-medium">We don't believe in rote learning - every concept is taught from fundamentals with real-world applications</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative z-10 border border-white/5 overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/20 rounded-full blur-[40px] opacity-50"></div>
                  <div className="text-7xl mb-8 group-hover:scale-110 transition-transform duration-500">👨‍🏫</div>
                  <h3 className="text-3xl font-black mb-8 italic tracking-tighter uppercase tracking-widest text-xs border-b border-white/20 pb-4">What Sets Us Apart</h3>
                  <ul className="space-y-4 text-gray-400 font-medium">
                    <li className="flex items-center gap-3">
                      <FaStar className="text-orange-500" />
                      Individual mentoring sessions
                    </li>
                    <li className="flex items-center gap-3">
                      <FaStar className="text-orange-500" />
                      Parent-teacher meetings every month
                    </li>
                    <li className="flex items-center gap-3">
                      <FaStar className="text-orange-500" />
                      Personalized study plans
                    </li>
                    <li className="flex items-center gap-3">
                      <FaStar className="text-orange-500" />
                      24/7 doubt resolution support
                    </li>
                    <li className="flex items-center gap-3">
                      <FaStar className="text-orange-500" />
                      Regular motivational sessions
                    </li>
                  </ul>
                </div>
                <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-orange-600 rounded-full opacity-20 blur-3xl -z-10"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student & Parent Testimonials */}
      <section className="py-24 bg-[#fffaf5]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-orange-600 font-bold uppercase tracking-widest text-[11px] mb-3 block">Testimonials</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">Success <span className="text-orange-600">Stories</span></h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg font-medium">Hear from our students and their parents</p>
          </div>

          {/* Student Testimonials */}
          <div className="mb-20">
            <h3 className="text-xs font-black text-orange-600 mb-10 text-center uppercase tracking-[0.4em]">★ From our toppers</h3>
            <div className="flex overflow-x-auto pb-12 gap-8 px-6 no-scrollbar snap-x">
              {[
                { name: "Amit Kumar", rank: "AIR 156", college: "IIT Bombay", quote: "Oasis changed my approach to problem-solving. The teachers are simply the best. Every doubt was cleared with patience and clarity.", color: "from-orange-500 to-orange-600" },
                { name: "Priya Sharma", rank: "AIR 892", college: "IIT Delhi", quote: "The mock tests were harder than the actual exam, which made JEE feel like a breeze. Thank you for the rigorous preparation!", color: "from-slate-800 to-slate-900" },
                { name: "Rahul Singh", rank: "AIR 543", college: "IIT Kanpur", quote: "Personalized attention is not just a marketing term here; it's a reality. My mentor guided me through every challenge.", color: "from-orange-600 to-yellow-500" },
                { name: "Anjali Verma", rank: "AIR 1205", college: "IIT Kharagpur", quote: "The ERP system kept my parents informed, and the faculty made complex concepts simple. Best decision ever!", color: "from-slate-900 to-slate-800" },
              ].map((student, idx) => (
                <div key={idx} className="min-w-[320px] md:min-w-[450px] bg-white rounded-[3rem] p-10 border border-orange-100 shadow-xl hover:shadow-orange-200/50 transition-all duration-500 snap-center group">
                  <FaQuoteLeft className="text-5xl text-orange-100 mb-6 group-hover:text-orange-600 transition-colors" />
                  <p className="text-gray-700 italic leading-relaxed text-lg mb-8 font-medium">"{student.quote}"</p>
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${student.color} flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-orange-900/10`}>
                      {student.name[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-lg uppercase tracking-widest text-xs italic">{student.name}</h4>
                      <p className="text-sm font-black text-orange-600">{student.rank} • {student.college}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parent Testimonials */}
          <div>
            <h3 className="text-xs font-black text-slate-900 mb-10 text-center uppercase tracking-[0.4em]">★ Parent feedback</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {[
                { parent: "Mr. Rajesh Kumar", student: "Amit's Father", quote: "The transparency through the ERP system is amazing. I could track my son's progress daily. The faculty is very responsive.", rating: 5 },
                { parent: "Mrs. Sunita Sharma", student: "Priya's Mother", quote: "Regular parent meetings and personalized attention helped Priya achieve her dreams. Forever grateful to Oasis!", rating: 5 },
                { parent: "Mr. Vijay Singh", student: "Rahul's Father", quote: "Best investment we made in our son's future. The mentorship and guidance are exceptional. Highly recommended!", rating: 5 },
              ].map((parent, idx) => (
                <div key={idx} className="bg-white rounded-[2.5rem] p-8 shadow-xl hover:shadow-orange-200/50 transition-all duration-500 border border-orange-100 flex flex-col justify-between">
                  <div>
                    <div className="flex text-orange-500 mb-6 gap-1">
                      {'★'.repeat(parent.rating)}
                    </div>
                    <p className="text-gray-700 italic mb-8 leading-relaxed font-medium">"{parent.quote}"</p>
                  </div>
                  <div className="border-t border-orange-50 pt-6">
                    <h4 className="font-black text-gray-900 uppercase tracking-widest text-[10px]">{parent.parent}</h4>
                    <p className="text-xs font-black text-orange-600 uppercase tracking-[0.1em]">{parent.student}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Strong CTA Section */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-[120px]"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight leading-tight">Join the <span className="text-orange-500">Oasis</span> Family</h2>
            <p className="text-lg md:text-xl text-gray-400 mb-12 leading-relaxed font-medium max-w-3xl mx-auto">
              Transform your IIT dreams into reality. Experience personalized mentorship, cutting-edge technology, and proven methodology.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
              <a
                href="/#demo-form"
                className="group px-12 py-5 bg-orange-600 text-white font-black rounded-2xl text-sm shadow-2xl shadow-orange-900/40 hover:bg-orange-700 hover:-translate-y-1 transition-all duration-300 uppercase tracking-[0.2em] relative overflow-hidden flex items-center justify-center gap-3"
              >
                Book Free Demo Class <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </a>
              <button className="px-12 py-5 bg-transparent border-2 border-white/10 hover:border-orange-600 text-white font-black rounded-2xl text-sm transition-all hover:bg-white/5 uppercase tracking-[0.2em]">
                Talk to Counselor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-white border-t border-white/5 pt-16">
              <div className="flex flex-col items-center gap-3 group">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-2 group-hover:bg-orange-600 transition-colors">
                  <FaPhone className="text-orange-500 group-hover:text-white transition-colors text-xl" />
                </div>
                <span className="font-black tracking-widest text-[10px] uppercase text-gray-400">Contact Us</span>
                <span className="text-xl font-black tracking-tighter">+91 98765 43210</span>
              </div>
              <div className="flex flex-col items-center gap-3 group">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-2 group-hover:bg-orange-600 transition-colors">
                  <FaEnvelope className="text-orange-500 group-hover:text-white transition-colors text-xl" />
                </div>
                <span className="font-black tracking-widest text-[10px] uppercase text-gray-400">Email Us</span>
                <span className="text-xl font-black tracking-tighter">info@oasisjee.com</span>
              </div>
              <div className="flex flex-col items-center gap-3 group">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-2 group-hover:bg-orange-600 transition-colors">
                  <FaMapMarkerAlt className="text-orange-500 group-hover:text-white transition-colors text-xl" />
                </div>
                <span className="font-black tracking-widest text-[10px] uppercase text-gray-400">Visit Us</span>
                <span className="text-xl font-black tracking-tighter italic">Saguna More, Patna</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
