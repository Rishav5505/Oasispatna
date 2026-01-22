import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../../config';
import { FaVideo, FaPlus, FaCalendarAlt, FaTimes, FaGlobe, FaBook } from 'react-icons/fa';

const TeacherLiveClass = ({ teacherData }) => {
    const [liveClasses, setLiveClasses] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const subjects = teacherData?.subjects || [];
    const classes = teacherData?.classes || [];
    const [newClass, setNewClass] = useState({
        title: '',
        description: '',
        meetingLink: '',
        dateTime: '',
        subjectId: '',
        classId: ''
    });

    const fetchLiveClasses = useCallback(async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        try {
            // Decode token to get user ID
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            const teacherId = payload.user.id;

            const res = await axios.get(`${config.API_URL}/live-classes/teacher/${teacherId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLiveClasses(res.data);
        } catch (err) {
            console.error('Error fetching live classes:', err);
        }
    }, []);

    useEffect(() => {
        fetchLiveClasses();
    }, [fetchLiveClasses]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        try {
            await axios.post(`${config.API_URL}/live-classes`, newClass, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setNewClass({ title: '', description: '', meetingLink: '', dateTime: '', subjectId: '', classId: '' });
            fetchLiveClasses();
            alert('Live class scheduled and students notified!');
        } catch (err) {
            alert('Error scheduling class');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <FaVideo className="text-red-500" /> Virtual Classroom
                    </h2>
                    <p className="text-gray-500 font-medium">Schedule and manage real-time interactive sessions</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-red-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-100 transition-all flex items-center gap-3"
                >
                    <FaPlus /> SCHEDULE NEW SESSION
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {liveClasses.map(lc => (
                    <div key={lc._id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-2 h-full bg-red-400"></div>
                        <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">{lc.title}</h3>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">
                            {lc.subjectId?.name || 'Academic'} • {lc.classId?.name || 'General'}
                        </p>
                        <div className="bg-gray-50 p-4 rounded-2xl mb-6">
                            <div className="flex items-center gap-2 text-xs text-gray-500 font-bold">
                                <FaCalendarAlt className="text-red-400" /> {new Date(lc.dateTime).toLocaleString()}
                            </div>
                        </div>
                        <a
                            href={lc.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-center bg-red-50 text-red-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                        >
                            START BROADCAST
                        </a>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Session Planner</h3>
                            <button onClick={() => setShowModal(false)} className="bg-white p-3 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Session Title</label>
                                <input
                                    required
                                    placeholder="e.g. Advanced Thermodynamics"
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                                    value={newClass.title}
                                    onChange={e => setNewClass({ ...newClass, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Subject</label>
                                    <select
                                        required
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                                        value={newClass.subjectId}
                                        onChange={e => setNewClass({ ...newClass, subjectId: e.target.value })}
                                    >
                                        <option value="">Select</option>
                                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Class</label>
                                    <select
                                        required
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                                        value={newClass.classId}
                                        onChange={e => setNewClass({ ...newClass, classId: e.target.value })}
                                    >
                                        <option value="">Select</option>
                                        {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Meeting Destination (URL)</label>
                                <div className="relative">
                                    <FaGlobe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                    <input
                                        required
                                        placeholder="Zoom, Google Meet, or Webex link..."
                                        className="w-full p-4 pl-12 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                                        value={newClass.meetingLink}
                                        onChange={e => setNewClass({ ...newClass, meetingLink: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Schedule Timestamp</label>
                                <input
                                    type="datetime-local"
                                    required
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                                    value={newClass.dateTime}
                                    onChange={e => setNewClass({ ...newClass, dateTime: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:bg-red-600">
                                INITIALIZE BROADCAST
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherLiveClass;
