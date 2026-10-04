import React, { useCallback, useEffect, useState } from 'react';
import { FiPlus, FiCalendar, FiMapPin, FiUser, FiClock } from 'react-icons/fi';
import { api, toastError, toastSuccess, errMsg } from './adminApi';
import { Modal, ConfirmDelete, EmptyState, SkeletonBlock, inputCls, labelCls, primaryBtn, cardCls } from './AdminUI';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || '';
const subjectOf = (s) => s.subject || (typeof s.subjectId === 'object' ? s.subjectId : null);
const teacherOf = (s) => s.teacher || (typeof s.teacherId === 'object' ? s.teacherId : null);

const fmt12 = (hhmm) => {
  if (!hhmm || !/^\d{1,2}:\d{2}$/.test(hhmm)) return hhmm || '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

// Brand-shade palette for subject blocks (stable per subject name).
const SUBJECT_SHADES = [
  { block: 'bg-brand-gradient text-white border-transparent shadow-brand-soft', time: 'text-white/80', meta: 'text-white/80' },
  { block: 'bg-ink-900 text-white border-transparent', time: 'text-brand-300', meta: 'text-gray-400' },
  { block: 'bg-brand-50 text-gray-900 border-brand-200 dark:bg-brand-500/10 dark:text-white dark:border-brand-500/20', time: 'text-brand-700 dark:text-brand-300', meta: 'text-gray-500 dark:text-gray-400' },
  { block: 'bg-brand-200 text-brand-900 border-transparent', time: 'text-brand-800', meta: 'text-brand-800/70' },
  { block: 'bg-white text-gray-900 border-brand-300 dark:bg-ink-800 dark:text-white', time: 'text-brand-600', meta: 'text-gray-500 dark:text-gray-400' },
  { block: 'bg-brand-800 text-white border-transparent', time: 'text-brand-200', meta: 'text-brand-100/80' },
];
const shadeFor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return SUBJECT_SHADES[h % SUBJECT_SHADES.length];
};
const TODAY = DAYS[(new Date().getDay() + 6) % 7];

