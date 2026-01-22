import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import { FaPlayCircle, FaCheckCircle, FaClock, FaBookOpen } from 'react-icons/fa';

const StudentVideo = ({ studentId }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState('All');

    useEffect(() => {
        if (studentId) fetchVideos();
    }, [studentId]);

    const fetchVideos = async () => {
        const token = sessionStorage.getItem('token');
        try {
            const res = await axios.get(`${config.API_URL}/videos/student/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setVideos(res.data);
        } catch (err) {
            console.error('Error fetching videos:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsWatched = async (videoId) => {
        const token = sessionStorage.getItem('token');
        try {
            await axios.post(`${config.API_URL}/videos/progress`, {
                studentId,
                videoId,
                watchedDuration: 100, // For simple "watched" status
                completed: true
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchVideos(); // Refresh
        } catch (err) {
            console.error('Error updating progress:', err);
        }
    };

    const subjects = ['All', ...new Set(videos.map(v => v.subjectId?.name).filter(Boolean))];
    const filteredVideos = selectedSubject === 'All'
        ? videos
        : videos.filter(v => v.subjectId?.name === selectedSubject);

    if (loading) return <div className="text-center py-10">Loading video library...</div>;

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Video Library</h2>
                    <p className="text-gray-500 font-medium">Recorded classes grouped by subject</p>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 w-full md:w-auto">
                    {subjects.map(sub => (
                        <button
                            key={sub}
                            onClick={() => setSelectedSubject(sub)}
                            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedSubject === sub
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                                    : 'bg-white text-gray-400 hover:bg-gray-50 border border-gray-100'
                                }`}
                        >
                            {sub}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredVideos.length > 0 ? filteredVideos.map(video => (
                    <div key={video._id} className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-gray-100 hover:shadow-2xl transition-all group flex flex-col">
                        <div className="relative aspect-video bg-gray-900 overflow-hidden">
                            {video.thumbnailUrl ? (
                                <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 opacity-80" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
                                    <FaPlayCircle className="text-white text-5xl opacity-40 group-hover:scale-125 transition-transform" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
                            <span className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-lg flex items-center gap-2">
                                <FaClock className="text-indigo-400" /> {video.duration || '15:00'}
                            </span>
                            {video.progress?.completed && (
                                <div className="absolute top-4 right-4 bg-green-500 text-white p-2 rounded-full shadow-lg">
                                    <FaCheckCircle />
                                </div>
                            )}
                        </div>

                        <div className="p-8 flex-grow flex flex-col">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{video.subjectId?.name}</span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                                {video.title}
                            </h3>
                            <p className="text-sm text-gray-500 mb-6 line-clamp-2">{video.description}</p>

                            <div className="mt-auto space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <span>Progress</span>
                                        <span>{video.progress?.completed ? '100%' : '0%'}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${video.progress?.completed ? 'bg-green-500' : 'bg-indigo-600'}`}
                                            style={{ width: video.progress?.completed ? '100%' : '0%' }}
                                        ></div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <a
                                        href={video.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-grow flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200"
                                    >
                                        <FaPlayCircle /> WATCH NOW
                                    </a>
                                    {!video.progress?.completed && (
                                        <button
                                            onClick={() => handleMarkAsWatched(video._id)}
                                            className="p-4 rounded-2xl border-2 border-gray-100 text-gray-400 hover:text-green-500 hover:border-green-100 hover:bg-green-50 transition-all"
                                            title="Mark as watched"
                                        >
                                            <FaCheckCircle className="text-xl" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-24 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <FaBookOpen className="text-3xl text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">No Videos Found</h3>
                        <p className="text-gray-400 font-medium max-w-xs mx-auto">Try selecting a different subject or check back later.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentVideo;
