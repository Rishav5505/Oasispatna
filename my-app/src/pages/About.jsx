import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
  FaRocket, FaChartLine, FaBell, FaClipboardCheck, FaCalendarAlt,
  FaTachometerAlt, FaUserGraduate, FaTrophy, FaChalkboardTeacher,
  FaLightbulb, FaUsers, FaStar, FaPhone, FaEnvelope, FaMapMarkerAlt,
  FaQuoteLeft, FaArrowRight
} from 'react-icons/fa';
import { BiWorld } from 'react-icons/bi';

const About = () => {
  const [selectedImage, setSelectedImage] = useState(null);

  const galleryImages = [
    {
      src: "C:/Users/risha/.gemini/antigravity/brain/f115251d-e185-408f-89a4-252228a9267e/classroom_environment_1766945354444.png",
      title: "Modern Classrooms",
      description: "State-of-the-art learning spaces"
    },
    {
      src: "C:/Users/risha/.gemini/antigravity/brain/f115251d-e185-408f-89a4-252228a9267e/library_facility_1766945370323.png",
      title: "Library Facilities",
      description: "Extensive collection of study materials"
    },
    {
      src: "C:/Users/risha/.gemini/antigravity/brain/f115251d-e185-408f-89a4-252228a9267e/computer_lab_1766945386557.png",
      title: "Computer Lab",
      description: "Digital learning infrastructure"
    },
    {
      src: "C:/Users/risha/.gemini/antigravity/brain/f115251d-e185-408f-89a4-252228a9267e/faculty_interaction_1766945403246.png",
      title: "Faculty Interaction",
      description: "Personalized mentorship"
    }
  ];

  return (
    <div className="min-h-screen bg-white selection:bg-indigo-500 selection:text-white">
      <Navbar />

      {/* Hero Section with Brand Story */}
      <section className="relative min-h-screen flex items-center justify-center bg-[#0f172a] overflow-hidden pt-24">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-purple-600/30 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-600/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-[20%] right-[20%] w-[20rem] h-[20rem] bg-blue-500/20 rounded-full blur-[80px] animate-bounce" style={{ animationDuration: '3s' }}></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-indigo-300 text-sm font-medium tracking-wide animate-fade-in-up">
            ✨ 10+ Years of Excellence in JEE Coaching
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white mb-8 tracking-tight leading-tight animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Oasis</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Founded in 2014, we've been transforming dreams into reality. Our mission is simple yet powerful:
            to provide world-class education that makes IIT dreams achievable for every aspiring student in Bihar.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            {[
              { icon: FaUserGraduate, count: "5000+", label: "Students", color: "from-blue-500 to-cyan-500" },
              { icon: FaTrophy, count: "95%", label: "Success Rate", color: "from-yellow-500 to-orange-500" },
              { icon: FaChalkboardTeacher, count: "50+", label: "Faculty", color: "from-purple-500 to-pink-500" },
              { icon: BiWorld, count: "1500+", label: "IIT Selections", color: "from-green-500 to-emerald-500" },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 transform hover:scale-105">
                <div className={`text-4xl mb-3 bg-gradient-to-r ${stat.color} text-transparent bg-clip-text`}>
                  <stat.icon className="mx-auto" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }} />
                </div>
                <h3 className="text-3xl font-bold text-white mb-1">{stat.count}</h3>
                <p className="text-sm text-gray-400 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Journey - Timeline Section */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-3">Our Journey</h2>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">A Decade of Innovation</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">From a small coaching center to Bihar's leading JEE institute</p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { year: "2014", title: "The Foundation", description: "Started with a vision to revolutionize JEE coaching in Patna with just 50 students and 5 dedicated faculty members.", color: "from-blue-500 to-blue-600", icon: FaRocket },
                { year: "2018", title: "Rapid Growth", description: "Achieved 90% success rate, expanded to 500+ students, and built a team of 20+ expert faculty from IITs.", color: "from-green-500 to-green-600", icon: FaChartLine },
                { year: "2021", title: "Digital Innovation", description: "Launched advanced ERP platform with real-time tracking, online doubt resolution, and parent portal.", color: "from-purple-500 to-purple-600", icon: FaTachometerAlt },
                { year: "2024", title: "Excellence Milestone", description: "Celebrating 5000+ successful students, 95% selection rate, and 1500+ IIT admissions.", color: "from-indigo-500 to-indigo-600", icon: FaTrophy },
              ].map((milestone, idx) => (
                <div key={idx} className="relative group">
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                    <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${milestone.color} rounded-l-2xl`}></div>
                    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${milestone.color} text-white text-2xl mb-4 shadow-lg`}>
                      <milestone.icon />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{milestone.year}</h3>
                    <h4 className="text-xl font-semibold text-indigo-600 mb-3">{milestone.title}</h4>
                    <p className="text-gray-600 leading-relaxed">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision Cards */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-3">Our Purpose</h2>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Mission & Vision</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="group relative bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 text-5xl shadow-lg">
                  🎯
                </div>
                <h3 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                  <span className="text-white drop-shadow-lg">Our </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 animate-pulse">Mission</span>
                </h3>
                <p className="text-indigo-100 leading-relaxed text-lg">
                  To transform aspiring students into confident achievers by providing holistic, technology-enabled JEE coaching that goes beyond traditional teaching. We are committed to nurturing not just academic excellence, but critical thinking, problem-solving abilities, and the resilience needed to crack JEE. Through personalized mentorship, innovative pedagogy, and unwavering support, we bridge the gap between dreams and IITs—ensuring every student realizes their true potential.
                </p>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-green-600 to-emerald-700 text-white rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 text-4xl">
                  🚀
                </div>
                <h3 className="text-3xl font-bold mb-4">Our Vision</h3>
                <p className="text-green-100 leading-relaxed text-lg">
                  To be the leading JEE coaching institute in Bihar, recognized nationally for innovation in teaching methodology, student success rates, and consistently producing top rankers who shape the future of engineering.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Smart Coaching Features (ERP-Based) */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-3">Smart Coaching</h2>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">ERP-Powered Learning</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Technology meets education - track, analyze, and excel</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { icon: FaClipboardCheck, title: "Real-Time Attendance", description: "Automated attendance tracking with instant parent notifications via SMS and app", color: "bg-blue-500" },
              { icon: FaChartLine, title: "Performance Analytics", description: "Advanced analytics dashboard showing progress, weak areas, and improvement trends", color: "bg-purple-500" },
              { icon: FaBell, title: "Smart Notifications", description: "Automated alerts for tests, assignments, results, and important announcements", color: "bg-yellow-500" },
              { icon: FaUsers, title: "Doubt Resolution Portal", description: "24/7 online doubt clearing through dedicated portal with faculty response within 2 hours", color: "bg-green-500" },
              { icon: FaCalendarAlt, title: "Intelligent Scheduling", description: "AI-powered test scheduling based on syllabus completion and student readiness", color: "bg-pink-500" },
              { icon: FaTachometerAlt, title: "Progress Dashboard", description: "Comprehensive dashboard for students and parents to track all academic metrics", color: "bg-indigo-500" },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 group">
                <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center text-white text-2xl mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                  <feature.icon />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Faculty Philosophy Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-3">Our Approach</h2>
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Faculty Philosophy</h2>
                <h3 className="text-2xl font-semibold text-gray-700 mb-6">Mentorship Over Teaching</h3>

                <div className="space-y-4 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <FaChalkboardTeacher className="text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">IIT Alumni Faculty</h4>
                      <p className="text-gray-600">Learn from those who've conquered JEE themselves - all our senior faculty are IIT graduates who understand the journey</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <FaUsers className="text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Small Batch Advantage</h4>
                      <p className="text-gray-600">Maximum 30 students per batch ensures every student gets personalized attention and doubt resolution</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <FaLightbulb className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Conceptual Clarity First</h4>
                      <p className="text-gray-600">We don't believe in rote learning - every concept is taught from fundamentals with real-world applications</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <FaChartLine className="text-pink-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 mb-1">Continuous Assessment</h4>
                      <p className="text-gray-600">Weekly tests, monthly mocks, and detailed performance analysis to track progress and identify improvement areas</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-2xl">
                  <div className="text-6xl mb-6">👨‍🏫</div>
                  <h3 className="text-2xl font-bold mb-4">What Sets Us Apart</h3>
                  <ul className="space-y-3 text-indigo-100">
                    <li className="flex items-center gap-2">
                      <FaStar className="text-yellow-400" />
                      Individual mentoring sessions
                    </li>
                    <li className="flex items-center gap-2">
                      <FaStar className="text-yellow-400" />
                      Parent-teacher meetings every month
                    </li>
                    <li className="flex items-center gap-2">
                      <FaStar className="text-yellow-400" />
                      Personalized study plans
                    </li>
                    <li className="flex items-center gap-2">
                      <FaStar className="text-yellow-400" />
                      24/7 doubt resolution support
                    </li>
                    <li className="flex items-center gap-2">
                      <FaStar className="text-yellow-400" />
                      Regular motivational sessions
                    </li>
                  </ul>
                </div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-yellow-400 rounded-full opacity-20 blur-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Student & Parent Testimonials */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-3">Testimonials</h2>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Success Stories</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Hear from our students and their parents</p>
          </div>

          {/* Student Testimonials */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Student Testimonials</h3>
            <div className="flex overflow-x-auto pb-6 gap-6 px-6 no-scrollbar snap-x">
              {[
                { name: "Amit Kumar", rank: "AIR 156", college: "IIT Bombay", quote: "Oasis changed my approach to problem-solving. The teachers are simply the best. Every doubt was cleared with patience and clarity.", color: "from-blue-500 to-cyan-500" },
                { name: "Priya Sharma", rank: "AIR 892", college: "IIT Delhi", quote: "The mock tests were harder than the actual exam, which made JEE feel like a breeze. Thank you for the rigorous preparation!", color: "from-purple-500 to-pink-500" },
                { name: "Rahul Singh", rank: "AIR 543", college: "IIT Kanpur", quote: "Personalized attention is not just a marketing term here; it's a reality. My mentor guided me through every challenge.", color: "from-orange-500 to-red-500" },
                { name: "Anjali Verma", rank: "AIR 1205", college: "IIT Kharagpur", quote: "The ERP system kept my parents informed, and the faculty made complex concepts simple. Best decision ever!", color: "from-green-500 to-emerald-500" },
              ].map((student, idx) => (
                <div key={idx} className="min-w-[350px] md:min-w-[400px] bg-white rounded-3xl p-8 border border-gray-100 shadow-xl hover:shadow-2xl transition-all duration-300 snap-center">
                  <FaQuoteLeft className="text-4xl text-indigo-200 mb-4" />
                  <p className="text-gray-700 italic leading-relaxed text-lg mb-6">"{student.quote}"</p>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${student.color} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                      {student.name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">{student.name}</h4>
                      <p className="text-sm font-semibold text-indigo-600">{student.rank} • {student.college}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex text-yellow-400 text-lg">
                    {'★'.repeat(5)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Parent Testimonials */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Parent Testimonials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                { parent: "Mr. Rajesh Kumar", student: "Amit's Father", quote: "The transparency through the ERP system is amazing. I could track my son's progress daily. The faculty is very responsive.", rating: 5 },
                { parent: "Mrs. Sunita Sharma", student: "Priya's Mother", quote: "Regular parent meetings and personalized attention helped Priya achieve her dreams. Forever grateful to Oasis!", rating: 5 },
                { parent: "Mr. Vijay Singh", student: "Rahul's Father", quote: "Best investment we made in our son's future. The mentorship and guidance are exceptional. Highly recommended!", rating: 5 },
              ].map((parent, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                  <div className="flex text-yellow-400 mb-3">
                    {'★'.repeat(parent.rating)}
                  </div>
                  <p className="text-gray-700 italic mb-4 leading-relaxed">"{parent.quote}"</p>
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="font-bold text-gray-900">{parent.parent}</h4>
                    <p className="text-sm text-gray-500">{parent.student}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Learning Environment Gallery */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-indigo-600 font-bold tracking-wide uppercase text-sm mb-3">Our Campus</h2>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Learning Environment</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Experience world-class infrastructure designed for success</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {galleryImages.map((image, idx) => (
              <div
                key={idx}
                className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <img
                  src={image.src}
                  alt={image.title}
                  className="w-full h-80 object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className="text-2xl font-bold mb-2">{image.title}</h3>
                    <p className="text-gray-200">{image.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="max-w-5xl w-full">
            <img
              src={selectedImage.src}
              alt={selectedImage.title}
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            <div className="text-center mt-6">
              <h3 className="text-3xl font-bold text-white mb-2">{selectedImage.title}</h3>
              <p className="text-gray-300 text-lg">{selectedImage.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Strong CTA Section */}
      <section className="py-24 bg-[#0f172a] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"></div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">Join the Oasis Family</h2>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed">
              Transform your IIT dreams into reality. Experience the difference that personalized mentorship,
              cutting-edge technology, and proven methodology can make.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-6 mb-16">
              <button className="group px-10 py-5 bg-white text-indigo-900 font-bold rounded-2xl text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative flex items-center justify-center gap-2">
                  Book Free Demo Class <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button className="px-10 py-5 bg-transparent border-2 border-white/20 hover:border-white text-white font-bold rounded-2xl text-lg transition-all hover:bg-white/10">
                Talk to Counselor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
              <div className="flex items-center justify-center gap-3 text-lg">
                <FaPhone className="text-indigo-400 text-2xl" />
                <span>+91 98765 43210</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-lg">
                <FaEnvelope className="text-purple-400 text-2xl" />
                <span>info@oasisjee.com</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-lg">
                <FaMapMarkerAlt className="text-pink-400 text-2xl" />
                <span>Saguna More, Patna</span>
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
