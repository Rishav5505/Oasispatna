import React, { useEffect, useId, useState } from 'react';
import { FiLock, FiZap, FiAward, FiCheckCircle, FiStar, FiTrendingUp, FiCalendar, FiUser } from 'react-icons/fi';
import { useInView } from '../ui/motionUtils';
import { AnimatedNumber } from '../ui/Motion';

// Returns `target` once the element is visible (0 before) so CSS transitions animate in.
const useRevealValue = (target) => {
    const [ref, inView] = useInView();
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!inView) return undefined;
        const t = requestAnimationFrame(() => setValue(target));
        return () => cancelAnimationFrame(t);
    }, [inView, target]);
    return [ref, value];
};

const RING_TONES = {
    brand: { from: '#fbad78', to: '#e15814', text: 'text-brand-600 dark:text-brand-400' },
    green: { from: '#6ee7b7', to: '#059669', text: 'text-emerald-600 dark:text-emerald-400' },
    amber: { from: '#fcd34d', to: '#f59e0b', text: 'text-amber-600 dark:text-amber-400' },
    red: { from: '#fda4af', to: '#e11d48', text: 'text-rose-600 dark:text-rose-400' },
    dark: { from: '#52525b', to: '#111114', text: 'text-gray-900 dark:text-white' },
};

