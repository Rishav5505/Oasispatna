import { useCallback, useEffect, useState } from 'react';
import { api } from './practiceApi';

// XP / level / rank for the logged-in student. `version` bump => refetch.
export const useStudentStats = (version = 0) => {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState(false);
    const [nonce, setNonce] = useState(0);

    useEffect(() => {
        let cancelled = false;
        api.get('/practice/stats/me')
            .then((data) => { if (!cancelled) { setStats(data); setError(false); } })
            .catch(() => { if (!cancelled) setError(true); });
        return () => { cancelled = true; };
    }, [version, nonce]);

    const reload = useCallback(() => setNonce(n => n + 1), []);
    return { stats, error, reload };
};

// XP at which a level starts (inverse of level = floor(sqrt(xp/100)) + 1)
export const levelStartXp = (level) => 100 * Math.max(0, (Number(level) || 1) - 1) ** 2;

export const levelProgress = (stats) => {
    if (!stats) return 0;
    const start = levelStartXp(stats.level);
    const next = Number(stats.nextLevelXp) || levelStartXp((Number(stats.level) || 1) + 1);
    if (next <= start) return 100;
    return Math.min(100, Math.max(0, Math.round(((stats.xp - start) / (next - start)) * 100)));
};
