/**
 * UpcomingEventsCard — compact list of the next holidays / exams / events (GET /calendar/upcoming?limit=).
 *   import UpcomingEventsCard from '../components/common/UpcomingEventsCard';
 *   <UpcomingEventsCard />
 *   <UpcomingEventsCard limit={4} onViewAll={() => setTab('calendar')} className="h-full" />
 * Props: limit? (default 5), onViewAll? (shows a "View all" link), title? (defaults to t('calendar.upcoming')), className?
 * Shows a countdown chip ("Today", "Tomorrow", "in 5d").
 */
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiCalendar, FiArrowRight } from 'react-icons/fi';
import { API, authHeaders } from './api';
import { useI18n } from '../../i18n/useI18n';
import { TYPE_STYLES, styleKey, typeLabelKey, eventId } from './calendarTypes';

const daysUntil = (d) => {
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
};

export function UpcomingEventsCard({ limit = 5, onViewAll, title, className = '' }) {
  const { t, lang } = useI18n();
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const [items, setItems] = useState(null);

  useEffect(() => {
    let cancelled = false;
    axios.get(`${API}/calendar/upcoming`, { headers: authHeaders(), params: { limit } })
      .then(({ data }) => { if (!cancelled) setItems(Array.isArray(data) ? data : data?.events || []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, [limit]);

  const countdown = (d) => {
    const n = daysUntil(d);
    if (n <= 0) return t('common.today');
    return n === 1 ? t('common.tomorrow') : t('common.inDays', { count: n });
  };

  return (
    <div className={`ui-card p-5 ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="flex items-center gap-2 font-extrabold tracking-tight text-gray-900 dark:text-white">
          <span className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-500/15 text-brand-600 flex items-center justify-center"><FiCalendar /></span>
          {title || t('calendar.upcoming')}
        </h3>
        {onViewAll && (
          <button type="button" onClick={onViewAll} className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 group">
            {t('common.viewAll')} <FiArrowRight className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {items === null ? (
        <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="ui-skeleton h-12" />)}</div>
      ) : items.length === 0 ? (
        <div className="py-6 flex flex-col items-center gap-2 text-center">
          <span className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center"><FiCalendar /></span>
          <p className="text-sm font-semibold text-gray-500">{t('calendar.noUpcoming')}</p>
        </div>
      ) : (
        <ul className="space-y-2 ui-stagger">
          {items.map((ev, i) => {
            const s = new Date(ev.startDate || ev.date);
            const st = TYPE_STYLES[styleKey(ev)];
            const n = daysUntil(s);
            return (
              <li key={`${eventId(ev) || ev.title}-${i}`} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-brand-50/40 dark:hover:bg-white/5 transition-colors">
                <div className="w-11 h-11 shrink-0 rounded-xl bg-gray-50 dark:bg-white/5 flex flex-col items-center justify-center">
                  <span className="text-base font-extrabold leading-none text-gray-900 dark:text-white">{s.getDate()}</span>
                  <span className="text-[10px] font-bold uppercase text-gray-400">{s.toLocaleDateString(locale, { month: 'short' })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{ev.title}</p>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} /> {t(typeLabelKey(ev))}
                  </span>
                </div>
                <span className={`ui-badge !normal-case shrink-0 ${n <= 1 ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300'}`}>{countdown(s)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default UpcomingEventsCard;
