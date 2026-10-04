import React, { useState, useEffect } from 'react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import best1 from '../../assets/best.jpg';
import best2 from '../../assets/best 2.jpg';
import best3 from '../../assets/best 3.jpg';
import heroUp1 from '../../assets/hero-up-1.jpg';
import heroUp2 from '../../assets/hero-up-2.jpg';
import config from '../../config';

// Home page sections
import '../../components/home/home.css';
import HeroSection from '../../components/home/HeroSection';
import StatsStrip from '../../components/home/StatsStrip';
import UspTicker from '../../components/home/UspTicker';
import CoursesSection from '../../components/home/CoursesSection';
import BatchQuiz from '../../components/home/BatchQuiz';
import WhyOasisBento from '../../components/home/WhyOasisBento';
import FacultySection from '../../components/home/FacultySection';
import VideoHighlights from '../../components/home/VideoHighlights';
import ErpShowcase from '../../components/home/ErpShowcase';
import WallOfFame from '../../components/home/WallOfFame';
import EventsGallery from '../../components/home/EventsGallery';
import DemoForm from '../../components/home/DemoForm';
import FaqAccordion from '../../components/home/FaqAccordion';
import ContactSection, { FinalCta } from '../../components/home/ContactSection';
import FloatingActions from '../../components/home/FloatingActions';
import { ScrollProgress } from '../../components/home/fx';
import { scrollToDemo } from '../../components/home/programs';

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
import raviPhoto from '../../assets/Ravi SIR.jpeg';

// Promotion Videos
import promoVideo from '../../assets/Physics Faculties in oasis jee classes.mp4';
import rishavVideo from '../../assets/Rishav.mp4';
import whatsappVideo from '../../assets/WhatsApp Video 2026-02-23 at 11.45.40 AM.mp4';

const HERO_IMAGES = [heroUp1, heroUp2, best1, best2, best3];

const FACULTY_MEMBERS = [
  { id: 'praveen', name: 'Praveen Sir', subjects: 'Maths, Physics, Chemistry', classes: 'Founder & CEO', icon: '🎓', photo: praveenPhoto },
  { id: 'kalpana', name: 'Kalpana Rani', subjects: 'English', classes: 'Subject Expert', icon: '👩‍🏫', photo: kalpanaPhoto },
  { id: 'ravi', name: 'Ravi Shekhar', subjects: 'Physics', classes: 'Senior Mentor', icon: '👨‍🔬', photo: raviPhoto },
];

const SIDE_VIDEOS = [
  { title: 'Student Success Story', src: rishavVideo, fit: 'object-cover' },
  { title: 'Oasis Highlights 2025', src: whatsappVideo, fit: 'object-contain' },
];

const GALLERY_ITEMS = [
  { img: coaching1, title: 'Scholarship Distribution', size: 'col-span-1 row-span-1' },
  { img: coaching2, title: 'Classroom Interaction', size: 'md:col-span-2 md:row-span-2 col-span-2 row-span-2' },
  { img: coaching3, title: 'Student Guidance', size: 'col-span-1 row-span-1' },
  { img: coaching4, title: 'Achievement Celebration', size: 'col-span-1 row-span-1' },
  { img: coaching5, title: 'Doubt Clearing Session', size: 'col-span-1 row-span-1' },
  { img: coaching6, title: 'Success Stories', size: 'md:col-span-2 md:row-span-1 col-span-2' },
  { img: coaching7, title: 'Exam Preparation', size: 'col-span-1 row-span-1' },
  { img: coaching8, title: 'Expert Mentorship', size: 'col-span-1 row-span-1' },
  { img: coaching9, title: 'Campus Life', size: 'col-span-1 row-span-1' },
  { img: coaching10, title: 'Annual Day', size: 'md:col-span-2 md:row-span-1 col-span-2' },
  { img: coaching11, title: 'Award Ceremony', size: 'col-span-1 row-span-1' },
  { img: coaching12, title: 'Classroom Learning', size: 'col-span-1 row-span-1' },
];

const ANNOUNCEMENTS = [
  'Admissions Open for Batch 2026-27',
  'New JEE Main Crash Course starting from next Monday',
  'Congratulating our JEE Toppers of 2025 session',
];

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
  const [selectedClass, setSelectedClass] = useState(null);
  const [courseFlash, setCourseFlash] = useState(0);

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
    } catch {
      setFormStatus({ message: '❌ Connection error. Please try again later.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-select a program in the demo form (UI only — submission logic untouched) and glide to it.
  const pickCourse = (courseName, cls) => {
    if (courseName) setFormData((prev) => ({ ...prev, course: courseName }));
    if (cls) setSelectedClass(cls);
    setCourseFlash((n) => n + 1);
    scrollToDemo();
  };

  const courseList = Array.isArray(courses) ? courses : [];
  const testimonialList = Array.isArray(testimonials) ? testimonials : [];
  const hasFaculty = faculty?.length > 0;

  return (
    <div className="min-h-screen bg-white dark:bg-ink-950 overflow-x-hidden relative">
      {/* Announcement Bar (scrolls away; Navbar sits below it until scrolled) */}
      <div className="relative w-full h-8 bg-ink-950 border-b border-white/10 overflow-hidden flex items-center">
        <div className="animate-marquee whitespace-nowrap text-white/85 text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] flex flex-nowrap">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex items-center gap-10 pr-10" aria-hidden={copy === 1}>
              {ANNOUNCEMENTS.map((text) => (
                <span key={text} className="inline-flex items-center gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  {text}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <ScrollProgress />
      <Navbar />

      <HeroSection images={HERO_IMAGES} />
      <StatsStrip />
      <UspTicker bottomClass="bg-white" />
      <CoursesSection
        courses={courseList}
        selectedClass={selectedClass}
        onSelectClass={setSelectedClass}
        onEnroll={(name) => pickCourse(name)}
      />
      <BatchQuiz onPick={pickCourse} topFill="#fffaf5" bottomFill="#ffffff" />
      <WhyOasisBento />
      <ErpShowcase />
      {testimonialList.length > 0 && <WallOfFame testimonials={testimonialList} />}
      {hasFaculty && <FacultySection members={FACULTY_MEMBERS} />}
      <VideoHighlights promoVideo={promoVideo} sideVideos={SIDE_VIDEOS} />
      <EventsGallery items={GALLERY_ITEMS} />
      <DemoForm
        formData={formData}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        formStatus={formStatus}
        flashKey={courseFlash}
      />
      <FaqAccordion />
      <ContactSection />
      <div id="final-cta"><FinalCta /></div>

      <FloatingActions avoidIds={['courses', 'batch-quiz', 'demo-form', 'final-cta']} />

      <Footer showCta={false} />
    </div>
  );
};

export default Home;
