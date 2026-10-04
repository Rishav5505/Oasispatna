import React, { useEffect, useState } from 'react';
import { paymentStatus } from './parentUtils';

// Shimmer block used to build per-tab loading skeletons
export const SkeletonBlock = ({ className = '' }) => (
    <div className={`ui-skeleton rounded-2xl ${className}`}></div>
);

export const CardsSkeleton = ({ count = 3, height = 'h-40' }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={`ui-card p-5 ${height} flex flex-col gap-3`}>
                <SkeletonBlock className="w-11 h-11 rounded-xl" />
                <SkeletonBlock className="h-4 w-2/3" />
                <SkeletonBlock className="h-3 w-1/2" />
            </div>
        ))}
    </div>
);

export const ListSkeleton = ({ rows = 5 }) => (
    <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
                <SkeletonBlock className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                    <SkeletonBlock className="h-3.5 w-1/2" />
                    <SkeletonBlock className="h-3 w-1/3" />
                </div>
            </div>
        ))}
    </div>
);

export const EmptyState = ({ icon: Icon, title, hint, action, className = '' }) => (
    <div className={`py-12 px-6 text-center rounded-3xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/60 dark:bg-white/[0.02] ${className}`}>
        {Icon && (
            <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-500 mx-auto mb-4 ring-8 ring-brand-50/50 dark:ring-brand-500/5">
                <Icon className="text-xl" />
            </div>
        )}
        <p className="text-gray-700 dark:text-gray-200 font-bold">{title}</p>
        {hint && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">{hint}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
);

const STATUS_STYLES = {
    Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20',
    Pending: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20',
    Rejected: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20',
};

const STATUS_LABEL = {
    Paid: 'Paid',
    Pending: 'Awaiting approval',
    Rejected: 'Rejected',
};

export const PaymentStatusBadge = ({ payment }) => {
    const status = paymentStatus(payment);
    return (
        <span className={`ui-badge ring-1 whitespace-nowrap ${STATUS_STYLES[status]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'Paid' ? 'bg-emerald-500' : status === 'Pending' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'}`}></span>
            {STATUS_LABEL[status]}
        </span>
    );
};

// Card wrapper with consistent padding + optional header row
export const Panel = ({ title, subtitle, icon: Icon, action, children, className = '', bodyClassName = '' }) => (
    <section className={`ui-card p-5 md:p-6 ${className}`}>
        {(title || action) && (
            <div className="flex items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3 min-w-0">
                    {Icon && (
                        <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
                            <Icon />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="text-base md:text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h3>
                        {subtitle && <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
                    </div>
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
        )}
        <div className={bodyClassName}>{children}</div>
    </section>
);

// Progress bar that animates its width from 0 on mount
export const AnimatedBar = ({ value = 0, className = 'h-2.5', barClassName = 'bg-brand-gradient', trackClassName = 'bg-gray-100 dark:bg-white/5' }) => {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const id = requestAnimationFrame(() => setWidth(Math.max(0, Math.min(100, Number(value) || 0))));
        return () => cancelAnimationFrame(id);
    }, [value]);
    return (
        <div className={`w-full rounded-full overflow-hidden ${trackClassName} ${className}`}>
            <div className={`h-full rounded-full transition-[width] duration-1000 ease-out ${barClassName}`} style={{ width: `${width}%` }} />
        </div>
    );
};

// Circular SVG progress ring with an animated stroke
export const ProgressRing = ({ value = 0, size = 96, stroke = 9, color = '#f37021', children }) => {
    const [shown, setShown] = useState(0);
    useEffect(() => {
        const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(100, Number(value) || 0))));
        return () => cancelAnimationFrame(id);
    }, [value]);
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-gray-100 dark:stroke-white/5" />
                <circle
                    cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
                    stroke={color} strokeDasharray={c} strokeDashoffset={c - (shown / 100) * c}
                    style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
                />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">{children}</div>
        </div>
    );
};

// Small rounded chip used for dates/countdowns/context
export const Chip = ({ icon: Icon, children, tone = 'gray', className = '' }) => {
    const tones = {
        gray: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300',
        brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300',
        green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
        amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
        red: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
        glass: 'bg-white/15 text-white ring-1 ring-white/20 backdrop-blur-md',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${tones[tone] || tones.gray} ${className}`}>
            {Icon && <Icon className="shrink-0" />}
            {children}
        </span>
    );
};
