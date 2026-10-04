import React from 'react';

// Shows the daily login streak from /auth/me `streak: { current, best, lastActiveDate }`
const StreakBadge = ({ streak }) => {
    if (!streak) return null;
    const current = Number(streak.current) || 0;
    const best = Math.max(Number(streak.best) || 0, current);
    const hot = current >= 3;

    return (
        <span
            className={`inline-flex items-center gap-1.5 pl-1.5 pr-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md bg-white/15 border-white/25 text-white ${hot ? 'animate-glow' : ''}`}
            title={`Best: ${best} day${best === 1 ? '' : 's'} — log in every day to keep your streak going`}
        >
            <span className="w-6 h-6 rounded-full bg-gradient-to-b from-amber-300 to-brand-600 flex items-center justify-center text-sm leading-none shadow-inner">
                <span className={hot ? 'inline-block animate-float-slow [animation-duration:2s]' : ''} role="img" aria-label="streak">🔥</span>
            </span>
            {current}-day streak
            <span className="text-white/60 font-semibold hidden sm:inline">· best {best}</span>
        </span>
    );
};

export default StreakBadge;
