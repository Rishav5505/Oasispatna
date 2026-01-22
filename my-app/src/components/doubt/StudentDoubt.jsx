import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../../config';
import { FaQuestionCircle, FaPlus, FaImage, FaTimes, FaReply, FaCheckCircle, FaHourglassHalf } from 'react-icons/fa';

const StudentDoubt = ({ studentId }) => {
    const [doubts, setDoubts] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [subjects, setSubjects] = useState([]);
    const [formData, setFormData] = useState({ title: '', description: '', subjectId: '', image: null });
    const [loading, setLoading] = useState(true);

    const fetchDoubts = useCallback(async () => {
        const token = sessionStorage.getItem('token');
        try {
            const res = await axios.get(`${config.API_URL}/doubts/student/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoubts(res.data);
        } catch (err) {
            console.error('Error fetching doubts:', err);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    const fetchSubjects = useCallback(async () => {
        const token = sessionStorage.getItem('token');
        try {
            const res = await axios.get(`${config.API_URL}/public/subjects`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSubjects(res.data);
        } catch (err) {
            console.error('Error fetching subjects:', err);
        }
    }, []);

    useEffect(() => {
        if (studentId) {
            fetchDoubts();
            fetchSubjects();
        }
    }, [studentId, fetchDoubts, fetchSubjects]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        const data = new FormData();
        data.append('title', formData.title);
        data.append('description', formData.description);
        data.append('subjectId', formData.subjectId);
        data.append('studentId', studentId);
        if (formData.image) data.append('image', formData.image);

        try {
            await axios.post(`${config.API_URL}/doubts`, data, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setIsModalOpen(false);
            setFormData({ title: '', description: '', subjectId: '', image: null });
            fetchDoubts();
        } catch (err) {
            console.error('Error posting doubt:', err);
        }
    };

    if (loading) return <div className="text-center py-10">Loading doubt board...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <FaQuestionCircle className="text-orange-500" /> Doubt Board
                    </h2>
                    <p className="text-gray-500 font-medium">Get your queries resolved by experts</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 shadow-xl shadow-gray-200 transition-all flex items-center gap-3"
                >
                    <FaPlus /> ASK NEW DOUBT
                </button>
            </div>

            <div className="space-y-6">
                {doubts.length > 0 ? doubts.map(doubt => (
                    <div key={doubt._id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-2 h-full ${doubt.status === 'open' ? 'bg-orange-400' : 'bg-green-400'}`}></div>

                        <div className="flex flex-col lg:flex-row gap-10">
                            <div className="flex-1">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-orange-50 text-orange-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-orange-100">
                                            {doubt.subjectId?.name}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {new Date(doubt.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${doubt.status === 'open' ? 'text-orange-500' : 'text-green-500'}`}>
                                        {doubt.status === 'open' ? <FaHourglassHalf /> : <FaCheckCircle />}
                                        {doubt.status}
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-gray-800 mb-4 tracking-tight uppercase">{doubt.title}</h3>
                                <p className="text-gray-500 font-medium leading-relaxed mb-8">{doubt.description}</p>

                                {doubt.replies.length > 0 && (
                                    <div className="mt-8 pt-8 border-t border-gray-50 space-y-6">
                                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                            <FaReply className="rotate-180" /> Instructor Replies ({doubt.replies.length})
                                        </h4>
                                        {doubt.replies.map((reply, idx) => (
                                            <div key={idx} className="bg-gray-50 p-6 rounded-2xl relative">
                                                <p className="text-sm font-medium text-gray-700">{reply.message}</p>
                                                <p className="text-[10px] font-bold text-gray-400 mt-3 text-right">
                                                    Replied on {new Date(reply.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {doubt.imageUrl && (
                                <div className="lg:w-64 w-full shrink-0">
                                    <img
                                        src={`${config.API_URL}${doubt.imageUrl}`}
                                        alt="Doubt reference"
                                        className="w-full h-48 object-cover rounded-[2rem] border-4 border-gray-50 shadow-inner"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )) : (
                    <div className="py-24 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <FaQuestionCircle className="text-4xl text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-800 mb-2">No Doubts Yet</h3>
                        <p className="text-gray-400 font-medium max-w-xs mx-auto">Got a question? Don't hesitate to ask our experts!</p>
                    </div>
                )}
            </div>

            {/* Ask Doubt Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Ask Your Doubt</h3>
                            <button onClick={() => setIsModalOpen(false)} className="bg-white p-3 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Subject</label>
                                    <select
                                        required
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all appearance-none"
                                        value={formData.subjectId}
                                        onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(sub => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Title</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                                        placeholder="Brief summary..."
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Detailed Description</label>
                                <textarea
                                    required
                                    rows="4"
                                    className="w-full bg-gray-50 border-none rounded-[2rem] p-6 text-sm font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                                    placeholder="Explain your doubt in detail..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Reference Image (Optional)</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                        onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                                    />
                                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-[2rem] p-8 text-center group-hover:bg-orange-50 group-hover:border-orange-200 transition-all">
                                        <FaImage className="text-3xl text-gray-300 mx-auto mb-3 group-hover:text-orange-400" />
                                        <p className="text-xs font-bold text-gray-400 group-hover:text-orange-600">
                                            {formData.image ? formData.image.name : 'Click or Drag image here'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 shadow-xl shadow-gray-200 transition-all mt-4"
                            >
                                SUBMIT DOUBT
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDoubt;
