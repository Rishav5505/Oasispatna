import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import config from '../../config';
import { FiPlay, FiCheckCircle, FiClock, FiFilm, FiX, FiExternalLink } from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { authHeaders, errorMessage, resolveFileUrl } from '../student/helpers';
import { SkeletonCards, EmptyState, ErrorState, PageHeader } from '../student/StudentUI';
import { AnimatedBar } from '../student/Widgets';

// 'mm:ss' or 'hh:mm:ss' -> seconds (0 when unknown)
const durationToSeconds = (d) => {
    if (!d || typeof d !== 'string') return 0;
    const parts = d.split(':').map(Number);
    if (parts.some(n => !Number.isFinite(n))) return 0;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
};

// Fallback: pull the id out of a YouTube URL when the API didn't provide youtubeId
const extractYoutubeId = (url) => {
    if (!url) return null;
    const m = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
};

const progressPercent = (video) => {
    if (video.progress?.completed) return 100;
    const w = Number(video.progress?.watchedDuration) || 0;
    return Math.min(100, Math.max(0, Math.round(w)));
};

const StudentVideo = ({ studentId }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('All');
    const [playing, setPlaying] = useState(null);
    const openedAtRef = useRef(null);

    const fetchVideos = useCallback(async () => {
        setError('');
        try {
            const res = await axios.get(`${config.API_URL}/videos/student/${studentId}`, { headers: authHeaders() });
            setVideos(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching videos:', err);
            const msg = errorMessage(err, 'Failed to load video library');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        if (studentId) fetchVideos();
    }, [studentId, fetchVideos]);

    const postProgress = useCallback(async (videoId, watchedDuration, completed) => {
        try {
            await axios.post(`${config.API_URL}/videos/progress`, {
                studentId,
                videoId,
                watchedDuration,
                completed
            }, { headers: authHeaders() });
            // optimistic local update so the UI reflects progress immediately
            setVideos(prev => prev.map(v => (v._id === videoId
                ? { ...v, progress: { ...(v.progress || {}), watchedDuration, completed: completed || v.progress?.completed } }
                : v)));
        } catch (err) {
            console.error('Error updating progress:', err);
        }
    }, [studentId]);

    const handleMarkAsWatched = async (videoId) => {
        await postProgress(videoId, 100, true);
        toast.success('Marked as watched');
    };

    const openVideo = (video) => {
        const ytId = video.youtubeId || extractYoutubeId(video.videoUrl);
        const current = progressPercent(video);
        if (ytId) {
            openedAtRef.current = Date.now();
            setPlaying({ ...video, ytId });
            // record that the student started watching
            if (!video.progress?.completed) postProgress(video._id, Math.max(current, 1), false);
        } else {
            window.open(resolveFileUrl(video.videoUrl), '_blank', 'noopener,noreferrer');
            if (!video.progress?.completed) postProgress(video._id, Math.max(current, 1), false);
        }
    };

    const closePlayer = useCallback(() => {
        if (!playing) return;
        const video = playing;
        setPlaying(null);
        if (video.progress?.completed) return;
        const elapsed = openedAtRef.current ? (Date.now() - openedAtRef.current) / 1000 : 0;
        const total = durationToSeconds(video.duration);
        // watchedDuration is stored as a percentage (0-100), matching the "mark as watched" = 100 convention
        let pct = total > 0 ? Math.round((elapsed / total) * 100) : (elapsed >= 120 ? 100 : Math.round((elapsed / 120) * 100));
        pct = Math.min(100, Math.max(progressPercent(video), pct, 1));
        const completed = pct >= 90;
        postProgress(video._id, completed ? 100 : pct, completed);
        if (completed) toast.success('Nice! Video marked as completed');
    }, [playing, postProgress]);

    useEffect(() => {
        if (!playing) return undefined;
        const onKey = (e) => { if (e.key === 'Escape') closePlayer(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [playing, closePlayer]);

    const subjects = ['All', ...new Set(videos.map(v => v.subjectId?.name).filter(Boolean))];
    const filteredVideos = selectedSubject === 'All'
        ? videos
        : videos.filter(v => v.subjectId?.name === selectedSubject);
    const completedCount = videos.filter(v => v.progress?.completed).length;
    const inProgressCount = videos.filter(v => !v.progress?.completed && progressPercent(v) > 0).length;

    if (loading) {
        return (
            <div className="space-y-8">
                <div className="ui-skeleton h-12 w-72"></div>
                <SkeletonCards count={6} height="h-80" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiFilm}
                title="Video Library"
                subtitle="Recorded classes grouped by subject"
                action={videos.length > 0 && (
                    <div className="flex gap-2">
                        <span className="ui-badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 !py-2 !px-3"><FiCheckCircle /> {completedCount}/{videos.length} done</span>
                        {inProgressCount > 0 && <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 !py-2 !px-3"><FiPlay /> {inProgressCount} in progress</span>}
                    </div>
                )}
            />

            {subjects.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1" role="tablist" aria-label="Filter by subject">
                    {subjects.map(sub => (
                        <button
                            key={sub}
                            role="tab"
                            aria-selected={selectedSubject === sub}
                            onClick={() => setSelectedSubject(sub)}
                            className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap active:scale-95 ${selectedSubject === sub
                                ? 'bg-brand-gradient text-white shadow-brand-soft'
                                : 'bg-white dark:bg-white/5 text-gray-500 dark:text-gray-300 hover:text-brand-600 border border-gray-200 dark:border-white/10'
                                }`}
                        >
                            {sub}
                        </button>
                    ))}
                </div>
            )}

            <div key={selectedSubject} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 ui-stagger">
                {error && videos.length === 0 ? (
                    <ErrorState message={error} onRetry={() => { setLoading(true); fetchVideos(); }} />
                ) : filteredVideos.length > 0 ? filteredVideos.map(video => {
                    const ytId = video.youtubeId || extractYoutubeId(video.videoUrl);
                    const thumb = video.thumbnailUrl ? resolveFileUrl(video.thumbnailUrl) : (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
                    const pct = progressPercent(video);
                    const done = !!video.progress?.completed;
                    return (
                        <div key={video._id} className="ui-card ui-card-hover group overflow-hidden flex flex-col">
                            <button type="button" onClick={() => openVideo(video)} className="relative aspect-video bg-ink-900 overflow-hidden block w-full focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/40" aria-label={`Play ${video.title}`}>
                                {thumb ? (
                                    <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full bg-brand-sunset flex items-center justify-center">
                                        <FiFilm className="text-white/30 text-5xl" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="w-14 h-14 rounded-full bg-white/90 text-brand-600 flex items-center justify-center text-xl shadow-2xl scale-90 opacity-90 group-hover:scale-110 group-hover:opacity-100 group-hover:bg-brand-500 group-hover:text-white transition-all duration-300">
                                        {ytId ? <FiPlay className="ml-1" /> : <FiExternalLink />}
                                    </span>
                                </div>
                                {video.subjectId?.name && (
                                    <span className="absolute top-3 left-3 ui-badge bg-black/50 backdrop-blur-md text-white">{video.subjectId.name}</span>
                                )}
                                {done && (
                                    <span className="absolute top-3 right-3 ui-badge bg-emerald-500 text-white shadow-lg"><FiCheckCircle /> Watched</span>
                                )}
                                {video.duration && (
                                    <span className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white text-[11px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                        <FiClock /> {video.duration}
                                    </span>
                                )}
                                {pct > 0 && (
                                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                                        <div className={`h-full ${done ? 'bg-emerald-500' : 'bg-brand-500'}`} style={{ width: `${pct}%` }} />
                                    </div>
                                )}
                            </button>

                            <div className="p-5 flex-grow flex flex-col">
                                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 group-hover:text-brand-600 transition-colors">
                                    {video.title}
                                </h3>
                                {video.teacherId?.name && <p className="text-xs font-semibold text-gray-400 mb-2">by {video.teacherId.name}</p>}
                                {video.description && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{video.description}</p>}

                                <div className="mt-auto space-y-4">
                                    <div>
                                        <div className="flex justify-between text-xs font-semibold text-gray-400 mb-1.5">
                                            <span>{done ? 'Completed' : pct > 0 ? 'In progress' : 'Not started'}</span>
                                            <span className="text-gray-700 dark:text-gray-200">{pct}%</span>
                                        </div>
                                        <AnimatedBar value={pct} className="h-1.5" barClass={pct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-brand-gradient'} />
                                    </div>

                                    <div className="flex gap-2">
                                        <button onClick={() => openVideo(video)} className={`flex-grow ${pct > 0 && pct < 100 ? 'ui-btn-primary' : 'ui-btn-dark'}`}>
                                            {ytId ? <FiPlay /> : <FiExternalLink />} {pct > 0 && pct < 100 ? 'Resume' : done ? 'Watch again' : 'Watch now'}
                                        </button>
                                        {!done && (
                                            <button
                                                onClick={() => handleMarkAsWatched(video._id)}
                                                className="w-11 shrink-0 rounded-xl border border-gray-200 dark:border-white/10 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 flex items-center justify-center transition-all"
                                                title="Mark as watched"
                                                aria-label="Mark as watched"
                                            >
                                                <FiCheckCircle className="text-lg" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <EmptyState
                        icon={<FiFilm />}
                        title="No videos found"
                        message={videos.length === 0 ? 'Recorded lectures for your class will appear here.' : 'Try selecting a different subject or check back later.'}
                    />
                )}
            </div>

            {/* YouTube player modal */}
            {playing && (
                <div
                    className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 md:p-10 animate-fade-in"
                    onClick={closePlayer}
                    role="dialog"
                    aria-modal="true"
                    aria-label={playing.title}
                >
                    <div className="w-full max-w-5xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4 mb-3 text-white">
                            <div className="min-w-0">
                                {playing.subjectId?.name && <span className="ui-badge bg-brand-500/20 text-brand-300 mb-1">{playing.subjectId.name}</span>}
                                <h3 className="text-lg md:text-xl font-extrabold truncate">{playing.title}</h3>
                            </div>
                            <button
                                onClick={closePlayer}
                                className="shrink-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 hover:rotate-90 flex items-center justify-center transition-all"
                                aria-label="Close player"
                            >
                                <FiX />
                            </button>
                        </div>
                        <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-brand-glow ring-1 ring-white/10">
                            <iframe
                                src={`https://www.youtube-nocookie.com/embed/${playing.ytId}?autoplay=1&rel=0&modestbranding=1`}
                                title={playing.title}
                                className="absolute inset-0 w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                        {playing.description && <p className="text-sm text-gray-300 mt-3 line-clamp-2">{playing.description}</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentVideo;
