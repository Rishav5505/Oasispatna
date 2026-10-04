// Event type → colour classes, shared by EventCalendar + UpcomingEventsCard.
export const EVENT_TYPES = ['holiday', 'exam', 'event', 'ptm', 'other'];

export const TYPE_STYLES = {
  holiday: { chip: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/30', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' },
  exam: { chip: 'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:border-brand-500/30', dot: 'bg-brand-500', badge: 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300' },
  event: { chip: 'bg-ink-900 text-white border-ink-900 dark:bg-white/10 dark:border-white/10', dot: 'bg-ink-900 dark:bg-white', badge: 'bg-ink-900 text-white dark:bg-white/15' },
  ptm: { chip: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300' },
  test: { chip: 'bg-brand-50/60 text-brand-700 border-dashed border-brand-300 dark:bg-brand-500/10 dark:text-brand-300', dot: 'bg-brand-300', badge: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300' },
  other: { chip: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-white/5 dark:text-gray-300 dark:border-white/10', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300' },
};

// Read-only items merged by the backend (exams / online tests) have `source`.
export const styleKey = (ev) => {
  if (ev?.source === 'test') return 'test';
  if (ev?.source === 'exam') return 'exam';
  return TYPE_STYLES[ev?.type] ? ev.type : 'other';
};

export const typeLabelKey = (ev) => `calendar.type.${styleKey(ev)}`;

export const eventId = (ev) => ev?._id || ev?.id;
export const isReadOnlyEvent = (ev) => !!ev?.source && ev.source !== 'calendar';
