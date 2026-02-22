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
import config from '../../config';

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

// Faculty Photos
import praveenPhoto from '../../assets/praveen_sir.jpeg';
import kalpanaPhoto from '../../assets/kalpana_rani.jpg';
import raviPhoto from '../../assets/ravi_shekhar.jpg';


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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    fetch(`${config.API_URL}/public/faculty`)
      .then(res => res.json())
      .then(data => setFaculty(data))
      .catch(err => console.error('Error fetching faculty:', err));

    // Fetch courses data
    fetch(`${config.API_URL}/public/courses`)
      .then(res => res.json())
      .then(data => setCourses(data))
      .catch(err => console.error('Error fetching courses:', err));

    // Fetch testimonials
    fetch(`${config.API_URL}/public/testimonials`)
      .then(res => res.json())
      .then(data => setTestimonials(data))
      .catch(err => console.error('Error fetching testimonials:', err));
  }, []);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, observerOptions);

    const revealElements = document.querySelectorAll('.reveal-on-scroll');
    revealElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [faculty, courses, testimonials]); // Re-run when dynamic content loads

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
        setFormStatus({ message: '✨ Success! Your demo class is booked. Check your email for confirmation.', type: 'success' });
        setFormData({ name: '', email: '', phone: '', course: 'JEE Main', batchTiming: 'Morning', message: '' });
        // Clear message after 5 seconds
        setTimeout(() => setFormStatus({ message: '', type: '' }), 8000);
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
    <div className="min-h-screen bg-[#fffaf5] overflow-x-hidden">
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

        {/* Premium Admissions Badge - Stuck to the absolute Top Edge */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 animate-slide-up">
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 text-orange-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse-soft shadow-2xl">
            <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></span>
            Admissions Open 2026-27
          </div>
        </div>

        <div className="container mx-auto px-4 relative z-10 flex flex-col gap-12">

          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Hero Left Content - Reverted to Left Aligned */}
            <div className="flex-1 text-left animate-slide-left">
              <h1 className="text-5xl md:text-8xl font-black text-white mb-6 leading-[0.9] tracking-tighter">
                DREAM BIG.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-400">ACHIEVE BIG.</span>
              </h1>
              <p className="text-gray-300 text-lg md:text-xl font-medium max-w-xl mb-10 leading-relaxed">
                Patna's most trusted institute for <span className="text-white font-black">JEE & NEET</span> preparation.
                Join the legacy of toppers today.
              </p>
              <div className="flex flex-wrap gap-4">
                <a href="#demo-form" className="px-8 py-4 bg-orange-600 text-white font-black rounded-2xl hover:bg-orange-700 transition-all hover:scale-105 shadow-xl shadow-orange-900/40 uppercase tracking-widest text-sm">
                  Start Journey
                </a>
                <Link to="/courses" className="px-8 py-4 bg-white/10 backdrop-blur-md text-white font-black rounded-2xl hover:bg-white/20 transition-all border border-white/20 uppercase tracking-widest text-sm">
                  Explore Courses
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Portal Login Section - Premium Cream Theme */}
      <section id="portal-login" className="py-16 bg-[#fffaf5] border-b border-orange-100 w-full reveal-on-scroll">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-center text-orange-600 font-black uppercase tracking-[0.3em] text-[10px] mb-10 block italic">🚀 Student & Parent Portals</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { role: 'student', label: 'Student Portal', icon: '👨‍🎓', color: 'from-orange-50 to-orange-100' },
                { role: 'teacher', label: 'Teacher Portal', icon: '👨‍🏫', color: 'from-orange-50 to-orange-100' },
                { role: 'parent', label: 'Parent Portal', icon: '👨‍👩‍👦', color: 'from-orange-50 to-orange-100' },
                { role: 'admin', label: 'Admin Portal', icon: '⚙️', color: 'from-orange-50 to-orange-100' }
              ].map((portal, idx) => (
                <Link key={idx} to={`/login?role=${portal.role}`} className={`bg-white border border-orange-100/50 text-gray-900 p-6 rounded-[2rem] text-center hover:bg-orange-600 hover:text-white transition-all shadow-xl shadow-orange-900/5 group transform hover:-translate-y-2 duration-500`}>
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{portal.icon}</div>
                  <div className="font-black text-xs uppercase tracking-widest">{portal.label}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Courses & Batches Section - Premium Cream Theme */}
      <section id="courses" className="py-24 bg-white w-full reveal-on-scroll">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-orange-600 font-black uppercase tracking-[0.3em] text-[10px] mb-3 block">Our Programs</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight italic">Our Courses & <span className="text-orange-600">Batches</span></h2>
            <p className="text-gray-600 text-lg font-medium">Comprehensive programs designed for JEE success</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {courses.map(course => (
              <div key={course.id} className="bg-[#fffaf5] rounded-[2.5rem] shadow-xl hover:shadow-orange-200/50 transition-all duration-500 overflow-hidden group border border-orange-100 flex flex-col">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-8">
                  <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">{course.name}</h3>
                  <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold uppercase tracking-widest border border-white/10">
                    Duration: {course.duration}
                  </div>
                </div>
                <div className="p-8 flex-grow">
                  <p className="text-gray-700 mb-6 font-medium italic">"{course.description}"</p>
                  <div className="mb-8">
                    <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                      Key Highlights:
                    </h4>
                    <ul className="space-y-3">
                      {course.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-center">
                          <span className="text-orange-600 mr-2 font-black">✓</span> {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a href="#demo-form" className="block text-center bg-orange-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-gray-900 transition-all transform group-hover:scale-[1.02] shadow-lg shadow-orange-900/20 uppercase tracking-widest text-[10px]">
                    Enroll Now
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <p className="text-orange-600 mb-6 text-xs font-black uppercase tracking-[0.3em]">📅 Batch Timings Available</p>
            <div className="flex flex-wrap gap-4 justify-center">
              {[
                { label: "Morning", time: "6 AM - 9 AM" },
                { label: "Day", time: "9 AM - 12 PM" },
                { label: "Evening", time: "4 PM - 7 PM" },
                { label: "Weekend", time: "SAT & SUN" }
              ].map((batch, i) => (
                <div key={i} className="bg-white border border-orange-100 px-6 py-3 rounded-2xl hover:border-orange-600 transition-colors shadow-lg group italic">
                  <span className="text-orange-600 text-[10px] font-black mr-2 uppercase tracking-widest">{batch.label}:</span>
                  <span className="text-gray-900 font-bold text-xs">{batch.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Smart ERP Features Section - Premium Cream Theme */}
      <section className="py-24 bg-[#fffaf5] w-full relative overflow-hidden reveal-on-scroll">
        <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-orange-400 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-orange-100 rounded-full blur-[100px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="text-orange-600 font-black uppercase tracking-[0.3em] text-[10px] mb-3 block italic">Why Oasis?</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight italic">Everything you need to <span className="text-orange-600 underline decoration-orange-200 underline-offset-8">Succeed</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-8 rounded-[2.5rem] bg-white shadow-xl hover:-translate-y-2 transition-all duration-500 group">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                📑
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Study Material</h3>
              <p className="text-gray-600">Comprehensive and well-researched study material designed by subject experts</p>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white shadow-xl hover:-translate-y-2 transition-all duration-500 group">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                👨‍🏫
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Top Faculty</h3>
              <p className="text-gray-600">Learning from highly qualified faculty with years of experience in JEE/NEET</p>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white shadow-xl hover:-translate-y-2 transition-all duration-500 group">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                📝
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Topic Tests</h3>
              <p className="text-gray-600">Regular assessment with topic-wise tests to ensure conceptual clarity</p>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white shadow-xl hover:-translate-y-2 transition-all duration-500 group">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                ❄️
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Smart Class</h3>
              <p className="text-gray-600">Comfortable learning environment with fully air-conditioned smart classrooms</p>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white shadow-xl hover:-translate-y-2 transition-all duration-500 group">
              <div className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                📷
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">CCTV Safety</h3>
              <p className="text-gray-600">24/7 security and monitoring to ensure a safe learning environment</p>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white shadow-xl hover:-translate-y-2 transition-all duration-500 group">
              <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                ☝️
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Bio-metric</h3>
              <p className="text-gray-600">Precise attendance tracking with instant notification to parents</p>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white shadow-xl hover:-translate-y-2 transition-all duration-500 group">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                📚
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Doubt Clearing</h3>
              <p className="text-gray-600">Dedicated sessions for one-on-one doubt resolution with faculty</p>
            </div>

            <div className="p-8 rounded-[2.5rem] bg-white shadow-xl hover:-translate-y-2 transition-all duration-500 group">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-3xl mb-4">
                📈
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Performance Tracking</h3>
              <p className="text-gray-600">Regular performance analysis and personalized feedback for improvement</p>
            </div>
          </div>
        </div>
      </section>

      {/* Smart ERP System Section - Premium Cream Theme */}
      <section id="erp-system" className="py-24 bg-[#fffaf5] w-full relative overflow-hidden reveal-on-scroll border-t border-orange-100">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-100 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight italic uppercase">Smart <span className="text-orange-600 ">ERP System</span></h2>
            <p className="text-gray-600 text-lg font-medium">Technology-driven coaching for modern learning</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Real-Time Attendance",
                desc: "Track student attendance instantly with automated SMS alerts to parents",
                icon: "📊",
                bg: "bg-blue-50"
              },
              {
                title: "Parent Dashboard",
                desc: "Complete visibility into performance, attendance, fees, and progress reports",
                icon: "👨‍👩-👦",
                bg: "bg-purple-50"
              },
              {
                title: "Live Notifications",
                desc: "Instant updates on exams, results, notices, and important announcements",
                icon: "🔔",
                bg: "bg-green-50"
              },
              {
                title: "Performance Analytics",
                desc: "Detailed insights and visualizations to track academic progress over time",
                icon: "📈",
                bg: "bg-orange-50"
              },
              {
                title: "Online Study Material",
                desc: "Access notes, practice papers, and resources anytime from student portal",
                icon: "📚",
                bg: "bg-indigo-50"
              },
              {
                title: "Fee Management",
                desc: "Transparent fee tracking with online payment options and instant receipts",
                icon: "💰",
                bg: "bg-pink-50"
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-[2rem] shadow-xl hover:-translate-y-2 transition-all duration-500 group">
                <div className={`w-16 h-16 ${feature.bg} rounded-3xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.title === "Real-Time Attendance" && <span className="text-orange-600">📊</span>}
                  {feature.title === "Parent Dashboard" && <span className="text-purple-600">👥</span>}
                  {feature.title === "Live Notifications" && <span className="text-green-600">🔔</span>}
                  {feature.title === "Performance Analytics" && <span className="text-orange-600">📉</span>}
                  {feature.title === "Online Study Material" && <span className="text-orange-600">📖</span>}
                  {feature.title === "Fee Management" && <span className="text-pink-600">💸</span>}
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed font-medium">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Faculty Showcase Section - Premium Cream Aesthetics */}
      {faculty.length > 0 && (
        <section className="py-24 bg-[#fffaf5] w-full relative overflow-hidden reveal-on-scroll border-t border-orange-100">
          {/* Decorative Background Element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-50/50 rounded-full blur-[120px] -z-10 animate-blob"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-600/30 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">Our Expert Faculty</h2>
              <p className="text-gray-600 text-lg">Learn from IIT alumni and experienced educators</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
              {[
                {
                  id: 'praveen',
                  name: 'Praveen Sir',
                  subjects: 'Maths, Physics, Chemistry',
                  classes: 'Founder & CEO',
                  icon: '🎓',
                  photo: praveenPhoto,
                  gradient: 'from-orange-600 to-orange-700'
                },
                {
                  id: 'kalpana',
                  name: 'Kalpana Rani',
                  subjects: 'English',
                  classes: 'Subject Expert',
                  icon: '👩‍🏫',
                  photo: kalpanaPhoto,
                  gradient: 'from-purple-500 to-pink-500'
                },
                {
                  id: 'ravi',
                  name: 'Ravi Shekhar',
                  subjects: 'Physics, Chemistry',
                  classes: 'Senior Mentor',
                  icon: '👨‍🔬',
                  photo: raviPhoto,
                  gradient: 'from-orange-500 to-orange-600'
                }
              ].map(member => (
                <div key={member.id} className="bg-white rounded-[2rem] shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden border border-gray-100 group flex flex-col items-center">
                  <div className="w-full h-64 relative overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${member.gradient} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-full h-full object-cover object-top transform group-hover:scale-105 transition-transform duration-700"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="hidden absolute inset-0 flex items-center justify-center text-5xl opacity-30">
                      {member.icon}
                    </div>
                  </div>

                  <div className="p-6 text-center w-full">
                    <h3 className="text-xl font-black text-gray-900 mb-1">{member.name}</h3>
                    <p className="text-orange-600 font-bold mb-3 uppercase tracking-wider text-[11px]">{member.subjects}</p>
                    <div className="inline-block px-4 py-1 rounded-xl bg-orange-50 text-orange-700 text-[10px] font-black uppercase tracking-widest border border-orange-100 shadow-sm">
                      {member.classes}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <Link to="/faculty" className="inline-block bg-orange-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors">
                View All Faculty →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section className="py-24 bg-slate-50 dark:bg-gray-950 w-full reveal-on-scroll">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">How It Works</h2>
            <p className="text-gray-600 text-lg">Simple steps to start your JEE journey</p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-6 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-3 md:gap-6 p-4 md:p-6 bg-gray-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-orange-100">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-base md:text-xl font-black shrink-0 shadow-lg">
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
        <section className="py-20 bg-gradient-to-br from-orange-50 to-purple-50 w-full reveal-on-scroll">
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
                  <div className="absolute top-6 right-8 text-4xl text-orange-100 opacity-50 group-hover:text-orange-200 transition-colors">
                    "
                  </div>
                  <div className="flex mb-6">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-lg">⭐</span>
                    ))}
                  </div>
                  <p className="text-gray-700 italic mb-8 leading-relaxed text-lg">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-4 border-t pt-6 border-gray-50">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md">
                      {testimonial.parentName[0]}
                    </div>
                    <div>
                      <p className="font-black text-gray-900 leading-none mb-1">{testimonial.parentName}</p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Parent of {testimonial.studentName}</p>
                      <p className="text-xs text-orange-600 font-bold mt-1 bg-orange-50 inline-block px-2 py-0.5 rounded-full">{testimonial.achievement}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Events Gallery Section */}
      <section className="py-24 w-full reveal-on-scroll">
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
            <Link to="/gallery" className="inline-block bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 transition-all shadow-lg hover:shadow-orange-500/30 transform hover:-translate-y-1">
              Explore Our Campus →
            </Link>
          </div>
        </div>
      </section>

      {/* Free Demo Enquiry Form Section - Premium Cream Theme */}
      <section id="demo-form" className="py-24 bg-[#fffaf5] text-gray-900 w-full reveal-on-scroll border-t border-orange-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-2xl p-8 md:p-12 text-white">
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
                    <option value="GROUND ZERO">GROUND ZERO (Class 7)</option>
                    <option value="NURTURE">NURTURE (Class 8)</option>
                    <option value="SHAKSHAM">SHAKSHAM (Class 9)</option>
                    <option value="DAKSH">DAKSH (Class 10)</option>
                    <option value="ABHYAAS">ABHYAAS (Class 11)</option>
                    <option value="TARGET">TARGET (Class 12)</option>
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
                disabled={isSubmitting}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all duration-300 shadow-lg flex items-center justify-center gap-3 ${isSubmitting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-white text-orange-600 hover:bg-orange-50 hover:scale-[1.02] active:scale-95'
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-orange-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>📞 Request Free Demo Class</>
                )}
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

      {/* Contact & Location Section - Premium Cream Theme */}
      <section className="py-24 bg-[#fffaf5] transition-colors duration-300 w-full reveal-on-scroll border-t border-orange-100">
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
                      Union Bank building near saguna more<br />
                      Danapur patna -801503
                    </p>
                  </div>
                </div>

                <div className="group flex items-center p-4 rounded-2xl bg-purple-50/30 hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-purple-100">
                  <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                    📞
                  </div>
                  <div className="ml-6">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-[0.2em] mb-1">Phone</p>
                    <p className="text-gray-800 font-bold text-lg">9905424369, 8825198919</p>
                  </div>
                </div>

                <div className="group flex items-center p-4 rounded-2xl bg-pink-50/30 hover:bg-white hover:shadow-lg transition-all duration-300 border border-transparent hover:border-pink-100">
                  <div className="w-14 h-14 bg-pink-600 rounded-2xl flex items-center justify-center text-2xl shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                    ✉️
                  </div>
                  <div className="ml-6">
                    <p className="text-xs font-bold text-pink-600 uppercase tracking-[0.2em] mb-1">Website</p>
                    <p className="text-gray-800 font-bold text-lg">www.oasisjeeclasses.com</p>
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

