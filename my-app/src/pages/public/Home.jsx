import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import best1 from '../../assets/best.jpg';
import best2 from '../../assets/best 2.jpg';
import best3 from '../../assets/best 3.jpg';
import bnner from '../../assets/Bnner.jpg';
import heroUp1 from '../../assets/hero-up-1.jpg';
import heroUp2 from '../../assets/hero-up-2.jpg';

// Coaching Photos for Gallery
import coaching1 from '../../assets/474589765_1276841513370808_7764133733018340516_n.jpg';
import coaching2 from '../../assets/474709499_1278016816586611_5145336952645222805_n.jpg';
import coaching3 from '../../assets/475415780_1285121682542791_8365407221338603766_n.jpg';
import coaching4 from '../../assets/475650196_1285121685876124_4721209917245273032_n.jpg';
import coaching5 from '../../assets/475679772_1285121712542788_7912544254822272362_n.jpg';
import coaching6 from '../../assets/475774089_1285121659209460_7756818827304219133_n.jpg';
import coaching7 from '../../assets/475874688_1285121709209455_8696569436817650851_n.jpg';
import coaching8 from '../../assets/475970746_1284020299319596_786940650357844988_n.jpg';
import coaching9 from '../../assets/476155997_1285121702542789_8367462175423701049_n.jpg';
import coaching10 from '../../assets/476640718_1290058428715783_719137760532989198_n.jpg';
import coaching11 from '../../assets/476644184_1290058588715767_7843985879107140710_n.jpg';
import coaching12 from '../../assets/550492546_1326566672187200_6186828262730265257_n.jpg';


