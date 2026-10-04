import config from '../../config';

// Backend origin (API_URL without the trailing '/api')
export const API_ORIGIN = config.API_URL.replace(/\/api\/?$/, '');

export const authHeaders = () => {
    const token = sessionStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Turns stored file paths ('/uploads/x.pdf', 'uploads\\x.pdf') into absolute URLs.
// Absolute URLs (http/https/data/blob) are returned untouched.
export const resolveFileUrl = (fileUrl) => {
    if (!fileUrl) return '#';
    if (/^(https?:|data:|blob:)/i.test(fileUrl)) return fileUrl;
    const normalized = String(fileUrl).replace(/\\/g, '/');
    return `${API_ORIGIN}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
};

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const todayName = () => new Date().toLocaleDateString('en-US', { weekday: 'long' });

export const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Normalise a fee payment status. Legacy records without status are treated as Paid.
export const paymentStatus = (p) => {
    const s = String(p?.status || 'Paid').toLowerCase();
    if (s === 'pending') return 'Pending';
    if (s === 'rejected' || s === 'failed') return 'Rejected';
    return 'Paid';
};

export const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

export const initials = (name = '') => String(name).trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('') || '?';

// One-word verdict for a 0-100 metric (null = no data yet)
export const verdictFor = (value, { good = 75, ok = 50 } = {}) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
        return { label: 'No data yet', tone: 'gray', color: '#9ca3af' };
    }
    if (value >= good) return { label: 'Excellent', tone: 'green', color: '#10b981' };
    if (value >= ok) return { label: 'Good', tone: 'amber', color: '#f59e0b' };
    return { label: 'Needs attention', tone: 'red', color: '#f43f5e' };
};

export const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Whole days from today (midnight) until the given date; negative = overdue
export const daysUntil = (date) => {
    if (!date) return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - start) / 86400000);
};
