import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Results = () => {
  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-20">
        <h1 className="text-3xl font-bold mb-8">Our Results</h1>
        <div className="grid grid-cols-2 gap-8">
          <div className="border p-4">
            <h3 className="text-xl font-bold">Topper: Rahul Kumar</h3>
            <p>JEE Main Rank: 150</p>
          </div>
          <div className="border p-4">
            <h3 className="text-xl font-bold">Topper: Anjali Singh</h3>
            <p>JEE Advanced Rank: 500</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Results;
