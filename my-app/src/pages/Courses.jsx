import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Courses = () => {
  const courses = [
    {
      title: "JEE Main",
      duration: "2 Years",
      features: ["Comprehensive syllabus coverage", "Regular mock tests", "Doubt clearing sessions", "Study material included"],
      price: "₹50,000",
      popular: false,
      icon: "🎯"
    },
    {
      title: "JEE Advanced",
      duration: "1 Year",
      features: ["Advanced problem solving", "IIT level preparation", "One-on-one mentoring", "Previous year analysis"],
      price: "₹75,000",
      popular: true,
      icon: "🚀"
    },
    {
      title: "Crash Course",
      duration: "6 Months",
      features: ["Intensive preparation", "Daily practice sessions", "Revision classes", "Exam strategies"],
      price: "₹30,000",
      popular: false,
      icon: "⚡"
    }
  ];

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto py-20 px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h1 className="text-5xl font-bold text-gray-800 mb-6">Our Courses</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Choose the perfect course for your JEE preparation. All courses include expert faculty, study materials, and regular assessments.</p>
            <div className="w-24 h-1 bg-blue-500 mx-auto mt-8"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            {courses.map((course, index) => (
              <div key={index} className={`bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-300 ${course.popular ? 'ring-2 ring-blue-500' : ''} animate-fade-in-up`} style={{animationDelay: `${0.4 + index * 0.2}s`}}>
                {course.popular && (
                  <div className="bg-blue-500 text-white text-center py-2 font-semibold">
                    Most Popular
                  </div>
                )}
                <div className="p-8">
                  <div className="text-4xl mb-4">{course.icon}</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{course.title}</h3>
                  <div className="text-blue-600 font-semibold mb-4">{course.duration}</div>
                  <ul className="space-y-2 mb-6">
                    {course.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-gray-600">
                        <span className="text-green-500 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="text-3xl font-bold text-gray-800 mb-4">{course.price}</div>
                  <button className={`w-full py-3 rounded-lg font-semibold transition ${course.popular ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                    Enroll Now
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Course Comparison */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-20 animate-fade-in-up" style={{animationDelay: '1s'}}>
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">Course Comparison</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Features</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JEE Main</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">JEE Advanced</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Crash Course</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Duration</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">2 Years</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">1 Year</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">6 Months</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Mock Tests</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">✓</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">✓</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">✓</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Study Material</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">✓</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">✓</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">✓</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">One-on-One Mentoring</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">✗</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">✓</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">✗</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Batch Size</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">30</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">20</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">25</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 text-center animate-fade-in-up" style={{animationDelay: '1.2s'}}>
            <h2 className="text-3xl font-bold mb-4">Not Sure Which Course to Choose?</h2>
            <p className="text-xl mb-6 opacity-90">Book a free counseling session with our experts</p>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition transform hover:scale-105">
              Book Free Consultation
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Courses;
