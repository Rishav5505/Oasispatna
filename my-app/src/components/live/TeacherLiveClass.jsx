import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../../config';
import { FiVideo, FiPlus, FiCalendar, FiGlobe, FiEdit2, FiTrash2, FiClock, FiExternalLink } from 'react-icons/fi';
import { notify } from '../../utils/notify';
import { authHeaders, errMsg, getTeacherId, idOf, timeAgo } from '../teacher/teacherApi';
import { Badge, ConfirmButton, EmptyState, Field, Modal, PageHeader, Segmented, Spinner } from '../teacher/TeacherUI';

const emptyClass = { title: '', description: '', meetingLink: '', dateTime: '', duration: 60, subjectId: '', classId: '' };

const STATUS_TONE = { scheduled: 'brand', live: 'red', completed: 'dark', cancelled: 'grey' };

// Date -> value for <input type="datetime-local"> in local time
const toLocalInput = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const off = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - off).toISOString().slice(0, 16);
};

const TeacherLiveClass = ({ teacherData }) => {
    const [liveClasses, setLiveClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [view, setView] = useState('upcoming'); // 'upcoming' | 'past' | 'all'
    const [statusBusy, setStatusBusy] = useState(null);
    const subjects = teacherData?.subjects || [];
    const classes = teacherData?.classes || [];
    const [newClass, setNewClass] = useState(emptyClass);

    const fetchLiveClasses = useCallback(async () => {
        const teacherId = getTeacherId();
        if (!teacherId) { setLoading(false); return; }
        try {
            const res = await axios.get(`${config.API_URL}/live-classes/teacher/${teacherId}`, { headers: authHeaders() });
            setLiveClasses(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Error fetching live classes:', err);
            notify(errMsg(err, 'Failed to load live classes'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLiveClasses();
    }, [fetchLiveClasses]);

    const openCreate = () => {
        setEditingId(null);
        setNewClass(emptyClass);
        setShowModal(true);
    };

    const openEdit = (lc) => {
        setEditingId(lc._id);
        setNewClass({
            title: lc.title || '',
            description: lc.description || '',
            meetingLink: lc.meetingLink || '',
            dateTime: toLocalInput(lc.dateTime),
            duration: lc.duration || 60,
            subjectId: idOf(lc.subjectId),
            classId: idOf(lc.classId)
        });
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = {
            ...newClass,
            dateTime: new Date(newClass.dateTime).toISOString(),
            duration: Number(newClass.duration) || 60
        };
        setSaving(true);
        try {
            if (editingId) {
                await axios.put(`${config.API_URL}/live-classes/${editingId}`, payload, { headers: authHeaders() });
                notify('Live class updated successfully!');
            } else {
                await axios.post(`${config.API_URL}/live-classes`, payload, { headers: authHeaders() });
                notify('Live class scheduled and students notified!');
            }
            setShowModal(false);
            setEditingId(null);
            setNewClass(emptyClass);
            fetchLiveClasses();
        } catch (err) {
            notify(`Error: ${errMsg(err, 'Failed to save class')}`);
        } finally {
            setSaving(false);
        }
    };

    const handleStatus = async (lc, status) => {
        if (lc.status === status) return;
        const prev = lc.status;
        setStatusBusy(lc._id);
        setLiveClasses(list => list.map(x => (x._id === lc._id ? { ...x, status } : x)));
        try {
            await axios.patch(`${config.API_URL}/live-classes/${lc._id}/status`, { status }, { headers: authHeaders() });
            notify(`Class marked ${status}`);
        } catch (err) {
            setLiveClasses(list => list.map(x => (x._id === lc._id ? { ...x, status: prev } : x)));
            notify(errMsg(err, 'Failed to update status'));
        } finally {
            setStatusBusy(null);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${config.API_URL}/live-classes/${id}`, { headers: authHeaders() });
            setLiveClasses(list => list.filter(x => x._id !== id));
            notify('Live class deleted');
        } catch (err) {
            notify(errMsg(err, 'Failed to delete class'));
        }
    };

    const handleStart = (lc) => {
        if (!lc.status || lc.status === 'scheduled') handleStatus(lc, 'live');
    };

    const isPast = (lc) => {
        const end = new Date(lc.dateTime).getTime() + (Number(lc.duration) || 60) * 60000;
        return lc.status === 'completed' || lc.status === 'cancelled' || (lc.status !== 'live' && end < Date.now());
    };

    const visible = liveClasses
        .filter(lc => (view === 'all' ? true : view === 'past' ? isPast(lc) : !isPast(lc)))
        .sort((a, b) => (view === 'upcoming'
            ? new Date(a.dateTime) - new Date(b.dateTime)
            : new Date(b.dateTime) - new Date(a.dateTime)));

    const upcomingCount = liveClasses.filter(lc => !isPast(lc)).length;
    const pastCount = liveClasses.length - upcomingCount;

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiVideo}
                eyebrow="Teaching"
                title="Live classes"
                subtitle="Schedule and run real-time interactive sessions."
                actions={<button type="button" onClick={openCreate} className="ui-btn-primary"><FiPlus /> Schedule session</button>}
            />

            <Segmented
                value={view}
                onChange={setView}
                options={[['upcoming', 'Upcoming', upcomingCount], ['past', 'Past', pastCount], ['all', 'All', liveClasses.length]]}
            />

            {loading ? (
                <Spinner label="Loading sessions..." variant="grid" />
            ) : visible.length === 0 ? (
                <EmptyState
                    icon={FiVideo}
                    title={liveClasses.length ? `No ${view} sessions` : 'No live classes scheduled yet'}
                    hint={liveClasses.length ? '' : 'Schedule a Zoom / Google Meet session — students in that class are notified instantly.'}
                    action={!liveClasses.length && <button type="button" onClick={openCreate} className="ui-btn-primary"><FiPlus /> Schedule first class</button>}
                />
            ) : (
                <div key={view} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 ui-stagger">
                    {visible.map(lc => {
                        const status = lc.status || 'scheduled';
                        const when = new Date(lc.dateTime);
                        const isLive = status === 'live';
                        const soon = !isLive && status === 'scheduled' && when.getTime() > Date.now();
                        return (
                            <div key={lc._id} className={`group ui-card ui-card-hover p-5 flex flex-col relative overflow-hidden ${isLive ? '!border-red-200 dark:!border-red-500/30 ring-2 ring-red-500/20' : ''} ${status === 'cancelled' ? 'opacity-70' : ''}`}>
                                {isLive && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-brand-500 to-red-500 bg-[length:200%_auto] animate-gradient-x" />}
                                <div className="flex items-start gap-4">
                                    <div className={`shrink-0 w-14 rounded-2xl overflow-hidden text-center border ${isLive ? 'border-red-200' : 'border-gray-100 dark:border-white/10'}`}>
                                        <div className={`text-[10px] font-bold uppercase py-0.5 text-white ${isLive ? 'bg-red-500' : 'bg-brand-gradient'}`}>{when.toLocaleDateString([], { month: 'short' })}</div>
                                        <div className="py-1.5 bg-white dark:bg-ink-800">
                                            <p className="text-xl font-extrabold leading-none text-gray-900 dark:text-white">{when.getDate()}</p>
                                            <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{when.toLocaleDateString([], { weekday: 'short' })}</p>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">{lc.title}</h3>
                                            {isLive ? (
                                                <Badge tone="red" dot>Live</Badge>
                                            ) : (
                                                <Badge tone={STATUS_TONE[status] || 'grey'} className={status === 'cancelled' ? 'line-through' : ''}>{status}</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 truncate">{lc.subjectId?.name || 'Academic'} · {lc.classId?.name || 'General'}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-semibold text-gray-500">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5"><FiClock className="text-brand-500" /> {when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-white/5"><FiCalendar className="text-brand-500" /> {lc.duration || 60} min</span>
                                    {soon && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300">Starts {timeAgo(lc.dateTime)}</span>}
                                </div>

                                <div className="mt-4">
                                    <Segmented
                                        size="sm"
                                        className="w-full [&>button]:flex-1 [&>button]:justify-center"
                                        value={status}
                                        onChange={(s) => statusBusy !== lc._id && handleStatus(lc, s)}
                                        options={[['live', 'Live'], ['completed', 'Completed'], ['cancelled', 'Cancelled']]}
                                    />
                                </div>

                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5 mt-auto">
                                    {status !== 'cancelled' && status !== 'completed' && (
                                        <a
                                            href={lc.meetingLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={() => handleStart(lc)}
                                            className={`flex-1 ${isLive ? 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 transition active:scale-[0.98]' : 'ui-btn-primary'}`}
                                        >
                                            <FiExternalLink /> {isLive ? 'Rejoin broadcast' : 'Start broadcast'}
                                        </a>
                                    )}
                                    <button type="button" onClick={() => openEdit(lc)} title="Edit session" aria-label="Edit session" className="ui-btn-secondary !px-3">
                                        <FiEdit2 />
                                    </button>
                                    <ConfirmButton
                                        onConfirm={() => handleDelete(lc._id)}
                                        title="Delete session"
                                        className="ui-btn-secondary !px-3 hover:!text-red-500 hover:!border-red-200"
                                    >
                                        <FiTrash2 />
                                    </ConfirmButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal
                open={showModal}
                onClose={() => !saving && setShowModal(false)}
                icon={FiVideo}
                title={editingId ? 'Edit session' : 'Schedule a live session'}
                subtitle="Students in the selected class are notified."
                size="md"
                dismissible={false}
                bodyClassName="p-5 md:p-7"
                footer={
                    <div className="flex gap-2 justify-end">
                        <button type="button" onClick={() => !saving && setShowModal(false)} className="ui-btn-secondary">Cancel</button>
                        <button type="submit" form="live-class-form" disabled={saving} className="ui-btn-primary">
                            {saving ? 'Saving…' : editingId ? 'Save changes' : 'Schedule session'}
                        </button>
                    </div>
                }
            >
                <form id="live-class-form" onSubmit={handleSubmit} className="space-y-4">
                    <Field label="Session title">
                        <input required placeholder="e.g. Advanced Thermodynamics" className="ui-input" value={newClass.title} onChange={e => setNewClass({ ...newClass, title: e.target.value })} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="Subject">
                            <select required className="ui-input" value={newClass.subjectId} onChange={e => setNewClass({ ...newClass, subjectId: e.target.value })}>
                                <option value="">Select</option>
                                {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Class">
                            <select required className="ui-input" value={newClass.classId} onChange={e => setNewClass({ ...newClass, classId: e.target.value })}>
                                <option value="">Select</option>
                                {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Meeting link">
                        <div className="relative">
                            <FiGlobe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input required type="url" placeholder="Zoom, Google Meet, or Webex link…" className="ui-input pl-11" value={newClass.meetingLink} onChange={e => setNewClass({ ...newClass, meetingLink: e.target.value })} />
                        </div>
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="Start time" className="sm:col-span-2">
                            <input type="datetime-local" required className="ui-input" value={newClass.dateTime} onChange={e => setNewClass({ ...newClass, dateTime: e.target.value })} />
                        </Field>
                        <Field label="Duration (min)">
                            <input type="number" min="10" max="600" required className="ui-input" value={newClass.duration} onChange={e => setNewClass({ ...newClass, duration: e.target.value })} />
                        </Field>
                    </div>
                    <Field label="Agenda (optional)">
                        <textarea rows="2" placeholder="Topics to be covered…" className="ui-input resize-none" value={newClass.description} onChange={e => setNewClass({ ...newClass, description: e.target.value })} />
                    </Field>
                </form>
            </Modal>
        </div>
    );
};

export default TeacherLiveClass;
