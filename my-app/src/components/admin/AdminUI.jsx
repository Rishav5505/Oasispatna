import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { badgeTone } from './adminTheme';
import { FiChevronLeft, FiChevronRight, FiX, FiTrash2, FiInbox, FiAlertTriangle } from 'react-icons/fi';

/* ------------------------------------------------------------------ */
/* Class tokens shared across admin screens                            */
/* ------------------------------------------------------------------ */
export const inputCls = 'ui-input font-semibold text-gray-800 dark:text-gray-100';
export const labelCls = 'text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5 block';
export const primaryBtn = 'ui-btn-primary';
export const secondaryBtn = 'ui-btn-secondary';
export const cardCls = 'ui-card';

// Tables: wrapper card > scroll container (sticky header) > table
export const tableScroll = 'overflow-x-auto ui-scrollbar';
export const theadRow = 'text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider';
export const thCls = 'sticky top-0 z-[1] px-5 py-3.5 bg-gray-50/95 dark:bg-ink-800/95 backdrop-blur border-b border-gray-100 dark:border-white/5 font-bold';
export const tdCls = 'px-5 py-4 align-middle';
export const rowCls = 'group transition-colors hover:bg-brand-50/40 dark:hover:bg-white/[0.03]';
export const tbodyCls = 'divide-y divide-gray-100 dark:divide-white/5';
export const iconBtn = 'inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400';

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */
export const Badge = ({ tone = 'gray', dot = false, pulse = false, className = '', children }) => (
  <span className={`ui-badge ${badgeTone(tone)} ${className}`}>
    {dot && (
      <span className="relative flex w-1.5 h-1.5">
        {pulse && <span className="absolute inline-flex w-full h-full rounded-full bg-current opacity-60 animate-ping" />}
        <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-current" />
      </span>
    )}
    {children}
  </span>
);

/* ------------------------------------------------------------------ */
/* Avatar with initials (falls back from photo)                        */
/* ------------------------------------------------------------------ */
const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() || '?';

const AVATAR_SIZES = {
  sm: 'w-8 h-8 text-[11px] rounded-lg',
  md: 'w-10 h-10 text-xs rounded-xl',
  lg: 'w-12 h-12 text-sm rounded-2xl',
  xl: 'w-16 h-16 text-lg rounded-2xl',
};

export const Avatar = ({ name, src, size = 'md', className = '' }) => {
  const [failed, setFailed] = useState(false);
  const sz = AVATAR_SIZES[size] || AVATAR_SIZES.md;
  return (
    <div className={`${sz} shrink-0 overflow-hidden bg-brand-gradient text-white font-extrabold flex items-center justify-center shadow-brand-soft ring-2 ring-white dark:ring-ink-900 transition-transform duration-300 group-hover:scale-105 ${className}`}>
      {src && !failed
        ? <img src={src} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} />
        : <span aria-hidden="true">{initialsOf(name)}</span>}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Animated SVG progress ring                                          */
/* ------------------------------------------------------------------ */
export const ProgressRing = ({ value = 0, size = 132, stroke = 12, color = '#f37021', track = 'rgba(148,163,184,0.18)', children, label }) => {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label || `${Math.round(pct)}%`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (shown / 100) * c}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
};

// Linear bar that animates its width from 0 on mount.
export const ProgressBar = ({ value = 0, className = '', barClass = 'bg-brand-gradient' }) => {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);
  return (
    <div className={`h-2 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden ${className}`}>
      <div className={`h-full rounded-full ${barClass} transition-[width] duration-1000 ease-out`} style={{ width: `${shown}%` }} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Page header for tabs                                                */
/* ------------------------------------------------------------------ */
export const PageHeader = ({ icon: Icon, eyebrow, title, subtitle, actions }) => (
  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
    <div className="flex items-center gap-4 min-w-0">
      {Icon && (
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-brand-gradient text-white items-center justify-center text-xl shadow-brand-soft shrink-0">
          <Icon />
        </div>
      )}
      <div className="min-w-0">
        {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>}
        <h2 className="text-2xl md:text-[1.75rem] font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full lg:w-auto">{actions}</div>}
  </div>
);

/* ------------------------------------------------------------------ */
/* Pagination / skeleton / empty                                       */
/* ------------------------------------------------------------------ */
export const Pagination = ({ page, totalPages, total, start, pageSize, setPage, label = 'records' }) => {
  if (total <= pageSize) return null;
  const end = Math.min(start + pageSize, total);
  const btn = 'w-9 h-9 inline-flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 hover:border-brand-300 hover:text-brand-600 disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-500 transition-all active:scale-95';
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-gray-100 dark:border-white/5 text-xs font-semibold text-gray-500">
      <span>Showing <span className="text-gray-900 dark:text-white">{start + 1}–{end}</span> of {total} {label}</span>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setPage(page - 1)} disabled={page <= 1} className={btn} aria-label="Previous page"><FiChevronLeft /></button>
        <span className="px-3 py-2 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 font-bold">{page} / {totalPages}</span>
        <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages} className={btn} aria-label="Next page"><FiChevronRight /></button>
      </div>
    </div>
  );
};

