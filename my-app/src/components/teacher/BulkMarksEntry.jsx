import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiClipboard, FiSave, FiCheckCircle, FiGrid, FiDelete } from 'react-icons/fi';
import { notify } from '../../utils/notify';
import { API, authHeaders, errMsg, idOf } from './teacherApi';
import { EmptyState, Spinner } from './TeacherUI';

const nameOf = (s) => s?.name || s?.userId?.name || 'Unknown';
const emailOf = (s) => s?.userId?.email || s?.email || '';
const norm = (v) => String(v || '').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Spreadsheet-style marks entry for a whole class → POST /marks/bulk.
 * Rows are matched on email first, then exact name.
 */
const BulkMarksEntry = ({ students, classId, subjectId, examId }) => {
    const [marks, setMarks] = useState({}); // { studentId: string }
    const [maxMarks, setMaxMarks] = useState('100');
    const [prefilling, setPrefilling] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedCount, setSavedCount] = useState(null);
    const [showPaste, setShowPaste] = useState(false);
    const [pasteText, setPasteText] = useState('');
    const [pasteReport, setPasteReport] = useState(null);

    const ready = classId && subjectId && examId;

    // Prefill with already-saved marks so re-saving upserts instead of starting blank
    useEffect(() => {
        if (!ready) return undefined;
        let cancelled = false;
        (async () => {
            setPrefilling(true);
            setSavedCount(null);
            try {
                const res = await axios.get(`${API}/marks/class/${classId}/subject/${subjectId}/exam/${examId}`, { headers: authHeaders() });
                if (cancelled) return;
                const map = {};
                (res.data || []).forEach(m => { map[idOf(m.studentId)] = String(m.marks ?? ''); });
                setMarks(map);
                const firstMax = (res.data || []).find(m => m.maxMarks)?.maxMarks;
                if (firstMax) setMaxMarks(String(firstMax));
            } catch {
                if (!cancelled) setMarks({});
            } finally {
                if (!cancelled) setPrefilling(false);
            }
        })();
        return () => { cancelled = true; };
    }, [ready, classId, subjectId, examId]);

    const max = Number(maxMarks) || 0;
    const invalid = (v) => v !== '' && v !== undefined && (Number.isNaN(Number(v)) || Number(v) < 0 || (max > 0 && Number(v) > max));
    const filled = students.filter(s => marks[s._id] !== undefined && marks[s._id] !== '');
    const invalidCount = students.filter(s => invalid(marks[s._id])).length;

    const applyPaste = () => {
        const byEmail = new Map();
        const byName = new Map();
        students.forEach(s => {
            if (emailOf(s)) byEmail.set(norm(emailOf(s)), s);
            byName.set(norm(nameOf(s)), s);
        });
        const next = { ...marks };
        let matched = 0;
        const unmatched = [];
        pasteText.split(/\r?\n/).forEach(line => {
            if (!line.trim()) return;
            let cols = line.split('\t');
            if (cols.length < 2) cols = line.split(/,|;|\s{2,}/);
            if (cols.length < 2) { unmatched.push(line.trim()); return; }
            const key = norm(cols[0]);
            const value = String(cols[cols.length - 1]).trim();
            if (Number.isNaN(Number(value)) || value === '') { unmatched.push(line.trim()); return; } // header rows etc.
            const student = byEmail.get(key) || byName.get(key);
            if (!student) { unmatched.push(cols[0].trim()); return; }
            next[student._id] = value;
            matched += 1;
        });
        setMarks(next);
        setPasteReport({ matched, unmatched });
        notify(matched ? `Matched ${matched} row${matched > 1 ? 's' : ''} from paste` : 'No rows could be matched to students');
    };

    const handleSave = async () => {
        if (!ready) { notify('Please select Class, Subject and Exam'); return; }
        if (!max) { notify('Please enter valid full marks'); return; }
        if (invalidCount) { notify(`Please fix ${invalidCount} invalid mark${invalidCount > 1 ? 's' : ''} (0–${max})`); return; }
        const entries = filled.map(s => ({ studentId: s._id, marks: Number(marks[s._id]) }));
        if (!entries.length) { notify('Please enter marks for at least one student'); return; }
        setSaving(true);
        try {
            const res = await axios.post(`${API}/marks/bulk`, { examId, subjectId, maxMarks: max, entries }, { headers: authHeaders() });
            const n = res.data?.saved ?? entries.length;
            setSavedCount(n);
            notify(`Marks saved for ${n} student${n === 1 ? '' : 's'}`);
        } catch (err) {
            notify(errMsg(err, 'Failed to save marks'));
        } finally {
            setSaving(false);
        }
    };

    if (!ready) {
        return (
            <EmptyState icon={FiGrid} title="Open the marks sheet" hint="Select Class, Subject and Exam to load the spreadsheet." className="min-h-[360px]" />
        );
    }

    const progress = students.length ? (filled.length / students.length) * 100 : 0;

    return (
        <div className="ui-card overflow-hidden animate-fade-up">
            <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-white/5">
                <div className="min-w-0">
                    <h3 className="font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2"><FiGrid className="text-brand-500" /> Bulk marks sheet</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                        <div className="w-32 h-1.5 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                            <div className="h-full bg-brand-gradient rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 tabular-nums">{filled.length} / {students.length} filled</p>
                        {invalidCount > 0 && <span className="ui-badge bg-red-50 text-red-600">{invalidCount} invalid</span>}
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-ink-800">
                        <span className="text-[11px] font-bold text-gray-500">Full marks</span>
                        <input
                            type="number"
                            min="1"
                            value={maxMarks}
                            onChange={e => setMaxMarks(e.target.value)}
                            className="w-16 py-1.5 rounded-lg bg-white dark:bg-ink-900 text-center font-extrabold text-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
                        />
                    </label>
                    <button
                        type="button"
                        onClick={() => setShowPaste(v => !v)}
                        className={showPaste ? 'ui-btn-dark !py-2 text-xs' : 'ui-btn-secondary !py-2 text-xs'}
                        aria-expanded={showPaste}
                    >
                        <FiClipboard /> Paste from Excel
                    </button>
                </div>
            </div>

            {showPaste && (
                <div className="m-4 md:m-5 mb-0 md:mb-0 bg-brand-50/60 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/20 rounded-2xl p-4 space-y-3 animate-fade-up">
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                        Copy two columns from Excel/Sheets — <span className="font-bold">student email or name</span>, then <span className="font-bold">marks</span> — and paste below.
                    </p>
                    <textarea
                        rows="5"
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        placeholder={'rahul@example.com\t78\nPriya Sharma\t91'}
                        className="ui-input font-mono text-xs"
                    />
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={applyPaste} disabled={!pasteText.trim()} className="ui-btn-primary !py-2 text-xs">Apply</button>
                        <button type="button" onClick={() => { setPasteText(''); setPasteReport(null); }} className="ui-btn-secondary !py-2 text-xs"><FiDelete /> Clear</button>
                    </div>
                    {pasteReport && (
                        <div className="text-xs font-semibold">
                            <p className="text-emerald-600">{pasteReport.matched} row(s) matched.</p>
                            {pasteReport.unmatched.length > 0 && (
                                <p className="text-red-500 mt-1">Not matched ({pasteReport.unmatched.length}): {pasteReport.unmatched.slice(0, 8).join(', ')}{pasteReport.unmatched.length > 8 ? '…' : ''}</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {prefilling ? (
                <div className="p-5"><Spinner label="Loading existing marks..." rows={5} /></div>
            ) : students.length === 0 ? (
                <p className="text-center py-12 text-sm text-gray-400">No students enrolled in this class.</p>
            ) : (
                <div className="m-4 md:m-5 overflow-auto ui-scrollbar max-h-[55vh] rounded-xl border border-gray-200 dark:border-white/10">
                    <table className="w-full text-left min-w-[520px] border-separate border-spacing-0 text-sm">
                        <thead>
                            <tr className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                <th className="sticky top-0 left-0 z-30 bg-gray-100 dark:bg-ink-800 px-3 py-2.5 w-12 text-center border-b border-r border-gray-200 dark:border-white/10">#</th>
                                <th className="sticky top-0 left-12 z-30 bg-gray-100 dark:bg-ink-800 px-3 py-2.5 border-b border-r border-gray-200 dark:border-white/10 min-w-[200px]">Student</th>
                                <th className="sticky top-0 z-20 bg-gray-100 dark:bg-ink-800 px-3 py-2.5 border-b border-r border-gray-200 dark:border-white/10">Email</th>
                                <th className="sticky top-0 z-20 bg-gray-100 dark:bg-ink-800 px-3 py-2.5 text-center border-b border-gray-200 dark:border-white/10 w-36">Marks / {max || '—'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((s, i) => {
                                const bad = invalid(marks[s._id]);
                                const val = marks[s._id];
                                const has = val !== undefined && val !== '';
                                return (
                                    <tr key={s._id} className="group">
                                        <td className="sticky left-0 z-10 w-12 bg-gray-50 dark:bg-ink-900 group-hover:bg-brand-50 dark:group-hover:bg-ink-800 px-3 py-0 text-center text-xs font-semibold text-gray-400 tabular-nums border-b border-r border-gray-200 dark:border-white/10">{i + 1}</td>
                                        <td className="sticky left-12 z-10 bg-white dark:bg-ink-900 group-hover:bg-brand-50 dark:group-hover:bg-ink-800 px-3 py-2 border-b border-r border-gray-200 dark:border-white/10 shadow-[4px_0_8px_-6px_rgba(0,0,0,0.15)]">
                                            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate max-w-[220px]">{nameOf(s)}</p>
                                        </td>
                                        <td className="bg-white dark:bg-ink-900 group-hover:bg-brand-50/50 dark:group-hover:bg-white/[0.03] px-3 py-2 text-xs text-gray-400 border-b border-r border-gray-200 dark:border-white/10 truncate max-w-[220px]">{emailOf(s) || '—'}</td>
                                        <td className={`p-0 border-b border-gray-200 dark:border-white/10 ${bad ? 'bg-red-50 dark:bg-red-500/10' : has ? 'bg-emerald-50/40 dark:bg-emerald-500/5' : 'bg-white dark:bg-ink-900'}`}>
                                            <input
                                                type="number"
                                                step="any"
                                                min="0"
                                                aria-label={`Marks for ${nameOf(s)}`}
                                                value={val ?? ''}
                                                onChange={e => { setMarks(m => ({ ...m, [s._id]: e.target.value })); setSavedCount(null); }}
                                                className={`w-full h-11 px-3 bg-transparent text-center font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-inset ${bad ? 'text-red-600 focus:ring-red-400' : 'text-gray-900 dark:text-white focus:ring-brand-500 focus:bg-white dark:focus:bg-ink-800'}`}
                                                placeholder="—"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="px-4 md:px-5 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.02] flex flex-col sm:flex-row items-center gap-3">
                {savedCount !== null && (
                    <span className="flex items-center gap-2 text-emerald-600 font-bold text-sm whitespace-nowrap animate-scale-in">
                        <FiCheckCircle /> {savedCount} saved
                    </span>
                )}
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || prefilling || !students.length}
                    className="ui-btn-primary w-full sm:w-auto sm:ml-auto py-3"
                >
                    <FiSave /> {saving ? 'Saving…' : `Save ${filled.length} entr${filled.length === 1 ? 'y' : 'ies'}`}
                </button>
            </div>
        </div>
    );
};

export default BulkMarksEntry;
