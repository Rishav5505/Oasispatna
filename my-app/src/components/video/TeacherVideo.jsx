import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../../config';
import { FaPlayCircle, FaFileUpload, FaTimes, FaFilm, FaBook, FaLaptop } from 'react-icons/fa';

const TeacherVideo = ({ teacherData }) => {
    const [videos, setVideos] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const subjects = teacherData?.subjects || [];
    const classes = teacherData?.classes || [];
    const [newVideo, setNewVideo] = useState({
        title: '',
        description: '',
        videoUrl: '',
        thumbnailUrl: '',
        subjectId: '',
        classId: '',
        duration: 0
    });

    const fetchVideos = useCallback(async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        try {
            // Decode token to get user ID
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            const teacherId = payload.user.id;

            const res = await axios.get(`${config.API_URL}/videos/teacher/${teacherId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVideos(res.data);
        } catch (err) {
            console.error('Error fetching videos:', err);
        }
    }, []);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        try {
            await axios.post(`${config.API_URL}/videos`, newVideo, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setNewVideo({ title: '', description: '', videoUrl: '', thumbnailUrl: '', subjectId: '', classId: '', duration: 0 });
            fetchVideos();
            alert('Video added to library successfully!');
        } catch (err) {
            alert('Error adding video');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <FaPlayCircle className="text-indigo-600" /> Digital Video Vault
                    </h2>
                    <p className="text-gray-500 font-medium">Manage and organize recorded educational content</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center gap-3"
                >
                    <FaFileUpload /> ADD NEW VIDEO
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {videos.map(video => (
                    <div key={video._id} className="bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100 group hover:shadow-2xl transition-all">
                        <div className="aspect-video bg-gray-900 relative flex items-center justify-center overflow-hidden">
                            {video.thumbnailUrl ? (
                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <FaFilm className="text-4xl text-white/20" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/60 transition-all flex items-center justify-center">
                                <FaPlayCircle className="text-5xl text-white opacity-0 group-hover:opacity-100 transition-all scale-50 group-hover:scale-100" />
                            </div>
                        </div>
                        <div className="p-6 space-y-3">
                            <h3 className="text-lg font-black text-gray-800 leading-tight uppercase tracking-tight">{video.title}</h3>
                            <div className="flex items-center gap-3">
                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {video.subjectId?.name || 'Academic'}
                                </span>
                                <span className="text-gray-400 text-[10px] font-bold uppercase">
                                    {video.duration} MINS
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Content Distributor</h3>
                            <button onClick={() => setShowModal(false)} className="bg-white p-3 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Video Title</label>
                                <input
                                    required
                                    placeholder="e.g. Introduction to Quantum Physics"
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                                    value={newVideo.title}
                                    onChange={e => setNewVideo({ ...newVideo, title: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Subject</label>
                                    <select
                                        required
                                        className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                                        value={newVideo.subjectId}
                                        onChange={e => setNewVideo({ ...newVideo, subjectId: e.target.value })}
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
                                        value={newVideo.classId}
                                        onChange={e => setNewVideo({ ...newVideo, classId: e.target.value })}
                                    >
                                        <option value="">Select</option>
                                        {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Video Resource URL</label>
                                <input
                                    required
                                    placeholder="YouTube, Vimeo, or S3 link..."
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                                    value={newVideo.videoUrl}
                                    onChange={e => setNewVideo({ ...newVideo, videoUrl: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Thumbnail URL (Optional)</label>
                                <input
                                    placeholder="Image URL..."
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                                    value={newVideo.thumbnailUrl}
                                    onChange={e => setNewVideo({ ...newVideo, thumbnailUrl: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Runtime (Minutes)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 45"
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl font-bold text-sm"
                                    value={newVideo.duration}
                                    onChange={e => setNewVideo({ ...newVideo, duration: e.target.value })}
                                />
                            </div>

                            <button type="submit" className="w-full py-5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all hover:bg-indigo-600">
                                ARCHIVE CONTENT
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherVideo;
