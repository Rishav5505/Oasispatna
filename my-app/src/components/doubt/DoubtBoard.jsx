import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../../config';
import { FaQuestionCircle, FaReply, FaTimes, FaCheckCircle, FaImage, FaUser } from 'react-icons/fa';

const DoubtBoard = () => {
    const [doubts, setDoubts] = useState([]);
    const [selectedDoubt, setSelectedDoubt] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchDoubts = useCallback(async () => {
        const token = sessionStorage.getItem('token');
        try {
            const res = await axios.get(`${config.API_URL}/doubts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoubts(res.data);
        } catch (err) {
            console.error('Error fetching doubts:', err);
        }
    }, []);

    useEffect(() => {
        fetchDoubts();
    }, [fetchDoubts]);

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyMessage.trim()) return;
        setLoading(true);
        const token = sessionStorage.getItem('token');
        try {
            await axios.post(`${config.API_URL}/doubts/${selectedDoubt._id}/reply`, {
                message: replyMessage
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReplyMessage('');
            setSelectedDoubt(null);
            fetchDoubts();
            alert('Reply sent and doubt marked as resolved!');
        } catch (err) {
            console.error('Error replying to doubt:', err);
            alert('Failed to send reply');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                    <FaQuestionCircle className="text-orange-500" /> Doubt Resolution Forum
                </h2>
                <p className="text-gray-500 font-medium">Clear student queries and provide academic guidance</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {doubts.map(doubt => (
                    <div key={doubt._id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 hover:shadow-xl transition-all group">
                        <div className="w-16 h-16 bg-orange-50 rounded-[2rem] flex items-center justify-center text-orange-600 font-black text-xl shrink-0 group-hover:scale-110 transition-transform">
                            {doubt.studentId?.name?.charAt(0) || <FaUser className="text-sm" />}
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">{doubt.title}</h3>
                                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">
                                        STUDENT: {doubt.studentId?.name || 'Unknown'} • SUBJECT: {doubt.subjectId?.name}
                                    </p>
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${doubt.status === 'open' ? 'bg-orange-100 text-orange-600 animate-pulse' : 'bg-emerald-100 text-emerald-600'}`}>
                                    {doubt.status}
                                </span>
                            </div>

                            <p className="text-gray-600 text-sm leading-relaxed">{doubt.description}</p>

                            {doubt.imageUrl && (
                                <div className="mt-4">
                                    <a href={`${config.API_URL.replace('/api', '')}${doubt.imageUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-indigo-600 font-bold text-xs hover:underline bg-indigo-50 px-4 py-2 rounded-xl">
                                        <FaImage /> VIEW ATTACHED IMAGE
                                    </a>
                                </div>
                            )}

                            {doubt.replies && doubt.replies.length > 0 && (
                                <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-3">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                        <FaCheckCircle /> Official Resolution
                                    </p>
                                    <p className="text-sm font-bold text-gray-700">{doubt.replies[0].message}</p>
                                </div>
                            )}
                        </div>

                        {doubt.status === 'open' && (
                            <button
                                onClick={() => setSelectedDoubt(doubt)}
                                className="self-center bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500 shadow-xl transition-all flex items-center gap-2"
                            >
                                <FaReply /> RESOLVE NOW
                            </button>
                        )}
                    </div>
                ))}

                {doubts.length === 0 && (
                    <div className="py-20 text-center grayscale opacity-30">
                        <FaQuestionCircle className="text-6xl mx-auto mb-4" />
                        <p className="font-bold text-gray-400">No active doubts found</p>
                    </div>
                )}
            </div>

            {/* Reply Modal */}
            {selectedDoubt && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Post Academic Reply</h3>
                            <button onClick={() => setSelectedDoubt(null)} className="bg-white p-3 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleReply} className="p-10 space-y-6">
                            <div className="bg-gray-50 p-6 rounded-2xl space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Student Query</p>
                                <p className="font-bold text-gray-800 italic">"{selectedDoubt.description}"</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Your Guidance</label>
                                <textarea
                                    required
                                    rows="6"
                                    placeholder="Explain the solution clearly..."
                                    className="w-full bg-gray-50 border-none rounded-[2rem] p-6 text-sm font-bold"
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all"
                            >
                                {loading ? 'SENDING...' : 'FINALIZE AND RESOLVE'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DoubtBoard;
