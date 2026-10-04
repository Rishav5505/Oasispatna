import { idOf } from './teacherApi';

// Question-bank helpers shared by QuestionBank.jsx, its modals and TeacherTest.
export const DIFFICULTIES = ['easy', 'medium', 'hard'];
export const DIFF_TONE = { easy: 'green', medium: 'amber', hard: 'red' };

export const blankBankQuestion = (defaults = {}) => ({
    type: 'mcq', questionText: '', options: ['', '', '', ''], correctOption: 0, correctAnswer: '',
    solution: '', subjectId: '', classId: '', chapter: '', difficulty: 'medium', tags: '',
    marks: 4, negativeMarks: 1, source: 'manual', year: '', ...defaults,
});

export const fromBankItem = (q) => {
    const opts = [...(q.options || [])];
    while (opts.length < 4) opts.push('');
    return {
        type: q.type || 'mcq', questionText: q.questionText || '', options: opts.slice(0, 4),
        correctOption: q.correctOption ?? 0, correctAnswer: q.correctAnswer ?? '', solution: q.solution || '',
        subjectId: idOf(q.subjectId), classId: idOf(q.classId), chapter: q.chapter || '',
        difficulty: q.difficulty || 'medium', tags: (q.tags || []).join(', '), marks: q.marks ?? 4,
        negativeMarks: q.negativeMarks ?? 1, source: q.source || 'manual', year: q.year ?? '',
    };
};

const OPT_RE = /^\(?([A-Da-d])[).:]\s*(.*)$/;
const ANS_RE = /^(?:ans|answer)\s*[:\-–]\s*(.*)$/i;
const SOL_RE = /^(?:sol|solution|explanation)\s*[:\-–]\s*(.*)$/i;

export const parseBulkText = (text) => {
    const blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
    const items = [];
    const errors = [];
    blocks.forEach((block, bi) => {
        const q = []; const opts = []; let ans = null; const sol = []; let inSol = false;
        block.split('\n').forEach(raw => {
            const line = raw.trim();
            if (!line) return;
            let m;
            if (inSol) { sol.push(line); return; }
            if ((m = line.match(SOL_RE))) { inSol = true; if (m[1]) sol.push(m[1]); return; }
            if ((m = line.match(ANS_RE))) { ans = m[1].trim(); return; }
            if (q.length && (m = line.match(OPT_RE))) { opts.push(m[2].trim()); return; }
            if (opts.length) opts[opts.length - 1] += ` ${line}`;
            else q.push(line);
        });
        const questionText = q.join('\n').replace(/^(?:Q\s*\d*|\d+)\s*[.):-]\s*/i, '').trim();
        if (!questionText) { errors.push(`Block ${bi + 1}: question text missing`); return; }
        if (ans === null || ans === '') { errors.push(`Block ${bi + 1}: "Ans:" line missing`); return; }
        if (opts.length === 4) {
            const letter = ans.replace(/[()\s.]/g, '').toUpperCase();
            const idx = 'ABCD'.indexOf(letter[0]);
            if (idx < 0) { errors.push(`Block ${bi + 1}: answer must be A–D`); return; }
            items.push({ type: 'mcq', questionText, options: opts, correctOption: idx, solution: sol.join('\n') });
        } else if (opts.length === 0) {
            if (!Number.isFinite(Number(ans))) { errors.push(`Block ${bi + 1}: numerical answer must be a number`); return; }
            items.push({ type: 'numerical', questionText, correctAnswer: Number(ans), solution: sol.join('\n') });
        } else {
            errors.push(`Block ${bi + 1}: found ${opts.length} options (need 4, or none for numerical)`);
        }
    });
    return { items, errors };
};

