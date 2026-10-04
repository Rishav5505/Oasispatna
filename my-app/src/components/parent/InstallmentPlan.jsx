import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiLayers, FiCheck, FiClock, FiAlertTriangle, FiCreditCard, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import config from '../../config';
import { useI18n } from '../../i18n/useI18n';
import { Panel, SkeletonBlock, AnimatedBar, Chip } from './ParentUI';
import { authHeaders, formatINR, daysUntil } from './parentUtils';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Effective status: trust 'paid' from the server, but mark past-due unpaid rows overdue
// even if the daily scheduler hasn't run yet today.
const statusOf = (inst) => {
    if (inst.status === 'paid') return 'paid';
    const d = daysUntil(inst.dueDate);
    if (inst.status === 'overdue' || (d !== null && d < 0)) return 'overdue';
    if (Number(inst.paidAmount) > 0) return 'partial';
    return 'due';
};

const STYLES = {
    paid: { dot: 'bg-emerald-500 text-white', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20', icon: FiCheck },
    due: { dot: 'bg-white dark:bg-ink-800 text-gray-400 ring-2 ring-gray-200 dark:ring-white/10', badge: 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-white/5 dark:text-gray-300 dark:ring-white/10', icon: FiClock },
    partial: { dot: 'bg-amber-500 text-white', badge: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20', icon: FiClock },
    overdue: { dot: 'bg-rose-500 text-white', badge: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20', icon: FiAlertTriangle },
};

// Fee installment timeline for one student. Renders nothing when the student has no plan (404).
// Mount with key={studentId}; bump `refreshKey` to refetch after a payment.
const InstallmentPlan = ({ studentId, onPay, refreshKey = 0 }) => {
    const { t, lang } = useI18n();
    const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
    const [state, setState] = useState({ status: 'loading', plan: null });
    const [reload, setReload] = useState(0);

    useEffect(() => {
        if (!studentId) return undefined;
        let cancelled = false;
        axios.get(`${config.API_URL}/finance/plans/${studentId}`, { headers: authHeaders() })
            .then(({ data }) => { if (!cancelled) setState({ status: 'ready', plan: data }); })
            .catch((err) => {
                if (cancelled) return;
                const code = err?.response?.status;
                // 404 = no plan; 403 = not permitted -> just hide the section
                setState({ status: code === 404 || code === 403 ? 'none' : 'error', plan: null });
            });
        return () => { cancelled = true; };
    }, [studentId, refreshKey, reload]);

    if (!studentId || state.status === 'none') return null;

    if (state.status === 'loading') {
        return (
            <Panel title={t('parent.plan.title')} icon={FiLayers}>
                <div className="space-y-3">{[0, 1, 2].map(i => <SkeletonBlock key={i} className="h-16" />)}</div>
            </Panel>
        );
    }

    if (state.status === 'error') {
        return (
            <Panel title={t('parent.plan.title')} icon={FiLayers}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 text-sm font-semibold text-rose-700 dark:text-rose-300">
                    <span className="flex items-center gap-2"><FiAlertTriangle /> {t('parent.plan.loadError')}</span>
                    <button onClick={() => setReload(r => r + 1)} className="ui-btn-secondary text-xs"><FiRefreshCw /> {t('common.retry')}</button>
                </div>
            </Panel>
        );
    }

    const plan = state.plan || {};
    const installments = plan.installments || [];
    const paidCount = installments.filter(i => statusOf(i) === 'paid').length;
    const next = installments.find(i => statusOf(i) !== 'paid');
    const nextDays = next ? daysUntil(next.dueDate) : null;
    const nextRemaining = next ? round2(Number(next.amount) - (Number(next.paidAmount) || 0)) : 0;
    const netFee = Number(plan.netFee ?? (Number(plan.totalFee || 0) - Number(plan.discount || 0)));
    const paidPct = netFee > 0 ? Math.min(100, Math.round((Number(plan.paid || 0) / netFee) * 100)) : 0;
    const fmtDate = (d) => new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

    const countdown = (days) => {
        if (days === null) return '';
        if (days < 0) return t('parent.plan.overdueBy', { count: Math.abs(days) });
        if (days === 0) return t('parent.plan.dueToday');
        if (days === 1) return t('parent.plan.dueTomorrow');
        return t('parent.plan.dueIn', { count: days });
    };

    return (
        <Panel
            title={t('parent.plan.title')}
            subtitle={t('parent.plan.subtitle', { net: formatINR(netFee), paid: formatINR(plan.paid || 0) })}
            icon={FiLayers}
            action={installments.length > 0 && <Chip tone={paidCount === installments.length ? 'green' : 'brand'}>{paidCount}/{installments.length}</Chip>}
        >
            {/* Next due hero */}
            {next ? (
                <div className={`relative overflow-hidden rounded-2xl p-4 md:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${nextDays !== null && nextDays < 0 ? 'bg-rose-50 dark:bg-rose-500/10 ring-1 ring-rose-200 dark:ring-rose-500/20' : 'bg-brand-dark text-white'}`}>
                    {!(nextDays !== null && nextDays < 0) && <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-brand-500/25 blur-2xl" />}
                    <div className="relative min-w-0">
                        <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${nextDays !== null && nextDays < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-brand-300'}`}>{t('parent.plan.nextDue')} · {next.label}</p>
                        <p className={`mt-1 text-2xl md:text-3xl font-extrabold tracking-tight ${nextDays !== null && nextDays < 0 ? 'text-rose-700 dark:text-rose-200' : ''}`}>{formatINR(nextRemaining)}</p>
                        <p className={`mt-1 text-xs font-semibold flex items-center gap-1.5 ${nextDays !== null && nextDays < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-white/70'}`}>
                            <FiCalendar /> {fmtDate(next.dueDate)}
                            <span className={`ml-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${nextDays !== null && nextDays < 0 ? 'bg-rose-500 text-white animate-glow' : nextDays !== null && nextDays <= 3 ? 'bg-amber-400 text-ink-900' : 'bg-white/15 text-white'}`}>
                                {countdown(nextDays)}
                            </span>
                        </p>
                    </div>
                    {onPay && nextRemaining > 0 && (
                        <button
                            onClick={() => onPay(nextRemaining)}
                            className={`relative inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all ${nextDays !== null && nextDays < 0 ? 'bg-rose-600 text-white' : 'bg-white text-ink-900'}`}
                        >
                            <FiCreditCard className={nextDays !== null && nextDays < 0 ? '' : 'text-brand-600'} /> {t('parent.plan.payThis')}
                        </button>
                    )}
                </div>
            ) : installments.length > 0 && (
                <div className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-sm font-bold flex items-center gap-2">
                    <FiCheck /> {t('parent.plan.allPaid')}
                </div>
            )}

            <div className="mb-5">
                <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-gray-600 dark:text-gray-300">{t('parent.plan.progress', { paid: paidCount, total: installments.length })}</span>
                    <span className="text-gray-400">{paidPct}%</span>
                </div>
                <AnimatedBar value={paidPct} className="h-2.5" barClassName={paidPct >= 100 ? 'bg-emerald-500' : 'bg-brand-gradient'} />
                <div className="mt-2 flex flex-wrap gap-2">
                    {Number(plan.discount) > 0 && <Chip tone="green">{t('parent.plan.discount', { amount: formatINR(plan.discount) })}</Chip>}
                    {Number(plan.gstPercent) > 0 && <Chip>{t('parent.plan.gst', { pct: plan.gstPercent })}</Chip>}
                </div>
            </div>

            {/* Timeline */}
            <ol className="relative ui-stagger">
                {installments.map((inst, idx) => {
                    const st = statusOf(inst);
                    const S = STYLES[st];
                    const last = idx === installments.length - 1;
                    const isNext = next && String(next._id) === String(inst._id);
                    const remaining = round2(Number(inst.amount) - (Number(inst.paidAmount) || 0));
                    return (
                        <li key={inst._id || idx} className="relative pl-11 pb-4">
                            {!last && <span className={`absolute left-[13px] top-8 bottom-0 w-0.5 ${st === 'paid' ? 'bg-emerald-300 dark:bg-emerald-500/40' : 'bg-gray-200 dark:bg-white/10'}`} aria-hidden="true" />}
                            <span className={`absolute left-0 top-1.5 w-7 h-7 rounded-full flex items-center justify-center text-xs ${S.dot} ${isNext ? 'ring-4 ring-brand-200 dark:ring-brand-500/30' : ''}`}>
                                <S.icon />
                            </span>
                            <div className={`rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2 transition-all ${isNext ? 'bg-brand-50/70 dark:bg-brand-500/10 ring-1 ring-brand-200 dark:ring-brand-500/20' : 'bg-gray-50/70 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] hover:shadow-card'}`}>
                                <div className="min-w-0">
                                    <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{inst.label}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                                        {st === 'paid' && inst.paidOn
                                            ? t('parent.plan.paidOn', { date: fmtDate(inst.paidOn) })
                                            : `${fmtDate(inst.dueDate)} · ${countdown(daysUntil(inst.dueDate))}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <div className="text-right">
                                        <p className="text-sm font-extrabold text-gray-900 dark:text-white">{formatINR(inst.amount)}</p>
                                        {st === 'partial' && <p className="text-[11px] font-bold text-amber-600">{t('parent.plan.remaining', { amount: formatINR(remaining) })}</p>}
                                    </div>
                                    <span className={`ui-badge ring-1 whitespace-nowrap ${S.badge}`}>{t(`parent.plan.status.${st}`)}</span>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </Panel>
    );
};

export default InstallmentPlan;