const SlotModal = ({ slot, batch, subjects, teachers, onClose, onSaved }) => {
  const editing = Boolean(slot._id);
  const [form, setForm] = useState({
    day: slot.day || 'Monday',
    startTime: slot.startTime || '09:00',
    endTime: slot.endTime || '10:00',
    subjectId: idOf(subjectOf(slot) || slot.subjectId),
    teacherId: idOf(teacherOf(slot) || slot.teacherId),
    room: slot.room || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const batchClassId = idOf(batch?.classId);
  const subjectOptions = batchClassId ? subjects.filter(s => !s.classId || idOf(s.classId) === batchClassId) : subjects;

  const onSubjectChange = (e) => {
    const subjectId = e.target.value;
    const sub = subjects.find(s => s._id === subjectId);
    // Pre-fill the subject's default teacher if none picked yet
    setForm(f => ({ ...f, subjectId, teacherId: f.teacherId || idOf(sub?.teacherId) }));
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.endTime <= form.startTime) {
      toastError({ message: 'End time must be after start time' }, 'Invalid slot');
      return;
    }
    setSaving(true);
    const body = { batchId: batch._id, ...form, room: form.room.trim() || undefined };
    try {
      if (editing) await api.put(`/schedule/${slot._id}`, body);
      else await api.post('/schedule', body);
      toastSuccess(editing ? 'Slot updated' : 'Slot added');
      onSaved();
      onClose();
    } catch (err) {
      if (err.response?.status === 409) toastError(err, 'Time clash');
      else toastError(err, 'Failed to save slot');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.del(`/schedule/${slot._id}`);
      toastSuccess('Slot deleted');
      onSaved();
      onClose();
    } catch (err) {
      toastError(err, 'Failed to delete slot');
    }
  };

  return (
    <Modal title={editing ? 'Edit Slot' : 'Add Slot'} subtitle={`Batch: ${batch?.name || ''}`} onClose={onClose}>
      <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className={labelCls}>Day *</label>
          <select className={inputCls} value={form.day} onChange={set('day')}>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Start *</label>
          <input type="time" required className={inputCls} value={form.startTime} onChange={set('startTime')} />
        </div>
        <div>
          <label className={labelCls}>End *</label>
          <input type="time" required className={inputCls} value={form.endTime} onChange={set('endTime')} />
        </div>
        <div>
          <label className={labelCls}>Subject *</label>
          <select required className={inputCls} value={form.subjectId} onChange={onSubjectChange}>
            <option value="">Select subject</option>
            {subjectOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Teacher *</label>
          <select required className={inputCls} value={form.teacherId} onChange={set('teacherId')}>
            <option value="">Select teacher</option>
            {teachers.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Room</label>
          <input className={inputCls} value={form.room} onChange={set('room')} placeholder="e.g. Room 2 / Lab" />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 pt-2">
          <div>{editing && <ConfirmDelete onConfirm={remove} label="Delete slot" />}</div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="ui-btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className={primaryBtn}>{saving ? 'Saving…' : editing ? 'Save' : 'Add slot'}</button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

const TimetableBuilder = ({ batches = [], classes = [], subjects = [], teachers = [] }) => {
  const [batchId, setBatchId] = useState('');
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // slot object (new slots have no _id)

  const activeBatchId = batchId || batches[0]?._id || '';
  const batch = batches.find(b => b._id === activeBatchId);

  const load = useCallback(async () => {
    if (!activeBatchId) return;
    setLoading(true);
    try {
      setSlots(await api.get(`/schedule/batch/${activeBatchId}`));
      setError(null);
    } catch (err) {
      setError(errMsg(err));
      toastError(err, 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  }, [activeBatchId]);

  useEffect(() => { load(); }, [load]);

  const className = (b) => b?.classId?.name || classes.find(c => c._id === idOf(b?.classId))?.name || '';

  if (batches.length === 0) {
    return (
      <div className={cardCls}>
        <EmptyState icon={FiCalendar} title="No batches yet" hint="Create a batch first, then build its weekly timetable." />
      </div>
    );
  }

  const byDay = DAYS.map(day => ({
    day,
    slots: slots.filter(s => s.day === day).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')),
  }));

  const legend = [...new Map(slots.map(s => [subjectOf(s)?.name || 'Subject', true])).keys()];

  return (
    <div className="space-y-5">
      <div className={`${cardCls} p-5 flex flex-col md:flex-row md:items-end justify-between gap-4`}>
        <div className="w-full md:w-80">
          <label className={labelCls}>Batch</label>
          <select className={inputCls} value={activeBatchId} onChange={(e) => setBatchId(e.target.value)}>
            {batches.map(b => <option key={b._id} value={b._id}>{b.name}{className(b) ? ` — ${className(b)}` : ''}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {legend.length > 0 && (
            <div className="hidden lg:flex flex-wrap gap-1.5 max-w-md">
              {legend.map(n => <span key={n} className={`ui-badge border ${shadeFor(n).block}`}>{n}</span>)}
            </div>
          )}
          <span className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300"><FiClock /> {slots.length} slots / week</span>
          <button onClick={() => setEditing({ day: 'Monday' })} className={primaryBtn}>
            <FiPlus /> Add slot
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 xl:grid-cols-7 gap-3">{DAYS.map(d => <SkeletonBlock key={d} className="h-56" />)}</div>
      ) : error ? (
        <div className={`${cardCls} p-10 text-center`}>
          <p className="font-bold text-gray-500 mb-4">{error}</p>
          <button onClick={load} className={primaryBtn}>Retry</button>
        </div>
      ) : (
        <div className="overflow-x-auto ui-scrollbar p-1 -m-1 pb-3">
          <div className="grid grid-cols-7 gap-3 min-w-[1050px] ui-stagger">
            {byDay.map(({ day, slots: daySlots }) => {
              const isToday = day === TODAY;
              return (
                <div key={day} className={`rounded-3xl flex flex-col min-h-[18rem] transition-all ${isToday ? 'bg-brand-50/70 dark:bg-brand-500/5 ring-2 ring-brand-300 dark:ring-brand-500/40' : 'bg-gray-100/70 dark:bg-white/[0.03]'}`}>
                  <div className="px-3.5 py-3 flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-extrabold uppercase tracking-wider ${isToday ? 'text-brand-700 dark:text-brand-300' : 'text-gray-700 dark:text-gray-200'}`}>{day.slice(0, 3)}</span>
                      {isToday && <span className="ml-1.5 ui-badge !px-1.5 !py-0 bg-brand-500 text-white">Today</span>}
                      <p className="text-[11px] text-gray-400 font-medium">{daySlots.length ? `${daySlots.length} class${daySlots.length > 1 ? 'es' : ''}` : 'Free day'}</p>
                    </div>
                    <button onClick={() => setEditing({ day })} className="w-8 h-8 rounded-xl bg-white dark:bg-ink-800 text-gray-400 shadow-sm hover:bg-brand-gradient hover:text-white hover:rotate-90 flex items-center justify-center text-sm transition-all duration-300" title={`Add slot on ${day}`} aria-label={`Add slot on ${day}`}>
                      <FiPlus />
                    </button>
                  </div>
                  <div className="px-2 pb-2 space-y-2 flex-1">
                    {daySlots.length === 0 && (
                      <button onClick={() => setEditing({ day })} className="w-full h-24 rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 text-xs font-bold text-gray-400 hover:border-brand-300 hover:text-brand-600 transition-colors">
                        + Add class
                      </button>
                    )}
                    {daySlots.map(s => {
                      const subj = subjectOf(s)?.name || 'Subject';
                      const shade = shadeFor(subj);
                      return (
                        <button
                          key={s._id}
                          onClick={() => setEditing(s)}
                          className={`w-full text-left p-3 rounded-2xl border hover:-translate-y-0.5 hover:shadow-card-hover active:scale-[0.98] transition-all duration-300 ${shade.block}`}
                        >
                          <p className={`text-[11px] font-bold tabular-nums ${shade.time}`}>{fmt12(s.startTime)} – {fmt12(s.endTime)}</p>
                          <p className="text-sm font-extrabold truncate mt-0.5">{subj}</p>
                          <p className={`text-[11px] font-semibold truncate flex items-center gap-1 mt-1 ${shade.meta}`}><FiUser className="shrink-0" /> {teacherOf(s)?.name || '—'}</p>
                          {s.room && <p className={`text-[11px] font-semibold truncate flex items-center gap-1 ${shade.meta}`}><FiMapPin className="shrink-0" /> {s.room}</p>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editing && batch && (
        <SlotModal key={editing._id || editing.day} slot={editing} batch={batch} subjects={subjects} teachers={teachers} onClose={() => setEditing(null)} onSaved={load} />
      )}
    </div>
  );
};

export default TimetableBuilder;
