import config from '../../config';

// Backend origin (e.g. http://localhost:5002) used for static files under /uploads
export const BACKEND_ORIGIN = config.API_URL.replace(/\/api\/?$/, '');

export const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem('token')}` });

// Turns stored file references into a usable URL.
// - absolute URLs (http/https/data/blob) are returned unchanged
// - web paths like '/uploads/x.pdf' or 'uploads/x.pdf' get the backend origin prefixed
export const resolveFileUrl = (url) => {
  if (!url) return '';
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  const normalized = String(url).split('\\').join('/');
  return `${BACKEND_ORIGIN}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const todayName = (date = new Date()) => date.toLocaleDateString('en-US', { weekday: 'long' });

export const toMinutes = (hhmm) => {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

export const formatTime12 = (hhmm) => {
  if (!hhmm) return '';
  const mins = toMinutes(hhmm);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
};

// For a list of schedule slots for *today*, returns { currentId, nextId }
export const findCurrentAndNext = (slots, now = new Date()) => {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const sorted = [...slots].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const current = sorted.find(s => toMinutes(s.startTime) <= nowMin && nowMin < toMinutes(s.endTime));
  const next = sorted.find(s => toMinutes(s.startTime) > nowMin);
  return { currentId: current?._id || null, nextId: next?._id || null };
};

export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;
