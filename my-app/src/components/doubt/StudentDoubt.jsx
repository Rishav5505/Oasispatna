import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../../config';
import { toast } from '../../utils/notify';
import { errorMessage, resolveFileUrl } from '../student/helpers';
import { SkeletonRows, EmptyState, PageHeader } from '../student/StudentUI';
import { FiHelpCircle, FiPlus, FiImage, FiX, FiMessageCircle, FiCheckCircle, FiClock, FiUser, FiSend, FiCpu } from 'react-icons/fi';
import AIDoubtSolver from '../student/AIDoubtSolver';
import { RichText } from '../student/PracticeUI';
import { useI18n } from '../../i18n/useI18n';

const StudentDoubt = ({ studentId }) => {
    const { t } = useI18n();
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
            toast.error(errorMessage(err, 'Failed to load your doubts'));
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

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
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
            toast.success('Doubt submitted! Our faculty will reply soon.');
        } catch (err) {
            console.error('Error posting doubt:', err);
            toast.error(errorMessage(err, 'Failed to submit doubt'));
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="space-y-6">
            <div className="ui-skeleton h-12 w-64"></div>
            <SkeletonRows count={4} />
        </div>
    );

    const openCount = doubts.filter(d => d.status === 'open').length;
    const resolvedCount = doubts.length - openCount;

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiHelpCircle}
                title={t('student.doubts.title')}
                subtitle={t('student.doubts.subtitle')}
                action={(
                    <button onClick={() => setIsModalOpen(true)} className="ui-btn-primary w-full md:w-auto">
                        <FiPlus /> {t('student.doubts.askFaculty')}
                    </button>
                )}
            />

            <AIDoubtSolver doubts={doubts} onAttached={fetchDoubts} />

            {doubts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    <span className="ui-badge bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300 !py-2 !px-3">{doubts.length} total</span>
                    <span className="ui-badge bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300 !py-2 !px-3"><FiClock /> {openCount} awaiting reply</span>
                    <span className="ui-badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 !py-2 !px-3"><FiCheckCircle /> {resolvedCount} resolved</span>
                </div>
            )}

            <div className="space-y-4 ui-stagger">
                {doubts.length > 0 ? doubts.map(doubt => {
                    const isOpen = doubt.status === 'open';
                    return (
                        <article key={doubt._id} className="ui-card ui-card-hover group overflow-hidden relative">
                            <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${isOpen ? 'bg-amber-400' : 'bg-emerald-500'}`} aria-hidden="true" />
                            <div className="p-5 md:p-7 pl-6 md:pl-8 flex flex-col lg:flex-row gap-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        {doubt.subjectId?.name && <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{doubt.subjectId.name}</span>}
                                        <span className={`ui-badge ${isOpen ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                                            {isOpen ? <FiClock /> : <FiCheckCircle />} {doubt.status}
                                        </span>
                                        <span className="text-xs font-semibold text-gray-400 ml-auto">
                                            {new Date(doubt.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                        </span>
                                    </div>

                                    <h3 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">{doubt.title}</h3>
                                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{doubt.description}</p>

                                    {doubt.replies?.length > 0 && (
                                        <div className="mt-6 space-y-3">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                                <FiMessageCircle /> {t('student.doubts.replies', { count: doubt.replies.length })}
                                            </h4>
                                            {doubt.replies.map((reply, idx) => {
                                                const isAI = reply.isAI || reply.by === 'AI';
                                                return (
                                                    <div key={idx} className="flex gap-3 min-w-0">
                                                        <span className={`w-9 h-9 shrink-0 rounded-full text-white flex items-center justify-center text-sm ${isAI ? 'bg-ink-900 dark:bg-white dark:text-ink-900' : 'bg-brand-gradient'}`}>{isAI ? <FiCpu /> : <FiUser />}</span>
                                                        <div className={`flex-1 min-w-0 rounded-2xl rounded-tl-md px-4 py-3 ${isAI ? 'bg-brand-50/60 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/20' : 'bg-gray-50 dark:bg-white/5'}`}>
                                                            {isAI && <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand-600 dark:text-brand-400 mb-2">{t('student.doubts.aiReply')}</p>}
                                                            {isAI
                                                                ? <RichText text={reply.message || reply.text} />
                                                                : <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{reply.message}</p>}
                                                            <p className="text-[11px] font-semibold text-gray-400 mt-2">{t('student.doubts.repliedOn', { date: new Date(reply.createdAt).toLocaleDateString() })}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {doubt.imageUrl && (
                                    <a href={resolveFileUrl(doubt.imageUrl)} target="_blank" rel="noopener noreferrer" className="lg:w-60 w-full shrink-0 block rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 group/img" title="Open full image">
                                        <img
                                            src={resolveFileUrl(doubt.imageUrl)}
                                            alt="Doubt reference"
                                            className="w-full h-44 object-cover group-hover/img:scale-105 transition-transform duration-500"
                                        />
                                    </a>
                                )}
                            </div>
                        </article>
                    );
                }) : (
                    <EmptyState
                        icon={<FiHelpCircle />}
                        title="No doubts yet"
                        message="Got a question? Don't hesitate to ask our experts!"
                        action={<button onClick={() => setIsModalOpen(true)} className="ui-btn-primary"><FiPlus /> Ask your first doubt</button>}
                    />
                )}
            </div>

            {/* Ask Doubt Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fade-in" onClick={() => setIsModalOpen(false)}>
                    <div className="ui-card w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Ask your doubt">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center"><FiHelpCircle /></span>
                                <div>
                                    <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Ask your doubt</h3>
                                    <p className="text-xs text-gray-400">Our faculty usually reply within a day</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-red-500 flex items-center justify-center" aria-label="Close">
                                <FiX />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                            <div className="p-6 space-y-5 overflow-y-auto ui-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Subject</span>
                                        <select
                                            required
                                            className="ui-input dark:text-white"
                                            value={formData.subjectId}
                                            onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                                        >
                                            <option value="">Select subject</option>
                                            {subjects.map(sub => <option key={sub._id} value={sub._id}>{sub.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Title</span>
                                        <input
                                            required
                                            type="text"
                                            className="ui-input dark:text-white"
                                            placeholder="Brief summary..."
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Detailed description</span>
                                    <textarea
                                        required
                                        rows="4"
                                        className="ui-input dark:text-white resize-none"
                                        placeholder="Explain your doubt in detail..."
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </label>

                                <div>
                                    <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5">Reference image (optional)</span>
                                    <div className="relative group">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            aria-label="Upload reference image"
                                            onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
                                        />
                                        <div className={`rounded-2xl border-2 border-dashed p-6 text-center transition-all ${formData.image ? 'border-brand-300 bg-brand-50/50 dark:bg-brand-500/5' : 'border-gray-200 dark:border-white/10 group-hover:border-brand-300 group-hover:bg-brand-50/40 dark:group-hover:bg-white/5'}`}>
                                            <div className="w-12 h-12 mx-auto rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform"><FiImage /></div>
                                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                                {formData.image ? formData.image.name : 'Click or drag an image here'}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">A photo of the question helps us answer faster</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-white/5 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="ui-btn-secondary">Cancel</button>
                                <button type="submit" disabled={submitting} className="ui-btn-primary">
                                    <FiSend /> {submitting ? 'Submitting…' : 'Submit doubt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDoubt;
