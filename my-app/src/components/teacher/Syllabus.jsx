import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FiLayers, FiAlertCircle, FiRefreshCw, FiCheck, FiArrowUp, FiArrowDown, FiTrash2, FiEdit2, FiPlus, FiX, FiBookOpen } from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { useI18n } from '../../i18n/useI18n';
import { API, authHeaders, errMsg } from './teacherApi';
import { Badge, ConfirmButton, EmptyState, PageHeader, ProgressRing, Segmented, Spinner } from './TeacherUI';

const Bar = ({ pct }) => {
    const [w, setW] = useState(0);
    useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id); }, [pct]);
    return (
        <div className="h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
            <div className="h-full bg-brand-gradient rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%` }} />
        </div>
    );
};

/* ---------------- Coverage per batch ---------------- */
const Coverage = ({ batches, mySubjectKey, onManage }) => {
    const { t } = useI18n();
    const [batchId, setBatchId] = useState(batches[0]?._id || '');
    const [groups, setGroups] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(null);

    const load = useCallback(async () => {
        if (!batchId) { setGroups([]); return; }
        setGroups(null);
        try {
            const res = await axios.get(`${API}/practice/syllabus/coverage`, { headers: authHeaders(), params: { batchId } });
            const list = Array.isArray(res.data) ? res.data : [];
            // My subjects first
            const mySubjectIds = mySubjectKey.split(',');
            list.sort((a, b) => Number(mySubjectIds.includes(String(b.subjectId))) - Number(mySubjectIds.includes(String(a.subjectId))));
            setGroups(list);
            setError('');
        } catch (err) {
            setError(errMsg(err, 'Failed to load coverage'));
            setGroups([]);
        }
    }, [batchId, mySubjectKey]);
    useEffect(() => { load(); }, [load]);

    const patchChapter = (chapterId, patch) => setGroups(gs => gs.map(g => {
        const chapters = g.chapters.map(c => (String(c._id) === String(chapterId) ? { ...c, ...patch } : c));
        const coveredCount = chapters.filter(c => c.covered).length;
        return { ...g, chapters, coveredCount, percentCovered: chapters.length ? Math.round((coveredCount / chapters.length) * 100) : 0 };
    }));

    const toggle = async (ch) => {
        setBusy(ch._id);
        try {
            if (ch.covered && ch.coverageId) {
                await axios.delete(`${API}/practice/syllabus/coverage/${ch.coverageId}`, { headers: authHeaders() });
                patchChapter(ch._id, { covered: false, coverageId: null, coveredOn: null });
            } else {
                const res = await axios.post(`${API}/practice/syllabus/coverage`, { batchId, chapterId: ch._id }, { headers: authHeaders() });
                patchChapter(ch._id, { covered: true, coverageId: res.data?._id, coveredOn: res.data?.coveredOn || new Date().toISOString() });
                toast.success(`Marked “${ch.name}” as covered`);
            }
        } catch (err) {
            toast.error(errMsg(err, 'Failed to update coverage'));
        } finally { setBusy(null); }
    };

    const total = (groups || []).reduce((a, g) => a + g.total, 0);
    const covered = (groups || []).reduce((a, g) => a + g.coveredCount, 0);

    if (!batches.length) return <EmptyState icon={FiLayers} title="No batches assigned to you" hint="Ask the admin to assign batches to track coverage." />;

    return (
        <div className="space-y-5">
            <div className="ui-card p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <ProgressRing value={total ? (covered / total) * 100 : 0} size={64} sublabel="done" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white">{covered} of {total} chapters taught</p>
                    <p className="text-xs text-gray-500">Students see what has been taught in their syllabus tracker.</p>
                </div>
                <select className="ui-input sm:!w-60" aria-label="Batch" value={batchId} onChange={e => setBatchId(e.target.value)}>
                    {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
            </div>
            {groups === null ? <Spinner label="Loading chapters…" variant="grid" rows={3} />
                : error ? <EmptyState icon={FiAlertCircle} title={error} action={<button type="button" onClick={load} className="ui-btn-secondary"><FiRefreshCw /> Try again</button>} />
                    : groups.length === 0 ? <EmptyState icon={FiBookOpen} title="No chapters set up for this class yet" action={<button type="button" onClick={onManage} className="ui-btn-primary"><FiPlus /> Add chapters</button>} />
                        : (
                            <div key={batchId} className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 ui-stagger">
                                {groups.map(g => (
                                    <div key={g.subjectId} className="ui-card p-5">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <h3 className="font-extrabold text-gray-900 dark:text-white truncate">{g.subjectName}</h3>
                                            <span className="text-sm font-extrabold text-brand-600 tabular-nums">{g.percentCovered}%</span>
                                        </div>
                                        <Bar pct={g.percentCovered} />
                                        <p className="text-[11px] text-gray-400 mt-1.5 mb-3">{g.coveredCount}/{g.total} {t('teacher.syllabus.covered').toLowerCase()}</p>
                                        <ul className="space-y-1.5 max-h-80 overflow-y-auto ui-scrollbar pr-1">
                                            {g.chapters.map((ch, i) => (
                                                <li key={ch._id}>
                                                    <button
                                                        type="button" disabled={busy === ch._id} onClick={() => toggle(ch)} aria-pressed={ch.covered}
                                                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all active:scale-[0.99] ${ch.covered ? 'bg-emerald-50/70 dark:bg-emerald-500/10' : 'hover:bg-brand-50/50 dark:hover:bg-white/5'} ${busy === ch._id ? 'opacity-60' : ''}`}
                                                    >
                                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold transition-all ${ch.covered ? 'bg-emerald-500 text-white scale-105' : 'border-2 border-gray-200 dark:border-white/15 text-gray-400'}`}>
                                                            {ch.covered ? <FiCheck /> : i + 1}
                                                        </span>
                                                        <span className={`flex-1 min-w-0 text-sm font-semibold truncate ${ch.covered ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-200'}`}>{ch.name}</span>
                                                        {ch.covered && ch.coveredOn && <span className="text-[10px] font-bold text-emerald-600 shrink-0">{new Date(ch.coveredOn).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
        </div>
    );
};

/* ---------------- Manage chapter list ---------------- */
const ChapterManager = ({ classes, subjects }) => {
    const [classId, setClassId] = useState(classes[0]?._id || '');
    const [subjectId, setSubjectId] = useState(subjects[0]?._id || '');
    const [chapters, setChapters] = useState(null);
    const [error, setError] = useState('');
    const [newNames, setNewNames] = useState('');
    const [adding, setAdding] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editName, setEditName] = useState('');

    const load = useCallback(async () => {
        if (!subjectId) { setChapters([]); return; }
        try {
            const params = { subjectId };
            if (classId) params.classId = classId;
            const res = await axios.get(`${API}/practice/syllabus/chapters`, { headers: authHeaders(), params });
            setChapters(Array.isArray(res.data) ? res.data : []);
            setError('');
        } catch (err) {
            setError(errMsg(err, 'Failed to load chapters'));
            setChapters([]);
        }
    }, [classId, subjectId]);
    useEffect(() => { load(); }, [load]);

    const add = async (e) => {
        e.preventDefault();
        const names = newNames.split('\n').map(s => s.trim()).filter(Boolean);
        if (!names.length) return;
        setAdding(true);
        try {
            const body = { subjectId, names };
            if (classId) body.classId = classId;
            await axios.post(`${API}/practice/syllabus/chapters`, body, { headers: authHeaders() });
            toast.success(`${names.length} chapter${names.length > 1 ? 's' : ''} added`);
            setNewNames('');
            load();
        } catch (err) { toast.error(errMsg(err, 'Failed to add chapters')); } finally { setAdding(false); }
    };

    const rename = async (id) => {
        if (!editName.trim()) return;
        try {
            await axios.put(`${API}/practice/syllabus/chapters/${id}`, { name: editName.trim() }, { headers: authHeaders() });
            setChapters(cs => cs.map(c => (c._id === id ? { ...c, name: editName.trim() } : c)));
            setEditId(null);
            toast.success('Chapter renamed');
        } catch (err) { toast.error(errMsg(err, 'Rename failed')); }
    };

    const move = async (idx, dir) => {
        const j = idx + dir;
        if (j < 0 || j >= chapters.length) return;
        const next = [...chapters];
        [next[idx], next[j]] = [next[j], next[idx]];
        const withOrder = next.map((c, i) => ({ ...c, order: i + 1 }));
        const prev = chapters;
        setChapters(withOrder);
        try {
            const changed = withOrder.filter((c, i) => prev.find(p => p._id === c._id)?.order !== i + 1);
            await Promise.all(changed.map(c => axios.put(`${API}/practice/syllabus/chapters/${c._id}`, { order: c.order }, { headers: authHeaders() })));
        } catch (err) {
            setChapters(prev);
            toast.error(errMsg(err, 'Reorder failed'));
        }
    };

    const remove = async (id) => {
        try {
            await axios.delete(`${API}/practice/syllabus/chapters/${id}`, { headers: authHeaders() });
            setChapters(cs => cs.filter(c => c._id !== id));
            toast.success('Chapter deleted');
        } catch (err) { toast.error(errMsg(err, 'Delete failed')); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4 space-y-4">
                <div className="ui-card p-4 space-y-3">
                    <select className="ui-input" aria-label="Class" value={classId} onChange={e => setClassId(e.target.value)}>
                        <option value="">Subject default class</option>{classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <select className="ui-input" aria-label="Subject" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
                        {subjects.length === 0 && <option value="">No subjects assigned</option>}
                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                </div>
                <form onSubmit={add} className="ui-card p-4 space-y-3">
                    <p className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2"><FiPlus className="text-brand-500" /> Add chapters</p>
                    <textarea rows="5" className="ui-input resize-y" placeholder={'One chapter per line\nUnits & Measurements\nKinematics'} value={newNames} onChange={e => setNewNames(e.target.value)} />
                    <button type="submit" disabled={adding || !subjectId || !newNames.trim()} className="ui-btn-primary w-full">{adding ? 'Adding…' : 'Add to list'}</button>
                </form>
            </div>
            <div className="lg:col-span-8">
                {chapters === null ? <Spinner label="Loading chapters…" rows={5} />
                    : error ? <EmptyState icon={FiAlertCircle} title={error} action={<button type="button" onClick={load} className="ui-btn-secondary"><FiRefreshCw /> Try again</button>} />
                        : chapters.length === 0 ? <EmptyState icon={FiBookOpen} title="No chapters yet" hint="Add chapters on the left — one per line." />
                            : (
                                <ul className="ui-card divide-y divide-gray-100 dark:divide-white/5 overflow-hidden">
                                    {chapters.map((c, i) => (
                                        <li key={c._id} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-50/40 dark:hover:bg-white/5">
                                            <span className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/5 text-xs font-extrabold text-gray-500 flex items-center justify-center shrink-0">{i + 1}</span>
                                            {editId === c._id ? (
                                                <form className="flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); rename(c._id); }}>
                                                    <input autoFocus className="ui-input !py-1.5" value={editName} onChange={e => setEditName(e.target.value)} aria-label="Chapter name" />
                                                    <button type="submit" aria-label="Save name" className="w-8 h-8 rounded-lg bg-brand-gradient text-white flex items-center justify-center shrink-0"><FiCheck /></button>
                                                    <button type="button" onClick={() => setEditId(null)} aria-label="Cancel" className="w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 flex items-center justify-center shrink-0"><FiX /></button>
                                                </form>
                                            ) : (
                                                <span className="flex-1 min-w-0 text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{c.name}</span>
                                            )}
                                            {editId !== c._id && (
                                                <div className="flex items-center gap-0.5 shrink-0">
                                                    <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up" className="w-8 h-8 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 flex items-center justify-center"><FiArrowUp /></button>
                                                    <button type="button" disabled={i === chapters.length - 1} onClick={() => move(i, 1)} aria-label="Move down" className="w-8 h-8 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 flex items-center justify-center"><FiArrowDown /></button>
                                                    <button type="button" onClick={() => { setEditId(c._id); setEditName(c.name); }} aria-label="Rename" className="w-8 h-8 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 flex items-center justify-center"><FiEdit2 /></button>
                                                    <ConfirmButton onConfirm={() => remove(c._id)} prompt="Delete chapter?" title="Delete chapter" className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center"><FiTrash2 /></ConfirmButton>
                                                </div>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
            </div>
        </div>
    );
};

const Syllabus = ({ teacherData }) => {
    const { t } = useI18n();
    const [view, setView] = useState('coverage');
    const subjects = teacherData?.subjects || [];
    const mySubjectKey = subjects.map(s => String(s._id)).join(',');
    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiLayers} eyebrow={t('teacher.group.teaching')} title={t('teacher.heading.syllabus')} subtitle={t('teacher.heading.syllabusSub')}
                actions={<Badge tone="brand">{(teacherData?.batches || []).length} batches</Badge>}
            />
            <Segmented value={view} onChange={setView} options={[['coverage', t('teacher.syllabus.coverage')], ['manage', t('teacher.syllabus.manage')]]} />
            <div key={view} className="animate-fade-up">
                {view === 'coverage'
                    ? <Coverage batches={teacherData?.batches || []} mySubjectKey={mySubjectKey} onManage={() => setView('manage')} />
                    : <ChapterManager classes={teacherData?.classes || []} subjects={subjects} />}
            </div>
        </div>
    );
};

export default Syllabus;
