// Mistake Notebook helpers (FEATURES_CONTRACT A3)
const Mistake = require('../models/Mistake');

const NUMERIC_TOLERANCE = 0.01;

/**
 * Upsert wrong answers into a student's mistake notebook, deduped by question.
 * items: [{ question: {_id, bankItemId?, type, questionText, options, correctOption, correctAnswer, solution, marks},
 *           yourAnswer, subjectId?, chapter? }]
 * ctx: { source: 'test'|'dpp', testId?, dppId? }
 * Never throws.
 */
async function recordMistakes(studentId, items, ctx = {}) {
  try {
    if (!studentId || !Array.isArray(items) || items.length === 0) return 0;
    const ops = items.filter(i => i && i.question).map(({ question: q, yourAnswer, subjectId, chapter }) => {
      const key = String(q.bankItemId || q._id);
      const questionRef = {
        questionId: q._id,
        bankItemId: q.bankItemId || undefined,
        type: q.type || 'mcq',
        questionText: q.questionText,
        options: Array.isArray(q.options) ? q.options : [],
        correctOption: q.correctOption,
        correctAnswer: q.correctAnswer,
        solution: q.solution || '',
        marks: q.marks,
      };
      const set = {
        source: ctx.source,
        questionRef,
        yourAnswer: yourAnswer === undefined ? null : yourAnswer,
        status: 'open',
        correctCount: 0,
      };
      if (ctx.testId) set.testId = ctx.testId;
      if (ctx.dppId) set.dppId = ctx.dppId;
      if (subjectId) set.subjectId = subjectId;
      if (chapter) set.chapter = chapter;
      return {
        updateOne: {
          filter: { studentId, questionKey: key },
          update: { $set: set, $setOnInsert: { studentId, questionKey: key, attempts: 0 } },
          upsert: true,
        },
      };
    });
    if (ops.length === 0) return 0;
    await Mistake.bulkWrite(ops, { ordered: false });
    return ops.length;
  } catch (err) {
    console.error('recordMistakes error:', err.message);
    return 0;
  }
}

const isBlank = (v) => v === undefined || v === null || v === '' || (typeof v === 'number' && Number.isNaN(v));

/**
 * Grade one answer against a question snapshot.
 * Returns { attempted, isCorrect, value } where value is the normalised answer.
 */
function gradeAnswer(q, a = {}) {
  if ((q.type || 'mcq') === 'numerical') {
    const raw = a.numericAnswer !== undefined ? a.numericAnswer : (a.answer !== undefined ? a.answer : a.selectedOption);
    if (isBlank(raw) || Number.isNaN(Number(raw))) return { attempted: false, isCorrect: false };
    const value = Number(raw);
    const isCorrect = q.correctAnswer != null && Math.abs(value - Number(q.correctAnswer)) <= NUMERIC_TOLERANCE;
    return { attempted: true, isCorrect, value };
  }
  const raw = a.selectedOption;
  if (isBlank(raw) || Number.isNaN(Number(raw))) return { attempted: false, isCorrect: false };
  const value = Number(raw);
  return { attempted: true, isCorrect: value === Number(q.correctOption), value };
}

module.exports = { recordMistakes, gradeAnswer, isBlank, NUMERIC_TOLERANCE };
