import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiInbox, FiX } from 'react-icons/fi';
import { BACKEND_ORIGIN } from './teacherApi';

/** Inline delete confirmation (replaces window.confirm). */
export const ConfirmButton = ({ onConfirm, children, className = '', prompt = 'Delete?', title = 'Delete', yesLabel = 'Yes' }) => {
    const [asking, setAsking] = useState(false);
    const [busy, setBusy] = useState(false);

    if (asking) {
        return (
            <div className="flex items-center gap-1.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl pl-3 pr-1 py-1 animate-scale-in" onClick={e => e.stopPropagation()}>
                <span className="text-[11px] font-bold text-red-600 whitespace-nowrap">{prompt}</span>
                <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                        setBusy(true);
                        try { await onConfirm(); } finally { setBusy(false); setAsking(false); }
                    }}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[11px] font-bold hover:bg-red-700 active:scale-95 transition disabled:opacity-50"
                >
                    {busy ? '…' : yesLabel}
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => setAsking(false)}
                    className="px-3 py-1.5 bg-white dark:bg-ink-800 text-gray-500 rounded-lg text-[11px] font-bold border border-gray-200 dark:border-white/10 hover:bg-gray-50 active:scale-95 transition"
                >
                    No
                </button>
            </div>
        );
    }

    return (
        <button type="button" title={title} aria-label={title} onClick={(e) => { e.stopPropagation(); setAsking(true); }} className={className}>
            {children}
        </button>
    );
};

/** Skeleton-based loading placeholder. `variant` shapes the blocks like the content. */
export const Spinner = ({ label = 'Loading...', variant = 'list', rows = 3 }) => (
    <div className="animate-fade-in" role="status" aria-live="polite">
        <span className="sr-only">{label}</span>
        {variant === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="ui-card p-5 space-y-4">
                        <div className="ui-skeleton h-32 w-full" />
                        <div className="ui-skeleton h-4 w-3/4" />
                        <div className="ui-skeleton h-3 w-1/2" />
                    </div>
                ))}
            </div>
        ) : (
            <div className="space-y-3">
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3">
                        <div className="ui-skeleton w-11 h-11 rounded-2xl shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="ui-skeleton h-3.5 w-2/3" />
                            <div className="ui-skeleton h-3 w-1/3" />
                        </div>
                    </div>
                ))}
            </div>
        )}
        <p className="mt-3 text-center text-xs font-semibold text-gray-400">{label}</p>
    </div>
);

