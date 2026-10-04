import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { FiEdit3, FiPlus, FiAlertCircle, FiRefreshCw, FiPaperclip, FiUsers, FiEdit2, FiTrash2, FiClock, FiUploadCloud } from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { useI18n } from '../../i18n/useI18n';
import { API, authHeaders, errMsg, fileHref, idOf } from './teacherApi';
import { Badge, ConfirmButton, EmptyState, Field, Modal, PageHeader, Segmented, Spinner } from './TeacherUI';
import HomeworkSubmissions from './HomeworkSubmissions';

const toDateInput = (d) => {
    const x = d ? new Date(d) : new Date(Date.now() + 2 * 86400000);
    const p = (n) => String(n).padStart(2, '0');
    return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};
const daysLeft = (d) => {
    const a = new Date(); a.setHours(0, 0, 0, 0);
    const b = new Date(d); b.setHours(0, 0, 0, 0);
    return Math.round((b - a) / 86400000);
};

const HomeworkForm = ({ editing, teacherData, onClose, onSaved }) => {
    const subjects = teacherData?.subjects || [];
    const classes = teacherData?.classes || [];
    const batches = teacherData?.batches || [];
    const [form, setForm] = useState(() => ({
        title: editing?.title || '', description: editing?.description || '',
        classId: idOf(editing?.classId) || classes[0]?._id || '', batchId: idOf(editing?.batchId),
        subjectId: idOf(editing?.subjectId) || subjects[0]?._id || '', dueDate: toDateInput(editing?.dueDate),
        maxMarks: editing?.maxMarks ?? 10,
    }));
    const [file, setFile] = useState(null);
    const [saving, setSaving] = useState(false);

    const save = async (e) => {
        e.preventDefault();
        if (!form.classId || !form.subjectId) { toast.error('Class and subject are required'); return; }
        if (file && file.size > 10 * 1024 * 1024) { toast.error('Attachment must be under 10 MB'); return; }
        setSaving(true);
        try {
            const fd = new FormData();
            Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
            if (file) fd.append('attachment', file);
            const headers = { ...authHeaders(), 'Content-Type': 'multipart/form-data' };
            if (editing) await axios.put(`${API}/homework/${editing._id}`, fd, { headers });
            else await axios.post(`${API}/homework`, fd, { headers });
            toast.success(editing ? 'Homework updated' : 'Homework assigned — students notified');
            onSaved();
        } catch (err) {
            toast.error(errMsg(err, 'Failed to save homework'));
        } finally { setSaving(false); }
    };

    return (
        <Modal
            open onClose={() => !saving && onClose()} icon={FiEdit3} title={editing ? 'Edit homework' : 'New homework'} size="lg" bodyClassName="p-4 md:p-6"
            footer={<div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="ui-btn-secondary">Cancel</button>
                <button type="submit" form="hw-form" disabled={saving} className="ui-btn-primary">{saving ? 'Saving…' : editing ? 'Save changes' : 'Assign homework'}</button>
            </div>}
        >
            <form id="hw-form" onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Title" className="md:col-span-2"><input required className="ui-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. NCERT Ex 3.2 Q1–15" /></Field>
                <Field label="Instructions" className="md:col-span-2"><textarea rows="3" className="ui-input resize-y" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
                <Field label="Class">
                    <select required className="ui-input" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
                        <option value="">Select class</option>{classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                </Field>
                <Field label="Batch (optional)">
                    <select className="ui-input" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}>
                        <option value="">Whole class</option>{batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                </Field>
                <Field label="Subject">
                    <select required className="ui-input" value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                        <option value="">Select subject</option>{subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                    <Field label="Due date"><input required type="date" className="ui-input" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} /></Field>
                    <Field label="Max marks"><input type="number" min="0" className="ui-input" value={form.maxMarks} onChange={e => setForm({ ...form, maxMarks: e.target.value })} /></Field>
                </div>
                <label className="md:col-span-2 relative flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-brand-200 dark:border-brand-500/30 bg-brand-50/40 dark:bg-brand-500/5 cursor-pointer hover:bg-brand-50 transition">
                    <input type="file" accept=".pdf,image/*" className="sr-only" onChange={e => setFile(e.target.files?.[0] || null)} />
                    <span className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shrink-0"><FiUploadCloud /></span>
                    <span className="min-w-0">
                        <span className="block text-sm font-bold text-gray-900 dark:text-white truncate">{file ? file.name : editing?.attachmentUrl ? 'Replace attachment' : 'Attach worksheet (optional)'}</span>
                        <span className="block text-[11px] text-gray-500">PDF or image, up to 10 MB</span>
                    </span>
                </label>
            </form>
        </Modal>
    );
};

const HomeworkCard = ({ hw, onOpen, onEdit, onDelete }) => {
    const total = hw.totalStudents || 0;
    const pct = total ? Math.min(100, Math.round((hw.submittedCount / total) * 100)) : 0;
    const dl = daysLeft(hw.dueDate);
    const dueTone = dl < 0 ? 'grey' : dl <= 1 ? 'red' : dl <= 3 ? 'amber' : 'green';
    const dueText = dl < 0 ? 'Closed' : dl === 0 ? 'Due today' : dl === 1 ? 'Due tomorrow' : `Due in ${dl}d`;
    const [w, setW] = useState(0);
    useEffect(() => { const id = requestAnimationFrame(() => setW(pct)); return () => cancelAnimationFrame(id); }, [pct]);
    return (
        <div className="group ui-card ui-card-hover p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">{hw.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{hw.subjectId?.name || 'Subject'} · {hw.classId?.name || 'Class'}{hw.batchId?.name ? ` · ${hw.batchId.name}` : ''}</p>
                </div>
                <Badge tone={dueTone} dot={dl >= 0 && dl <= 1}><FiClock /> {dueText}</Badge>
            </div>
            {hw.description && <p className="mt-2 text-xs text-gray-500 line-clamp-2">{hw.description}</p>}
            <div className="mt-4">
                <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1.5">
                    <span>{hw.submittedCount}/{total} submitted</span>
                    <span>{hw.gradedCount || 0} graded</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                    <div className="h-full bg-brand-gradient rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%` }} />
                </div>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5 mt-auto">
                <button type="button" onClick={onOpen} className="ui-btn-dark flex-1 !py-2 text-xs"><FiUsers /> Submissions</button>
                {hw.attachmentUrl && <a href={fileHref(hw.attachmentUrl)} target="_blank" rel="noopener noreferrer" aria-label="Open attachment" title="Attachment" className="ui-btn-secondary !px-3 !py-2"><FiPaperclip /></a>}
                <button type="button" onClick={onEdit} aria-label="Edit homework" title="Edit" className="ui-btn-secondary !px-3 !py-2"><FiEdit2 /></button>
                <ConfirmButton onConfirm={onDelete} prompt="Delete + submissions?" title="Delete homework" className="ui-btn-secondary !px-3 !py-2 hover:!text-red-500"><FiTrash2 /></ConfirmButton>
            </div>
        </div>
    );
};

const Homework = ({ teacherData }) => {
    const { t } = useI18n();
    const [list, setList] = useState(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('open');
    const [formFor, setFormFor] = useState(null); // null | 'new' | homework
    const [viewing, setViewing] = useState(null);

    const load = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/homework/teacher/mine`, { headers: authHeaders() });
            setList(Array.isArray(res.data) ? res.data : []);
            setError('');
        } catch (err) {
            setError(errMsg(err, 'Failed to load homework'));
            setList([]);
        }
    }, []);
    useEffect(() => { const id = setTimeout(load, 0); return () => clearTimeout(id); }, [load]);

    const remove = async (id) => {
        try {
            await axios.delete(`${API}/homework/${id}`, { headers: authHeaders() });
            toast.success('Homework deleted');
            setList(l => l.filter(h => h._id !== id));
        } catch (err) { toast.error(errMsg(err, 'Failed to delete homework')); }
    };

    const all = list || [];
    const open = all.filter(h => daysLeft(h.dueDate) >= 0);
    const closed = all.filter(h => daysLeft(h.dueDate) < 0);
    const visible = filter === 'open' ? [...open].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)) : filter === 'closed' ? closed : all;

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiEdit3} eyebrow={t('teacher.group.teaching')} title={t('teacher.heading.homework')} subtitle={t('teacher.heading.homeworkSub')}
                actions={<button type="button" onClick={() => setFormFor('new')} className="ui-btn-primary"><FiPlus /> {t('teacher.homework.new')}</button>}
            />
            <Segmented value={filter} onChange={setFilter} options={[['open', 'Open', open.length], ['closed', 'Past due', closed.length], ['all', 'All', all.length]]} />
            {list === null ? <Spinner label="Loading homework…" variant="grid" />
                : error ? <EmptyState icon={FiAlertCircle} title={error} action={<button type="button" onClick={load} className="ui-btn-secondary"><FiRefreshCw /> Try again</button>} />
                    : visible.length === 0 ? (
                        <EmptyState icon={FiEdit3} title={all.length ? 'Nothing here' : t('teacher.homework.none')} hint={all.length ? '' : 'Assign worksheets with a due date — students submit photos/PDFs and you grade with remarks.'}
                            action={!all.length && <button type="button" onClick={() => setFormFor('new')} className="ui-btn-primary"><FiPlus /> {t('teacher.homework.new')}</button>} />
                    ) : (
                        <div key={filter} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 ui-stagger">
                            {visible.map(hw => <HomeworkCard key={hw._id} hw={hw} onOpen={() => setViewing(hw)} onEdit={() => setFormFor(hw)} onDelete={() => remove(hw._id)} />)}
                        </div>
                    )}
            {formFor && (
                <HomeworkForm editing={formFor === 'new' ? null : formFor} teacherData={teacherData} onClose={() => setFormFor(null)} onSaved={() => { setFormFor(null); load(); }} />
            )}
            {viewing && <HomeworkSubmissions hw={viewing} onClose={() => setViewing(null)} onChanged={load} />}
        </div>
    );
};

export default Homework;
