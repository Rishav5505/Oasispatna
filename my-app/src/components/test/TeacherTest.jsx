import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import config from '../../config';
import {
    FiClipboard, FiPlus, FiX, FiTrash2, FiBarChart2, FiFileText, FiEdit2, FiZap, FiAward,
    FiUsers, FiMinusCircle, FiExternalLink, FiUploadCloud, FiCheck, FiCheckCircle, FiDatabase, FiLayers, FiTarget
} from 'react-icons/fi';
import { notify, toast } from '../../utils/notify';
import { useI18n } from '../../i18n/useI18n';
import { authHeaders, errMsg, fileHref, getTeacherId, idOf } from '../teacher/teacherApi';
import { Avatar, Badge, ConfirmButton, EmptyState, Field, Modal, PageHeader, Segmented, Spinner } from '../teacher/TeacherUI';

const blankQuestion = () => ({ type: 'mcq', questionText: '', options: ['', '', '', ''], correctOption: 0, correctAnswer: '', marks: 4, negativeMarks: '', section: '' });

// JEE Main: 3 sections x (20 MCQ +4/-1 + 5 numerical +4/0), 180 min
const JEE_SECTIONS = ['Physics', 'Chemistry', 'Mathematics'];
const SECTION_TONE = { Physics: 'brand', Chemistry: 'dark', Mathematics: 'amber' };
const jeeNegative = (type) => (type === 'numerical' ? 0 : 1);
const jeeTemplate = (placeholders) => JEE_SECTIONS.flatMap(section => Array.from({ length: 25 }, (_, i) => {
    const type = i < 20 ? 'mcq' : 'numerical';
    return {
        ...blankQuestion(), type, section, marks: 4, negativeMarks: jeeNegative(type),
        questionText: placeholders ? `${section} Q${i + 1}` : '',
        options: placeholders && type === 'mcq' ? ['A', 'B', 'C', 'D'] : ['', '', '', ''],
    };
}));
// Consecutive thirds -> Physics / Chemistry / Mathematics
const autoSections = (qs) => {
    const per = Math.ceil(qs.length / 3) || 1;
    return qs.map((q, i) => ({ ...q, section: JEE_SECTIONS[Math.min(2, Math.floor(i / per))] }));
};

const emptyTest = () => ({
    title: '',
    description: '',
    subjectId: '',
    classId: '',
    batchId: '',
    duration: 30,
    negativeMarks: 0,
    status: 'active',
    questionPaperUrl: null,
    pattern: 'custom',
    isMock: false,
    questions: [blankQuestion()]
});

const STATUS_TONE = { draft: 'grey', active: 'brand', completed: 'dark' };
const STATUSES = ['draft', 'active', 'completed'];

const isBlankQuestion = (q) => !q.questionText?.trim() && (q.options || []).every(o => !String(o).trim());

const fmtSeconds = (s) => {
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) return '—';
    return `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}`;
};

// Numbered step heading used inside the test builder.
const StepTitle = ({ n, title, hint, compact = false }) => (
    <div className={`flex items-center gap-3 ${compact ? '' : 'mb-4'}`}>
        <span className="w-7 h-7 rounded-full bg-ink-900 dark:bg-white/10 text-white text-xs font-extrabold flex items-center justify-center shrink-0">{n}</span>
        <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">{title}</h4>
            {hint && <p className="text-[11px] text-gray-500">{hint}</p>}
        </div>
    </div>
);