export const EmptyState = ({ icon = FiInbox, title, hint, action, className = '' }) => {
    const Icon = icon;
    return (
        <div className={`ui-card py-14 px-6 flex flex-col items-center justify-center text-center animate-fade-up ${className}`}>
            <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full bg-brand-500/15 blur-xl" />
                <div className="relative w-16 h-16 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center text-2xl">
                    <Icon />
                </div>
            </div>
            <p className="font-bold text-gray-800 dark:text-gray-100">{title}</p>
            {hint && <p className="text-sm text-gray-500 mt-1 max-w-sm">{hint}</p>}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
};

/** Page heading for a tab: icon chip, title, subtitle and right-side actions. */
export const PageHeader = ({ icon: Icon, title, subtitle, actions, eyebrow }) => (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
            {Icon && (
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-brand-gradient text-white flex items-center justify-center text-xl shadow-brand-soft">
                    <Icon />
                </div>
            )}
            <div className="min-w-0">
                {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">{eyebrow}</p>}
                <h2 className="text-2xl md:text-[1.75rem] font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight">{title}</h2>
                {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        {actions && <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center">{actions}</div>}
    </div>
);

/** Pill-style segmented control. options: [[value, label, count?]] */
export const Segmented = ({ options, value, onChange, className = '', size = 'md' }) => (
    <div role="tablist" className={`inline-flex p-1 rounded-2xl bg-gray-100/80 dark:bg-white/5 border border-gray-100 dark:border-white/5 overflow-x-auto max-w-full ${className}`}>
        {options.map(([k, label, count]) => {
            const active = value === k;
            return (
                <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onChange(k)}
                    className={`shrink-0 flex items-center gap-2 rounded-xl font-bold whitespace-nowrap transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'} ${active
                        ? 'bg-white dark:bg-ink-800 text-brand-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'}`}
                >
                    {label}
                    {count !== undefined && (
                        <span className={`px-1.5 min-w-[1.25rem] text-center rounded-md text-[10px] ${active ? 'bg-brand-500 text-white' : 'bg-gray-200/80 dark:bg-white/10 text-gray-500'}`}>{count}</span>
                    )}
                </button>
            );
        })}
    </div>
);

/** Labelled form field wrapper. */
export const Field = ({ label, children, hint, className = '' }) => (
    <label className={`block space-y-1.5 ${className}`}>
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{label}</span>
        {children}
        {hint && <span className="block text-[11px] text-gray-400">{hint}</span>}
    </label>
);

/** Initials / photo avatar with brand gradient. */
export const Avatar = ({ name, photo, size = 'md', className = '' }) => {
    const sizes = { xs: 'w-7 h-7 text-[10px]', sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-lg', xl: 'w-28 h-28 text-4xl' };
    const initials = String(name || '?').trim().split(/\s+/).slice(0, 2).map(p => p.charAt(0).toUpperCase()).join('') || '?';
    const src = photo ? (/^(https?:|data:|blob:)/.test(photo) ? photo : `${BACKEND_ORIGIN}${photo}`) : null;
    return (
        <div className={`shrink-0 rounded-full overflow-hidden bg-brand-gradient text-white font-bold flex items-center justify-center ring-2 ring-white dark:ring-ink-900 ${sizes[size] || sizes.md} ${className}`}>
            {src ? <img src={src} alt={name || 'Avatar'} className="w-full h-full object-cover" /> : initials}
        </div>
    );
};

/** Animated circular progress (0-100). */
export const ProgressRing = ({ value = 0, size = 72, stroke = 7, label, sublabel, color = '#f37021', track = 'rgba(148,163,184,0.2)' }) => {
    const [shown, setShown] = useState(0);
    useEffect(() => {
        const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, Number(value) || 0))));
        return () => cancelAnimationFrame(id);
    }, [value]);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
                <circle
                    cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={c - (shown / 100) * c}
                    style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                <span className="text-sm font-extrabold">{label ?? `${Math.round(shown)}%`}</span>
                {sublabel && <span className="text-[9px] font-bold uppercase tracking-wider opacity-70 mt-0.5">{sublabel}</span>}
            </div>
        </div>
    );
};

/** Modal shell: blurred backdrop, scale-in panel, optional sticky footer. Esc closes. */
export const Modal = ({ open, onClose, title, subtitle, icon: Icon, children, footer, size = 'lg', bodyClassName = '', dismissible = true }) => {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === 'Escape' && dismissible) onClose?.(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose, dismissible]);
    if (!open) return null;
    const widths = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
    // Portal so animated (transformed) tab wrappers don't trap the fixed overlay.
    return createPortal(
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={dismissible ? onClose : undefined}>
            <div
                role="dialog"
                aria-modal="true"
                onClick={e => e.stopPropagation()}
                className={`ui-card w-full ${widths[size] || widths.lg} max-h-[94vh] flex flex-col overflow-hidden rounded-b-none sm:rounded-3xl animate-scale-in`}
            >
                <div className="flex items-center gap-3 px-5 md:px-7 py-4 md:py-5 border-b border-gray-100 dark:border-white/5">
                    {Icon && <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center text-lg shrink-0"><Icon /></div>}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight truncate">{title}</h3>
                        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 dark:hover:bg-white/10 hover:rotate-90 transition-all duration-300">
                        <FiX />
                    </button>
                </div>
                <div className={`flex-1 overflow-y-auto ui-scrollbar ${bodyClassName}`}>{children}</div>
                {footer && <div className="px-5 md:px-7 py-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-white/[0.02]">{footer}</div>}
            </div>
        </div>,
        document.body
    );
};

const STATUS_BADGE = {
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
    dark: 'bg-ink-900 text-white dark:bg-white/10',
    grey: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
};

export const Badge = ({ tone = 'grey', children, dot, className = '' }) => (
    <span className={`ui-badge ${STATUS_BADGE[tone] || STATUS_BADGE.grey} ${className}`}>
        {dot && (
            <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-current opacity-60 animate-ping" />
                <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-current" />
            </span>
        )}
        {children}
    </span>
);
