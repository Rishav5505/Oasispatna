// Helpers shared by the fees desk (admin + staff).
import { toDateInput } from '../../common/api';

export const MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card'];
export const PAY_TYPES = ['Tuition', 'Exam', 'Registration', 'Other'];

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// 05 Jan 2026
export const fmtDate = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  return Number.isNaN(x.getTime()) ? '—' : x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const pctOf = (part, whole) => (Number(whole) > 0 ? Math.max(0, Math.min(100, (Number(part) / Number(whole)) * 100)) : 0);

export const addMonths = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toDateInput(d);
};

// Equal split of `total` into `count` dated rows; the last row absorbs the rounding remainder.
export const splitRows = (total, count, first, interval, labelFor = (i) => `Installment ${i + 1}`) => {
  const c = Math.max(1, Math.min(60, parseInt(count, 10) || 1));
  const net = round2(total);
  const each = Math.floor((net / c) * 100) / 100;
  const gap = Math.max(0, parseInt(interval, 10) || 0);
  return Array.from({ length: c }, (_, i) => ({
    label: labelFor(i),
    amount: String(i === c - 1 ? round2(net - each * (c - 1)) : each),
    dueDate: first ? addMonths(first, i * gap) : '',
  }));
};

// t('key.one') when n is exactly 1, else t('key') — both receive {n}.
export const plural = (t, key, n, vars = {}) => t(Number(n) === 1 ? `${key}.one` : key, { n, ...vars });

export const isOverdue = (s) => (s.installments || []).some(i => i.status === 'overdue') || s.nextDue?.status === 'overdue';

// Remembered UI flags (never throws — private mode / blocked storage).
export const readFlag = (key) => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
export const writeFlag = (key, on) => { try { if (on) localStorage.setItem(key, '1'); else localStorage.removeItem(key); } catch { /* ignore */ } };
