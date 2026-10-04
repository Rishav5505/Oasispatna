import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiUsers, FiExternalLink, FiAlertCircle, FiRefreshCw, FiCheck, FiCornerUpLeft, FiFileText } from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { useI18n } from '../../i18n/useI18n';
import { API, authHeaders, errMsg, fileHref, timeAgo } from './teacherApi';
import { Avatar, Badge, EmptyState, Modal, Segmented, Spinner } from './TeacherUI';

const STATUS_TONE = { submitted: 'brand', late: 'amber', graded: 'green', returned: 'dark' };

const GradeForm = ({ sub, maxMarks, onDone }) => {
    const { t } = useI18n();
    const [marks, setMarks] = useState(sub.marks ?? '');
    const [remark, setRemark] = useState(sub.remark || '');
    const [busy, setBusy] = useState('');

    const send = async (status) => {
        if (status === 'graded' && (marks === '' || !Number.isFinite(Number(marks)))) { toast.error('Enter marks to grade'); return; }
        if (status === 'graded' && maxMarks != null && Number(marks) > maxMarks) { toast.error(`Marks cannot exceed ${maxMarks}`); return; }
        setBusy(status);
        try {
            const body = { status, remark };
            if (marks !== '') body.marks = Number(marks);
            const res = await axios.put(`${API}/homework/submissions/${sub._id}/grade`, body, { headers: authHeaders() });
            toast.success(status === 'graded' ? 'Graded — student notified' : 'Returned for correction');
            onDone(res.data);
        } catch (err) {
            toast.error(errMsg(err, 'Failed to save grade'));
        } finally { setBusy(''); }
    };

    return (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-[110px_1fr_auto] gap-2 items-start">
            <label className="flex items-center gap-1.5 ui-input !py-2">
                <input type="number" min="0" max={maxMarks ?? undefined} step="0.5" value={marks} onChange={e => setMarks(e.target.value)} aria-label="Marks" className="w-full bg-transparent font-bold focus:outline-none" placeholder="Marks" />
                <span className="text-xs text-gray-400 shrink-0">/{maxMarks ?? '—'}</span>
            </label>
            <input className="ui-input !py-2" placeholder="Remark (optional)" value={remark} onChange={e => setRemark(e.target.value)} aria-label="Remark" />
            <div className="flex gap-2">
                <button type="button" disabled={!!busy} onClick={() => send('graded')} className="ui-btn-primary !py-2 text-xs flex-1 sm:flex-none"><FiCheck /> {busy === 'graded' ? '…' : t('teacher.homework.grade')}</button>
                <button type="button" disabled={!!busy} onClick={() => send('returned')} className="ui-btn-secondary !py-2 text-xs flex-1 sm:flex-none"><FiCornerUpLeft /> {busy === 'returned' ? '…' : t('teacher.homework.return')}</button>
            </div>
        </div>
    );
};

