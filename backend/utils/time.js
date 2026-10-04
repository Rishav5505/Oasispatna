// Date helpers pinned to India Standard Time (Asia/Kolkata, UTC+05:30, no DST)
const TZ = 'Asia/Kolkata';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' for the given instant, in IST
function istDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// Add (or subtract) whole days to a 'YYYY-MM-DD' string
function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// [start, end) instants of the IST calendar day containing `date`
function istDayRange(date = new Date()) {
  const str = istDateString(date);
  const start = new Date(`${str}T00:00:00+05:30`);
  const end = new Date(`${addDays(str, 1)}T00:00:00+05:30`);
  return { start, end, dateStr: str };
}

// Last `n` months (oldest first) in IST: [{ key: 'YYYY-MM', label: 'Jan 2026', start: Date }]
function lastNMonthsIST(n = 6, now = new Date()) {
  const [y, m] = istDateString(now).split('-').map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    let year = y;
    let month = m - i; // 1-based
    while (month <= 0) { month += 12; year -= 1; }
    const key = `${year}-${String(month).padStart(2, '0')}`;
    out.push({ key, label: `${MONTHS[month - 1]} ${year}`, start: new Date(`${key}-01T00:00:00+05:30`) });
  }
  return out;
}

module.exports = { TZ, istDateString, addDays, istDayRange, lastNMonthsIST };