const Home = () => {
  const [faculty, setFaculty] = useState([]);
  const [courses, setCourses] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    course: 'JEE Main',
    batchTiming: 'Morning',
    message: ''
  });
  const [formStatus, setFormStatus] = useState({ message: '', type: '' });

  const heroImages = [heroUp1, heroUp2, best1, best2, best3];
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const testimonialRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isPaused && testimonials.length > 0) {
      const interval = setInterval(() => {
        if (testimonialRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = testimonialRef.current;
          // If we reach the end, go back to start, else scroll right
          if (scrollLeft + clientWidth >= scrollWidth - 10) {
            testimonialRef.current.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            testimonialRef.current.scrollBy({ left: window.innerWidth < 768 ? window.innerWidth * 0.85 : 400, behavior: 'smooth' });
          }
        }
      }, 3500);
      return () => clearInterval(interval);
    }
  }, [isPaused, testimonials]);

  useEffect(() => {
    // Fetch faculty data
    fetch('http://localhost:5002/api/public/faculty')
      .then(res => res.json())
      .then(data => setFaculty(data))
      .catch(err => console.error('Error fetching faculty:', err));

    // Fetch courses data
    fetch('http://localhost:5002/api/public/courses')
      .then(res => res.json())
      .then(data => setCourses(data))
      .catch(err => console.error('Error fetching courses:', err));

    // Fetch testimonials
    fetch('http://localhost:5002/api/public/testimonials')
      .then(res => res.json())
      .then(data => setTestimonials(data))
      .catch(err => console.error('Error fetching testimonials:', err));
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormStatus({ message: '', type: '' });

    try {
      const response = await fetch('http://localhost:5002/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setFormStatus({ message: data.message, type: 'success' });
        setFormData({ name: '', email: '', phone: '', course: 'JEE Main', batchTiming: 'Morning', message: '' });
      } else {
        setFormStatus({ message: data.message, type: 'error' });
      }
    } catch (err) {
      setFormStatus({ message: 'Failed to submit. Please try again.', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <Navbar />

      <section className="relative h-[calc(100vh-80px)] mt-[80px] w-screen flex items-center justify-center overflow-hidden bg-slate-900">
        {/* Background Slideshow - Edge to Edge */}
        {heroImages.map((img, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${idx === currentHeroIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
              }`}
          >
            <img
              src={img}
              alt="Oasis Hero"
              className="w-full h-full object-cover object-top transform transition-transform duration-[5000ms] ease-out"
            />
            {/* Improved Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent"></div>
          </div>
        ))}

        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden z-[2] pointer-events-none opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-[120px] animate-blob"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
        </div>

        <div className="relative z-10 w-full pt-20">
          <div className="text-center py-6 px-4">
            <div className="inline-block bg-white/10 backdrop-blur-md rounded-full px-6 py-2 mb-8 border border-white/20 animate-reveal shadow-xl overflow-hidden relative">
              <span className="relative text-xs md:text-sm font-bold text-white tracking-wider flex items-center gap-2">
                <span className="animate-pulse text-indigo-400">🏆</span>
                10+ Years of Excellence in JEE Coaching
              </span>
            </div>

            <h1 className="mb-6 leading-tight tracking-tight">
              <span className="block text-4xl md:text-6xl font-black text-white mb-2 drop-shadow-2xl animate-reveal" style={{ animationDelay: '0.2s' }}>
                Transform Your
              </span>
              <div className="flex justify-center">
                <span className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-300 animate-typewriter drop-shadow-[0_0_20px_rgba(251,146,60,0.5)] py-2 px-1">
                  IIT Dream Into Reality
                </span>
              </div>
            </h1>

            <p className="text-lg md:text-xl mb-8 animate-reveal font-bold tracking-tight drop-shadow-md" style={{ animationDelay: '2.5s' }}>
              <span className="text-indigo-300">Expert Faculty</span>
              <span className="mx-2 text-white/30">•</span>
              <span className="text-purple-300">Smart ERP System</span>
              <span className="mx-2 text-white/30">•</span>
              <span className="text-pink-300">Proven Results</span>
            </p>

            <p className="text-base md:text-lg mb-10 text-gray-200 font-medium leading-relaxed animate-reveal drop-shadow-sm" style={{ animationDelay: '2.7s' }}>
              Join Patna's most trusted JEE coaching institute with
              <span className="text-white font-bold mx-1 border-b border-indigo-500">95% success rate</span>
              and personalized attention.
            </p>

            <div className="flex flex-wrap gap-4 justify-center mb-12 animate-reveal" style={{ animationDelay: '2.9s' }}>
              <a href="#demo-form" className="group relative bg-white text-indigo-900 px-8 py-4 rounded-xl font-black text-base transition-all duration-300 shadow-xl hover:-translate-y-1 active:scale-95 overflow-hidden">
                <span className="relative flex items-center gap-2">
                  <span>📞</span> Book Free Demo Class
                </span>
              </a>
              <a href="#courses" className="group relative bg-indigo-600/10 backdrop-blur-xl border border-white/20 text-white px-8 py-4 rounded-xl font-black text-base transition-all duration-300 hover:bg-white hover:text-indigo-900 hover:-translate-y-1 active:scale-95 shadow-lg">
                <span className="relative flex items-center gap-2">
                  <span>📚</span> Explore Courses
                </span>
              </a>
            </div>

            {/* Stats Overlay inside the glass container */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-3xl font-bold text-white">500+</div>
                <div className="text-xs uppercase tracking-wider opacity-80 mt-1">Students</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-3xl font-bold text-white">95%</div>
                <div className="text-xs uppercase tracking-wider opacity-80 mt-1">Success Rate</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-3xl font-bold text-white">50+</div>
                <div className="text-xs uppercase tracking-wider opacity-80 mt-1">Expert Faculty</div>
              </div>
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-3xl font-bold text-white">10+</div>
                <div className="text-xs uppercase tracking-wider opacity-80 mt-1">Years Exp.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Login Section */}
      <section id="portal-login" className="py-12 bg-white dark:bg-gray-950 border-b dark:border-gray-800 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-center text-gray-700 font-semibold mb-4">🚀 Portal Login</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link to="/login?role=student" className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg text-center hover:scale-105 transition-transform shadow-md">
                <div className="text-3xl mb-2">👨‍🎓</div>
                <div className="font-semibold text-sm">Student Portal</div>
              </Link>
              <Link to="/login?role=teacher" className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg text-center hover:scale-105 transition-transform shadow-md">
                <div className="text-3xl mb-2">👨‍🏫</div>
                <div className="font-semibold text-sm">Teacher Portal</div>
              </Link>
              <Link to="/login?role=parent" className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg text-center hover:scale-105 transition-transform shadow-md">
                <div className="text-3xl mb-2">👨‍👩‍👦</div>
                <div className="font-semibold text-sm">Parent Portal</div>
              </Link>
              <Link to="/login?role=admin" className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg text-center hover:scale-105 transition-transform shadow-md">
                <div className="text-3xl mb-2">⚙️</div>
                <div className="font-semibold text-sm">Admin Portal</div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Courses & Batches Section */}
      <section id="courses" className="py-24 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Our Courses & Batches</h2>
            <p className="text-gray-600 text-lg">Comprehensive programs designed for JEE success</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {courses.map(course => (
              <div key={course.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6">
                  <h3 className="text-2xl font-bold mb-2">{course.name}</h3>
                  <p className="text-sm opacity-90">Duration: {course.duration}</p>
                </div>
                <div className="p-6">
                  <p className="text-gray-600 mb-4">{course.description}</p>
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Key Features:</h4>
                    <ul className="space-y-1">
                      {course.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center">
                          <span className="text-green-500 mr-2">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a href="#demo-form" className="block text-center bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                    Enroll Now
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-gray-700 mb-4 text-lg font-semibold">📅 Batch Timings Available:</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <span className="bg-blue-100 text-blue-700 px-6 py-2 rounded-full font-semibold">Morning (6 AM - 9 AM)</span>
              <span className="bg-green-100 text-green-700 px-6 py-2 rounded-full font-semibold">Day (9 AM - 12 PM)</span>
              <span className="bg-purple-100 text-purple-700 px-6 py-2 rounded-full font-semibold">Evening (4 PM - 7 PM)</span>
              <span className="bg-orange-100 text-orange-700 px-6 py-2 rounded-full font-semibold">Weekend Batches</span>
            </div>
          </div>
        </div>
      </section>

      {/* Smart ERP Features Section */}
      <section className="py-24 bg-indigo-600 w-full relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Smart ERP System</h2>
            <p className="text-indigo-100 text-lg">Technology-driven coaching for modern learning</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-8 rounded-xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                📊
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Real-Time Attendance</h3>
              <p className="text-gray-600">Track student attendance instantly with automated SMS alerts to parents</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-8 rounded-xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                👨‍👩‍👦
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Parent Dashboard</h3>
              <p className="text-gray-600">Complete visibility into performance, attendance, fees, and progress reports</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 p-8 rounded-xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                🔔
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Live Notifications</h3>
              <p className="text-gray-600">Instant updates on exams, results, notices, and important announcements</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-8 rounded-xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                📈
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Performance Analytics</h3>
              <p className="text-gray-600">Detailed insights and visualizations to track academic progress over time</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-8 rounded-xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                📚
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Online Study Material</h3>
              <p className="text-gray-600">Access notes, practice papers, and resources anytime from student portal</p>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-8 rounded-xl hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                💰
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Fee Management</h3>
              <p className="text-gray-600">Transparent fee tracking with online payment options and instant receipts</p>
            </div>
          </div>
        </div>
      </section>

      {/* Faculty Showcase Section */}
      {faculty.length > 0 && (
        <section className="py-24 bg-white dark:bg-gray-950 w-full">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Our Expert Faculty</h2>
              <p className="text-gray-600 text-lg">Learn from IIT alumni and experienced educators</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {faculty.map(member => (
                <div key={member.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl mx-auto mb-4">
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      '👨‍🏫'
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{member.name}</h3>
                  <p className="text-indigo-600 font-semibold mb-2">{member.subjects}</p>
                  <p className="text-gray-600 text-sm">{member.classes}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/faculty" className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                View All Faculty →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section className="py-24 bg-slate-50 dark:bg-gray-950 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">How It Works</h2>
            <p className="text-gray-600 text-lg">Simple steps to start your JEE journey</p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-6 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-3 md:gap-6 p-4 md:p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-indigo-100">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-base md:text-xl font-black shrink-0 shadow-lg">
                1
              </div>
              <div>
                <h3 className="text-sm md:text-lg font-bold text-gray-800 mb-1">Book Demo</h3>
                <p className="text-gray-500 text-[10px] md:text-sm leading-relaxed">Fill the enquiry form and schedule your free demo class</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-3 md:gap-6 p-4 md:p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-green-100">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white text-base md:text-xl font-black shrink-0 shadow-lg">
                2
              </div>
              <div>
                <h3 className="text-sm md:text-lg font-bold text-gray-800 mb-1">Attend Demo</h3>
                <p className="text-gray-500 text-[10px] md:text-sm leading-relaxed">Experience our teaching methodology and meet our faculty</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-3 md:gap-6 p-4 md:p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-purple-100">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-base md:text-xl font-black shrink-0 shadow-lg">
                3
              </div>
              <div>
                <h3 className="text-sm md:text-lg font-bold text-gray-800 mb-1">Admission</h3>
                <p className="text-gray-500 text-[10px] md:text-sm leading-relaxed">Choose your batch and complete the process</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-3 md:gap-6 p-4 md:p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-orange-100">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-base md:text-xl font-black shrink-0 shadow-lg">
                4
              </div>
              <div>
                <h3 className="text-sm md:text-lg font-bold text-gray-800 mb-1">Success</h3>
                <p className="text-gray-500 text-[10px] md:text-sm leading-relaxed">Begin your personalized journey to crack JEE</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Parent Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="py-20 bg-gradient-to-br from-indigo-50 to-purple-50 w-full">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">What Parents Say</h2>
              <p className="text-gray-600 text-lg">Real experiences from satisfied parents</p>
            </div>

            <div
              ref={testimonialRef}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onTouchStart={() => setIsPaused(true)}
              onTouchEnd={() => setIsPaused(false)}
              className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0 scroll-smooth"
            >
              {testimonials.map(testimonial => (
                <div
                  key={testimonial.id}
                  className="snap-center shrink-0 w-[85vw] md:w-[380px] bg-white rounded-3xl shadow-xl p-8 border border-white/50 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 relative group"
                >
                  <div className="absolute top-6 right-8 text-4xl text-indigo-100 opacity-50 group-hover:text-indigo-200 transition-colors">
                    "
                  </div>
                  <div className="flex mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-lg">⭐</span>
                    ))}
                  </div>
                  <p className="text-gray-700 italic mb-8 leading-relaxed text-lg">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4 border-t pt-6 border-gray-50">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                      {testimonial.parentName[0]}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 leading-none mb-1">{testimonial.parentName}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Parent of {testimonial.studentName}</p>
                      <p className="text-xs text-indigo-600 font-bold mt-1 bg-indigo-50 inline-block px-2 py-0.5 rounded-full">{testimonial.achievement}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Events Gallery Section */}
      <section className="py-24 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Life at Oasis: Events Gallery</h2>
            <p className="text-gray-600 text-lg">Glimpses of our vibrant campus life, celebrations, and achievements</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {[
              { img: coaching1, title: "Scholarship Distribution", size: "col-span-1 row-span-1" },
              { img: coaching2, title: "Classroom Interaction", size: "md:col-span-2 md:row-span-2 col-span-2" },
              { img: coaching3, title: "Student Guidance", size: "col-span-1 row-span-1" },
              { img: coaching4, title: "Achievement Celebration", size: "col-span-1 row-span-1" },
              { img: coaching5, title: "Doubt Clearing Session", size: "col-span-1 row-span-1" },
              { img: coaching6, title: "Success Stories", size: "md:col-span-2 md:row-span-1 col-span-2" },
              { img: coaching7, title: "Exam Preparation", size: "col-span-1 row-span-1" },
              { img: coaching8, title: "Expert Mentorship", size: "col-span-1 row-span-1" },
              { img: coaching9, title: "Campus Life", size: "col-span-1 row-span-1" },
              { img: coaching10, title: "Annual Day", size: "md:col-span-2 md:row-span-1 col-span-2" },
              { img: coaching11, title: "Award Ceremony", size: "col-span-1 row-span-1" },
              { img: coaching12, title: "Classroom Learning", size: "col-span-1 row-span-1" },
            ].map((item, idx) => (
              <div key={idx} className={`group relative overflow-hidden rounded-2xl shadow-lg border border-gray-100 ${item.size} cursor-pointer`}>
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h3 className="text-white font-bold text-sm md:text-lg">{item.title}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/gallery" className="inline-block bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-1">
              Explore Our Campus →
            </Link>
          </div>
        </div>
      </section>

      {/* Free Demo Enquiry Form Section */}
      <section id="demo-form" className="py-24 bg-slate-900 text-white w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl p-8 md:p-12 text-white">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-4">Book Your Free Demo Class</h2>
              <p className="text-lg opacity-90">Take the first step towards your IIT dream</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 rounded-lg text-gray-800 focus:ring-2 focus:ring-white outline-none"
                  placeholder="Enter your full name"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-lg text-gray-800 focus:ring-2 focus:ring-white outline-none"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    pattern="[0-9]{10}"
                    className="w-full px-4 py-3 rounded-lg text-gray-800 focus:ring-2 focus:ring-white outline-none"
                    placeholder="10-digit number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold mb-2">Course Interest</label>
                  <select
                    name="course"
                    value={formData.course}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg text-gray-800 focus:ring-2 focus:ring-white outline-none"
                  >
                    <option value="JEE Main">JEE Main</option>
                    <option value="JEE Advanced">JEE Advanced</option>
                    <option value="Foundation">Foundation (9th-10th)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Preferred Batch</label>
                  <select
                    name="batchTiming"
                    value={formData.batchTiming}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg text-gray-800 focus:ring-2 focus:ring-white outline-none"
                  >
                    <option value="Morning">Morning (6 AM - 9 AM)</option>
                    <option value="Day">Day (9 AM - 12 PM)</option>
                    <option value="Evening">Evening (4 PM - 7 PM)</option>
                    <option value="Weekend">Weekend</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Message (Optional)</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-4 py-3 rounded-lg text-gray-800 focus:ring-2 focus:ring-white outline-none resize-none"
                  placeholder="Any specific queries or requirements?"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-white text-indigo-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-100 hover:scale-105 transition-all duration-300 shadow-lg"
              >
                📞 Request Free Demo Class
              </button>

              {formStatus.message && (
                <div className={`p-4 rounded-lg text-center font-semibold ${formStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {formStatus.message}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Contact & Location Section - Full Width */}
      <section className="py-24 bg-gray-50 dark:bg-gray-900 transition-colors duration-300 w-full">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Visit Us</h2>
            <p className="text-gray-600 text-lg">We're here to help you succeed</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-indigo-50/50">
              <h3 className="text-3xl font-extrabold text-gray-900 mb-10 text-center md:text-left relative">
                Contact Information
                <span className="absolute bottom-[-12px] left-1/2 md:left-0 transform md:transform-none -translate-x-1/2 md:translate-x-0 w-20 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"></span>
              </h3>

              <div className="space-y-6">
                <div className="group flex items-center p-4 rounded-2xl bg-indigo-50/30 hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-indigo-100">
                  <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                    📍
                  </div>
                  <div className="ml-6">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-[0.2em] mb-1">Address</p>
                    <p className="text-gray-800 font-bold leading-relaxed">
                      Above Corporation Bank, Saguna More<br />
                      Patna - 800001, Bihar
                    </p>
                  </div>
                </div>

                <div className="group flex items-center p-4 rounded-2xl bg-purple-50/30 hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-purple-100">
                  <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                    📞
                  </div>
                  <div className="ml-6">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-[0.2em] mb-1">Phone</p>
                    <p className="text-gray-800 font-bold text-lg">+91-0612-XXXXXXX</p>
                  </div>
                </div>

                <div className="group flex items-center p-4 rounded-2xl bg-pink-50/30 hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-pink-100">
                  <div className="w-14 h-14 bg-pink-600 rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                    ✉️
                  </div>
                  <div className="ml-6">
                    <p className="text-xs font-bold text-pink-600 uppercase tracking-[0.2em] mb-1">Email</p>
                    <p className="text-gray-800 font-bold">info@oasisjeeclasses.com</p>
                  </div>
                </div>

                <div className="group flex items-center p-4 rounded-2xl bg-blue-50/30 hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-blue-100">
                  <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                    🕒
                  </div>
                  <div className="ml-6">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mb-1">Office Hours</p>
                    <p className="text-gray-800 font-bold">
                      Mon - Sat: 9:00 AM - 6:00 PM<br />
                      <span className="text-gray-500 font-semibold text-sm">Sunday: By Appointment</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 h-[500px]">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3598.0743445!2d85.1376!3d25.5941!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjXCsDM1JzM4LjgiTiA4NcKwMDgnMTUuNCJF!5e0!3m2!1sen!2sin!4v1234567890"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                title="Oasis JEE Classes Location"
                className="w-full h-full"
              ></iframe>
            </div>
          </div>

          <div className="max-w-6xl mx-auto mt-12 px-4">
            <a href="#demo-form" className="p-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[2rem] text-white shadow-2xl flex flex-col md:flex-row items-center justify-between group hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-center md:text-left mb-6 md:mb-0">
                <h4 className="font-black text-2xl mb-1">Still confused about your journey?</h4>
                <p className="text-blue-100 font-medium opacity-90">Book a 1-on-1 counseling session or a free demo class today.</p>
              </div>
              <div className="flex items-center gap-4 bg-white/20 px-8 py-4 rounded-2xl backdrop-blur-sm group-hover:bg-white group-hover:text-blue-600 transition-all duration-300 font-bold whitespace-nowrap">
                Get Started Now
                <span className="text-2xl transition-transform duration-300 group-hover:translate-x-2">→</span>
              </div>
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Home;