import React, { useCallback, useEffect, useState } from 'react';
import { FiBookmark, FiFileText, FiPlus, FiTrash2, FiChevronDown, FiChevronUp, FiExternalLink, FiEdit3 } from 'react-icons/fi';
import { toast } from '../../utils/notify';
import { errorMessage, resolveFileUrl } from './helpers';
import { EmptyState, ErrorState, PageHeader, SkeletonRows, SkeletonCards } from './StudentUI';
import { RichText, Segmented } from './PracticeUI';
import { api } from './practiceApi';
import Modal from '../common/Modal';
import { useI18n } from '../../i18n/useI18n';

const BookmarkItem = ({ b, onDelete }) => {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState(false);
    return (
        <li className="ui-card p-4 md:p-5">
            <div className="flex items-start gap-3">
                <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${b.kind === 'note' ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'bg-brand-gradient text-white'}`}>
                    {b.kind === 'note' ? <FiEdit3 /> : <FiBookmark />}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="ui-badge bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300">{t(`student.bookmarks.kind.${b.kind}`)}</span>
                        {b.subjectId?.name && <span className="ui-badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{b.subjectId.name}</span>}
                        <span className="text-[11px] text-gray-400 ml-auto">{new Date(b.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white break-words">{b.title}</p>
                    {b.content && (
                        <button onClick={() => setOpen(o => !o)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400">
                            {open ? <FiChevronUp /> : <FiChevronDown />} {open ? t('student.bookmarks.hide') : t('student.bookmarks.show')}
                        </button>
                    )}
                    {open && b.content && <div className="mt-3 rounded-2xl bg-gray-50 dark:bg-white/5 p-4 animate-fade-in"><RichText text={b.content} /></div>}
                </div>
                {confirm ? (
                    <div className="flex flex-col gap-1.5 shrink-0">
                        <button onClick={() => onDelete(b._id)} className="ui-btn-dark !py-1.5 !px-3 text-xs !bg-rose-600">{t('common.delete')}</button>
                        <button onClick={() => setConfirm(false)} className="ui-btn-secondary !py-1.5 !px-3 text-xs">{t('common.cancel')}</button>
                    </div>
                ) : (
                    <button onClick={() => setConfirm(true)} className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" aria-label={t('common.delete')}><FiTrash2 /></button>
                )}
            </div>
        </li>
    );
};

const FormulaSheets = () => {
    const { t } = useI18n();
    const [items, setItems] = useState(null);
    const [error, setError] = useState('');
    const [nonce, setNonce] = useState(0);
    useEffect(() => {
        let cancelled = false;
        api.get('/study-material', { category: 'formula' })
            .then((d) => { if (!cancelled) setItems(Array.isArray(d) ? d : []); })
            .catch((err) => { if (!cancelled) setError(errorMessage(err, t('student.formula.loadError'))); });
        return () => { cancelled = true; };
    }, [nonce, t]);
    const load = () => { setError(''); setItems(null); setNonce(n => n + 1); };

    if (error) return <ErrorState message={error} onRetry={load} />;
    if (items === null) return <SkeletonCards count={3} height="h-36" />;
    if (items.length === 0) return <EmptyState icon={<FiFileText />} title={t('student.formula.emptyTitle')} message={t('student.formula.emptyMsg')} />;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 ui-stagger">
            {items.map(m => (
                <a key={m._id} href={resolveFileUrl(m.fileUrl)} target="_blank" rel="noopener noreferrer" className="ui-card ui-card-hover group p-5 flex items-start gap-3">
                    <span className="w-11 h-11 shrink-0 rounded-2xl bg-brand-gradient text-white flex items-center justify-center text-lg group-hover:scale-110 group-hover:rotate-3 transition-transform"><FiFileText /></span>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors break-words">{m.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{m.subjectId?.name || t('student.timer.general')} · {new Date(m.createdAt).toLocaleDateString()}</p>
                    </div>
                    <FiExternalLink className="text-gray-400 group-hover:text-brand-600 shrink-0" />
                </a>
            ))}
        </div>
    );
};

const Bookmarks = () => {
    const { t } = useI18n();
    const [tab, setTab] = useState('bookmarks');
    const [kind, setKind] = useState('');
    const [items, setItems] = useState(null);
    const [error, setError] = useState('');
    const [noteOpen, setNoteOpen] = useState(false);
    const [note, setNote] = useState({ title: '', content: '', subjectId: '' });
    const [subjects, setSubjects] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setError('');
        setItems(null);
        try {
            const d = await api.get('/practice/bookmarks', kind ? { kind } : undefined);
            setItems(Array.isArray(d) ? d : []);
        } catch (err) {
            setError(errorMessage(err, t('student.bookmarks.loadError')));
        }
    }, [kind, t]);
    useEffect(() => { if (tab === 'bookmarks') load(); }, [load, tab]);
    useEffect(() => {
        api.get('/public/subjects').then(d => setSubjects(Array.isArray(d) ? d : [])).catch(() => {});
    }, []);

    const remove = async (id) => {
        try {
            await api.del(`/practice/bookmarks/${id}`);
            setItems(prev => (prev || []).filter(b => b._id !== id));
            toast.success(t('student.bookmarks.removed'));
        } catch (err) {
            toast.error(errorMessage(err, t('student.common.actionError')));
        }
    };

    const saveNote = async () => {
        if (!note.title.trim()) { toast.error(t('student.bookmarks.titleRequired')); return; }
        setSaving(true);
        try {
            await api.post('/practice/bookmarks', { kind: 'note', title: note.title.trim(), content: note.content, ...(note.subjectId ? { subjectId: note.subjectId } : {}) });
            toast.success(t('student.bookmarks.noteSaved'));
            setNoteOpen(false);
            setNote({ title: '', content: '', subjectId: '' });
            load();
        } catch (err) {
            toast.error(errorMessage(err, t('student.bookmarks.saveError')));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiBookmark}
                title={t('student.nav.bookmarks')}
                subtitle={t('student.bookmarks.subtitle')}
                action={tab === 'bookmarks' && <button onClick={() => setNoteOpen(true)} className="ui-btn-primary w-full md:w-auto"><FiPlus /> {t('student.bookmarks.newNote')}</button>}
            />
            <Segmented
                value={tab}
                onChange={setTab}
                options={[
                    { value: 'bookmarks', label: t('student.bookmarks.savedTab'), icon: <FiBookmark /> },
                    { value: 'formula', label: t('student.formula.title'), icon: <FiFileText /> },
                ]}
            />

            {tab === 'formula' ? <FormulaSheets /> : (
                <>
                    <div className="flex flex-wrap gap-2">
                        {['', 'question', 'note', 'material'].map(k => (
                            <button key={k || 'all'} onClick={() => setKind(k)} className={`ui-badge !py-2 !px-3 transition-colors ${kind === k ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-brand-200'}`}>
                                {k ? t(`student.bookmarks.kind.${k}`) : t('common.all')}
                            </button>
                        ))}
                    </div>
                    {error ? <ErrorState message={error} onRetry={load} /> : items === null ? <SkeletonRows count={4} /> : items.length === 0 ? (
                        <EmptyState icon={<FiBookmark />} title={t('student.bookmarks.emptyTitle')} message={t('student.bookmarks.emptyMsg')} action={<button onClick={() => setNoteOpen(true)} className="ui-btn-primary"><FiPlus /> {t('student.bookmarks.newNote')}</button>} />
                    ) : (
                        <ul className="space-y-3 ui-stagger">{items.map(b => <BookmarkItem key={b._id} b={b} onDelete={remove} />)}</ul>
                    )}
                </>
            )}

            <Modal
                open={noteOpen}
                onClose={() => setNoteOpen(false)}
                title={t('student.bookmarks.newNote')}
                footer={(
                    <>
                        <button onClick={() => setNoteOpen(false)} className="ui-btn-secondary">{t('common.cancel')}</button>
                        <button onClick={saveNote} disabled={saving} className="ui-btn-primary">{saving ? t('student.common.saving') : t('common.save')}</button>
                    </>
                )}
            >
                <div className="space-y-4">
                    <label className="block">
                        <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('student.bookmarks.noteTitle')}</span>
                        <input value={note.title} maxLength={300} onChange={(e) => setNote({ ...note, title: e.target.value })} className="ui-input dark:text-white" />
                    </label>
                    <label className="block">
                        <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('student.common.subject')} ({t('common.optional')})</span>
                        <select value={note.subjectId} onChange={(e) => setNote({ ...note, subjectId: e.target.value })} className="ui-input dark:text-white">
                            <option value="">{t('student.timer.general')}</option>
                            {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="block text-xs font-bold text-gray-500 mb-1.5">{t('student.bookmarks.noteContent')}</span>
                        <textarea rows={6} value={note.content} onChange={(e) => setNote({ ...note, content: e.target.value })} className="ui-input dark:text-white resize-y" />
                    </label>
                </div>
            </Modal>
        </div>
    );
};

export default Bookmarks;
