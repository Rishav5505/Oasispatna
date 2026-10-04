import React, { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { FiCheckSquare, FiCheck, FiX, FiUsers, FiSearch, FiSave, FiShield, FiUserCheck, FiUserX } from 'react-icons/fi';
import { BsQrCode } from 'react-icons/bs';
import { Avatar, EmptyState, Field, Modal, PageHeader } from './TeacherUI';

const studentName = (s) => s.name || s.userId?.name || 'Unknown Student';

/** Teacher attendance marking: filters, animated summary bar, tap-friendly toggles, QR session. */
const AttendancePanel = ({
    teacherData, selectedClass, setSelectedClass, attendanceSubject, setAttendanceSubject,
    attendanceDate, setAttendanceDate, students, attendanceData, setAttendanceData,
    loadingStudents, onSave, onGenerateQR, generatingQR, showQRModal, setShowQRModal, qrToken,
}) => {
    const [search, setSearch] = useState('');
    const ready = selectedClass && attendanceSubject;

    const present = students.filter(s => attendanceData[s._id] === 'present').length;
    const absent = students.filter(s => attendanceData[s._id] === 'absent').length;
    const total = students.length || 1;
    const pct = Math.round((present / total) * 100);

    const setAll = (status) => {
        const next = { ...attendanceData };
        students.forEach(s => { next[s._id] = status; });
        setAttendanceData(next);
    };

    const q = search.trim().toLowerCase();
    const visible = q ? students.filter(s => studentName(s).toLowerCase().includes(q)) : students;

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiCheckSquare}
                eyebrow="Classroom"
                title="Mark attendance"
                subtitle="Pick a class and subject — the roster loads automatically."
                actions={
                    <button type="button" onClick={onGenerateQR} disabled={generatingQR} className="ui-btn-dark group">
                        <BsQrCode className="group-hover:rotate-12 transition-transform" />
                        {generatingQR ? 'Generating secure QR…' : 'Show attendance QR'}
                    </button>
                }
            />

            <div className="ui-card p-4 md:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <Field label="Class">
                    <select className="ui-input" value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                        <option value="">{teacherData.classes?.length === 0 ? 'No classes assigned' : 'Select class'}</option>
                        {teacherData.classes?.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                </Field>
                <Field label="Subject">
                    <select className="ui-input" value={attendanceSubject} onChange={(e) => setAttendanceSubject(e.target.value)}>
                        <option value="">Select subject</option>
                        {teacherData.subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                </Field>
                <Field label="Date">
                    <input type="date" className="ui-input" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
                </Field>
            </div>

            {!ready ? (
                <EmptyState icon={FiUsers} title="Select class & subject" hint="The student list appears automatically once both are chosen." />
            ) : loadingStudents ? (
                <div className="ui-card p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="ui-skeleton h-16" />)}
                </div>
            ) : students.length === 0 ? (
                <EmptyState icon={FiUsers} title="No students found" hint="There are no students enrolled in this class." />
            ) : (
                <>
                    {/* Summary bar */}
                    <div className="ui-card p-4 md:p-5 animate-fade-up">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex items-center gap-5 flex-1">
                                <div>
                                    <p className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white tabular-nums">{pct}<span className="text-lg text-gray-400">%</span></p>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Present</p>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5">
                                        <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${(present / total) * 100}%` }} />
                                        <div className="bg-gradient-to-r from-rose-400 to-red-500 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${(absent / total) * 100}%` }} />
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs font-semibold">
                                        <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-2 h-2 rounded-full bg-emerald-500" />{present} present</span>
                                        <span className="flex items-center gap-1.5 text-red-500"><span className="w-2 h-2 rounded-full bg-red-500" />{absent} absent</span>
                                        <span className="flex items-center gap-1.5 text-gray-400"><FiUsers />{students.length} total</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setAll('present')} className="ui-btn-secondary !px-3.5 !py-2 text-xs"><FiUserCheck className="text-emerald-500" /> All present</button>
                                <button type="button" onClick={() => setAll('absent')} className="ui-btn-secondary !px-3.5 !py-2 text-xs"><FiUserX className="text-red-500" /> All absent</button>
                            </div>
                        </div>
                    </div>

                    {students.length > 8 && (
                        <div className="relative">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a student…" className="ui-input pl-11" aria-label="Search students" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ui-stagger">
                        {visible.map((s, idx) => {
                            const status = attendanceData[s._id];
                            return (
                                <div
                                    key={s._id}
                                    className={`ui-card !rounded-2xl p-3 pl-4 flex items-center gap-3 border-l-4 transition-all ${status === 'present' ? '!border-l-emerald-500' : status === 'absent' ? '!border-l-red-500' : ''}`}
                                >
                                    <span className="w-6 text-[11px] font-bold text-gray-300 tabular-nums">{idx + 1}</span>
                                    <Avatar name={studentName(s)} size="sm" />
                                    <p className="flex-1 min-w-0 font-semibold text-sm text-gray-800 dark:text-gray-100 truncate">{studentName(s)}</p>
                                    <div className="flex gap-1.5" role="radiogroup" aria-label={`Attendance for ${studentName(s)}`}>
                                        {[{ st: 'present', icon: FiCheck, short: 'P' }, { st: 'absent', icon: FiX, short: 'A' }].map((t) => {
                                            const { st, short } = t;
                                            const on = status === st;
                                            return (
                                                <button
                                                    key={st}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={on}
                                                    aria-label={st}
                                                    onClick={() => setAttendanceData({ ...attendanceData, [s._id]: st })}
                                                    className={`h-11 min-w-[3.25rem] px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all duration-200 active:scale-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${on
                                                        ? st === 'present' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105' : 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-105'
                                                        : 'bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                                                >
                                                    <t.icon className="text-base" /><span className="hidden sm:inline">{st === 'present' ? 'Present' : 'Absent'}</span><span className="sm:hidden">{short}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Sticky save bar */}
                    <div className="sticky bottom-24 lg:bottom-4 z-20">
                        <div className="ui-glass rounded-2xl shadow-card-hover p-3 flex items-center gap-3">
                            <p className="hidden sm:block flex-1 text-sm text-gray-600 dark:text-gray-300 px-2">
                                <span className="font-bold text-gray-900 dark:text-white">{present}</span> present · <span className="font-bold text-gray-900 dark:text-white">{absent}</span> absent · {attendanceDate}
                            </p>
                            <button
                                type="button"
                                onClick={onSave}
                                disabled={!ready || students.length === 0 || loadingStudents}
                                className="ui-btn-primary w-full sm:w-auto py-3"
                            >
                                <FiSave /> {loadingStudents ? 'Syncing…' : 'Save attendance'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <Modal
                open={showQRModal}
                onClose={() => setShowQRModal(false)}
                title="Scan to mark presence"
                subtitle="Expires in 5 minutes"
                icon={BsQrCode}
                size="md"
                bodyClassName="p-6 md:p-8 text-center"
            >
                <div className="relative inline-block p-4 rounded-3xl bg-white border border-brand-100 shadow-brand-soft">
                    <div className="absolute -inset-1 rounded-[1.75rem] bg-brand-gradient opacity-20 blur-md -z-10" />
                    {qrToken && <QRCodeCanvas value={qrToken} size={240} level="H" includeMargin={true} />}
                </div>
                <p className="mt-6 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl">
                    Ask students to open their dashboard and use the <span className="text-brand-600 font-bold">Scanner</span> tool.
                </p>
                <p className="mt-4 flex items-center justify-center gap-2 text-xs font-bold text-brand-600">
                    <span className="relative flex w-2 h-2"><span className="absolute inline-flex w-full h-full rounded-full bg-brand-500 opacity-60 animate-ping" /><span className="relative w-2 h-2 rounded-full bg-brand-500" /></span>
                    <FiShield /> Secure geofencing active
                </p>
            </Modal>
        </div>
    );
};

export default AttendancePanel;
