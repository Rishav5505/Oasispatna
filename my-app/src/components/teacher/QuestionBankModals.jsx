import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { FiCheck, FiCheckCircle, FiClipboard, FiDatabase, FiEdit2, FiShuffle, FiUploadCloud } from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { API, authHeaders, errMsg } from './teacherApi';
import { Badge, Field, Modal, Segmented } from './TeacherUI';
import { DIFFICULTIES, parseBulkText } from './qbUtils';

const toPayload = (f) => {
    const out = {
        type: f.type, questionText: f.questionText, solution: f.solution, subjectId: f.subjectId,
        classId: f.classId || null, chapter: f.chapter, difficulty: f.difficulty,
        tags: String(f.tags || '').split(',').map(x => x.trim()).filter(Boolean),
        marks: f.marks, negativeMarks: f.negativeMarks, source: f.source, year: f.year,
    };
    if (f.type === 'mcq') { out.options = f.options; out.correctOption = Number(f.correctOption); }
    else out.correctAnswer = f.correctAnswer;
    return out;
};

/* ---------------- Add / edit one question ---------------- */
export const QuestionFormModal = ({ open, editing, initial, subjects, classes, chapters, onClose, onSaved }) => {
    const [form, setForm] = useState(initial);
    const [saving, setSaving] = useState(false);
    if (!open || !form) return null;
    const set = (patch) => setForm(f => ({ ...f, ...patch }));

    const save = async (e) => {
        e.preventDefault();
        if (!form.subjectId) { toast.error('Please choose a subject'); return; }
        if (form.type === 'mcq' && form.options.some(o => !String(o).trim())) { toast.error('Fill all 4 options'); return; }
        if (form.type === 'numerical' && (form.correctAnswer === '' || !Number.isFinite(Number(form.correctAnswer)))) { toast.error('Enter the numerical answer'); return; }
        setSaving(true);
        try {
            const payload = toPayload(form);
            const res = editing
                ? await axios.put(`${API}/question-bank/${editing}`, payload, { headers: authHeaders() })
                : await axios.post(`${API}/question-bank`, payload, { headers: authHeaders() });
            toast.success(editing ? 'Question updated' : 'Question added to bank');
            onSaved(res.data);
        } catch (err) {
            toast.error(errMsg(err, 'Failed to save question'));
        } finally { setSaving(false); }
    };

    return (
        <Modal
            open={open} onClose={() => !saving && onClose()} icon={editing ? FiEdit2 : FiDatabase}
            title={editing ? 'Edit question' : 'Add question'} subtitle="Stored in the shared question bank" size="xl"
            bodyClassName="p-4 md:p-6"
            footer={<div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="ui-btn-secondary">Cancel</button>
                <button type="submit" form="qb-form" disabled={saving} className="ui-btn-primary">{saving ? 'Saving…' : 'Save question'}</button>
            </div>}
        >
            <form id="qb-form" onSubmit={save} className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Segmented size="sm" value={form.type} onChange={(type) => set({ type, negativeMarks: type === 'numerical' ? 0 : form.negativeMarks })} options={[['mcq', 'MCQ'], ['numerical', 'Numerical']]} />
                    <Segmented size="sm" value={form.difficulty} onChange={(difficulty) => set({ difficulty })} options={DIFFICULTIES.map(d => [d, d[0].toUpperCase() + d.slice(1)])} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Subject">
                        <select required className="ui-input" value={form.subjectId} onChange={e => set({ subjectId: e.target.value })}>
                            <option value="">Select subject</option>
                            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Class (optional)">
                        <select className="ui-input" value={form.classId} onChange={e => set({ classId: e.target.value })}>
                            <option value="">Any class</option>
                            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Chapter">
                        <input className="ui-input" list="qb-chapter-list" placeholder="e.g. Kinematics" value={form.chapter} onChange={e => set({ chapter: e.target.value })} />
                        <datalist id="qb-chapter-list">{chapters.map(c => <option key={c.chapter} value={c.chapter} />)}</datalist>
                    </Field>
                </div>
                <Field label="Question">
                    <textarea required rows="3" className="ui-input resize-y" value={form.questionText} onChange={e => set({ questionText: e.target.value })} placeholder="Type the question…" />
                </Field>
                {form.type === 'mcq' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {form.options.map((o, i) => {
                            const correct = Number(form.correctOption) === i;
                            return (
                                <div key={i} className={`flex items-center gap-2 p-1.5 pr-3 rounded-xl border-2 ${correct ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-gray-100 dark:border-white/10'}`}>
                                    <button type="button" onClick={() => set({ correctOption: i })} aria-label={`Mark option ${String.fromCharCode(65 + i)} correct`} className={`w-9 h-9 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${correct ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-brand-100'}`}>
                                        {correct ? <FiCheck /> : String.fromCharCode(65 + i)}
                                    </button>
                                    <input className="flex-1 min-w-0 bg-transparent py-2 text-sm focus:outline-none" placeholder={`Option ${String.fromCharCode(65 + i)}`} value={o} onChange={e => set({ options: form.options.map((x, j) => (j === i ? e.target.value : x)) })} />
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <Field label="Correct answer (number)">
                        <input type="number" step="any" className="ui-input font-bold" value={form.correctAnswer} onChange={e => set({ correctAnswer: e.target.value })} />
                    </Field>
                )}
                <Field label="Solution (shown after attempt)">
                    <textarea rows="3" className="ui-input resize-y" value={form.solution} onChange={e => set({ solution: e.target.value })} placeholder="Step-by-step explanation" />
                </Field>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Field label="Marks"><input type="number" min="0" className="ui-input" value={form.marks} onChange={e => set({ marks: e.target.value })} /></Field>
                    <Field label="Negative"><input type="number" min="0" step="0.25" className="ui-input" value={form.negativeMarks} onChange={e => set({ negativeMarks: e.target.value })} /></Field>
                    <Field label="Source">
                        <select className="ui-input" value={form.source} onChange={e => set({ source: e.target.value })}>
                            <option value="manual">Manual</option><option value="pyq">PYQ</option><option value="ai">AI</option>
                        </select>
                    </Field>
                    <Field label="Year (PYQ)"><input type="number" className="ui-input" value={form.year} onChange={e => set({ year: e.target.value })} /></Field>
                    <Field label="Tags" className="col-span-2 md:col-span-1"><input className="ui-input" placeholder="comma, separated" value={form.tags} onChange={e => set({ tags: e.target.value })} /></Field>
                </div>
            </form>
        </Modal>
    );
};

/* ---------------- Bulk paste ---------------- */
const BULK_SAMPLE = `Q1. A ball is thrown up with 20 m/s. Max height? (g=10)
A) 10 m
B) 20 m
C) 30 m
D) 40 m
Ans: B
Sol: h = u²/2g = 400/20 = 20 m

Q2. Number of moles in 22 g of CO2?
Ans: 0.5`;

export const BulkPasteModal = ({ open, onClose, subjects, classes, defaults, onSaved }) => {
    const [text, setText] = useState('');
    const [shared, setShared] = useState(() => ({ subjectId: defaults?.subjectId || '', classId: defaults?.classId || '', chapter: defaults?.chapter || '', difficulty: 'medium', marks: 4, negativeMarks: 1, source: 'manual' }));
    const [saving, setSaving] = useState(false);
    const parsed = useMemo(() => parseBulkText(text), [text]);
    if (!open) return null;

    const save = async () => {
        if (!shared.subjectId) { toast.error('Please choose a subject'); return; }
        if (!parsed.items.length) { toast.error('No valid questions found'); return; }
        setSaving(true);
        try {
            const items = parsed.items.map(it => ({ ...it, negativeMarks: it.type === 'numerical' ? 0 : shared.negativeMarks }));
            const body = { items, subjectId: shared.subjectId, chapter: shared.chapter, difficulty: shared.difficulty, marks: shared.marks, source: shared.source };
            if (shared.classId) body.classId = shared.classId;
            const res = await axios.post(`${API}/question-bank/bulk`, body, { headers: authHeaders() });
            toast.success(`${res.data?.saved ?? items.length} questions saved${res.data?.skipped ? `, ${res.data.skipped} skipped` : ''}`);
            setText('');
            onSaved();
        } catch (err) {
            toast.error(errMsg(err, 'Bulk save failed'));
        } finally { setSaving(false); }
    };

    return (
        <Modal
            open={open} onClose={() => !saving && onClose()} icon={FiUploadCloud} title="Bulk paste questions"
            subtitle="Separate questions with a blank line" size="xl" bodyClassName="p-4 md:p-6"
            footer={<div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex gap-2 text-xs"><Badge tone="green">{parsed.items.length} ready</Badge>{parsed.errors.length > 0 && <Badge tone="red">{parsed.errors.length} issues</Badge>}</div>
                <div className="flex gap-2 sm:ml-auto">
                    <button type="button" onClick={onClose} className="ui-btn-secondary">Cancel</button>
                    <button type="button" onClick={save} disabled={saving || !parsed.items.length} className="ui-btn-primary">{saving ? 'Saving…' : `Save ${parsed.items.length} to bank`}</button>
                </div>
            </div>}
        >
            <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Field label="Subject">
                        <select className="ui-input" value={shared.subjectId} onChange={e => setShared({ ...shared, subjectId: e.target.value })}>
                            <option value="">Select</option>{subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Class">
                        <select className="ui-input" value={shared.classId} onChange={e => setShared({ ...shared, classId: e.target.value })}>
                            <option value="">Any class</option>{classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Chapter"><input className="ui-input" value={shared.chapter} onChange={e => setShared({ ...shared, chapter: e.target.value })} /></Field>
                    <Field label="Difficulty">
                        <select className="ui-input" value={shared.difficulty} onChange={e => setShared({ ...shared, difficulty: e.target.value })}>
                            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </Field>
                    <Field label="Marks"><input type="number" min="0" className="ui-input" value={shared.marks} onChange={e => setShared({ ...shared, marks: e.target.value })} /></Field>
                    <Field label="Negative (MCQ)"><input type="number" min="0" step="0.25" className="ui-input" value={shared.negativeMarks} onChange={e => setShared({ ...shared, negativeMarks: e.target.value })} /></Field>
                    <Field label="Source">
                        <select className="ui-input" value={shared.source} onChange={e => setShared({ ...shared, source: e.target.value })}>
                            <option value="manual">Manual</option><option value="pyq">PYQ</option><option value="ai">AI</option>
                        </select>
                    </Field>
                </div>
                <Field label="Questions" hint='Format: question line(s), options "A) … D)", "Ans: B" (or a number for numerical), optional "Sol: …".'>
                    <textarea rows="12" className="ui-input font-mono !text-xs resize-y" value={text} onChange={e => setText(e.target.value)} placeholder={BULK_SAMPLE} />
                </Field>
                {parsed.errors.length > 0 && (
                    <ul className="rounded-xl bg-red-50 dark:bg-red-500/10 p-3 text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                        {parsed.errors.map((er, i) => <li key={i}>{er}</li>)}
                    </ul>
                )}
            </div>
        </Modal>
    );
};

/* ---------------- Build test from bank ---------------- */
export const BuildTestModal = ({ open, onClose, selectedIds, subjects, classes, batches, defaults, chapters, onBuilt }) => {
    // Mounted only while open, so initial state comes straight from props.
    const [mode, setMode] = useState(() => (selectedIds.length ? 'selected' : 'random'));
    const [form, setForm] = useState(() => ({ title: '', classId: defaults?.classId || '', subjectId: defaults?.subjectId || '', batchId: '', duration: 60 }));
    const [random, setRandom] = useState(() => ({ chapter: defaults?.chapter || '', difficulty: defaults?.difficulty || '', count: 10 }));
    const [saving, setSaving] = useState(false);
    if (!open) return null;

    const build = async (e) => {
        e.preventDefault();
        if (!form.classId || !form.subjectId) { toast.error('Class and subject are required'); return; }
        if (mode === 'selected' && !selectedIds.length) { toast.error('Select questions first'); return; }
        setSaving(true);
        try {
            const body = { title: form.title, classId: form.classId, subjectId: form.subjectId, duration: Number(form.duration) || 60 };
            if (form.batchId) body.batchId = form.batchId;
            if (mode === 'selected') body.questionIds = selectedIds;
            else body.random = { count: Number(random.count) || 10, ...(random.chapter ? { chapter: random.chapter } : {}), ...(random.difficulty ? { difficulty: random.difficulty } : {}) };
            const res = await axios.post(`${API}/question-bank/build-test`, body, { headers: authHeaders() });
            toast.success(`Draft test created with ${res.data?.test?.questions?.length || 0} questions`);
            onBuilt(res.data?.test);
        } catch (err) {
            toast.error(errMsg(err, 'Could not build the test'));
        } finally { setSaving(false); }
    };

    return (
        <Modal
            open={open} onClose={() => !saving && onClose()} icon={FiClipboard} title="Build test from bank"
            subtitle="Creates a draft test you can review and publish" size="lg" bodyClassName="p-4 md:p-6"
            footer={<div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="ui-btn-secondary">Cancel</button>
                <button type="submit" form="qb-build" disabled={saving} className="ui-btn-primary">{saving ? 'Building…' : 'Create draft test'}</button>
            </div>}
        >
            <form id="qb-build" onSubmit={build} className="space-y-4">
                <Segmented
                    value={mode} onChange={setMode}
                    options={[['selected', <span key="s" className="flex items-center gap-1.5"><FiCheckCircle /> Selected ({selectedIds.length})</span>], ['random', <span key="r" className="flex items-center gap-1.5"><FiShuffle /> Random pick</span>]]}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Test title" className="md:col-span-2"><input required className="ui-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Kinematics practice test" /></Field>
                    <Field label="Subject">
                        <select required className="ui-input" value={form.subjectId} onChange={e => setForm({ ...form, subjectId: e.target.value })}>
                            <option value="">Select subject</option>{subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Class">
                        <select required className="ui-input" value={form.classId} onChange={e => setForm({ ...form, classId: e.target.value })}>
                            <option value="">Select class</option>{classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Batch (optional)">
                        <select className="ui-input" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}>
                            <option value="">All batches</option>{batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                        </select>
                    </Field>
                    <Field label="Duration (minutes)"><input required type="number" min="1" className="ui-input" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></Field>
                </div>
                {mode === 'random' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-2xl bg-brand-50/50 dark:bg-brand-500/5 animate-fade-up">
                        <Field label="Chapter">
                            <select className="ui-input" value={random.chapter} onChange={e => setRandom({ ...random, chapter: e.target.value })}>
                                <option value="">Any chapter</option>
                                {chapters.filter(c => c.chapter).map(c => <option key={c.chapter} value={c.chapter}>{c.chapter} ({c.count})</option>)}
                            </select>
                        </Field>
                        <Field label="Difficulty">
                            <select className="ui-input" value={random.difficulty} onChange={e => setRandom({ ...random, difficulty: e.target.value })}>
                                <option value="">Any</option>{DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </Field>
                        <Field label="How many"><input type="number" min="1" max="300" className="ui-input" value={random.count} onChange={e => setRandom({ ...random, count: e.target.value })} /></Field>
                    </div>
                )}
                {mode === 'selected' && !selectedIds.length && (
                    <p className="text-xs font-semibold text-amber-600">Tick questions in the list first, or switch to Random pick.</p>
                )}
            </form>
        </Modal>
    );
};
