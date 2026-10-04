import React from 'react';
import { FiCheck, FiX } from 'react-icons/fi';

// ---------- markdown-ish renderer (AI answers, solutions) ----------
const renderInline = (text, keyPrefix) => {
    const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
    return parts.map((p, i) => {
        const k = `${keyPrefix}-${i}`;
        if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={k} className="font-extrabold text-gray-900 dark:text-white">{p.slice(2, -2)}</strong>;
        if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={k} className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/10 text-[0.9em] font-mono">{p.slice(1, -1)}</code>;
        return <React.Fragment key={k}>{p}</React.Fragment>;
    });
};

export const RichText = ({ text, className = '' }) => {
    if (!text) return null;
    const lines = String(text).replace(/\r/g, '').split('\n');
    const blocks = [];
    let list = null;
    const flush = () => { if (list) { blocks.push(list); list = null; } };

    lines.forEach((raw) => {
        const line = raw.trimEnd();
        const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
        if (bullet) {
            if (!list || list.type !== 'ul') { flush(); list = { type: 'ul', items: [] }; }
            list.items.push(bullet[1]);
        } else if (numbered) {
            if (!list || list.type !== 'ol') { flush(); list = { type: 'ol', items: [], start: Number(numbered[1]) }; }
            list.items.push(numbered[2]);
        } else {
            flush();
            if (heading) blocks.push({ type: 'h', text: heading[1] });
            else if (line.trim() === '') blocks.push({ type: 'gap' });
            else blocks.push({ type: 'p', text: line });
        }
    });
    flush();

    return (
        <div className={`text-sm leading-relaxed text-gray-700 dark:text-gray-200 space-y-1.5 break-words ${className}`}>
            {blocks.map((b, i) => {
                if (b.type === 'gap') return <div key={i} className="h-1" aria-hidden="true" />;
                if (b.type === 'h') return <h4 key={i} className="pt-2 text-base font-extrabold text-gray-900 dark:text-white tracking-tight">{renderInline(b.text, i)}</h4>;
                if (b.type === 'p') return <p key={i}>{renderInline(b.text, i)}</p>;
                if (b.type === 'ul') {
                    return (
                        <ul key={i} className="space-y-1 pl-1">
                            {b.items.map((it, j) => (
                                <li key={j} className="flex gap-2"><span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" aria-hidden="true" /><span>{renderInline(it, `${i}-${j}`)}</span></li>
                            ))}
                        </ul>
                    );
                }
                return (
                    <ol key={i} className="space-y-1.5">
                        {b.items.map((it, j) => (
                            <li key={j} className="flex gap-2.5">
                                <span className="w-6 h-6 shrink-0 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-extrabold flex items-center justify-center">{(b.start || 1) + j}</span>
                                <span className="pt-0.5">{renderInline(it, `${i}-${j}`)}</span>
                            </li>
                        ))}
                    </ol>
                );
            })}
        </div>
    );
};

// ---------- answer input for MCQ / numerical ----------
// value: {selectedOption} | {numericAnswer}
// reveal: {correctOption, correctAnswer} once graded (colors options)
export const AnswerInput = ({ question, value, onChange, disabled, reveal, idPrefix = 'q' }) => {
    const isNum = question?.type === 'numerical';
    if (isNum) {
        const v = value?.numericAnswer ?? '';
        const graded = reveal && reveal.correctAnswer != null;
        const correct = graded && v !== '' && Math.abs(Number(v) - Number(reveal.correctAnswer)) <= 0.01;
        return (
            <div className="max-w-xs">
                <label htmlFor={`${idPrefix}-${question._id}`} className="block text-xs font-bold text-gray-500 mb-1.5">Your answer</label>
                <input
                    id={`${idPrefix}-${question._id}`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    disabled={disabled}
                    value={v}
                    onChange={(e) => onChange?.({ numericAnswer: e.target.value })}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="Enter a number"
                    className={`ui-input !text-lg !font-extrabold tabular-nums dark:text-white ${graded ? (correct ? '!border-emerald-400' : '!border-rose-400') : ''}`}
                />
                {graded && (
                    <p className="text-xs font-bold mt-2 text-emerald-600 dark:text-emerald-400">Correct answer: {reveal.correctAnswer}</p>
                )}
            </div>
        );
    }
    const sel = value?.selectedOption;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(question?.options || []).map((opt, idx) => {
                const letter = String.fromCharCode(65 + idx);
                const selected = sel === idx;
                const isRight = reveal && reveal.correctOption === idx;
                const isWrongPick = reveal && selected && !isRight;
                let cls = 'border-gray-100 dark:border-white/10 hover:border-brand-200 hover:bg-gray-50 dark:hover:bg-white/5';
                if (selected) cls = 'border-brand-500 bg-brand-50 dark:bg-brand-500/10';
                if (isRight) cls = 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10';
                if (isWrongPick) cls = 'border-rose-400 bg-rose-50 dark:bg-rose-500/10';
                return (
                    <button
                        key={idx}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange?.({ selectedOption: idx })}
                        aria-pressed={selected}
                        className={`group flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all active:scale-[0.99] disabled:cursor-default ${cls}`}
                    >
                        <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-extrabold ${isRight ? 'bg-emerald-500 text-white' : isWrongPick ? 'bg-rose-500 text-white' : selected ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
                            {isRight ? <FiCheck /> : isWrongPick ? <FiX /> : letter}
                        </span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 break-words min-w-0">{opt === letter ? `Option ${letter}` : opt}</span>
                    </button>
                );
            })}
        </div>
    );
};

export const Segmented = ({ options, value, onChange, size = 'md', className = '' }) => (
    <div role="radiogroup" className={`inline-flex p-1 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 ${className}`}>
        {options.map(o => {
            const active = value === o.value;
            return (
                <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange(o.value)}
                    className={`inline-flex items-center gap-1.5 rounded-xl font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'} ${active ? 'bg-white dark:bg-ink-800 text-brand-700 dark:text-brand-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white'}`}
                >
                    {o.icon}{o.label}
                </button>
            );
        })}
    </div>
);
