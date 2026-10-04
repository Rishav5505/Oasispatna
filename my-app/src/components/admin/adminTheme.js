// Non-component helpers shared by admin UI (kept separate for fast-refresh).

const BADGE_TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
  red: 'bg-red-50 text-red-600 ring-1 ring-red-200/70 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/20',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200/70 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20',
  dark: 'bg-ink-900 text-white ring-1 ring-black/10 dark:bg-white/10',
  gray: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200/70 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10',
};
export const badgeTone = (tone = 'gray') => BADGE_TONES[tone] || BADGE_TONES.gray;

// Maps a free-text status to a semantic tone.
export const statusTone = (status) => {
  const s = String(status || '').toLowerCase();
  if (['paid', 'present', 'approved', 'published', 'admitted', 'active', 'completed'].includes(s)) return 'green';
  if (['pending', 'draft', 'contacted', 'interested', 'upcoming'].includes(s)) return 'amber';
  if (['absent', 'overdue', 'rejected', 'failed', 'cancelled', 'live now'].includes(s)) return 'red';
  if (['new'].includes(s)) return 'brand';
  return 'gray';
};

