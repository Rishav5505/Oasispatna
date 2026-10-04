/**
 * EventCalendar — holiday / exam / event / PTM calendar (GET /calendar?from=&to=).
 *   import EventCalendar from '../components/common/EventCalendar';
 *   <EventCalendar />                                            // read-only (student / parent)
 *   <EventCalendar canEdit classOptions={classes} />             // admin / teacher
 * Props:
 *   canEdit?: boolean      – shows "Add event", click a day to add, click an event to edit/delete
 *                            (POST/PUT/DELETE /calendar[/:id]). Items with `source` (exam/test) stay read-only.
 *   classOptions?: Array   – classes for the multi-select: [{_id, name}] or [{value, label}] or strings.
 *                            No selection = event for everyone.
 *   className?: string
 * Desktop: month grid. Mobile (<md): agenda list for the month. Colours: holiday red, exam orange,
 * event dark, PTM amber, online test dashed orange.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FiChevronLeft, FiChevronRight, FiPlus, FiCalendar, FiTrash2, FiLock, FiCheck } from 'react-icons/fi';
import { API, authHeaders, errMsg, toDateInput } from './api';
import { useI18n } from '../../i18n/useI18n';
import Modal from './Modal';
import { EVENT_TYPES, TYPE_STYLES, styleKey, typeLabelKey, eventId, isReadOnlyEvent } from './calendarTypes';

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayKey = (d) => toDateInput(d);

const normalizeClassOptions = (opts = []) =>
  opts.map((o) => (typeof o === 'string'
    ? { value: o, label: o }
    : { value: String(o.value ?? o._id ?? o.id), label: o.label ?? o.name ?? String(o.value ?? o._id) }));

const toLocalDateTime = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${toDateInput(x)}T${p(x.getHours())}:${p(x.getMinutes())}`;
};

const emptyForm = (date = new Date()) => ({
  title: '', description: '', type: 'event', allDay: true,
  startDate: toDateInput(date), endDate: toDateInput(date), classIds: [],
});

// Expands each event onto every day it covers within [from, to].
const bucketByDay = (events, from, to) => {
  const map = {};
  events.forEach((ev) => {
    const s = startOfDay(ev.startDate || ev.date);
    const e = startOfDay(ev.endDate || ev.startDate || ev.date);
    if (Number.isNaN(s.getTime())) return;
    const cur = new Date(Math.max(s.getTime(), from.getTime()));
    const end = new Date(Math.min((e < s ? s : e).getTime(), to.getTime()));
    let guard = 0;
    while (cur <= end && guard < 62) {
      const k = dayKey(cur);
      (map[k] = map[k] || []).push(ev);
      cur.setDate(cur.getDate() + 1);
      guard += 1;
    }
  });
  return map;
};

export function EventCalendar({ canEdit = false, classOptions = [], className = '' }) {
  const { t, lang } = useI18n();
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { ev?: event, form, readOnly }
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const classes = useMemo(() => normalizeClassOptions(classOptions), [classOptions]);
  const classLabel = useCallback((id) => classes.find((c) => c.value === String(id?._id ?? id))?.label || id?.name || '', [classes]);

  // Grid range: Sunday before the 1st → Saturday after month end.
  const { gridStart, gridEnd, days } = useMemo(() => {
    const first = new Date(cursor);
    const gs = new Date(first); gs.setDate(1 - first.getDay());
    const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
    const ge = new Date(last); ge.setDate(last.getDate() + (6 - last.getDay()));
    ge.setHours(23, 59, 59, 999);
    const list = [];
    for (let d = new Date(gs); d <= ge; d.setDate(d.getDate() + 1)) list.push(new Date(d));
    return { gridStart: gs, gridEnd: ge, days: list };
  }, [cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/calendar`, {
        headers: authHeaders(),
        params: { from: gridStart.toISOString(), to: gridEnd.toISOString() },
      });
      setEvents(Array.isArray(data) ? data : data?.events || []);
    } catch (err) {
      setEvents([]);
      toast.error(errMsg(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  }, [gridStart, gridEnd, t]);

  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => bucketByDay(events, gridStart, gridEnd), [events, gridStart, gridEnd]);

  const monthEvents = useMemo(() => {
    const mStart = new Date(cursor);
    const mEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
    return events
      .filter((ev) => {
        const s = new Date(ev.startDate || ev.date);
        const e = new Date(ev.endDate || ev.startDate || ev.date);
        return s <= mEnd && e >= mStart;
      })
      .sort((a, b) => new Date(a.startDate || a.date) - new Date(b.startDate || b.date));
  }, [events, cursor]);

  const shiftMonth = (delta) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  const goToday = () => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); };

  const openNew = (date) => {
    setConfirmDelete(false);
    setModal({ form: emptyForm(date || new Date()), readOnly: false });
  };
  const openEvent = (ev) => {
    setConfirmDelete(false);
    const readOnly = !canEdit || isReadOnlyEvent(ev);
    const allDay = ev.allDay !== false;
    setModal({
      ev,
      readOnly,
      form: {
        title: ev.title || '',
        description: ev.description || '',
        type: EVENT_TYPES.includes(ev.type) ? ev.type : 'other',
        allDay,
        startDate: allDay ? toDateInput(ev.startDate || ev.date) : toLocalDateTime(ev.startDate || ev.date),
        endDate: allDay ? toDateInput(ev.endDate || ev.startDate || ev.date) : toLocalDateTime(ev.endDate || ev.startDate || ev.date),
        classIds: (ev.classIds || []).map((c) => String(c?._id ?? c)),
      },
    });
  };
  const closeModal = () => { if (!saving) setModal(null); };

  const setField = (k, v) => setModal((m) => ({ ...m, form: { ...m.form, [k]: v } }));
  const toggleAllDay = (checked) => setModal((m) => {
    const f = m.form;
    const conv = (v) => (checked ? (v || '').slice(0, 10) : (v && v.length === 10 ? `${v}T09:00` : v));
    return { ...m, form: { ...f, allDay: checked, startDate: conv(f.startDate), endDate: conv(f.endDate) } };
  });
  const toggleClass = (id) => setModal((m) => {
    const has = m.form.classIds.includes(id);
    return { ...m, form: { ...m.form, classIds: has ? m.form.classIds.filter((x) => x !== id) : [...m.form.classIds, id] } };
  });

  const save = async () => {
    const f = modal.form;
    if (!f.title.trim()) { toast.error(t('calendar.titleRequired')); return; }
    const start = new Date(f.allDay ? `${f.startDate}T00:00` : f.startDate);
    const end = new Date(f.allDay ? `${f.endDate || f.startDate}T23:59` : (f.endDate || f.startDate));
    if (Number.isNaN(start.getTime())) { toast.error(t('common.error')); return; }
    if (end < start) { toast.error(t('leave.dateError')); return; }
    const payload = {
      title: f.title.trim(), description: f.description.trim(), type: f.type, allDay: f.allDay,
      startDate: start.toISOString(), endDate: end.toISOString(), classIds: f.classIds,
    };
    setSaving(true);
    try {
      const id = eventId(modal.ev);
      if (id) await axios.put(`${API}/calendar/${id}`, payload, { headers: authHeaders() });
      else await axios.post(`${API}/calendar`, payload, { headers: authHeaders() });
      toast.success(t('calendar.saved'));
      setModal(null);
      load();
    } catch (err) {
      toast.error(errMsg(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const id = eventId(modal?.ev);
    if (!id) return;
    setSaving(true);
    try {
      await axios.delete(`${API}/calendar/${id}`, { headers: authHeaders() });
      toast.success(t('calendar.deleted'));
      setModal(null);
      setEvents((list) => list.filter((e) => eventId(e) !== id));
    } catch (err) {
      toast.error(errMsg(err, t('common.error')));
    } finally {
      setSaving(false);
    }
  };

  const today = new Date();
  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 7); // a Sunday
    return Array.from({ length: 7 }, (_, i) => new Date(base.getFullYear(), 0, 7 + i).toLocaleDateString(locale, { weekday: 'short' }));
  }, [locale]);
  const monthTitle = cursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const fmtRange = (ev) => {
    const s = new Date(ev.startDate || ev.date);
    const e = new Date(ev.endDate || ev.startDate || ev.date);
    const d = { day: 'numeric', month: 'short' };
    const timePart = ev.allDay === false ? ` · ${s.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })}` : '';
    return sameDay(s, e) ? `${s.toLocaleDateString(locale, d)}${timePart}` : `${s.toLocaleDateString(locale, d)} – ${e.toLocaleDateString(locale, d)}`;
  };

  const legend = ['holiday', 'exam', 'event', 'ptm', 'test'];

  return (
    <div className={`ui-card overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 pt-5 pb-4 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft shrink-0"><FiCalendar /></span>
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white capitalize truncate">{monthTitle}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('calendar.title')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-brand-600 active:scale-95 transition"><FiChevronLeft /></button>
          <button type="button" onClick={goToday} className="h-9 px-3 rounded-xl text-xs font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:text-brand-600 transition">{t('common.today')}</button>
          <button type="button" onClick={() => shiftMonth(1)} aria-label="Next month" className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-brand-600 active:scale-95 transition"><FiChevronRight /></button>
          {canEdit && (
            <button type="button" onClick={() => openNew()} className="ui-btn-primary !px-3.5 !py-2 ml-1">
              <FiPlus /> <span className="hidden sm:inline">{t('calendar.addEvent')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 px-4 sm:px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
        {legend.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${TYPE_STYLES[k].dot}`} /> {t(`calendar.type.${k}`)}
          </span>
        ))}
      </div>

      {/* Desktop month grid */}
      <div className="hidden md:block px-4 sm:px-6 pb-6">
        <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wide text-gray-400 pb-2">
          {weekdays.map((w) => <div key={w}>{w}</div>)}
        </div>
        <div className={`grid grid-cols-7 gap-1.5 ${loading ? 'opacity-60' : ''} transition-opacity`}>
          {days.map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const isToday = sameDay(d, today);
            const list = byDay[dayKey(d)] || [];
            const DayTag = canEdit ? 'button' : 'div';
            return (
              <DayTag
                key={dayKey(d)}
                {...(canEdit ? { type: 'button', onClick: () => openNew(d), 'aria-label': `${t('calendar.addEvent')} ${d.toDateString()}` } : {})}
                className={`group relative min-h-[104px] rounded-2xl p-1.5 text-left border transition-all ${
                  inMonth ? 'bg-white dark:bg-ink-900 border-gray-100 dark:border-white/5' : 'bg-gray-50/70 dark:bg-white/[0.02] border-transparent'
                } ${canEdit ? 'hover:border-brand-200 hover:shadow-card cursor-pointer' : ''}`}
              >
                <div className="flex items-center justify-between px-1">
                  <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-brand-gradient text-white shadow-brand-soft' : inMonth ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'
                  }`}>{d.getDate()}</span>
                  {canEdit && <FiPlus className="w-3.5 h-3.5 text-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>
                <div className="mt-1 space-y-1">
                  {list.slice(0, 3).map((ev, i) => (
                    <span
                      key={`${eventId(ev) || ev.title}-${i}`}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); openEvent(ev); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); openEvent(ev); } }}
                      title={ev.title}
                      className={`block truncate text-[11px] font-semibold px-2 py-0.5 rounded-lg border cursor-pointer hover:brightness-95 ${TYPE_STYLES[styleKey(ev)].chip}`}
                    >
                      {ev.title}
                    </span>
                  ))}
                  {list.length > 3 && <span className="block text-[11px] font-bold text-gray-400 px-2">+{list.length - 3}</span>}
                </div>
              </DayTag>
            );
          })}
        </div>
      </div>

      {/* Mobile agenda */}
      <div className="md:hidden px-4 pb-5">
        {loading ? (
          <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="ui-skeleton h-16" />)}</div>
        ) : monthEvents.length === 0 ? (
          <div className="py-10 flex flex-col items-center text-center gap-3">
            <span className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center"><FiCalendar className="w-6 h-6" /></span>
            <p className="text-sm font-semibold text-gray-500">{t('calendar.noEvents')}</p>
            {canEdit && <button type="button" onClick={() => openNew()} className="ui-btn-primary"><FiPlus /> {t('calendar.addEvent')}</button>}
          </div>
        ) : (
          <ul className="space-y-2.5 ui-stagger">
            {monthEvents.map((ev, i) => {
              const s = new Date(ev.startDate || ev.date);
              const st = TYPE_STYLES[styleKey(ev)];
              return (
                <li key={`${eventId(ev) || ev.title}-${i}`}>
                  <button type="button" onClick={() => openEvent(ev)} className="w-full flex items-stretch gap-3 p-3 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-ink-900 text-left active:scale-[0.99] transition">
                    <div className={`w-12 shrink-0 rounded-xl flex flex-col items-center justify-center ${sameDay(s, today) ? 'bg-brand-gradient text-white' : 'bg-gray-50 dark:bg-white/5 text-gray-800 dark:text-gray-200'}`}>
                      <span className="text-lg font-extrabold leading-none">{s.getDate()}</span>
                      <span className="text-[10px] font-bold uppercase">{s.toLocaleDateString(locale, { weekday: 'short' })}</span>
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{ev.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{fmtRange(ev)}</p>
                      <span className={`ui-badge mt-1.5 !text-[10px] ${st.badge}`}>{t(typeLabelKey(ev))}</span>
                    </div>
                    <span className={`w-1.5 rounded-full ${st.dot}`} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Add / edit / view modal */}
      <Modal
        open={!!modal}
        onClose={closeModal}
        title={modal?.readOnly ? (modal?.ev?.title || t('calendar.title')) : modal?.ev ? t('calendar.editEvent') : t('calendar.addEvent')}
        footer={modal && !modal.readOnly ? (
          <>
            {eventId(modal.ev) && (
              confirmDelete ? (
                <div className="mr-auto flex items-center gap-2">
                  <span className="text-xs font-semibold text-red-600">{t('calendar.deleteConfirm')}</span>
                  <button type="button" onClick={remove} disabled={saving} className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50">{t('common.yes')}</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 dark:bg-white/10 dark:text-gray-300">{t('common.no')}</button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className="mr-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
                  <FiTrash2 /> {t('common.delete')}
                </button>
              )
            )}
            <button type="button" onClick={closeModal} className="ui-btn-secondary">{t('common.cancel')}</button>
            <button type="button" onClick={save} disabled={saving} className="ui-btn-primary"><FiCheck /> {saving ? t('common.loading') : t('common.save')}</button>
          </>
        ) : (
          <button type="button" onClick={closeModal} className="ui-btn-secondary">{t('common.close')}</button>
        )}
      >
        {modal && modal.readOnly && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`ui-badge ${TYPE_STYLES[styleKey(modal.ev)].badge}`}>{t(typeLabelKey(modal.ev))}</span>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">{fmtRange(modal.ev)}</span>
            </div>
            {modal.ev.description && <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line">{modal.ev.description}</p>}
            {(modal.ev.classIds || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {modal.ev.classIds.map((c) => <span key={String(c?._id ?? c)} className="ui-badge bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 !normal-case">{classLabel(c) || String(c?._id ?? c)}</span>)}
              </div>
            )}
            {isReadOnlyEvent(modal.ev) && <p className="flex items-center gap-1.5 text-xs text-gray-400"><FiLock /> {t('calendar.readOnly')}</p>}
          </div>
        )}
        {modal && !modal.readOnly && (
          <div className="space-y-4">
            <label className="block">
              <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('calendar.eventTitle')}</span>
              <input className="ui-input" value={modal.form.title} onChange={(e) => setField('title', e.target.value)} maxLength={120} autoFocus />
            </label>
            <div>
              <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('calendar.type')}</span>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPES.map((ty) => (
                  <button
                    key={ty}
                    type="button"
                    onClick={() => setField('type', ty)}
                    aria-pressed={modal.form.type === ty}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                      modal.form.type === ty ? 'border-brand-500 ring-2 ring-brand-500/20 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-brand-300'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${TYPE_STYLES[ty].dot}`} /> {t(`calendar.type.${ty}`)}
                  </button>
                ))}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">
              <input type="checkbox" checked={modal.form.allDay} onChange={(e) => toggleAllDay(e.target.checked)} className="w-4 h-4 accent-brand-500" />
              {t('calendar.allDay')}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('calendar.start')}</span>
                <input type={modal.form.allDay ? 'date' : 'datetime-local'} className="ui-input" value={modal.form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('calendar.end')}</span>
                <input type={modal.form.allDay ? 'date' : 'datetime-local'} className="ui-input" value={modal.form.endDate} min={modal.form.startDate} onChange={(e) => setField('endDate', e.target.value)} />
              </label>
            </div>
            <label className="block">
              <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('calendar.description')} <span className="font-medium text-gray-400">({t('common.optional')})</span></span>
              <textarea className="ui-input min-h-[80px] resize-y" value={modal.form.description} onChange={(e) => setField('description', e.target.value)} maxLength={1000} />
            </label>
            {classes.length > 0 && (
              <div>
                <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('calendar.classes')}</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setField('classIds', [])}
                    aria-pressed={modal.form.classIds.length === 0}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${modal.form.classIds.length === 0 ? 'bg-ink-900 text-white border-ink-900 dark:bg-white dark:text-ink-900' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300'}`}
                  >
                    {t('common.everyone')}
                  </button>
                  {classes.map((c) => {
                    const on = modal.form.classIds.includes(c.value);
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => toggleClass(c.value)}
                        aria-pressed={on}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${on ? 'bg-brand-gradient text-white border-transparent shadow-brand-soft' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-brand-300'}`}
                      >
                        {on && <FiCheck className="w-3 h-3" />} {c.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400">{t('calendar.classesHint')}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default EventCalendar;
