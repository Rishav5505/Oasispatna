import React, { useEffect, useRef, useState } from 'react';
import { FiCpu, FiCamera, FiImage, FiX, FiZap, FiBookOpen, FiCopy, FiLink, FiRefreshCw } from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { errorMessage } from './helpers';
import { RichText, Segmented } from './PracticeUI';
import { api } from './practiceApi';
import { useI18n } from '../../i18n/useI18n';

const MAX_BYTES = 10 * 1024 * 1024;

// "Ask AI instantly" — text and/or photo, hint vs full solution, optionally attach to an existing doubt
const AIDoubtSolver = ({ doubts = [], onAttached }) => {
    const { t } = useI18n();
    const [question, setQuestion] = useState('');
    const [image, setImage] = useState(null);
    const [preview, setPreview] = useState('');
    const [mode, setMode] = useState('solution');
    const [doubtId, setDoubtId] = useState('');
    const [loading, setLoading] = useState(false);
    const [answer, setAnswer] = useState(null); // {answer, attached, mode}
    const cameraRef = useRef(null);
    const galleryRef = useRef(null);

    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const pick = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error(t('student.ai.imageOnly')); return; }
        if (file.size > MAX_BYTES) { toast.error(t('student.ai.tooBig')); return; }
        if (preview) URL.revokeObjectURL(preview);
        setImage(file);
        setPreview(URL.createObjectURL(file));
    };

    const clearImage = () => {
        if (preview) URL.revokeObjectURL(preview);
        setImage(null);
        setPreview('');
        if (cameraRef.current) cameraRef.current.value = '';
        if (galleryRef.current) galleryRef.current.value = '';
    };

    const canAsk = (question.trim() || image || doubtId) && !loading;

    const ask = async (e) => {
        e?.preventDefault();
        if (!canAsk) return;
        setLoading(true);
        setAnswer(null);
        const fd = new FormData();
        if (question.trim()) fd.append('question', question.trim());
        if (image) fd.append('image', image);
        fd.append('mode', mode);
        if (doubtId) fd.append('doubtId', doubtId);
        try {
            const res = await api.upload('/ai-buddy/solve-doubt', fd);
            setAnswer({ ...res, mode });
            if (res.attached) {
                toast.success(t('student.ai.attached'));
                onAttached?.();
            }
        } catch (err) {
            toast.error(errorMessage(err, t('student.ai.error')));
        } finally {
            setLoading(false);
        }
    };

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(answer?.answer || '');
            toast.success(t('student.ai.copied'));
        } catch {
            toast.error(t('student.common.actionError'));
        }
    };

    return (
        <section className="ui-card overflow-hidden">
            <div className="relative bg-brand-dark text-white px-5 md:px-6 py-5 overflow-hidden">
                <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-brand-500/30 blur-3xl animate-float-slow" />
                <div className="relative flex items-center gap-3">
                    <span className="w-11 h-11 shrink-0 rounded-2xl bg-brand-gradient flex items-center justify-center text-xl shadow-brand-glow"><FiCpu /></span>
                    <div className="min-w-0">
                        <h3 className="text-lg font-extrabold tracking-tight">{t('student.ai.title')}</h3>
                        <p className="text-xs text-white/60">{t('student.ai.subtitle')}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={ask} className="p-5 md:p-6 space-y-4">
                <label className="block">
                    <span className="sr-only">{t('student.ai.placeholder')}</span>
                    <textarea
                        rows={3}
                        maxLength={4000}
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder={t('student.ai.placeholder')}
                        className="ui-input dark:text-white resize-y min-h-[88px]"
                    />
                </label>

                {preview ? (
                    <div className="relative w-full sm:w-64 rounded-2xl overflow-hidden border border-gray-100 dark:border-white/10 animate-scale-in">
                        <img src={preview} alt={t('student.ai.photoAlt')} className="w-full h-44 object-cover" />
                        <button type="button" onClick={clearImage} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink-900/80 text-white flex items-center justify-center hover:bg-rose-600" aria-label={t('student.ai.removePhoto')}><FiX /></button>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => cameraRef.current?.click()} className="ui-btn-secondary !py-2 text-xs"><FiCamera /> {t('student.ai.takePhoto')}</button>
                        <button type="button" onClick={() => galleryRef.current?.click()} className="ui-btn-secondary !py-2 text-xs"><FiImage /> {t('student.ai.upload')}</button>
                    </div>
                )}
                <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
                <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />

                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <Segmented
                        value={mode}
                        onChange={setMode}
                        options={[
                            { value: 'hint', label: t('student.ai.hint'), icon: <FiZap /> },
                            { value: 'solution', label: t('student.ai.full'), icon: <FiBookOpen /> },
                        ]}
                    />
                    {doubts.length > 0 && (
                        <label className="flex items-center gap-2 md:ml-auto min-w-0">
                            <FiLink className="text-gray-400 shrink-0" />
                            <span className="sr-only">{t('student.ai.attachTo')}</span>
                            <select value={doubtId} onChange={(e) => setDoubtId(e.target.value)} className="ui-input !py-2 dark:text-white md:w-64 truncate">
                                <option value="">{t('student.ai.noAttach')}</option>
                                {doubts.map(d => <option key={d._id} value={d._id}>{t('student.ai.attachOption', { title: d.title })}</option>)}
                            </select>
                        </label>
                    )}
                </div>

                <button type="submit" disabled={!canAsk} className="ui-btn-primary w-full md:w-auto disabled:opacity-50">
                    <FiCpu className={loading ? 'animate-spin' : ''} /> {loading ? t('student.ai.thinking') : t('student.ai.ask')}
                </button>
                {doubtId && !question.trim() && !image && <p className="text-xs text-gray-400">{t('student.ai.doubtOnlyHint')}</p>}
            </form>

            {loading && (
                <div className="px-5 md:px-6 pb-6 space-y-2" aria-busy="true">
                    <div className="ui-skeleton h-4 w-2/3" />
                    <div className="ui-skeleton h-4 w-full" />
                    <div className="ui-skeleton h-4 w-5/6" />
                </div>
            )}

            {answer && (
                <div className="mx-5 md:mx-6 mb-6 rounded-2xl border border-brand-100 dark:border-brand-500/20 bg-brand-50/40 dark:bg-brand-500/5 p-4 md:p-5 animate-fade-up">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="ui-badge bg-brand-gradient text-white"><FiCpu /> {answer.mode === 'hint' ? t('student.ai.hint') : t('student.ai.full')}</span>
                        {answer.attached && <span className="ui-badge bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"><FiLink /> {t('student.ai.attachedShort')}</span>}
                        <div className="ml-auto flex gap-1">
                            {answer.mode === 'hint' && (
                                <button type="button" onClick={() => { setMode('solution'); }} className="text-xs font-bold text-brand-600 dark:text-brand-400 px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-white/5">{t('student.ai.switchFull')}</button>
                            )}
                            <button type="button" onClick={copy} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-brand-600 hover:bg-white dark:hover:bg-white/5" aria-label={t('student.ai.copy')}><FiCopy /></button>
                            <button type="button" onClick={() => setAnswer(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-brand-600 hover:bg-white dark:hover:bg-white/5" aria-label={t('common.close')}><FiX /></button>
                        </div>
                    </div>
                    <RichText text={answer.answer} />
                    <p className="mt-4 text-[11px] text-gray-400 flex items-center gap-1.5"><FiRefreshCw /> {t('student.ai.disclaimer')}</p>
                </div>
            )}
        </section>
    );
};

export default AIDoubtSolver;
