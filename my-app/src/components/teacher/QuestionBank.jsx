import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
    FiDatabase, FiPlus, FiUploadCloud, FiClipboard, FiSearch, FiEdit2, FiTrash2, FiChevronLeft,
    FiChevronRight, FiChevronDown, FiAlertCircle, FiRefreshCw, FiX
} from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { useI18n } from '../../i18n/useI18n';
import { API, authHeaders, errMsg, getTeacherId, idOf } from './teacherApi';
import { Badge, ConfirmButton, EmptyState, PageHeader, Spinner } from './TeacherUI';
import { BuildTestModal, BulkPasteModal, QuestionFormModal } from './QuestionBankModals';
import { DIFF_TONE, DIFFICULTIES, blankBankQuestion, fromBankItem } from './qbUtils';

const LIMIT = 20;

const QuestionRow = ({ q, checked, onToggle, onEdit, onDelete, canEdit }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className={`ui-card p-4 transition-all ${checked ? 'ring-2 ring-brand-400/60' : ''}`}>
            <div className="flex items-start gap-3">
                <input type="checkbox" checked={checked} onChange={onToggle} aria-label="Select question" className="mt-1 w-4 h-4 accent-[#f37021] shrink-0 cursor-pointer" />
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <Badge tone={q.type === 'numerical' ? 'dark' : 'brand'}>{q.type === 'numerical' ? 'Numerical' : 'MCQ'}</Badge>
                        {q.difficulty && <Badge tone={DIFF_TONE[q.difficulty]}>{q.difficulty}</Badge>}
                        {q.subjectId?.name && <Badge tone="grey">{q.subjectId.name}</Badge>}
                        {q.chapter && <Badge tone="grey">{q.chapter}</Badge>}
                        {q.source && q.source !== 'manual' && <Badge tone="amber">{q.source === 'pyq' ? `PYQ${q.year ? ` ${q.year}` : ''}` : 'AI'}</Badge>}
                        <span className="text-[11px] font-semibold text-gray-400">+{q.marks ?? 4}{Number(q.negativeMarks) ? ` / −${q.negativeMarks}` : ''}</span>
                    </div>
                    <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left">
                        <p className={`text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words ${open ? '' : 'line-clamp-2'}`}>{q.questionText}</p>
                    </button>
                    {open && (
                        <div className="mt-3 space-y-2 animate-fade-up">
                            {q.type === 'mcq' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                    {(q.options || []).map((o, i) => (
                                        <p key={i} className={`text-xs px-3 py-2 rounded-lg ${i === q.correctOption ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 font-bold' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300'}`}>
                                            {String.fromCharCode(65 + i)}. {o}
                                        </p>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs font-bold text-emerald-600">Answer: {q.correctAnswer}</p>
                            )}
                            {q.solution && <p className="text-xs text-gray-500 whitespace-pre-wrap rounded-lg bg-brand-50/50 dark:bg-white/5 p-3"><span className="font-bold text-brand-600">Solution: </span>{q.solution}</p>}
                            {q.tags?.length > 0 && <p className="text-[11px] text-gray-400">#{q.tags.join(' #')}</p>}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => setOpen(o => !o)} aria-label={open ? 'Collapse' : 'Expand'} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5">
                        <FiChevronDown className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {canEdit && (
                        <>
                            <button type="button" onClick={onEdit} aria-label="Edit question" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5"><FiEdit2 /></button>
                            <ConfirmButton onConfirm={onDelete} prompt="Delete?" title="Delete question" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><FiTrash2 /></ConfirmButton>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const QuestionBank = ({ teacherData, onTestBuilt }) => {
    const { t } = useI18n();
    const subjects = teacherData?.subjects || [];
    const classes = teacherData?.classes || [];
    const batches = teacherData?.batches || [];
    const myId = getTeacherId();

    const [filters, setFilters] = useState({ classId: '', subjectId: '', chapter: '', difficulty: '', type: '', q: '' });
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, pages: 1 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [chapters, setChapters] = useState([]);
    const [selected, setSelected] = useState([]);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formInitial, setFormInitial] = useState(null);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [buildOpen, setBuildOpen] = useState(false);

    // Debounce the search box
    useEffect(() => {
        const id = setTimeout(() => { setFilters(f => (f.q === search ? f : { ...f, q: search })); setPage(1); }, 350);
        return () => clearTimeout(id);
    }, [search]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { page, limit: LIMIT };
            Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
            const res = await axios.get(`${API}/question-bank`, { headers: authHeaders(), params });
            setData({ items: res.data?.items || [], total: res.data?.total || 0, pages: res.data?.pages || 1 });
            setError('');
        } catch (err) {
            setError(errMsg(err, 'Failed to load the question bank'));
        } finally {
            setLoading(false);
        }
    }, [filters, page]);

    const loadChapters = useCallback(async () => {
        try {
            const params = {};
            if (filters.subjectId) params.subjectId = filters.subjectId;
            if (filters.classId) params.classId = filters.classId;
            const res = await axios.get(`${API}/question-bank/chapters`, { headers: authHeaders(), params });
            setChapters(Array.isArray(res.data) ? res.data : []);
        } catch { setChapters([]); }
    }, [filters.subjectId, filters.classId]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { loadChapters(); }, [loadChapters]);

    const setFilter = (patch) => { setFilters(f => ({ ...f, ...patch })); setPage(1); };
    const toggle = (id) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
    const pageIds = data.items.map(q => q._id);
    const allOnPage = pageIds.length > 0 && pageIds.every(id => selected.includes(id));
    const togglePage = () => setSelected(s => (allOnPage ? s.filter(id => !pageIds.includes(id)) : [...new Set([...s, ...pageIds])]));

    const openAdd = () => {
        setEditing(null);
        setFormInitial(blankBankQuestion({ subjectId: filters.subjectId, classId: filters.classId, chapter: filters.chapter }));
        setFormOpen(true);
    };
    const openEdit = (q) => { setEditing(q._id); setFormInitial(fromBankItem(q)); setFormOpen(true); };

    const remove = async (id) => {
        try {
            await axios.delete(`${API}/question-bank/${id}`, { headers: authHeaders() });
            toast.success('Question deleted');
            setSelected(s => s.filter(x => x !== id));
            load(); loadChapters();
        } catch (err) { toast.error(errMsg(err, 'Failed to delete question')); }
    };

    const hasFilters = Object.values(filters).some(Boolean);

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiDatabase} eyebrow={t('teacher.group.teaching')} title={t('teacher.heading.questionBank')} subtitle={t('teacher.heading.questionBankSub')}
                actions={<>
                    <button type="button" onClick={() => setBulkOpen(true)} className="ui-btn-secondary"><FiUploadCloud /> {t('teacher.qb.bulk')}</button>
                    <button type="button" onClick={openAdd} className="ui-btn-primary"><FiPlus /> {t('teacher.qb.add')}</button>
                </>}
            />

            <div className="ui-card p-4 space-y-3">
                <div className="relative">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="ui-input !pl-10" placeholder="Search question text…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search questions" />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                    <select className="ui-input" aria-label="Class" value={filters.classId} onChange={e => setFilter({ classId: e.target.value, chapter: '' })}>
                        <option value="">All classes</option>{classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                    <select className="ui-input" aria-label="Subject" value={filters.subjectId} onChange={e => setFilter({ subjectId: e.target.value, chapter: '' })}>
                        <option value="">All subjects</option>{subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                    <select className="ui-input" aria-label="Chapter" value={filters.chapter} onChange={e => setFilter({ chapter: e.target.value })}>
                        <option value="">All chapters</option>
                        {chapters.filter(c => c.chapter).map(c => <option key={c.chapter} value={c.chapter}>{c.chapter} ({c.count})</option>)}
                    </select>
                    <select className="ui-input" aria-label="Difficulty" value={filters.difficulty} onChange={e => setFilter({ difficulty: e.target.value })}>
                        <option value="">Any difficulty</option>{DIFFICULTIES.map(d => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}
                    </select>
                    <select className="ui-input col-span-2 md:col-span-1" aria-label="Type" value={filters.type} onChange={e => setFilter({ type: e.target.value })}>
                        <option value="">MCQ + numerical</option><option value="mcq">MCQ only</option><option value="numerical">Numerical only</option>
                    </select>
                </div>
                {hasFilters && (
                    <button type="button" onClick={() => { setSearch(''); setFilter({ classId: '', subjectId: '', chapter: '', difficulty: '', type: '', q: '' }); }} className="text-xs font-bold text-brand-600 hover:underline inline-flex items-center gap-1">
                        <FiX /> Clear filters
                    </button>
                )}
            </div>

            {/* Selection / build bar */}
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2.5 ui-glass rounded-2xl px-4 py-3 border border-gray-100 dark:border-white/5">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 cursor-pointer">
                    <input type="checkbox" checked={allOnPage} onChange={togglePage} className="w-4 h-4 accent-[#f37021]" /> Select page
                </label>
                <Badge tone={selected.length ? 'brand' : 'grey'}>{selected.length} selected</Badge>
                {selected.length > 0 && <button type="button" onClick={() => setSelected([])} className="text-xs font-bold text-gray-500 hover:text-gray-800">Clear</button>}
                <span className="text-xs text-gray-400 ml-auto hidden sm:inline">{data.total} question{data.total === 1 ? '' : 's'}</span>
                <button type="button" onClick={() => setBuildOpen(true)} className="ui-btn-dark !py-2 text-xs w-full sm:w-auto"><FiClipboard /> {t('teacher.qb.build')}</button>
            </div>

            {loading ? (
                <Spinner label="Loading questions…" rows={5} />
            ) : error ? (
                <EmptyState icon={FiAlertCircle} title={error} action={<button type="button" onClick={load} className="ui-btn-secondary"><FiRefreshCw /> Try again</button>} />
            ) : data.items.length === 0 ? (
                <EmptyState
                    icon={FiDatabase}
                    title={hasFilters ? 'No questions match these filters' : 'Your question bank is empty'}
                    hint={hasFilters ? '' : 'Add questions one by one, paste many at once, or save AI-generated questions from the test builder.'}
                    action={!hasFilters && <button type="button" onClick={openAdd} className="ui-btn-primary"><FiPlus /> {t('teacher.qb.add')}</button>}
                />
            ) : (
                <div key={`${page}-${JSON.stringify(filters)}`} className="space-y-3 ui-stagger">
                    {data.items.map(q => (
                        <QuestionRow
                            key={q._id} q={q} checked={selected.includes(q._id)} onToggle={() => toggle(q._id)}
                            canEdit={!q.createdBy || idOf(q.createdBy) === myId}
                            onEdit={() => openEdit(q)} onDelete={() => remove(q._id)}
                        />
                    ))}
                </div>
            )}

            {data.pages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="ui-btn-secondary !px-3 !py-2" aria-label="Previous page"><FiChevronLeft /></button>
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300 tabular-nums">Page {page} / {data.pages}</span>
                    <button type="button" disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="ui-btn-secondary !px-3 !py-2" aria-label="Next page"><FiChevronRight /></button>
                </div>
            )}

            {formOpen && (
                <QuestionFormModal
                    open editing={editing} initial={formInitial} subjects={subjects} classes={classes} chapters={chapters}
                    onClose={() => setFormOpen(false)}
                    onSaved={() => { setFormOpen(false); load(); loadChapters(); }}
                />
            )}
            {bulkOpen && (
                <BulkPasteModal
                    open subjects={subjects} classes={classes} defaults={filters}
                    onClose={() => setBulkOpen(false)}
                    onSaved={() => { setBulkOpen(false); load(); loadChapters(); }}
                />
            )}
            {buildOpen && (
                <BuildTestModal
                    open selectedIds={selected} subjects={subjects} classes={classes} batches={batches} defaults={filters} chapters={chapters}
                    onClose={() => setBuildOpen(false)}
                    onBuilt={(test) => { setBuildOpen(false); setSelected([]); onTestBuilt?.(test); }}
                />
            )}
        </div>
    );
};

export default QuestionBank;