// Animated SVG circular progress (0-100)
export const ProgressRing = ({ value = 0, size = 112, stroke = 10, tone = 'brand', label, sublabel, children }) => {
    const pct = Math.min(100, Math.max(0, Number(value) || 0));
    const [ref, shown] = useRevealValue(pct);
    const gradId = `ring-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const t = RING_TONES[tone] || RING_TONES.brand;

    return (
        <div ref={ref} className="flex flex-col items-center text-center">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
                    <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={t.from} />
                            <stop offset="100%" stopColor={t.to} />
                        </linearGradient>
                    </defs>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-gray-100 dark:stroke-white/10" />
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={r}
                        fill="none"
                        stroke={`url(#${gradId})`}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={c}
                        strokeDashoffset={c - (shown / 100) * c}
                        style={{ transition: 'stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center" role="img" aria-label={`${label || 'Progress'} ${Math.round(pct)}%`}>
                    {children || (
                        <span className={`text-2xl font-extrabold tracking-tight ${t.text}`}>
                            <AnimatedNumber value={Math.round(pct)} suffix="%" />
                        </span>
                    )}
                </div>
            </div>
            {label && <p className="mt-3 text-sm font-bold text-gray-900 dark:text-white">{label}</p>}
            {sublabel && <p className="text-xs text-gray-500 dark:text-gray-400">{sublabel}</p>}
        </div>
    );
};

// Horizontal bar that grows from 0 when visible
export const AnimatedBar = ({ value = 0, className = 'h-2.5', barClass = 'bg-brand-gradient', trackClass = 'bg-gray-100 dark:bg-white/10' }) => {
    const pct = Math.min(100, Math.max(0, Number(value) || 0));
    const [ref, shown] = useRevealValue(pct);
    return (
        <div ref={ref} className={`w-full rounded-full overflow-hidden ${trackClass} ${className}`}>
            <div
                className={`h-full rounded-full ${barClass}`}
                style={{ width: `${shown}%`, transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1)' }}
            />
        </div>
    );
};

// Small pill used inside the gradient banner
export const BannerChip = ({ icon, children, onClick, tone = 'glass', className = '', title }) => {
    const tones = {
        glass: 'bg-white/15 hover:bg-white/25 border-white/20 text-white',
        warn: 'bg-rose-500/30 border-rose-200/40 text-white animate-glow',
        solid: 'bg-white text-brand-700 border-white',
    };
    const Tag = onClick ? 'button' : 'span';
    return (
        <Tag
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            title={title}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md transition-all ${onClick ? 'active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white' : ''} ${tones[tone] || tones.glass} ${className}`}
        >
            {icon && <span className="text-sm leading-none">{icon}</span>}
            {children}
        </Tag>
    );
};

// Live d/h/m/s countdown tiles
export const CountdownTiles = ({ timeLeft, dark = true }) => (
    <div className="flex items-stretch gap-2">
        {[
            ['days', 'Days'],
            ['hours', 'Hrs'],
            ['minutes', 'Min'],
            ['seconds', 'Sec'],
        ].map(([k, l]) => (
            <div key={k} className={`flex-1 rounded-2xl py-2.5 text-center ${dark ? 'bg-white/10 border border-white/10' : 'bg-brand-50 dark:bg-white/5'}`}>
                <span className="block text-2xl font-extrabold tabular-nums leading-none">{String(timeLeft?.[k] ?? 0).padStart(2, '0')}</span>
                <span className={`block mt-1 text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-white/60' : 'text-gray-400'}`}>{l}</span>
            </div>
        ))}
    </div>
);

const TIPS = [
    { quote: 'Success is the sum of small efforts, repeated day in and day out.', by: 'Robert Collier' },
    { quote: 'Solve 10 problems from your weakest chapter today. Strength is built where it hurts.', by: 'Oasis Tip' },
    { quote: 'Revise within 24 hours of learning — it can double what you remember.', by: 'Study Hack' },
    { quote: 'The expert in anything was once a beginner.', by: 'Helen Hayes' },
    { quote: 'Mistakes in practice tests are free lessons. Maintain an error notebook.', by: 'Oasis Tip' },
    { quote: 'Don’t watch the clock; do what it does. Keep going.', by: 'Sam Levenson' },
    { quote: 'Sleep 7–8 hours. A rested brain solves JEE problems faster than a tired one.', by: 'Wellness Tip' },
    { quote: 'Discipline is choosing between what you want now and what you want most.', by: 'Abraham Lincoln' },
    { quote: 'Practise NCERT examples first, then move to advanced problems.', by: 'Oasis Tip' },
    { quote: 'It always seems impossible until it’s done.', by: 'Nelson Mandela' },
];

// Static rotating tip/quote of the day
export const TipOfTheDay = () => {
    const [idx, setIdx] = useState(() => Math.floor(Date.now() / 86400000) % TIPS.length);
    const tip = TIPS[idx];
    return (
        <div className="ui-card relative overflow-hidden p-6">
            <div className="absolute -right-6 -bottom-10 text-[9rem] leading-none font-black text-brand-500/10 select-none" aria-hidden="true">&rdquo;</div>
            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"><FiStar /> Tip of the day</span>
                    <button
                        type="button"
                        onClick={() => setIdx((i) => (i + 1) % TIPS.length)}
                        className="text-xs font-bold text-gray-400 hover:text-brand-600 transition-colors"
                        aria-label="Show another tip"
                    >
                        Next &rarr;
                    </button>
                </div>
                <p key={idx} className="text-base font-semibold text-gray-800 dark:text-gray-100 leading-relaxed animate-fade-in">&ldquo;{tip.quote}&rdquo;</p>
                <p className="mt-2 text-xs font-bold uppercase tracking-widest text-gray-400">&mdash; {tip.by}</p>
            </div>
        </div>
    );
};

// Badges derived from real student data. `stats` = { streakBest, attendancePct, hasAttendance, topScore, feesClear, profilePct }
export const AchievementBadges = ({ stats }) => {
    const s = stats || {};
    const badges = [
        { id: 'starter', icon: FiZap, name: 'Ignition', desc: 'Start a login streak', earned: (s.streakBest || 0) >= 1 },
        { id: 'week', icon: FiTrendingUp, name: 'Week Warrior', desc: '7-day login streak', earned: (s.streakBest || 0) >= 7 },
        { id: 'month', icon: FiAward, name: 'Unstoppable', desc: '30-day login streak', earned: (s.streakBest || 0) >= 30 },
        { id: 'regular', icon: FiCalendar, name: 'Regular', desc: '90%+ attendance', earned: !!s.hasAttendance && (s.attendancePct || 0) >= 90 },
        { id: 'topper', icon: FiStar, name: 'Topper', desc: 'Score 90%+ in a test', earned: (s.topScore || 0) >= 90 },
        { id: 'fees', icon: FiCheckCircle, name: 'All Clear', desc: 'No pending fees', earned: !!s.feesClear },
        { id: 'profile', icon: FiUser, name: 'All-Star Profile', desc: 'Profile 100% complete', earned: (s.profilePct || 0) >= 100 },
    ];
    const earned = badges.filter(b => b.earned).length;

    return (
        <div className="ui-card p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                    <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">Achievements</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Unlock badges as you learn</p>
                </div>
                <span className="ui-badge bg-ink-900 text-white dark:bg-white dark:text-ink-900">{earned}/{badges.length} unlocked</span>
            </div>
            <div className="flex gap-3 overflow-x-auto ui-scrollbar pb-2 -mx-1 px-1 ui-stagger">
                {badges.map(b => {
                    const Icon = b.icon;
                    return (
                        <div
                            key={b.id}
                            title={`${b.name} — ${b.desc}${b.earned ? ' (unlocked)' : ' (locked)'}`}
                            className={`group shrink-0 w-32 rounded-2xl p-4 text-center border transition-all duration-300 ${b.earned
                                ? 'bg-gradient-to-b from-brand-50 to-white dark:from-brand-500/10 dark:to-transparent border-brand-100 dark:border-brand-500/20 hover:-translate-y-1 hover:shadow-brand-soft'
                                : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5'}`}
                        >
                            <div className={`relative mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-300 ${b.earned
                                ? 'bg-brand-gradient text-white shadow-brand-glow group-hover:scale-110 group-hover:rotate-6'
                                : 'bg-gray-200 dark:bg-white/10 text-gray-400 grayscale'}`}
                            >
                                <Icon />
                                {!b.earned && (
                                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-ink-800 border border-gray-200 dark:border-white/10 flex items-center justify-center text-[11px] text-gray-500">
                                        <FiLock />
                                    </span>
                                )}
                            </div>
                            <p className={`mt-3 text-sm font-bold leading-tight ${b.earned ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{b.name}</p>
                            <p className="mt-0.5 text-[11px] text-gray-400 leading-snug">{b.desc}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// Keyed tab container: fades up on mount, then drops the transform so fixed-position modals inside work
export const TabPanel = ({ children }) => {
    const [done, setDone] = useState(false);
    return (
        <div
            className={done ? '' : 'animate-fade-up'}
            onAnimationEnd={(e) => { if (e.target === e.currentTarget) setDone(true); }}
        >
            {children}
        </div>
    );
};

// Card header used across student cards
export const CardHeader = ({ title, subtitle, icon: Icon, action }) => (
    <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
            {Icon && (
                <div className="shrink-0 w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center text-lg">
                    <Icon />
                </div>
            )}
            <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight truncate">{title}</h2>
                {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
            </div>
        </div>
        {action}
    </div>
);
