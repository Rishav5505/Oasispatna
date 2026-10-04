import React, { useCallback, useEffect, useState } from 'react';
import { FiLayers, FiUsers, FiBook, FiCalendar, FiEdit2, FiPlus, FiX } from 'react-icons/fi';
import { api, toastError, toastSuccess } from './adminApi';
import { ConfirmDelete, SkeletonRows, EmptyRow, PageHeader, Avatar, inputCls, labelCls, primaryBtn, cardCls, tableScroll, theadRow, thCls, tdCls, rowCls, tbodyCls, iconBtn } from './AdminUI';
import TimetableBuilder from './TimetableBuilder';

const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || '';

// Field config per entity. `options` keys refer to lookups passed to the form.
const ENTITIES = {
  classes: {
    label: 'Class', icon: FiLayers,
    fields: [
      { key: 'name', label: 'Class name', required: true, placeholder: 'e.g. Class 11' },
      { key: 'description', label: 'Description', placeholder: 'Optional' },
    ],
  },
  batches: {
    label: 'Batch', icon: FiUsers,
    fields: [
      { key: 'name', label: 'Batch name', required: true, placeholder: 'e.g. Morning A' },
      { key: 'classId', label: 'Class', required: true, options: 'classes' },
      { key: 'schedule', label: 'Timing note', placeholder: 'e.g. 7AM–10AM' },
    ],
  },
  subjects: {
    label: 'Subject', icon: FiBook,
    fields: [
      { key: 'name', label: 'Subject name', required: true, placeholder: 'e.g. Physics' },
      { key: 'classId', label: 'Class', required: true, options: 'classes' },
      { key: 'teacherId', label: 'Teacher', options: 'teachers' },
    ],
  },
};

const blankFor = (type) => Object.fromEntries(ENTITIES[type].fields.map(f => [f.key, '']));

