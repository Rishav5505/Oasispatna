import React, { useState } from 'react';
import axios from 'axios';

const EnquiryForm = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '', course: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await axios.post('https://oasis-fdpj.onrender.com/api/leads', form);
    alert('Enquiry submitted');
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md max-w-md mx-auto">
      <h2 className="text-2xl mb-4">Admission Enquiry</h2>
      <input type="text" placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="w-full p-2 mb-4 border" required />
      <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full p-2 mb-4 border" required />
      <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full p-2 mb-4 border" required />
      <textarea placeholder="Message" value={form.message} onChange={(e) => setForm({...form, message: e.target.value})} className="w-full p-2 mb-4 border"></textarea>
      <select value={form.course} onChange={(e) => setForm({...form, course: e.target.value})} className="w-full p-2 mb-4 border">
        <option value="">Select Course</option>
        <option value="10th">10th</option>
        <option value="11th">11th</option>
        <option value="12th">12th</option>
      </select>
      <button type="submit" className="w-full bg-blue-500 text-white p-2">Submit</button>
    </form>
  );
};

export default EnquiryForm;
