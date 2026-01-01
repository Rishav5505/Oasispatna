import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Faculty = () => {
  const faculty = [
    {
      name: "Dr. Rajesh Kumar",
      subject: "Physics",
      experience: "15+ years",
      qualification: "PhD Physics, IIT Delhi",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      achievements: ["IIT Delhi Alumni", "Published 20+ research papers", "JEE Physics Topper 2005"]
    },
    {
      name: "Ms. Priya Singh",
      subject: "Chemistry",
      experience: "12+ years",
      qualification: "MSc Chemistry, IIT Bombay",
      image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      achievements: ["IIT Bombay Alumni", "Organic Chemistry Specialist", "Mentored 500+ students"]
    },
    {
      name: "Mr. Amit Sharma",
      subject: "Mathematics",
      experience: "10+ years",
      qualification: "MSc Maths, IIT Kanpur",
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      achievements: ["IIT Kanpur Alumni", "Mathematics Olympiad Winner", "Author of JEE Maths Guide"]
    },
    {
      name: "Dr. Sunita Verma",
      subject: "Biology",
      experience: "8+ years",
      qualification: "PhD Biology, AIIMS",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80",
      achievements: ["AIIMS Graduate", "Medical Research Experience", "NEET Biology Expert"]
    }
  ];

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto py-20 px-4">
          <div className="text-center mb-16 animate-fade-in-up">
            <h1 className="text-5xl font-bold text-gray-800 mb-6">Our Expert Faculty</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">Learn from the best minds in JEE coaching. Our faculty comprises IIT alumni and experienced educators dedicated to your success.</p>
            <div className="w-24 h-1 bg-blue-500 mx-auto mt-8"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-fade-in-up" style={{animationDelay: '0.2s'}}>
            {faculty.map((member, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden transform hover:scale-105 transition-all duration-300 animate-fade-in-up group" style={{animationDelay: `${0.4 + index * 0.2}s`}}>
                <div className="relative">
                  <img 
                    src={member.image} 
                    alt={member.name} 
                    className="w-full h-48 object-cover group-hover:scale-110 transition duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {member.subject}
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition duration-300"></div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{member.name}</h3>
                  <p className="text-blue-600 font-semibold mb-2">{member.subject} Expert</p>
                  <p className="text-sm text-gray-600 mb-2">{member.qualification}</p>
                  <p className="text-sm text-gray-500 mb-4">{member.experience} Experience</p>
                  <div className="space-y-1">
                    {member.achievements.slice(0, 2).map((achievement, idx) => (
                      <p key={idx} className="text-xs text-gray-600">• {achievement}</p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Faculty Stats */}
          <div className="mt-20 bg-white rounded-xl shadow-lg p-8 animate-fade-in-up" style={{animationDelay: '1.2s'}}>
            <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">Faculty Excellence</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
              <div className="transform hover:scale-105 transition duration-300">
                <div className="text-4xl font-bold text-blue-600 mb-2">100%</div>
                <div className="text-gray-600">IIT Alumni</div>
              </div>
              <div className="transform hover:scale-105 transition duration-300">
                <div className="text-4xl font-bold text-green-600 mb-2">50+</div>
                <div className="text-gray-600">Years Combined Experience</div>
              </div>
              <div className="transform hover:scale-105 transition duration-300">
                <div className="text-4xl font-bold text-purple-600 mb-2">5000+</div>
                <div className="text-gray-600">Students Taught</div>
              </div>
              <div className="transform hover:scale-105 transition duration-300">
                <div className="text-4xl font-bold text-indigo-600 mb-2">95%</div>
                <div className="text-gray-600">Success Rate</div>
              </div>
            </div>
          </div>

          <div className="mt-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl p-8 text-center animate-fade-in-up" style={{animationDelay: '1.4s'}}>
            <h2 className="text-3xl font-bold mb-4">Want to Join Our Faculty?</h2>
            <p className="text-xl mb-6 opacity-90">We're always looking for talented educators to join our team</p>
            <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition transform hover:scale-105">
              Apply Now
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Faculty;
