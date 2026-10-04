import axios from 'axios';
import config from '../../config';
import { authHeaders } from './helpers';

// ---------- tiny API wrapper (student practice features) ----------
const url = (p) => `${config.API_URL}${p}`;
export const api = {
    get: (p, params) => axios.get(url(p), { headers: authHeaders(), params }).then(r => r.data),
    post: (p, body) => axios.post(url(p), body, { headers: authHeaders() }).then(r => r.data),
    put: (p, body) => axios.put(url(p), body, { headers: authHeaders() }).then(r => r.data),
    del: (p) => axios.delete(url(p), { headers: authHeaders() }).then(r => r.data),
    upload: (p, formData) => axios.post(url(p), formData, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
};

export const answerLabel = (question, ans) => {
    if (ans === undefined || ans === null || ans === '') return '—';
    if (question?.type === 'numerical') return String(ans);
    const n = Number(ans);
    return Number.isFinite(n) ? String.fromCharCode(65 + n) : String(ans);
};

// Text snapshot of a question used when bookmarking it
export const questionToNote = (q, { correctOption, correctAnswer, solution } = {}) => {
    const lines = [q.questionText || ''];
    if (q.type !== 'numerical' && Array.isArray(q.options)) {
        q.options.forEach((o, i) => lines.push(`${String.fromCharCode(65 + i)}. ${o}`));
    }
    if (q.type === 'numerical' && correctAnswer != null) lines.push('', `**Answer:** ${correctAnswer}`);
    if (q.type !== 'numerical' && correctOption != null) lines.push('', `**Answer:** ${String.fromCharCode(65 + Number(correctOption))}`);
    if (solution) lines.push('', '**Solution**', solution);
    return lines.join('\n');
};

