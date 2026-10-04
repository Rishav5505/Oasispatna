import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import config from '../../config';

export const API = config.API_URL;
export const BACKEND_ORIGIN = config.API_URL.replace(/\/api\/?$/, '');

export const getToken = () => sessionStorage.getItem('token');
export const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export const getTeacherId = () => {
    const token = getToken();
    if (!token) return null;
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(window.atob(base64))?.user?.id || null;
    } catch {
        return null;
    }
};

// Uploaded files are stored as web paths ('/uploads/x.pdf'); legacy rows may hold 'uploads\\x.pdf'.
export const fileHref = (p) => {
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    let s = String(p).replace(/\\/g, '/');
    if (!s.startsWith('/')) s = `/${s}`;
    return `${BACKEND_ORIGIN}${s}`;
};

export const errMsg = (err, fallback = 'Something went wrong') =>
    err?.response?.data?.message || err?.response?.data?.error || fallback;

export const idOf = (v) => (v && typeof v === 'object' ? v._id : v) || '';

export const timeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const abs = Math.abs(diff);
    const min = Math.round(abs / 60000);
    let label;
    if (min < 1) label = 'just now';
    else if (min < 60) label = `${min} min`;
    else if (min < 1440) label = `${Math.round(min / 60)} hr`;
    else if (min < 43200) label = `${Math.round(min / 1440)} d`;
    else return new Date(date).toLocaleDateString();
    if (label === 'just now') return label;
    return diff >= 0 ? `${label} ago` : `in ${label}`;
};

// ---------- Timetable helpers ----------
export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const todayName = () => DAYS[(new Date().getDay() + 6) % 7];

// Accepts 'HH:mm' or legacy '09:00 AM'
export const toMinutes = (t) => {
    if (!t) return 0;
    const m = String(t).trim().match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
    if (!m) return 0;
    let h = Number(m[1]);
    const mins = Number(m[2]);
    if (m[3]) {
        const pm = m[3].toLowerCase() === 'pm';
        if (h === 12) h = pm ? 12 : 0;
        else if (pm) h += 12;
    }
    return h * 60 + mins;
};

export const fmtTime = (t) => {
    const total = toMinutes(t);
    const h = Math.floor(total / 60);
    const m = total % 60;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
};

export const slotSubject = (s) => s?.subject?.name || s?.subjectId?.name || 'Class';
export const slotBatch = (s) => s?.batch?.name || s?.batchName || s?.batchId?.name || '';

const sortSlots = (a, b) => toMinutes(a.startTime) - toMinutes(b.startTime);

/** Returns { currentId, nextId } for highlighting. */
export const findCurrentAndNext = (slots) => {
    const today = todayName();
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const todays = slots.filter(s => s.day === today).sort(sortSlots);
    const current = todays.find(s => toMinutes(s.startTime) <= nowMin && nowMin < toMinutes(s.endTime));
    let next = todays.find(s => toMinutes(s.startTime) > nowMin);
    if (!next) {
        const startIdx = DAYS.indexOf(today);
        for (let i = 1; i <= 7 && !next; i++) {
            const day = DAYS[(startIdx + i) % 7];
            next = slots.filter(s => s.day === day).sort(sortSlots)[0];
        }
    }
    return { currentId: current?._id || null, nextId: next?._id || null };
};

export const slotsForDay = (slots, day) => slots.filter(s => s.day === day).sort(sortSlots);

export const useTeacherSchedule = () => {
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API}/schedule/teacher/me`, { headers: authHeaders() });
            setSlots(Array.isArray(res.data) ? res.data : []);
            setError('');
        } catch (err) {
            setError(errMsg(err, 'Failed to load timetable'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return { slots, loading, error, reload: load };
};