export const SkeletonRows = ({ rows = 5, cols = 4 }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r}>
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c} className="px-5 py-4">
            {c === 0 ? (
              <div className="flex items-center gap-3">
                <div className="ui-skeleton w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2"><div className="ui-skeleton h-3 w-3/4" /><div className="ui-skeleton h-2.5 w-1/2" /></div>
              </div>
            ) : (
              <div className={`ui-skeleton h-3 ${c % 2 ? 'w-2/3' : 'w-1/2'}`} />
            )}
          </td>
        ))}
      </tr>
    ))}
  </>
);

export const SkeletonBlock = ({ className = 'h-32' }) => <div className={`ui-skeleton rounded-3xl ${className}`} />;

export const EmptyState = ({ icon = FiInbox, title = 'Nothing here yet', hint, action }) => {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center animate-fade-in">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-brand-500/20 blur-xl" />
        <div className="relative w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-500/10 ring-8 ring-brand-50/50 dark:ring-brand-500/5 flex items-center justify-center text-brand-500 text-2xl">
          <Icon />
        </div>
      </div>
      <p className="text-gray-800 dark:text-gray-100 font-bold">{title}</p>
      {hint && <p className="text-sm text-gray-500 mt-1 max-w-sm">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export const EmptyRow = ({ colSpan, ...rest }) => (
  <tr><td colSpan={colSpan}><EmptyState {...rest} /></td></tr>
);

/* ------------------------------------------------------------------ */
/* Confirmations                                                       */
/* ------------------------------------------------------------------ */
// Two-step inline delete: first click reveals Confirm / Cancel. Never uses window.confirm.
export const ConfirmDelete = ({ onConfirm, label = 'Delete', confirmLabel = 'Confirm', busy = false, compact = false }) => {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setArmed(true); }}
        className={`inline-flex items-center gap-2 ${compact ? 'w-9 h-9 justify-center' : 'px-3 py-2'} text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 rounded-xl font-bold text-xs transition-all active:scale-95`}
        title={label}
        aria-label={label}
      >
        <FiTrash2 />{!compact && label}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 animate-scale-in" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={busy}
        onClick={async () => { await onConfirm(); setArmed(false); }}
        className="px-3 py-2 bg-red-600 text-white hover:bg-red-700 rounded-xl font-bold text-xs disabled:opacity-50 active:scale-95 transition-all"
      >
        {busy ? '…' : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="px-3 py-2 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 rounded-xl font-bold text-xs"
      >
        Cancel
      </button>
    </span>
  );
};

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */
const useEscape = (onClose) => {
  useEffect(() => {
    if (!onClose) return undefined;
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
};

export const Modal = ({ title, subtitle, icon: Icon, onClose, children, footer, maxWidth = 'max-w-xl', bodyClass = 'p-6 md:p-7', z = 'z-[200]', portal = false }) => {
  useEscape(onClose);
  // portal: render under <body> so a transformed/animated ancestor can't clip the fixed backdrop.
  const node = (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm ${z} flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in`} onClick={(e) => { e.stopPropagation(); onClose?.(); }}>
      <div
        role="dialog"
        aria-modal="true"
        className={`ui-card !rounded-b-none sm:!rounded-3xl w-full ${maxWidth} max-h-[92vh] flex flex-col overflow-hidden animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0"><Icon /></div>}
            <div className="min-w-0">
              <h2 className="text-lg font-extrabold text-gray-900 dark:text-white truncate">{title}</h2>
              {subtitle && <p className="text-xs font-medium text-gray-500 mt-0.5 truncate">{subtitle}</p>}
            </div>
          </div>
          <button type="button" onClick={onClose} className={iconBtn} aria-label="Close">
            <FiX className="text-lg" />
          </button>
        </div>
        <div className={`overflow-y-auto ui-scrollbar flex-1 ${bodyClass}`}>{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-ink-800/60 flex flex-wrap justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
  return portal ? createPortal(node, document.body) : node;
};

// Promise-free confirm dialog. Render when `open`; onConfirm runs then closes.
export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', tone = 'brand', onConfirm, onClose }) => {
  if (!open) return null;
  const confirmCls = tone === 'red'
    ? 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-700 active:scale-[0.98] transition-all'
    : primaryBtn;
  return (
    <Modal
      title={title}
      icon={FiAlertTriangle}
      onClose={onClose}
      maxWidth="max-w-md"
      z="z-[300]"
      footer={(
        <>
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
          <button type="button" autoFocus onClick={() => { onClose(); onConfirm?.(); }} className={confirmCls}>{confirmLabel}</button>
        </>
      )}
    >
      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{message}</p>
    </Modal>
  );
};
