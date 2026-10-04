// LIVE / UPCOMING / COMPLETED / CANCELLED for a live class, honouring server status and duration (minutes).
export const liveClassStatus = (cls, now = new Date()) => {
  if (cls.status === 'cancelled') return 'CANCELLED';
  if (cls.status === 'completed') return 'COMPLETED';
  if (cls.status === 'live') return 'LIVE NOW';
  const start = new Date(cls.dateTime);
  const end = new Date(start.getTime() + (Number(cls.duration) || 60) * 60 * 1000);
  if (now < start) return 'UPCOMING';
  if (now <= end) return 'LIVE NOW';
  return 'COMPLETED';
};

export const isSameDay = (a, b = new Date()) => {
  const d = new Date(a);
  return d.getFullYear() === b.getFullYear() && d.getMonth() === b.getMonth() && d.getDate() === b.getDate();
};

export const timeAgo = (date) => {
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return '';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 0) {
    const m = Math.round(-s / 60);
    if (m < 60) return `in ${m}m`;
    const h = Math.round(m / 60);
    return h < 24 ? `in ${h}h` : `in ${Math.round(h / 24)}d`;
  }
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d ago` : new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
