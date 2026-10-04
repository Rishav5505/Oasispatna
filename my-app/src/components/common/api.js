// Small helpers shared by the common components (not part of the public contract).
import config from '../../config';

export const API = config.API_URL;
export const SOCKET_URL = config.SOCKET_URL || config.API_URL.replace(/\/api\/?$/, '');

export const getToken = () => {
  try { return sessionStorage.getItem('token'); } catch { return null; }
};

export const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// '/uploads/x.png' -> absolute URL on the API host; absolute URLs pass through.
export const resolveUrl = (p) => {
  if (!p) return '';
  if (/^(https?:|blob:|data:)/i.test(p)) return p;
  return `${SOCKET_URL}${p.startsWith('/') ? '' : '/'}${p}`;
};

export const errMsg = (err, fallback) => err?.response?.data?.message || fallback;

export const isPdfUrl = (u) => /\.pdf($|\?)/i.test(u || '');

// Local YYYY-MM-DD for <input type="date">.
export const toDateInput = (d) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

export const fmtDate = (d, lang = 'en', opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  const x = new Date(d);
  if (Number.isNaN(x.getTime())) return '';
  return x.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', opts);
};