const TeacherTest = ({ teacherData, focusTestId, onFocusHandled }) => {
    const { t } = useI18n();
    const [tests, setTests] = useState([]);
    const [highlightId, setHighlightId] = useState(null);
    // "Build test from bank" hands us a new draft test id to open once the list loads
    const focusRef = useRef(focusTestId);
    const openEditRef = useRef(null);
    const onFocusHandledRef = useRef(onFocusHandled);
    useEffect(() => { onFocusHandledRef.current = onFocusHandled; }, [onFocusHandled]);
    const [loadingTests, setLoadingTests] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [statusBusy, setStatusBusy] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);

    const subjects = teacherData?.subjects || [];
    const classes = teacherData?.classes || [];
    const batches = teacherData?.batches || [];

    const [testMode, setTestMode] = useState('manual'); // 'manual' or 'upload'
    const [questionFile, setQuestionFile] = useState(null);
    const [numQuestions, setNumQuestions] = useState(1);
    const [newTest, setNewTest] = useState(emptyTest);

    // AI generator
    const [aiOpen, setAiOpen] = useState(false);
    const [ai, setAi] = useState({ topic: '', count: 5, difficulty: 'medium' });
    const [aiLoading, setAiLoading] = useState(false);
    const [bankSaving, setBankSaving] = useState(false);

    // Results drawer
    const [viewing, setViewing] = useState(null); // test object
    const [resultsTab, setResultsTab] = useState('leaderboard');
    const [results, setResults] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [loadingResults, setLoadingResults] = useState(false);

    const fetchTests = useCallback(async () => {
        const teacherId = getTeacherId();
        if (!teacherId) { setLoadingTests(false); return; }
        try {
            const res = await axios.get(`${config.API_URL}/tests/teacher/${teacherId}`, { headers: authHeaders() });
            const list = Array.isArray(res.data) ? res.data : [];
            setTests(list);
            const fid = focusRef.current;
            if (fid) {
                focusRef.current = null;
                const found = list.find(x => x._id === fid);
                if (found) {
                    setStatusFilter('all');
                    setHighlightId(fid);
                    openEditRef.current?.(found);
                }
                onFocusHandledRef.current?.();
            }
        } catch (err) {
            console.error('Error fetching tests:', err);
            notify(errMsg(err, 'Failed to load tests'));
        } finally {
            setLoadingTests(false);
        }
    }, []);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    // ---------- builder helpers (immutable) ----------
    const setQuestions = (fn) => setNewTest(t => ({ ...t, questions: fn(t.questions) }));
    const updateQuestion = (index, patch) => setQuestions(qs => qs.map((q, i) => (i === index ? { ...q, ...patch } : q)));
    const handleAddQuestion = () => setQuestions(qs => [...qs, blankQuestion()]);
    const handleRemoveQuestion = (index) => setQuestions(qs => qs.filter((_, i) => i !== index));
    const handleOptionChange = (qIndex, oIndex, value) =>
        setQuestions(qs => qs.map((q, i) => (i === qIndex ? { ...q, options: q.options.map((o, j) => (j === oIndex ? value : o)) } : q)));

    const generateAnswerSheet = (count) => {
        const n = Math.max(1, Math.min(200, Number(count) || 1));
        setQuestions(() => Array.from({ length: n }, (_, i) => ({
            ...blankQuestion(),
            questionText: `Question ${i + 1}`,
            options: ['A', 'B', 'C', 'D'],
        })));
    };

    const openCreate = () => {
        setEditingId(null);
        setNewTest(emptyTest());
        setTestMode('manual');
        setQuestionFile(null);
        setAiOpen(false);
        setIsModalOpen(true);
    };

    const openEdit = (test) => {
        const sectionOf = {};
        (test.sections || []).forEach(sec => (sec.questionIndexes || []).forEach(i => { sectionOf[i] = sec.name; }));
        setEditingId(test._id);
        setNewTest({
            title: test.title || '',
            description: test.description || '',
            subjectId: idOf(test.subjectId),
            classId: idOf(test.classId),
            batchId: idOf(test.batchId),
            duration: test.duration || 30,
            negativeMarks: test.negativeMarks ?? 0,
            status: test.status || 'active',
            questionPaperUrl: test.questionPaperUrl || null,
            pattern: test.pattern || 'custom',
            isMock: !!test.isMock,
            questions: (test.questions?.length ? test.questions : [blankQuestion()]).map((q, qi) => {
                const opts = [...(q.options || [])];
                while (opts.length < 4) opts.push('');
                return {
                    type: q.type || 'mcq',
                    questionText: q.questionText || '',
                    options: opts.slice(0, 4),
                    correctOption: q.correctOption ?? 0,
                    correctAnswer: q.correctAnswer ?? '',
                    marks: q.marks ?? 4,
                    negativeMarks: q.negativeMarks ?? '',
                    section: sectionOf[qi] || '',
                    solution: q.solution || '',
                    chapter: q.chapter || '',
                    bankItemId: q.bankItemId || undefined,
                    _id: q._id,
                };
            })
        });
        setTestMode(test.questionPaperUrl ? 'upload' : 'manual');
        setQuestionFile(null);
        setAiOpen(false);
        setIsModalOpen(true);
    };

    useEffect(() => { openEditRef.current = openEdit; });

    // ---------- pattern ----------
    const setPattern = (pattern) => {
        if (pattern === newTest.pattern) return;
        if (pattern === 'jee_main') {
            setNewTest(tst => ({
                ...tst, pattern, isMock: true, duration: 180, negativeMarks: 0,
                questions: autoSections(tst.questions).map(q => ({ ...q, negativeMarks: q.negativeMarks === '' ? jeeNegative(q.type) : q.negativeMarks })),
            }));
            notify('JEE Main pattern: 180 min, +4/−1 MCQ, +4/0 numerical. Load the 75-question template or assign sections.');
        } else {
            setNewTest(tst => ({ ...tst, pattern, isMock: false, questions: tst.questions.map(q => ({ ...q, section: '' })) }));
        }
    };
    const loadJeeTemplate = () => {
        setQuestions(() => jeeTemplate(testMode === 'upload'));
        notify('JEE Main template added: 75 questions in 3 sections');
    };
    const changeType = (qIndex, type) => updateQuestion(qIndex, newTest.pattern === 'jee_main'
        ? { type, negativeMarks: jeeNegative(type) }
        : { type });

    // ---------- save AI questions to the bank ----------
    const saveToBank = async (indexes) => {
        if (!newTest.subjectId) { toast.error('Select a subject first'); return; }
        const picked = indexes.map(i => newTest.questions[i]).filter(Boolean);
        const bad = picked.find(q => !q.questionText.trim() || (q.type === 'mcq' && q.options.some(o => !String(o).trim())));
        if (bad) { toast.error('Complete the question text and all options before saving'); return; }
        setBankSaving(true);
        try {
            const items = picked.map(q => ({
                type: q.type, questionText: q.questionText, solution: q.solution || '',
                ...(q.type === 'mcq' ? { options: q.options, correctOption: Number(q.correctOption) } : { correctAnswer: Number(q.correctAnswer) }),
                marks: Number(q.marks) || 4,
                negativeMarks: q.negativeMarks !== '' && q.negativeMarks != null ? Number(q.negativeMarks) : (q.type === 'mcq' ? 1 : 0),
            }));
            const body = { items, subjectId: newTest.subjectId, source: 'ai', difficulty: ai.difficulty, chapter: ai.topic.trim() };
            if (newTest.classId) body.classId = newTest.classId;
            const res = await axios.post(`${config.API_URL}/question-bank/bulk`, body, { headers: authHeaders() });
            setQuestions(qs => qs.map((q, i) => (indexes.includes(i) ? { ...q, bankSaved: true } : q)));
            toast.success(`${res.data?.saved ?? items.length} question${items.length === 1 ? '' : 's'} saved to the bank`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not save to the question bank'));
        } finally {
            setBankSaving(false);
        }
    };

    const closeModal = () => {
        if (saving) return;
        setIsModalOpen(false);
        setEditingId(null);
    };

    // ---------- AI generation ----------
    const handleGenerateAI = async () => {
        const subjectName = subjects.find(s => s._id === newTest.subjectId)?.name;
        if (!subjectName) { notify('Please select a Subject before generating questions'); return; }
        if (!ai.topic.trim()) { notify('Please enter a topic for the AI'); return; }
        setAiLoading(true);
        try {
            const res = await axios.post(`${config.API_URL}/ai-buddy/generate-questions`, {
                subject: subjectName,
                topic: ai.topic.trim(),
                count: Math.max(1, Math.min(20, Number(ai.count) || 5)),
                difficulty: ai.difficulty
            }, { headers: authHeaders() });
            const generated = (res.data?.questions || []).map(q => {
                const opts = [...(q.options || [])].map(String);
                while (opts.length < 4) opts.push('');
                return {
                    ...blankQuestion(),
                    questionText: q.questionText || '',
                    options: opts.slice(0, 4),
                    correctOption: Number.isInteger(q.correctOption) ? q.correctOption : 0,
                    marks: q.marks ?? 4,
                    solution: q.solution || q.explanation || '',
                    fromAI: true,
                    ...(newTest.pattern === 'jee_main' ? { negativeMarks: 1 } : {}),
                };
            });
            if (!generated.length) { notify('AI returned no questions. Please try a different topic'); return; }
            setQuestions(qs => {
                const merged = [...qs.filter(q => !isBlankQuestion(q)), ...generated];
                return newTest.pattern === 'jee_main' ? autoSections(merged) : merged;
            });
            setTestMode('manual');
            notify(`${generated.length} AI questions added — please review them before publishing`);
        } catch (err) {
            notify(errMsg(err, 'AI generation failed. Please try again'));
        } finally {
            setAiLoading(false);
        }
    };

    // ---------- save ----------
    const handleSubmit = async (e) => {
        e?.preventDefault();
        if (!newTest.subjectId || !newTest.classId) {
            notify('Please select BOTH Subject and Class before publishing.');
            return;
        }
        if (!newTest.questions.length) {
            notify('Please add at least one question');
            return;
        }
        const badNumerical = newTest.questions.findIndex(q => q.type === 'numerical' && (q.correctAnswer === '' || !Number.isFinite(Number(q.correctAnswer))));
        if (badNumerical >= 0) {
            notify(`Please enter the correct numerical answer for Q${badNumerical + 1}`);
            return;
        }
        if (testMode === 'upload' && !questionFile && !newTest.questionPaperUrl) {
            notify('Please upload the question paper (PDF/Image)');
            return;
        }

        setSaving(true);
        try {
            let paperUrl = testMode === 'upload' ? newTest.questionPaperUrl : null;
            if (testMode === 'upload' && questionFile) {
                const formData = new FormData();
                formData.append('file', questionFile);
                const uploadRes = await axios.post(`${config.API_URL}/tests/upload`, formData, {
                    headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' }
                });
                paperUrl = uploadRes.data.url;
            }

            const isJee = newTest.pattern === 'jee_main';
            if (isJee) {
                const unassigned = newTest.questions.findIndex(q => !q.section);
                if (unassigned >= 0) { notify(`Please assign a section to Q${unassigned + 1}`); setSaving(false); return; }
            }
            const questions = newTest.questions.map(q => {
                const base = q.type === 'numerical'
                    ? { type: 'numerical', questionText: q.questionText, options: [], correctOption: 0, correctAnswer: Number(q.correctAnswer), marks: Number(q.marks) || 0 }
                    : { type: 'mcq', questionText: q.questionText, options: q.options, correctOption: Number(q.correctOption), marks: Number(q.marks) || 0 };
                if (q.negativeMarks !== '' && q.negativeMarks != null && Number.isFinite(Number(q.negativeMarks))) base.negativeMarks = Math.abs(Number(q.negativeMarks));
                if (q.solution) base.solution = q.solution;
                if (q.chapter) base.chapter = q.chapter;
                if (q.bankItemId) base.bankItemId = q.bankItemId;
                if (q._id) base._id = q._id;
                return base;
            });
            const sectionNames = [...new Set([...JEE_SECTIONS, ...newTest.questions.map(q => q.section).filter(Boolean)])];
            const sections = isJee
                ? sectionNames.map(name => ({ name, questionIndexes: newTest.questions.map((q, i) => (q.section === name ? i : -1)).filter(i => i >= 0) })).filter(sec => sec.questionIndexes.length)
                : [];

            const testPayload = {
                title: newTest.title,
                description: newTest.description,
                subjectId: newTest.subjectId,
                classId: newTest.classId,
                duration: Number(newTest.duration) || 30,
                negativeMarks: Math.abs(Number(newTest.negativeMarks) || 0),
                status: newTest.status,
                totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
                questionPaperUrl: paperUrl,
                questions,
                pattern: newTest.pattern || 'custom',
                isMock: isJee || !!newTest.isMock,
                sections,
            };
            if (newTest.batchId) testPayload.batchId = newTest.batchId;

            if (editingId) {
                await axios.put(`${config.API_URL}/tests/${editingId}`, testPayload, { headers: authHeaders() });
                notify('Test updated successfully!');
            } else {
                await axios.post(`${config.API_URL}/tests`, testPayload, { headers: authHeaders() });
                notify(newTest.status === 'draft' ? 'Test saved as draft' : 'Test created successfully!');
            }
            setIsModalOpen(false);
            setEditingId(null);
            fetchTests();
        } catch (err) {
            console.error('Error saving test:', err);
            notify(`Error: ${errMsg(err, 'Failed to save test')}`);
        } finally {
            setSaving(false);
        }
    };

    // ---------- list actions ----------
    const handleStatusChange = async (test, status) => {
        if (test.status === status) return;
        const prev = test.status;
        setStatusBusy(test._id);
        setTests(ts => ts.map(t => (t._id === test._id ? { ...t, status } : t)));
        try {
            await axios.patch(`${config.API_URL}/tests/${test._id}/status`, { status }, { headers: authHeaders() });
            notify(`Test marked ${status}`);
        } catch (err) {
            setTests(ts => ts.map(t => (t._id === test._id ? { ...t, status: prev } : t)));
            notify(errMsg(err, 'Failed to update status'));
        } finally {
            setStatusBusy(null);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${config.API_URL}/tests/${id}`, { headers: authHeaders() });
            setTests(ts => ts.filter(t => t._id !== id));
            notify('Test deleted');
        } catch (err) {
            notify(errMsg(err, 'Failed to delete test'));
        }
    };

    const openResults = async (test) => {
        setViewing(test);
        setResultsTab('leaderboard');
        setResults([]);
        setLeaderboard([]);
        setLoadingResults(true);
        const headers = authHeaders();
        const [r, lb] = await Promise.allSettled([
            axios.get(`${config.API_URL}/tests/${test._id}/results`, { headers }),
            axios.get(`${config.API_URL}/tests/${test._id}/leaderboard`, { headers })
        ]);
        if (r.status === 'fulfilled') setResults(Array.isArray(r.value.data) ? r.value.data : []);
        if (lb.status === 'fulfilled') setLeaderboard(Array.isArray(lb.value.data) ? lb.value.data : []);
        if (r.status === 'rejected' && lb.status === 'rejected') notify(errMsg(r.reason, 'Failed to load results'));
        setLoadingResults(false);
    };

    const counts = STATUSES.reduce((acc, s) => ({ ...acc, [s]: tests.filter(t => (t.status || 'draft') === s).length }), {});
    const visibleTests = statusFilter === 'all' ? tests : tests.filter(t => (t.status || 'draft') === statusFilter);
    const totalMarks = newTest.questions.reduce((sum, q) => sum + (Number(q.marks) || 0), 0);

    const sectionAverages = (() => {
        const acc = {};
        results.forEach(r => (r.sectionScores || []).forEach(sec => {
            if (!acc[sec.name]) acc[sec.name] = { name: sec.name, total: 0, max: 0, n: 0 };
            acc[sec.name].total += Number(sec.score) || 0;
            acc[sec.name].max = Math.max(acc[sec.name].max, Number(sec.max) || 0);
            acc[sec.name].n += 1;
        }));
        return Object.values(acc).map(a => ({ ...a, avg: a.n ? Math.round((a.total / a.n) * 10) / 10 : 0 }));
    })();

    const avgPct = results.length
        ? Math.round(results.reduce((s, r) => s + (r.totalMarks ? (r.score / r.totalMarks) * 100 : 0), 0) / results.length)
        : 0;

    const subjectName = subjects.find(s => s._id === newTest.subjectId)?.name;
    const isJee = newTest.pattern === 'jee_main';
    const unsavedAI = newTest.questions.map((q, i) => (q.fromAI && !q.bankSaved ? i : -1)).filter(i => i >= 0);
    const sectionCounts = JEE_SECTIONS.map(name => [name, newTest.questions.filter(q => q.section === name).length]);
    const hasContent = newTest.questions.some(q => !isBlankQuestion(q));

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiClipboard}
                eyebrow="Teaching"
                title="Online tests"
                subtitle="Create, schedule and analyse JEE-style assessments."
                actions={<button type="button" onClick={openCreate} className="ui-btn-primary"><FiPlus /> Create test</button>}
            />

            <Segmented
                value={statusFilter}
                onChange={setStatusFilter}
                options={[['all', 'All', tests.length], ...STATUSES.map(s => [s, s.charAt(0).toUpperCase() + s.slice(1), counts[s]])]}
            />

            {loadingTests ? (
                <Spinner label="Loading your tests..." variant="grid" />
            ) : visibleTests.length === 0 ? (
                <EmptyState
                    icon={FiClipboard}
                    title={tests.length ? `No ${statusFilter} tests` : 'No tests created yet'}
                    hint={tests.length ? '' : 'Build one manually, upload a paper with an answer key, or let AI draft questions for you.'}
                    action={!tests.length && <button type="button" onClick={openCreate} className="ui-btn-primary"><FiPlus /> Create first test</button>}
                />
            ) : (
                <div key={statusFilter} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 ui-stagger">
                    {visibleTests.map(test => {
                        const status = test.status || 'draft';
                        return (
                            <div key={test._id} className={`group ui-card ui-card-hover p-5 flex flex-col relative overflow-hidden ${highlightId === test._id ? 'ring-2 ring-brand-500 shadow-brand-glow' : ''}`}>
                                <div className={`absolute inset-x-0 top-0 h-1 ${status === 'active' ? 'bg-brand-gradient' : status === 'completed' ? 'bg-ink-900 dark:bg-white/30' : 'bg-gray-200 dark:bg-white/10'}`} />
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0 group-hover:rotate-6 transition-transform">
                                            {test.questionPaperUrl ? <FiFileText /> : <FiClipboard />}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">{test.title}</h3>
                                            <p className="text-xs text-gray-500 truncate">{test.subjectId?.name || 'Academic'} · {test.classId?.name || 'Class'}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <Badge tone={STATUS_TONE[status]} dot={status === 'active'}>{status}</Badge>
                                        {test.isMock && <Badge tone="amber"><FiTarget /> {test.pattern === 'jee_main' ? 'JEE Main' : 'Mock'}</Badge>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    {[['Questions', test.questions?.length || 0], ['Marks', test.totalMarks || 0], ['Minutes', test.duration]].map(([label, val]) => (
                                        <div key={label} className="rounded-xl bg-gray-50 dark:bg-white/5 py-2 text-center">
                                            <p className="text-base font-extrabold text-gray-900 dark:text-white tabular-nums">{val}</p>
                                            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                                        </div>
                                    ))}
                                </div>
                                {Number(test.negativeMarks) > 0 && (
                                    <p className="mt-2 text-[11px] font-semibold text-red-500 flex items-center gap-1"><FiMinusCircle /> −{test.negativeMarks} per wrong answer</p>
                                )}

                                <div className="mt-4">
                                    <Segmented
                                        size="sm"
                                        className="w-full [&>button]:flex-1 [&>button]:justify-center"
                                        value={status}
                                        onChange={(s) => statusBusy !== test._id && handleStatusChange(test, s)}
                                        options={STATUSES.map(s => [s, s.charAt(0).toUpperCase() + s.slice(1)])}
                                    />
                                </div>

                                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5 mt-auto">
                                    <button type="button" onClick={() => openResults(test)} className="ui-btn-dark flex-1 !py-2 text-xs">
                                        <FiBarChart2 /> Results
                                    </button>
                                    <button type="button" onClick={() => openEdit(test)} title="Edit test" aria-label="Edit test" className="ui-btn-secondary !px-3 !py-2">
                                        <FiEdit2 />
                                    </button>
                                    <ConfirmButton
                                        onConfirm={() => handleDelete(test._id)}
                                        prompt="Delete test & results?"
                                        title="Delete test"
                                        className="ui-btn-secondary !px-3 !py-2 hover:!text-red-500 hover:!border-red-200"
                                    >
                                        <FiTrash2 />
                                    </ConfirmButton>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create / Edit Test Modal */}
            <Modal
                open={isModalOpen}
                onClose={closeModal}
                icon={FiClipboard}
                title={editingId ? 'Edit test' : 'Test builder'}
                subtitle={`${newTest.questions.length} question${newTest.questions.length === 1 ? '' : 's'} · ${totalMarks} marks`}
                size="xl"
                dismissible={false}
                bodyClassName="p-4 md:p-6 bg-gray-50/60 dark:bg-transparent"
                footer={
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Badge tone="brand">{newTest.questions.length} Qs</Badge>
                            <Badge tone="grey">{totalMarks} marks</Badge>
                            <Badge tone={newTest.status === 'draft' ? 'grey' : 'green'}>{newTest.status}</Badge>
                        </div>
                        <div className="flex gap-2 sm:ml-auto">
                            <button type="button" onClick={closeModal} className="ui-btn-secondary flex-1 sm:flex-none">Cancel</button>
                            <button type="submit" form="test-form" disabled={saving} className="ui-btn-primary flex-1 sm:flex-none">
                                {saving ? 'Saving…' : editingId ? 'Save changes' : newTest.status === 'draft' ? 'Save as draft' : 'Publish test'}
                            </button>
                        </div>
                    </div>
                }
            >
                <form id="test-form" onSubmit={handleSubmit} className="space-y-5">
                    {/* Step 1 — details */}
                    <section className="ui-card p-4 md:p-5">
                        <StepTitle n={1} title="Test details" hint="Who it's for and how it's scored" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            {[
                                { k: 'custom', icon: FiClipboard, label: 'Custom test', hint: 'Your own marking & duration' },
                                { k: 'jee_main', icon: FiTarget, label: 'JEE Main mock', hint: '3 sections · 75 Qs · 180 min · +4/−1' },
                            ].map(opt => {
                                const on = (newTest.pattern || 'custom') === opt.k;
                                return (
                                    <button key={opt.k} type="button" onClick={() => setPattern(opt.k)} aria-pressed={on}
                                        className={`text-left p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${on ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-gray-100 dark:border-white/10 hover:border-brand-200'}`}>
                                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}><opt.icon /></span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-bold text-gray-900 dark:text-white">{opt.label}</span>
                                            <span className="block text-[11px] text-gray-500">{opt.hint}</span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                            <Field label="Test title" className="md:col-span-3">
                                <input required type="text" placeholder="e.g. Weekly Physics Quiz – Kinematics" className="ui-input" value={newTest.title} onChange={(e) => setNewTest({ ...newTest, title: e.target.value })} />
                            </Field>
                            <Field label="Subject">
                                <select required className="ui-input" value={newTest.subjectId} onChange={(e) => setNewTest({ ...newTest, subjectId: e.target.value })}>
                                    <option value="">Select subject</option>
                                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Target class">
                                <select required className="ui-input" value={newTest.classId} onChange={(e) => setNewTest({ ...newTest, classId: e.target.value })}>
                                    <option value="">Select class</option>
                                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Batch (optional)">
                                <select className="ui-input" value={newTest.batchId} onChange={(e) => setNewTest({ ...newTest, batchId: e.target.value })}>
                                    <option value="">All batches</option>
                                    {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Duration (minutes)">
                                <input required type="number" min="1" className="ui-input" value={newTest.duration} onChange={(e) => setNewTest({ ...newTest, duration: e.target.value })} />
                            </Field>
                            <Field label={isJee ? 'Negative marks (per question below)' : 'Negative marks / wrong'}>
                                <input type="number" min="0" step="0.25" className="ui-input" value={newTest.negativeMarks} onChange={(e) => setNewTest({ ...newTest, negativeMarks: e.target.value })} />
                            </Field>
                            <Field label="Status">
                                <select className="ui-input" value={newTest.status} onChange={(e) => setNewTest({ ...newTest, status: e.target.value })}>
                                    <option value="active">Active (visible to students)</option>
                                    <option value="draft">Draft (hidden)</option>
                                    {editingId && <option value="completed">Completed</option>}
                                </select>
                            </Field>
                            <Field label="Instructions (optional)" className="md:col-span-3">
                                <textarea rows="2" placeholder="e.g. +4 for correct, -1 for wrong. Numerical answers up to 2 decimals." className="ui-input resize-none" value={newTest.description} onChange={(e) => setNewTest({ ...newTest, description: e.target.value })} />
                            </Field>
                        </div>
                    </section>

                    {/* Step 2 — source */}
                    <section className="ui-card p-4 md:p-5">
                        <StepTitle n={2} title="How will you add questions?" hint="Type them, upload a paper with an answer key, or let AI draft them" />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {[
                                { k: 'manual', icon: FiEdit2, label: 'Manual entry', hint: 'Type MCQ / numerical questions' },
                                { k: 'upload', icon: FiUploadCloud, label: 'Upload paper', hint: 'PDF/image + answer key' },
                            ].map(opt => {
                                const on = testMode === opt.k;
                                return (
                                    <button
                                        key={opt.k}
                                        type="button"
                                        onClick={() => setTestMode(opt.k)}
                                        aria-pressed={on}
                                        className={`text-left p-3.5 rounded-2xl border-2 transition-all flex items-center gap-3 ${on ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-gray-100 dark:border-white/10 hover:border-brand-200'}`}
                                    >
                                        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${on ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}><opt.icon /></span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-bold text-gray-900 dark:text-white">{opt.label}</span>
                                            <span className="block text-[11px] text-gray-500">{opt.hint}</span>
                                        </span>
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                onClick={() => setAiOpen(o => !o)}
                                aria-pressed={aiOpen}
                                className={`text-left p-[2px] rounded-2xl bg-brand-gradient bg-[length:200%_auto] animate-gradient-x transition-all ${aiOpen ? 'shadow-brand-glow' : 'opacity-90 hover:opacity-100'}`}
                            >
                                <span className={`h-full p-3 rounded-[14px] flex items-center gap-3 ${aiOpen ? 'bg-transparent text-white' : 'bg-white dark:bg-ink-900'}`}>
                                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${aiOpen ? 'bg-white/20' : 'bg-brand-gradient text-white'}`}><FiZap /></span>
                                    <span className="min-w-0">
                                        <span className={`block text-sm font-bold ${aiOpen ? '' : 'text-gray-900 dark:text-white'}`}>Generate with AI</span>
                                        <span className={`block text-[11px] ${aiOpen ? 'text-white/80' : 'text-gray-500'}`}>Draft questions from a topic</span>
                                    </span>
                                </span>
                            </button>
                        </div>

                        {/* AI panel */}
                        {aiOpen && (
                            <div className="mt-4 p-[1.5px] rounded-2xl bg-brand-gradient bg-[length:200%_auto] animate-gradient-x animate-fade-up">
                                <div className="rounded-[15px] bg-white dark:bg-ink-900 p-4 md:p-5 space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <FiZap className="text-brand-500" />
                                        <h4 className="font-extrabold text-sm ui-gradient-text">AI question generator</h4>
                                        <span className={`ml-auto ui-badge ${subjectName ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'bg-amber-50 text-amber-700'}`}>
                                            {subjectName ? `Subject: ${subjectName}` : 'Select a subject in step 1'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                        <Field label="Topic" className="md:col-span-2">
                                            <input className="ui-input" placeholder="e.g. Projectile motion" value={ai.topic} onChange={e => setAi({ ...ai, topic: e.target.value })} />
                                        </Field>
                                        <Field label="Difficulty">
                                            <select className="ui-input" value={ai.difficulty} onChange={e => setAi({ ...ai, difficulty: e.target.value })}>
                                                <option value="easy">Easy</option>
                                                <option value="medium">Medium</option>
                                                <option value="hard">Hard (JEE Adv)</option>
                                            </select>
                                        </Field>
                                        <Field label="Count (1–20)">
                                            <input type="number" min="1" max="20" className="ui-input text-center font-bold" value={ai.count} onChange={e => setAi({ ...ai, count: e.target.value })} />
                                        </Field>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                        <button type="button" onClick={handleGenerateAI} disabled={aiLoading} className="ui-btn-primary">
                                            {aiLoading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</> : <><FiZap /> Generate & append</>}
                                        </button>
                                        <p className="text-[11px] text-gray-500">Questions are appended below — always review answers before publishing.</p>
                                        {unsavedAI.length > 0 && (
                                            <button type="button" disabled={bankSaving} onClick={() => saveToBank(unsavedAI)} className="ui-btn-secondary sm:ml-auto !py-2 text-xs">
                                                <FiDatabase /> {bankSaving ? 'Saving…' : `${t('teacher.qb.saveToBank')} (${unsavedAI.length})`}
                                            </button>
                                        )}
                                    </div>
                                    {aiLoading && (
                                        <div className="space-y-2.5 pt-1" aria-hidden="true">
                                            {[0, 1].map(i => (
                                                <div key={i} className="rounded-xl border border-gray-100 dark:border-white/10 p-3 space-y-2">
                                                    <div className="ui-skeleton h-3.5 w-3/4" />
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[0, 1, 2, 3].map(j => <div key={j} className="ui-skeleton h-7" />)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    {isJee && (
                        <section className="ui-card p-4 md:p-5 animate-fade-up">
                            <div className="flex flex-col md:flex-row md:items-center gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shrink-0"><FiLayers /></span>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">Sections</h4>
                                        <div className="flex flex-wrap gap-1.5 mt-1">
                                            {sectionCounts.map(([name, n]) => <Badge key={name} tone={SECTION_TONE[name]}>{name}: {n}</Badge>)}
                                            {newTest.questions.some(q => !q.section) && <Badge tone="red">Unassigned: {newTest.questions.filter(q => !q.section).length}</Badge>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2 md:ml-auto">
                                    <button type="button" onClick={() => setQuestions(autoSections)} className="ui-btn-secondary !py-2 text-xs">Auto-assign in thirds</button>
                                    {hasContent ? (
                                        <ConfirmButton onConfirm={loadJeeTemplate} prompt="Replace all questions?" yesLabel="Replace" title="Load JEE Main template" className="ui-btn-dark !py-2 text-xs">
                                            <FiTarget /> Load 75-Q template
                                        </ConfirmButton>
                                    ) : (
                                        <button type="button" onClick={loadJeeTemplate} className="ui-btn-dark !py-2 text-xs"><FiTarget /> Load 75-Q template</button>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}

                    {/* Upload paper */}
                    {testMode === 'upload' && (
                        <section className="ui-card p-4 md:p-5 space-y-4 animate-fade-up">
                            <StepTitle n={3} title="Question paper & answer key" hint="Students see the paper and answer on an OMR-style sheet" />
                            <div className="relative group border-2 border-dashed border-brand-200 dark:border-brand-500/30 rounded-2xl p-7 text-center bg-brand-50/40 dark:bg-brand-500/5 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-all">
                                <input
                                    type="file"
                                    accept=".pdf,image/*"
                                    aria-label="Upload question paper"
                                    onChange={(e) => setQuestionFile(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="mx-auto w-12 h-12 rounded-full bg-brand-gradient text-white flex items-center justify-center text-xl mb-3 group-hover:-translate-y-1 transition-transform"><FiUploadCloud /></div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm break-all">
                                    {questionFile ? questionFile.name : newTest.questionPaperUrl ? 'Replace uploaded question paper' : 'Upload question paper (PDF / image)'}
                                </p>
                                <p className="text-xs text-brand-600 mt-1">Click or drag a file here</p>
                            </div>
                            {newTest.questionPaperUrl && !questionFile && (
                                <a href={fileHref(newTest.questionPaperUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 hover:underline">
                                    <FiExternalLink /> View current paper
                                </a>
                            )}

                            <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">Answer key generator</h4>
                                    <p className="text-xs text-gray-500 mt-0.5">Creates an OMR sheet for your paper (replaces the current key)</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="200"
                                        aria-label="Number of questions"
                                        value={numQuestions}
                                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                                        className="ui-input !w-20 text-center font-bold !py-2.5"
                                    />
                                    <button type="button" onClick={() => generateAnswerSheet(numQuestions)} className="ui-btn-dark !py-2.5">Generate</button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {newTest.questions.map((q, qIndex) => (
                                    <div key={qIndex} className="rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-ink-800 p-2.5 flex items-center justify-between gap-2">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-xs font-extrabold text-gray-500">Q{qIndex + 1}</span>
                                            {isJee && (
                                                <select aria-label={`Section for Q${qIndex + 1}`} value={q.section || ''} onChange={(e) => updateQuestion(qIndex, { section: e.target.value })} className="bg-gray-50 dark:bg-white/5 rounded-lg px-1 py-2 text-[10px] font-bold text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-300">
                                                    <option value="">—</option>
                                                    {JEE_SECTIONS.map(n => <option key={n} value={n}>{n.slice(0, 4)}</option>)}
                                                </select>
                                            )}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <select
                                                aria-label={`Answer for Q${qIndex + 1}`}
                                                value={q.type === 'numerical' ? 'num' : q.correctOption}
                                                onChange={(e) => (e.target.value === 'num'
                                                    ? updateQuestion(qIndex, { type: 'numerical', ...(isJee ? { negativeMarks: 0 } : {}) })
                                                    : updateQuestion(qIndex, { type: 'mcq', correctOption: Number(e.target.value), options: q.options.some(o => o) ? q.options : ['A', 'B', 'C', 'D'], ...(isJee && q.type === 'numerical' ? { negativeMarks: 1 } : {}) }))}
                                                className="bg-brand-50 dark:bg-brand-500/10 rounded-lg px-2 py-2 text-xs font-bold text-brand-700 dark:text-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300"
                                            >
                                                {[0, 1, 2, 3].map(oIdx => (
                                                    <option key={oIdx} value={oIdx}>{String.fromCharCode(65 + oIdx)}</option>
                                                ))}
                                                <option value="num">#NUM</option>
                                            </select>
                                            {q.type === 'numerical' && (
                                                <input
                                                    type="number"
                                                    step="any"
                                                    aria-label={`Numerical answer for Q${qIndex + 1}`}
                                                    value={q.correctAnswer}
                                                    onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })}
                                                    className="w-16 bg-brand-50 dark:bg-brand-500/10 rounded-lg p-2 text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-300"
                                                    placeholder="Ans"
                                                />
                                            )}
                                            <input
                                                type="number"
                                                value={q.marks}
                                                onChange={(e) => updateQuestion(qIndex, { marks: e.target.value })}
                                                className="w-12 bg-gray-50 dark:bg-white/5 rounded-lg p-2 text-center text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-300"
                                                placeholder="Mks"
                                                title="Marks"
                                                aria-label={`Marks for Q${qIndex + 1}`}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Manual question builder */}
                    {testMode === 'manual' && (
                        <section className="space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <StepTitle n={3} title={`Questions (${newTest.questions.length})`} hint="Click the circle to mark the correct option" compact />
                            </div>

                            {newTest.questions.map((question, qIndex) => (
                                <div key={qIndex} className="group ui-card p-4 md:p-5 relative animate-fade-up">
                                    <div className="flex flex-wrap items-center gap-2 mb-3">
                                        <span className="w-8 h-8 rounded-lg bg-brand-gradient text-white flex items-center justify-center text-xs font-extrabold">{qIndex + 1}</span>
                                        <Segmented
                                            size="sm"
                                            value={question.type}
                                            onChange={(type) => changeType(qIndex, type)}
                                            options={[['mcq', 'MCQ'], ['numerical', 'Numerical']]}
                                        />
                                        {isJee && (
                                            <select aria-label={`Section for question ${qIndex + 1}`} value={question.section || ''} onChange={(e) => updateQuestion(qIndex, { section: e.target.value })}
                                                className={`rounded-lg px-2 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-brand-300 ${question.section ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'bg-red-50 text-red-600'}`}>
                                                <option value="">Section…</option>
                                                {JEE_SECTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        )}
                                        {question.fromAI && (
                                            question.bankSaved
                                                ? <Badge tone="green"><FiCheck /> In bank</Badge>
                                                : <button type="button" disabled={bankSaving} onClick={() => saveToBank([qIndex])} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-brand-600 bg-brand-50 dark:bg-brand-500/10 hover:bg-brand-100 transition disabled:opacity-50"><FiDatabase /> {t('teacher.qb.saveToBank')}</button>
                                        )}
                                        <label className="ml-auto flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg border border-gray-200 dark:border-white/10">
                                            <span className="text-[11px] font-bold text-gray-500">Marks</span>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-12 py-1 rounded-md bg-gray-50 dark:bg-white/5 text-center text-sm font-bold text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
                                                value={question.marks}
                                                onChange={(e) => updateQuestion(qIndex, { marks: e.target.value })}
                                            />
                                        </label>
                                        {(isJee || (question.negativeMarks !== '' && question.negativeMarks != null)) && (
                                            <label className="flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-lg border border-gray-200 dark:border-white/10">
                                                <span className="text-[11px] font-bold text-gray-500">−ve</span>
                                                <input
                                                    type="number" min="0" step="0.25" aria-label={`Negative marks for question ${qIndex + 1}`}
                                                    className="w-12 py-1 rounded-md bg-gray-50 dark:bg-white/5 text-center text-sm font-bold text-red-500 focus:outline-none focus:ring-2 focus:ring-brand-300"
                                                    value={question.negativeMarks}
                                                    onChange={(e) => updateQuestion(qIndex, { negativeMarks: e.target.value })}
                                                />
                                            </label>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveQuestion(qIndex)}
                                            title="Remove question"
                                            aria-label={`Remove question ${qIndex + 1}`}
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                                        >
                                            <FiTrash2 />
                                        </button>
                                    </div>

                                    <textarea
                                        required
                                        rows="3"
                                        className="ui-input resize-none !text-[15px]"
                                        placeholder="Type your question here…"
                                        aria-label={`Question ${qIndex + 1} text`}
                                        value={question.questionText}
                                        onChange={(e) => updateQuestion(qIndex, { questionText: e.target.value })}
                                    />

                                    {question.type === 'numerical' ? (
                                        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/20">
                                            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"><FiCheckCircle /> Correct answer</span>
                                            <input
                                                required
                                                type="number"
                                                step="any"
                                                className="ui-input flex-1 !py-2 font-bold"
                                                placeholder="e.g. 9.8"
                                                value={question.correctAnswer}
                                                onChange={(e) => updateQuestion(qIndex, { correctAnswer: e.target.value })}
                                            />
                                            <span className="text-[11px] text-gray-500">Tolerance ±0.01</span>
                                        </div>
                                    ) : (
                                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {question.options.map((option, oIndex) => {
                                                const correct = Number(question.correctOption) === oIndex;
                                                return (
                                                    <div key={oIndex} className={`flex items-center gap-2.5 p-1.5 pr-3 rounded-xl border-2 transition-all focus-within:border-brand-400 ${correct ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/5' : 'border-gray-100 dark:border-white/10 bg-white dark:bg-ink-800'}`}>
                                                        <label className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-xs font-extrabold cursor-pointer transition-all ${correct ? 'bg-emerald-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 hover:bg-brand-100 hover:text-brand-700'}`} title="Mark as correct">
                                                            <input
                                                                type="radio"
                                                                className="sr-only"
                                                                name={`correct-${qIndex}`}
                                                                checked={correct}
                                                                onChange={() => updateQuestion(qIndex, { correctOption: oIndex })}
                                                                aria-label={`Mark option ${String.fromCharCode(65 + oIndex)} correct`}
                                                            />
                                                            {correct ? <FiCheck /> : String.fromCharCode(65 + oIndex)}
                                                        </label>
                                                        <input
                                                            required
                                                            type="text"
                                                            className="flex-1 min-w-0 bg-transparent py-2 text-sm font-medium text-gray-800 dark:text-gray-100 focus:outline-none placeholder:text-gray-300"
                                                            placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                                            value={option}
                                                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <button
                                type="button"
                                onClick={() => (isJee ? setQuestions(qs => [...qs, { ...blankQuestion(), negativeMarks: 1, section: qs[qs.length - 1]?.section || JEE_SECTIONS[0] }]) : handleAddQuestion())}
                                className="w-full py-5 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl text-sm font-bold text-gray-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/60 dark:hover:bg-brand-500/5 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
                            >
                                <FiPlus /> Add another question
                            </button>
                        </section>
                    )}
                </form>
            </Modal>

            {/* Results drawer */}
            {viewing && createPortal(
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-end z-[999] animate-fade-in" onClick={() => setViewing(null)}>
                    <div role="dialog" aria-modal="true" aria-label={`Results for ${viewing.title}`} className="bg-white dark:bg-ink-900 w-full max-w-xl h-full shadow-2xl animate-slide-in-right flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="relative overflow-hidden bg-brand-sunset text-white p-5 md:p-6 space-y-4">
                            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
                            <div className="relative flex justify-between items-start gap-4">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">{viewing.isMock ? (viewing.pattern === 'jee_main' ? 'JEE Main mock · results' : 'Mock test · results') : 'Test results'}</p>
                                    <h3 className="text-xl font-extrabold tracking-tight truncate">{viewing.title}</h3>
                                </div>
                                <button type="button" onClick={() => setViewing(null)} aria-label="Close results" className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center hover:rotate-90 transition-all"><FiX /></button>
                            </div>
                            <div className="relative grid grid-cols-3 gap-2.5">
                                {[['Attempts', results.length], ['Average', `${avgPct}%`], ['Top score', results[0] ? `${results[0].score}/${results[0].totalMarks}` : '—']].map(([label, val]) => (
                                    <div key={label} className="rounded-2xl bg-white/15 backdrop-blur border border-white/15 p-3 text-center">
                                        <p className="text-xl font-extrabold tabular-nums">{val}</p>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{label}</p>
                                    </div>
                                ))}
                            </div>
                            {sectionAverages.length > 0 && (
                                <div className="relative flex flex-wrap gap-2">
                                    {sectionAverages.map(sec => (
                                        <span key={sec.name} className="px-3 py-1.5 rounded-full bg-black/20 border border-white/15 text-[11px] font-bold">
                                            {sec.name}: avg {sec.avg}/{sec.max}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="px-5 md:px-6 pt-4">
                            <Segmented
                                className="w-full [&>button]:flex-1 [&>button]:justify-center"
                                value={resultsTab}
                                onChange={setResultsTab}
                                options={[
                                    ['leaderboard', <span key="l" className="flex items-center gap-1.5"><FiAward /> Leaderboard</span>],
                                    ['submissions', <span key="s" className="flex items-center gap-1.5"><FiUsers /> All submissions</span>],
                                ]}
                            />
                        </div>
                        <div key={resultsTab} className="flex-1 overflow-y-auto ui-scrollbar p-5 md:p-6 space-y-2.5 ui-stagger">
                            {loadingResults ? (
                                <Spinner label="Loading results..." rows={5} />
                            ) : resultsTab === 'leaderboard' ? (
                                leaderboard.length > 0 ? leaderboard.map((row, idx) => (
                                    <div key={`${row.rank}-${idx}`} className={`p-3 rounded-2xl flex items-center gap-3 border ${row.rank === 1 ? 'bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-500/30 shadow-brand-soft' : row.rank <= 3 ? 'bg-brand-50/50 dark:bg-white/5 border-brand-100 dark:border-white/10' : 'bg-white dark:bg-ink-800 border-gray-100 dark:border-white/5'}`}>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 ${row.rank === 1 ? 'bg-brand-gradient text-white animate-glow' : row.rank <= 3 ? 'bg-ink-900 text-brand-300' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                                            {row.rank <= 3 ? <FiAward /> : `#${row.rank}`}
                                        </div>
                                        <Avatar name={row.studentName || 'Student'} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-900 dark:text-white truncate">{row.studentName || 'Student'}</p>
                                            <p className="text-[11px] text-gray-400">Rank #{row.rank}{row.percentile != null ? ` · ${Number(row.percentile).toFixed(2)} %ile` : ''}{row.timeTaken ? ` · ${fmtSeconds(row.timeTaken)}` : ''}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-extrabold text-gray-900 dark:text-white tabular-nums">{row.score}/{row.totalMarks}</p>
                                            <p className="text-[11px] font-bold text-brand-600 tabular-nums">{Math.round(Number(row.percentage) || 0)}%</p>
                                        </div>
                                    </div>
                                )) : (
                                    <EmptyState icon={FiAward} title="No attempts yet" hint="Rankings appear once students submit." className="!shadow-none" />
                                )
                            ) : results.length > 0 ? results.map((res, idx) => {
                                const pct = res.totalMarks ? (res.score / res.totalMarks) * 100 : 0;
                                return (
                                    <div key={res._id || idx} className="p-3.5 rounded-2xl bg-white dark:bg-ink-800 border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={res.studentId?.name || 'Student'} size="sm" />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-white truncate">{res.studentId?.name || 'Student'}</p>
                                                <p className="text-[11px] text-gray-400 flex flex-wrap gap-x-2">
                                                    <span>#{idx + 1}</span>
                                                    {res.correct !== undefined && <><span className="text-emerald-600">✓ {res.correct}</span><span className="text-red-500">✗ {res.wrong ?? 0}</span><span>– {res.unattempted ?? 0}</span></>}
                                                    {res.submittedAt && <span>{new Date(res.submittedAt).toLocaleDateString()}</span>}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-extrabold text-brand-600 tabular-nums">{res.score}/{res.totalMarks}</p>
                                                {res.percentile != null && <p className="text-[11px] font-bold text-gray-500 tabular-nums">{Number(res.percentile).toFixed(2)} %ile</p>}
                                            </div>
                                        </div>
                                        {res.sectionScores?.length > 0 && (
                                            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                                                {res.sectionScores.map(sec => (
                                                    <div key={sec.name} className="rounded-lg bg-gray-50 dark:bg-white/5 px-2 py-1.5 text-center">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 truncate">{sec.name}</p>
                                                        <p className="text-xs font-extrabold text-gray-900 dark:text-white tabular-nums">{sec.score}/{sec.max}</p>
                                                        <p className="text-[10px] text-gray-400"><span className="text-emerald-600">✓{sec.correct ?? 0}</span> <span className="text-red-500">✗{sec.wrong ?? 0}</span></p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="mt-2.5 h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                                            <div className="h-full bg-brand-gradient rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                                        </div>
                                    </div>
                                );
                            }) : (
                                <EmptyState icon={FiBarChart2} title="No attempts yet" hint="Submissions will be listed here." className="!shadow-none" />
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default TeacherTest;
