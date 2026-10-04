import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../../config';
import { FiPlayCircle, FiPlay, FiPlus, FiFilm, FiEdit2, FiTrash2, FiClock, FiSearch, FiEye } from 'react-icons/fi';
import { notify } from '../../utils/notify';
import { authHeaders, errMsg, getTeacherId, idOf } from '../teacher/teacherApi';
import { Badge, ConfirmButton, EmptyState, Field, Modal, PageHeader, Spinner } from '../teacher/TeacherUI';

const emptyVideo = { title: '', description: '', videoUrl: '', thumbnailUrl: '', subjectId: '', classId: '', duration: '' };

const youtubeId = (url = '') => {
    const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
    return m ? m[1] : null;
};

const thumbOf = (v) => {
    if (v.thumbnailUrl) return v.thumbnailUrl;
    const id = v.youtubeId || youtubeId(v.videoUrl);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
};

// Legacy rows stored minutes as a number; new rows store 'mm:ss'
const durationLabel = (d) => {
    if (d === undefined || d === null || d === '' || d === '0' || d === 0) return '';
    return String(d).includes(':') ? String(d) : `${d} min`;
};

const DURATION_RE = /^\d{1,3}:[0-5]\d$/;

const TeacherVideo = ({ teacherData }) => {
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const subjects = teacherData?.subjects || [];
    const classes = teacherData?.classes || [];
    const [newVideo, setNewVideo] = useState(emptyVideo);

    const fetchVideos = useCallback(async () => {
        const teacherId = getTeacherId();
        if (!teacherId) { setLoading(false); return; }
        try {
            const res = await axios.get(`${config.API_URL}/videos/teacher/${teacherId}`, { headers: authHeaders() });
            setVideos(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching videos:', err);
            notify(errMsg(err, 'Failed to load videos'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVideos();
    }, [fetchVideos]);

    const openCreate = () => {
        setEditingId(null);
        setNewVideo(emptyVideo);
        setShowModal(true);
    };

    const openEdit = (v) => {
        setEditingId(v._id);
        setNewVideo({
            title: v.title || '',
            description: v.description || '',
            videoUrl: v.videoUrl || '',
            thumbnailUrl: v.thumbnailUrl || '',
            subjectId: idOf(v.subjectId),
            classId: idOf(v.classId),
            duration: v.duration && String(v.duration).includes(':') ? v.duration : (Number(v.duration) ? `${v.duration}:00` : ''),
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const duration = newVideo.duration.trim();
        if (duration && !DURATION_RE.test(duration)) {
            notify('Please enter duration as mm:ss (e.g. 45:30)');
            return;
        }
        const payload = { ...newVideo, duration };
        setSaving(true);
        try {
            if (editingId) {
                await axios.put(`${config.API_URL}/videos/${editingId}`, payload, { headers: authHeaders() });
                notify('Video updated successfully!');
            } else {
                await axios.post(`${config.API_URL}/videos`, payload, { headers: authHeaders() });
                notify('Video added to library successfully!');
            }
            setShowModal(false);
            setEditingId(null);
            setNewVideo(emptyVideo);
            fetchVideos();
        } catch (err) {
            notify(`Error: ${errMsg(err, 'Failed to save video')}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${config.API_URL}/videos/${id}`, { headers: authHeaders() });
            setVideos(vs => vs.filter(v => v._id !== id));
            notify('Video deleted');
        } catch (err) {
            notify(errMsg(err, 'Failed to delete video'));
        }
    };

    const q = search.trim().toLowerCase();
    const visible = q
        ? videos.filter(v => [v.title, v.subjectId?.name, v.classId?.name].some(x => String(x || '').toLowerCase().includes(q)))
        : videos;

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiPlayCircle}
                eyebrow="Teaching"
                title="Video library"
                subtitle="Recorded lectures your students can revise anytime."
                actions={
                    <>
                        <div className="relative sm:w-60">
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search videos…" aria-label="Search videos" className="ui-input pl-10 !py-2.5" />
                        </div>
                        <button type="button" onClick={openCreate} className="ui-btn-primary"><FiPlus /> Add video</button>
                    </>
                }
            />

            {loading ? (
                <Spinner label="Loading video library..." variant="grid" />
            ) : visible.length === 0 ? (
                <EmptyState
                    icon={FiFilm}
                    title={videos.length ? 'No videos match your search' : 'Your video library is empty'}
                    hint={videos.length ? '' : 'Add YouTube or cloud links to recorded lectures so students can revise anytime.'}
                    action={!videos.length && <button type="button" onClick={openCreate} className="ui-btn-primary"><FiPlus /> Add first video</button>}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 ui-stagger">
                    {visible.map(video => {
                        const thumb = thumbOf(video);
                        const dur = durationLabel(video.duration);
                        return (
                            <div key={video._id} className="group ui-card ui-card-hover overflow-hidden flex flex-col">
                                <a href={video.videoUrl} target="_blank" rel="noopener noreferrer" className="aspect-video bg-ink-900 relative flex items-center justify-center overflow-hidden" aria-label={`Play ${video.title}`}>
                                    {thumb ? (
                                        <img src={thumb} alt={video.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <div className="w-full h-full bg-brand-sunset flex items-center justify-center">
                                            <FiFilm className="text-4xl text-white/30" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 group-hover:via-black/20 transition-all" />
                                    <span className="absolute w-14 h-14 rounded-full bg-white/90 text-brand-600 flex items-center justify-center text-2xl shadow-xl scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                                        <FiPlay className="ml-1" />
                                    </span>
                                    {dur && (
                                        <span className="absolute bottom-2.5 right-2.5 bg-black/75 backdrop-blur text-white text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 tabular-nums"><FiClock /> {dur}</span>
                                    )}
                                </a>
                                <div className="p-4 flex-1 flex flex-col gap-3">
                                    <h3 className="font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">{video.title}</h3>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <Badge tone="brand">{video.subjectId?.name || 'Academic'}</Badge>
                                        {video.classId?.name && <Badge tone="grey">{video.classId.name}</Badge>}
                                        {Number(video.views) > 0 && <span className="text-[11px] text-gray-400 flex items-center gap-1 ml-auto"><FiEye /> {video.views}</span>}
                                    </div>
                                    <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-white/5">
                                        <button type="button" onClick={() => openEdit(video)} className="ui-btn-secondary flex-1 !py-2 text-xs">
                                            <FiEdit2 /> Edit
                                        </button>
                                        <ConfirmButton
                                            onConfirm={() => handleDelete(video._id)}
                                            title="Delete video"
                                            className="ui-btn-secondary !px-3 !py-2 hover:!text-red-500 hover:!border-red-200"
                                        >
                                            <FiTrash2 />
                                        </ConfirmButton>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => !saving && setShowModal(false)}
                icon={FiFilm}
                title={editingId ? 'Edit video' : 'Add a video'}
                subtitle="YouTube links get a thumbnail automatically."
                size="md"
                dismissible={false}
                bodyClassName="p-5 md:p-7"
                footer={
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => !saving && setShowModal(false)} className="ui-btn-secondary">Cancel</button>
                        <button type="submit" form="video-form" disabled={saving} className="ui-btn-primary">
                            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add to library'}
                        </button>
                    </div>
                }
            >
                <form id="video-form" onSubmit={handleSubmit} className="space-y-4">
                    <Field label="Video title">
                        <input required placeholder="e.g. Introduction to Quantum Physics" className="ui-input" value={newVideo.title} onChange={e => setNewVideo({ ...newVideo, title: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Subject">
                            <select required className="ui-input" value={newVideo.subjectId} onChange={e => setNewVideo({ ...newVideo, subjectId: e.target.value })}>
                                <option value="">Select</option>
                                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Class">
                            <select required className="ui-input" value={newVideo.classId} onChange={e => setNewVideo({ ...newVideo, classId: e.target.value })}>
                                <option value="">Select</option>
                                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Video URL" hint={youtubeId(newVideo.videoUrl) ? undefined : 'YouTube, Vimeo, or cloud link'}>
                        <input required type="url" placeholder="https://…" className="ui-input" value={newVideo.videoUrl} onChange={e => setNewVideo({ ...newVideo, videoUrl: e.target.value })} />
                    </Field>
                    {youtubeId(newVideo.videoUrl) && (
                        <div className="flex items-center gap-3 p-2 rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 animate-fade-up">
                            <img src={`https://img.youtube.com/vi/${youtubeId(newVideo.videoUrl)}/mqdefault.jpg`} alt="" className="w-24 aspect-video object-cover rounded-xl" />
                            <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">YouTube link detected — thumbnail will be added automatically.</p>
                        </div>
                    )}
                    <Field label="Description (optional)">
                        <textarea rows="2" placeholder="Chapter, key concepts covered…" className="ui-input resize-none" value={newVideo.description} onChange={e => setNewVideo({ ...newVideo, description: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Thumbnail URL">
                            <input placeholder="Optional" className="ui-input" value={newVideo.thumbnailUrl} onChange={e => setNewVideo({ ...newVideo, thumbnailUrl: e.target.value })} />
                        </Field>
                        <Field label="Duration (mm:ss)">
                            <input placeholder="e.g. 45:30" className="ui-input" value={newVideo.duration} onChange={e => setNewVideo({ ...newVideo, duration: e.target.value })} />
                        </Field>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default TeacherVideo;
