import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

// Shimmering placeholder cards shown while a tab is loading
export const SkeletonCards = ({ count = 3, className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', height = 'h-56' }) => (
    <div className={className} aria-busy="true" aria-label="Loading">
        {[...Array(count)].map((_, i) => (
            <div key={i} className={`ui-card p-6 ${height} flex flex-col`}>
                <div className="flex justify-between mb-6">
                    <div className="ui-skeleton h-5 w-20 !rounded-full"></div>
                    <div className="ui-skeleton h-5 w-16 !rounded-full"></div>
                </div>
                <div className="ui-skeleton h-6 w-3/4 mb-3"></div>
                <div className="ui-skeleton h-4 w-1/2 mb-8"></div>
                <div className="ui-skeleton h-11 w-full mt-auto"></div>
            </div>
        ))}
    </div>
);

export const SkeletonRows = ({ count = 4 }) => (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-ink-900">
                <div className="ui-skeleton w-10 h-10 shrink-0"></div>
                <div className="flex-1 space-y-2">
                    <div className="ui-skeleton h-4 w-1/2"></div>
                    <div className="ui-skeleton h-3 w-1/3"></div>
                </div>
            </div>
        ))}
    </div>
);

export const Spinner = ({ label }) => (
    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-brand-500 border-t-transparent mb-3"></div>
        {label && <p className="text-xs font-bold uppercase tracking-widest">{label}</p>}
    </div>
);

export const EmptyState = ({ icon, title, message, action, compact = false }) => (
    <div className={`col-span-full text-center rounded-3xl border border-dashed border-gray-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] animate-fade-in ${compact ? 'py-8 px-4' : 'py-16 px-6'}`}>
        {icon && (
            <div className={`relative mx-auto rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center ${compact ? 'w-12 h-12 mb-3 text-xl' : 'w-20 h-20 mb-5 text-3xl'}`}>
                {!compact && <span className="absolute inset-0 rounded-full bg-brand-500/10 animate-ping [animation-duration:3s]" aria-hidden="true" />}
                <span className="relative">{icon}</span>
            </div>
        )}
        <h3 className={`font-bold text-gray-900 dark:text-white mb-1 ${compact ? 'text-sm' : 'text-lg'}`}>{title}</h3>
        {message && <p className={`text-gray-500 dark:text-gray-400 max-w-sm mx-auto ${compact ? 'text-xs' : 'text-sm'}`}>{message}</p>}
        {action && <div className="mt-5">{action}</div>}
    </div>
);

export const ErrorState = ({ message, onRetry }) => (
    <div className="col-span-full text-center rounded-3xl border border-rose-100 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-500/5 py-10 px-6 animate-fade-in">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-100 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center text-xl"><FiAlertTriangle /></div>
        <p className="text-rose-700 dark:text-rose-300 font-semibold mb-4">{message || 'Something went wrong while loading this section.'}</p>
        {onRetry && (
            <button onClick={onRetry} className="ui-btn-dark">
                <FiRefreshCw /> Retry
            </button>
        )}
    </div>
);

// Consistent heading for each student tab
export const PageHeader = ({ icon: Icon, title, subtitle, action }) => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
            {Icon && (
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-brand-gradient text-white flex items-center justify-center text-xl shadow-brand-soft">
                    <Icon />
                </div>
            )}
            <div className="min-w-0">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{title}</h2>
                {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
            </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
    </div>
);
