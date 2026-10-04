import React from 'react';
import { FiDownload, FiCheck, FiClock, FiX } from 'react-icons/fi';
import { PaymentStatusBadge } from './ParentUI';
import { paymentStatus, formatINR } from './parentUtils';

const DOT = {
    Paid: { cls: 'bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]', icon: FiCheck },
    Pending: { cls: 'bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.18)]', icon: FiClock },
    Rejected: { cls: 'bg-rose-500 shadow-[0_0_0_4px_rgba(244,63,94,0.15)]', icon: FiX },
};

// Vertical timeline of fee payments with status badges + receipt action
export const PaymentTimeline = ({ payments, onReceipt }) => (
    <ol className="relative ui-stagger">
        {payments.map((p, idx) => {
            const status = paymentStatus(p);
            const { cls, icon: StatusIcon } = DOT[status];
            const date = new Date(p.date || p.createdAt);
            const last = idx === payments.length - 1;
            return (
                <li key={p._id || idx} className="relative pl-12 pb-5">
                    {!last && <span className="absolute left-[15px] top-8 bottom-0 w-px bg-gray-200 dark:bg-white/10" aria-hidden="true" />}
                    <span className={`absolute left-0 top-1 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${cls}`}>
                        <StatusIcon />
                    </span>
                    <div className="rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] p-4 hover:bg-white dark:hover:bg-white/[0.04] hover:shadow-card transition-all">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">{formatINR(p.amount)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                    {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    <span className="mx-1.5 text-gray-300">•</span>
                                    <span className="capitalize">{p.mode || 'N/A'}</span>
                                </p>
                            </div>
                            <PaymentStatusBadge payment={p} />
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-mono text-gray-400 truncate max-w-full">Txn: {p.transactionId || 'N/A'}</p>
                            {status === 'Paid' ? (
                                <button onClick={() => onReceipt(p)} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 px-2.5 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors">
                                    <FiDownload /> Receipt
                                </button>
                            ) : (
                                <span className="text-[11px] font-semibold text-gray-400">{status === 'Pending' ? 'Receipt after approval' : '—'}</span>
                            )}
                        </div>
                        {status === 'Rejected' && (p.rejectionReason || p.reason) && (
                            <p className="mt-2 text-xs text-rose-600 dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">{p.rejectionReason || p.reason}</p>
                        )}
                    </div>
                </li>
            );
        })}
    </ol>
);
