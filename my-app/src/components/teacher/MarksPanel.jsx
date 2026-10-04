import React from 'react';
import { FiBarChart2, FiEdit3, FiGrid, FiEye, FiRefreshCw, FiSend, FiTable, FiUser } from 'react-icons/fi';
import BulkMarksEntry from './BulkMarksEntry';
import { Avatar, Badge, EmptyState, Field, PageHeader, Segmented, Spinner } from './TeacherUI';

const nameOf = (s) => s?.name || s?.userId?.name || 'Unknown';
const pctTone = (pct) => (pct >= 0.75 ? 'green' : pct >= 0.4 ? 'amber' : 'red');

/** Marks tab: selectors, single entry, bulk sheet and class records. State lives in the dashboard. */
const MarksPanel = ({
    teacherData, exams, marksViewMode, onModeChange, marksClass, onMarksClassChange,
    newMark, setNewMark, marksStudents, selectedMarkStudent, setSelectedMarkStudent,
    onUploadMarks, onFetchClassMarks, fetchingClassMarks, classMarks, onEditMark,
}) => {
    const pct = selectedMarkStudent && newMark.marks !== '' && Number(newMark.maxMarks) > 0
        ? Math.max(0, Math.min(1, Number(newMark.marks) / Number(newMark.maxMarks)))
        : null;

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiBarChart2}
                eyebrow="Classroom"
                title="Marks & performance"
                subtitle="Enter marks one-by-one, as a sheet, or review class records."
                actions={
                    <Segmented
                        value={marksViewMode}
                        onChange={onModeChange}
                        options={[
                            ['entry', <span key="e" className="flex items-center gap-1.5"><FiEdit3 /> Single</span>],
                            ['bulk', <span key="b" className="flex items-center gap-1.5"><FiGrid /> Bulk sheet</span>],
                            ['view', <span key="v" className="flex items-center gap-1.5"><FiEye /> Records</span>],
                        ]}
                    />
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
                <div className="lg:col-span-1 space-y-5">
                    <div className="ui-card p-5 space-y-4 lg:sticky lg:top-4">
                        <Field label="Class">
                            <select className="ui-input" value={marksClass} onChange={(e) => onMarksClassChange(e.target.value)}>
                                <option value="">Choose class</option>
                                {teacherData.classes?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Subject">
                            <select className="ui-input" value={newMark.subjectId} onChange={(e) => setNewMark({ ...newMark, subjectId: e.target.value })}>
                                <option value="">Choose subject</option>
                                {teacherData.subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Exam">
                            <select className="ui-input" value={newMark.examId} onChange={(e) => setNewMark({ ...newMark, examId: e.target.value })}>
                                <option value="">Choose exam</option>
                                {exams.map(e => <option key={e._id} value={e._id}>{e.name} ({e.type})</option>)}
                            </select>
                        </Field>

                        {marksViewMode === 'entry' && (
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Students</p>
                                    <span className="text-[11px] text-gray-400">{marksStudents.length}</span>
                                </div>
                                {marksStudents.length === 0 ? (
                                    <p className="text-xs text-gray-400 py-4 text-center">{marksClass ? 'No students in this class' : 'Choose a class to list students'}</p>
                                ) : (
                                    <div className="space-y-1 max-h-[320px] overflow-y-auto ui-scrollbar pr-1 -mr-1">
                                        {marksStudents.map(s => {
                                            const active = selectedMarkStudent?._id === s._id;
                                            return (
                                                <button
                                                    key={s._id}
                                                    type="button"
                                                    onClick={() => setSelectedMarkStudent(s)}
                                                    className={`w-full flex items-center gap-3 p-2 rounded-xl text-left transition-all ${active ? 'bg-brand-gradient text-white shadow-brand-soft' : 'hover:bg-brand-50/60 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200'}`}
                                                >
                                                    <Avatar name={nameOf(s)} size="xs" className={active ? 'ring-white/40' : ''} />
                                                    <span className="text-sm font-semibold truncate">{nameOf(s)}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {marksViewMode === 'view' && (
                            <button
                                type="button"
                                onClick={onFetchClassMarks}
                                disabled={!marksClass || !newMark.subjectId || !newMark.examId || fetchingClassMarks}
                                className="ui-btn-dark w-full py-3"
                            >
                                <FiRefreshCw className={fetchingClassMarks ? 'animate-spin' : ''} /> {fetchingClassMarks ? 'Fetching…' : 'Refresh records'}
                            </button>
                        )}
                    </div>
                </div>

                <div key={marksViewMode} className="lg:col-span-2 animate-fade-up">
                    {marksViewMode === 'bulk' ? (
                        <BulkMarksEntry
                            students={marksStudents}
                            classId={marksClass}
                            subjectId={newMark.subjectId}
                            examId={newMark.examId}
                        />
                    ) : marksViewMode === 'entry' ? (
                        selectedMarkStudent ? (
                            <div key={selectedMarkStudent._id} className="ui-card p-5 md:p-7 space-y-6 animate-slide-in-right">
                                <div className="flex items-center gap-4">
                                    <Avatar name={nameOf(selectedMarkStudent)} size="lg" />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white truncate">{nameOf(selectedMarkStudent)}</h3>
                                        <p className="text-xs text-gray-500">Single mark entry</p>
                                    </div>
                                    {pct !== null && <Badge tone={pctTone(pct)}>{Math.round(pct * 100)}%</Badge>}
                                </div>

                                <form onSubmit={onUploadMarks} className="space-y-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Marks obtained">
                                            <input
                                                type="number"
                                                placeholder="0"
                                                className="ui-input !text-3xl !font-extrabold text-center !py-4 tabular-nums"
                                                value={newMark.marks}
                                                onChange={(e) => setNewMark({ ...newMark, marks: e.target.value })}
                                                required
                                            />
                                        </Field>
                                        <Field label="Full marks">
                                            <input
                                                type="number"
                                                placeholder="100"
                                                className="ui-input !text-3xl !font-extrabold text-center !py-4 tabular-nums text-gray-400"
                                                value={newMark.maxMarks}
                                                onChange={(e) => setNewMark({ ...newMark, maxMarks: e.target.value })}
                                                required
                                            />
                                        </Field>
                                    </div>
                                    {pct !== null && (
                                        <div className="h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-700 ${pct >= 0.75 ? 'bg-emerald-500' : pct >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct * 100}%` }} />
                                        </div>
                                    )}
                                    <Field label="Remarks for the student">
                                        <textarea
                                            rows="4"
                                            placeholder="Constructive feedback…"
                                            className="ui-input resize-none"
                                            value={newMark.remarks}
                                            onChange={(e) => setNewMark({ ...newMark, remarks: e.target.value })}
                                        />
                                    </Field>
                                    <button type="submit" className="ui-btn-primary w-full py-3.5"><FiSend /> Save marks</button>
                                </form>
                            </div>
                        ) : (
                            <EmptyState icon={FiUser} title="Pick a student" hint="Select a student from the list to start entering marks." className="min-h-[360px]" />
                        )
                    ) : (
                        <div className="ui-card overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/5">
                                <h3 className="font-extrabold tracking-tight text-gray-900 dark:text-white">Class records</h3>
                                <Badge tone="brand">{classMarks.length} records</Badge>
                            </div>
                            {fetchingClassMarks ? (
                                <div className="p-5"><Spinner label="Retrieving marks…" rows={5} /></div>
                            ) : classMarks.length === 0 ? (
                                <div className="py-14 text-center">
                                    <div className="mx-auto w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center text-xl mb-3"><FiTable /></div>
                                    <p className="text-sm text-gray-500">No marks records for this selection</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto ui-scrollbar">
                                    <table className="w-full text-left min-w-[560px]">
                                        <thead className="bg-gray-50 dark:bg-white/[0.03] sticky top-0">
                                            <tr className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                                                <th className="px-5 py-3">Student</th>
                                                <th className="px-5 py-3 text-center">Score</th>
                                                <th className="px-5 py-3">Remarks</th>
                                                <th className="px-5 py-3 text-right">Edit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                            {classMarks.map(m => {
                                                const ratio = m.marks / (m.maxMarks || 100);
                                                return (
                                                    <tr key={m._id} className="hover:bg-brand-50/40 dark:hover:bg-white/[0.03] transition-colors">
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar name={m.studentId?.name} size="xs" />
                                                                <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{m.studentId?.name || 'Unknown'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3 text-center">
                                                            <Badge tone={pctTone(ratio)} className="!text-xs tabular-nums">{m.marks} / {m.maxMarks || 100}</Badge>
                                                        </td>
                                                        <td className="px-5 py-3 text-xs text-gray-500 max-w-[220px] truncate">{m.remarks || '—'}</td>
                                                        <td className="px-5 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => onEditMark(m)}
                                                                className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition"
                                                                title="Edit mark"
                                                                aria-label={`Edit mark for ${m.studentId?.name || 'student'}`}
                                                            >
                                                                <FiEdit3 />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarksPanel;
