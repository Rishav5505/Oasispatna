import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import { FaVideo, FaCalendarAlt, FaChalkboardTeacher, FaClock } from 'react-icons/fa';

const StudentLiveClass = ({ studentId }) => {
    const [liveClasses, setLiveClasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (studentId) fetchLiveClasses();
    }, [studentId]);

    const fetchLiveClasses = async () => {
        const token = sessionStorage.getItem('token');
        try {
            const res = await axios.get(`${config.API_URL}/live-classes/student/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLiveClasses(res.data);
        } catch (err) {
            console.error('Error fetching live classes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (liveClass) => {
        const token = sessionStorage.getItem('token');
        try {
            // Auto attendance on join
            await axios.post(`${config.API_URL}/live-classes/join`, {
                studentId,
                liveClassId: liveClass._id,
                subjectId: liveClass.subjectId._id
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Open meeting link in new tab
            window.open(liveClass.meetingLink, '_blank');
        } catch (err) {
            console.error('Error marking attendance:', err);
            // Still open the link even if attendance fails
            window.open(liveClass.meetingLink, '_blank');
        }
    };

    if (loading) return <div className="text-center py-10">Loading classes...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <FaVideo className="text-red-500 animate-pulse" /> Today's Live Sessions
                </h2>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-4 py-2 rounded-full">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveClasses.length > 0 ? liveClasses.map(lc => (
                    <div key={lc._id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:bg-indigo-100 transition-colors"></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <span className="bg-red-50 text-red-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-red-100">
                                {lc.status === 'live' ? '● Live Now' : 'Scheduled'}
                            </span>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                                {lc.subjectId?.name}
                            </span>
                        </div>

                        <h3 className="text-xl font-black text-gray-800 mb-2 truncate relative z-10">{lc.title}</h3>

                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 relative z-10">
                            <FaChalkboardTeacher className="text-indigo-400" />
                            <span className="font-medium">Prof. {lc.teacherId?.name}</span>
                        </div>

                        <div className="space-y-3 mb-8 relative z-10">
                            <div className="flex items-center gap-3 text-xs text-gray-600 font-bold bg-gray-50 p-3 rounded-2xl">
                                <FaClock className="text-indigo-500" />
                                <span>{new Date(lc.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({lc.duration} mins)</span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleJoin(lc)}
                            className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200"
                        >
                            JOIN SESSION NOW
                        </button>
                    </div>
                )) : (
                    <div className="col-span-full py-24 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <FaVideo className="text-3xl text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">No Sessions Today</h3>
                        <p className="text-gray-400 font-medium max-w-xs mx-auto">You're all caught up! There are no live sessions scheduled for today.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentLiveClass;