const EntityManager = ({ type, items, loading, lookups, reload }) => {
  const cfg = ENTITIES[type];
  const [form, setForm] = useState(blankFor(type));
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [classFilter, setClassFilter] = useState('');

  const reset = () => { setForm(blankFor(type)); setEditingId(null); };

  const startEdit = (item) => {
    setEditingId(item._id);
    setForm(Object.fromEntries(cfg.fields.map(f => [f.key, f.options ? idOf(item[f.key]) : (item[f.key] || '')])));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {};
      cfg.fields.forEach(f => { body[f.key] = form[f.key] === '' ? (f.options ? null : '') : form[f.key]; });
      if (editingId) {
        await api.put(`/academics/${type}/${editingId}`, body);
        toastSuccess(`${cfg.label} updated`);
      } else {
        await api.post(`/academics/${type}`, body);
        toastSuccess(`${cfg.label} created`);
      }
      reset();
      reload();
    } catch (err) {
      toastError(err, `Failed to save ${cfg.label.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.del(`/academics/${type}/${id}`);
      toastSuccess(`${cfg.label} deleted`);
      if (editingId === id) reset();
      reload();
    } catch (err) {
      toastError(err, `Failed to delete ${cfg.label.toLowerCase()}`);
    }
  };

  const nameFor = (lookupKey, id) => (lookups[lookupKey] || []).find(o => o._id === id)?.name;
  const showClassCol = cfg.fields.some(f => f.key === 'classId');
  const visible = classFilter ? items.filter(i => idOf(i.classId) === classFilter) : items;
  const Icon = cfg.icon;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 md:gap-6">
      <form onSubmit={save} className={`${cardCls} p-5 md:p-6 space-y-4 h-fit xl:sticky xl:top-4 ${editingId ? 'ring-2 ring-brand-300' : ''}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-gray-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-brand-gradient text-white shadow-brand-soft flex items-center justify-center"><Icon /></span>
            {editingId ? `Edit ${cfg.label.toLowerCase()}` : `New ${cfg.label.toLowerCase()}`}
          </h3>
          {editingId && <button type="button" onClick={reset} className={iconBtn} title="Cancel edit" aria-label="Cancel edit"><FiX /></button>}
        </div>
        {cfg.fields.map(f => (
          <div key={f.key}>
            <label className={labelCls}>{f.label}{f.required ? ' *' : ''}</label>
            {f.options ? (
              <select required={f.required} className={inputCls} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                <option value="">{f.required ? `Select ${f.label.toLowerCase()}` : 'None'}</option>
                {(lookups[f.options] || []).map(o => <option key={o._id} value={o._id}>{o.name}</option>)}
              </select>
            ) : (
              <input required={f.required} className={inputCls} placeholder={f.placeholder} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
            )}
          </div>
        ))}
        <button type="submit" disabled={saving} className={`${primaryBtn} w-full`}>
          {editingId ? <FiEdit2 /> : <FiPlus />} {saving ? 'Saving…' : editingId ? 'Save changes' : `Add ${cfg.label.toLowerCase()}`}
        </button>
      </form>

      <div className={`${cardCls} xl:col-span-2 overflow-hidden h-fit`}>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <p className="text-sm font-bold text-gray-700 dark:text-gray-200">{visible.length} {type}</p>
          {showClassCol && (
            <select className="ui-input !w-auto !py-2 text-xs font-bold" value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label="Filter by class">
              <option value="">All classes</option>
              {(lookups.classes || []).map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div className={`${tableScroll} max-h-[34rem]`}>
          <table className="w-full text-left min-w-[560px]">
            <thead>
              <tr className={theadRow}>
                <th className={thCls}>Name</th>
                {showClassCol && <th className={thCls}>Class</th>}
                {type === 'batches' && <th className={thCls}>Timing</th>}
                {type === 'subjects' && <th className={thCls}>Teacher</th>}
                {type === 'classes' && <th className={thCls}>Description</th>}
                <th className={`${thCls} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className={tbodyCls}>
              {loading ? <SkeletonRows rows={4} cols={4} /> : visible.length === 0 ? (
                <EmptyRow colSpan={4} icon={cfg.icon} title={`No ${type} yet`} hint={`Use the form to add a ${cfg.label.toLowerCase()}.`} />
              ) : visible.map(item => {
                const teacherName = item.teacherId?.name || nameFor('teachers', idOf(item.teacherId));
                return (
                  <tr key={item._id} className={`${rowCls} ${editingId === item._id ? 'bg-brand-50/60 dark:bg-white/5' : ''}`}>
                    <td className={tdCls}>
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"><Icon /></span>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{item.name}</span>
                      </div>
                    </td>
                    {showClassCol && (
                      <td className={tdCls}>
                        <span className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">{item.classId?.name || nameFor('classes', idOf(item.classId)) || '—'}</span>
                      </td>
                    )}
                    {type === 'batches' && <td className={`${tdCls} text-sm text-gray-500`}>{item.schedule || '—'}</td>}
                    {type === 'subjects' && (
                      <td className={tdCls}>
                        {teacherName ? (
                          <span className="flex items-center gap-2"><Avatar size="sm" name={teacherName} /><span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{teacherName}</span></span>
                        ) : <span className="ui-badge bg-amber-50 text-amber-700">Unassigned</span>}
                      </td>
                    )}
                    {type === 'classes' && <td className={`${tdCls} text-sm text-gray-500`}>{item.description || '—'}</td>}
                    <td className={tdCls}>
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEdit(item)} className={iconBtn} title="Edit" aria-label={`Edit ${item.name}`}><FiEdit2 /></button>
                        <ConfirmDelete compact onConfirm={() => remove(item._id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SECTIONS = [
  { id: 'classes', label: 'Classes', icon: FiLayers },
  { id: 'batches', label: 'Batches', icon: FiUsers },
  { id: 'subjects', label: 'Subjects', icon: FiBook },
  { id: 'timetable', label: 'Timetable', icon: FiCalendar },
];

const AcademicsManager = ({ teachers = [], onChanged }) => {
  const [section, setSection] = useState('classes');
  const [data, setData] = useState({ classes: [], batches: [], subjects: [] });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [classes, batches, subjects] = await Promise.all([
        api.get('/academics/classes'),
        api.get('/academics/batches'),
        api.get('/academics/subjects'),
      ]);
      setData({ classes, batches, subjects });
    } catch (err) {
      toastError(err, 'Failed to load academics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const reload = () => { load(); onChanged?.(); };
  const lookups = { classes: data.classes, teachers: teachers.map(t => ({ _id: t._id, name: t.name })) };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FiLayers}
        eyebrow="Academics"
        title="Classes & timetable"
        subtitle="Classes, batches, subjects and weekly timetables"
        actions={(
          <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-white/5" role="tablist" aria-label="Academics sections">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={section === s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-sm transition-all active:scale-95 ${section === s.id ? 'bg-white dark:bg-ink-800 text-brand-600 shadow-card' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                <s.icon /> {s.label}
                {s.id !== 'timetable' && <span className={`text-[11px] px-1.5 rounded-md ${section === s.id ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10' : 'bg-white/70 dark:bg-white/10 text-gray-400'}`}>{data[s.id].length}</span>}
              </button>
            ))}
          </div>
        )}
      />

      <div key={section} className="animate-fade-up">
        {section === 'timetable' ? (
          <TimetableBuilder batches={data.batches} classes={data.classes} subjects={data.subjects} teachers={lookups.teachers} />
        ) : (
          <EntityManager key={section} type={section} items={data[section]} loading={loading} lookups={lookups} reload={reload} />
        )}
      </div>
    </div>
  );
};

export default AcademicsManager;