const SubmissionRow = ({ row, hw, onGraded }) => {
    const sub = row.submission;
    const [showText, setShowText] = useState(false);
    const [grading, setGrading] = useState(false);
    return (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-ink-800 border border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-3">
                <Avatar name={row.student?.name} size="sm" />
                <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{row.student?.name || 'Student'}</p>
                    <p className="text-[11px] text-gray-400">{sub ? `Submitted ${timeAgo(sub.submittedAt)}` : 'Not submitted'}</p>
                </div>
                {sub ? (
                    <div className="text-right shrink-0">
                        <Badge tone={STATUS_TONE[sub.status] || 'grey'}>{sub.status}</Badge>
                        {sub.marks != null && <p className="text-sm font-extrabold text-brand-600 tabular-nums mt-1">{sub.marks}/{hw.maxMarks}</p>}
                    </div>
                ) : <Badge tone="red">missing</Badge>}
            </div>
            {sub && (
                <div className="mt-3 flex flex-wrap items-center gap-2 pl-12">
                    {sub.fileUrl && (
                        <a href={fileHref(sub.fileUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"><FiExternalLink /> Open file</a>
                    )}
                    {sub.text && (
                        <button type="button" onClick={() => setShowText(v => !v)} className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-brand-600"><FiFileText /> {showText ? 'Hide answer' : 'Read answer'}</button>
                    )}
                    <button type="button" onClick={() => setGrading(v => !v)} className="ml-auto text-xs font-bold text-brand-600 hover:underline">{grading ? 'Close' : sub.status === 'graded' ? 'Re-grade' : 'Grade'}</button>
                </div>
            )}
            {sub?.remark && !grading && <p className="mt-2 pl-12 text-xs text-gray-500 italic">“{sub.remark}”</p>}
            {showText && <p className="mt-2 ml-12 text-sm whitespace-pre-wrap rounded-xl bg-gray-50 dark:bg-white/5 p-3 text-gray-700 dark:text-gray-200 animate-fade-up">{sub.text}</p>}
            {grading && <div className="pl-0 sm:pl-12 animate-fade-up"><GradeForm sub={sub} maxMarks={hw.maxMarks} onDone={(s) => { setGrading(false); onGraded(s); }} /></div>}
        </div>
    );
};

const HomeworkSubmissions = ({ hw, onClose, onChanged }) => {
    const { t } = useI18n();
    const [rows, setRows] = useState(null);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');

    const load = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/homework/${hw._id}/submissions`, { headers: authHeaders() });
            setRows(Array.isArray(res.data) ? res.data : []);
            setError('');
        } catch (err) {
            setError(errMsg(err, 'Failed to load submissions'));
            setRows([]);
        }
    }, [hw._id]);
    useEffect(() => { const id = setTimeout(load, 0); return () => clearTimeout(id); }, [load]);

    const counts = useMemo(() => {
        const list = rows || [];
        return {
            all: list.length,
            pending: list.filter(r => r.submission && ['submitted', 'late'].includes(r.submission.status)).length,
            graded: list.filter(r => r.submission && ['graded', 'returned'].includes(r.submission.status)).length,
            missing: list.filter(r => !r.submission).length,
        };
    }, [rows]);
    const visible = (rows || []).filter(r => (
        filter === 'all' ? true
            : filter === 'missing' ? !r.submission
                : filter === 'pending' ? r.submission && ['submitted', 'late'].includes(r.submission.status)
                    : r.submission && ['graded', 'returned'].includes(r.submission.status)
    ));

    const onGraded = (sub) => {
        setRows(rs => rs.map(r => (r.submission?._id === sub._id ? { ...r, submission: { ...r.submission, ...sub } } : r)));
        onChanged?.();
    };

    return (
        <Modal open onClose={onClose} icon={FiUsers} title={`${t('teacher.homework.submissions')} — ${hw.title}`} subtitle={`Due ${new Date(hw.dueDate).toLocaleDateString()} · Max ${hw.maxMarks ?? '—'} marks`} size="xl" bodyClassName="p-4 md:p-6 space-y-4">
            <Segmented value={filter} onChange={setFilter} options={[['all', 'All', counts.all], ['pending', 'To grade', counts.pending], ['graded', 'Graded', counts.graded], ['missing', 'Missing', counts.missing]]} />
            {rows === null ? <Spinner label="Loading submissions…" rows={4} />
                : error ? <EmptyState icon={FiAlertCircle} title={error} action={<button type="button" onClick={load} className="ui-btn-secondary"><FiRefreshCw /> Try again</button>} />
                    : visible.length === 0 ? <EmptyState icon={FiUsers} title={rows.length ? 'Nobody in this filter' : 'No students in this class/batch'} className="!shadow-none" />
                        : <div key={filter} className="space-y-2.5 ui-stagger">{visible.map(r => <SubmissionRow key={r.student?._id} row={r} hw={hw} onGraded={onGraded} />)}</div>}
        </Modal>
    );
};

export default HomeworkSubmissions;
