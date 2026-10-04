import React, { useEffect, useMemo, useState } from 'react';
import { FiStar, FiSearch, FiX, FiPrinter, FiUsers, FiClipboard, FiAward, FiCheck } from 'react-icons/fi';
import { api, toastError } from './adminApi';
import { PageHeader, Avatar, Badge, EmptyState, SkeletonBlock, inputCls, labelCls } from './AdminUI';
import { printCertificates } from './printDocs';
import { toDateInput } from '../common/api';
import { useI18n } from '../../i18n/useI18n';

const TEMPLATES = [
  { id: 'merit', swatch: 'bg-brand-gradient' },
  { id: 'participation', swatch: 'bg-ink-900' },
  { id: 'topper', swatch: 'bg-gradient-to-br from-amber-400 to-orange-700' },
];
const SOURCES = [
  { id: 'pick', icon: FiUsers },
  { id: 'test', icon: FiClipboard },
  { id: 'exam', icon: FiAward },
];

const Seg = ({ value, options, onChange, render }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(o => (
      <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
        className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${value === o.id ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:text-brand-600'}`}>
        {render(o)}
      </button>
    ))}
  </div>
);

/** Printable merit / participation / topper certificates from real students & results. */
const CertificateGenerator = ({ students = [], classes = [] }) => {
  const { t } = useI18n();
  const [source, setSource] = useState('pick');
  const [template, setTemplate] = useState('merit');
  const [picked, setPicked] = useState([]);
  const [search, setSearch] = useState('');
  const [tests, setTests] = useState(null);
  const [testId, setTestId] = useState('');
  const [classId, setClassId] = useState('');
  const [exams, setExams] = useState([]);
  const [examId, setExamId] = useState('');
  const [ranked, setRanked] = useState(null); // [{name, rank, detail}]
  const [topN, setTopN] = useState(3);
  const [loadingRank, setLoadingRank] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: toDateInput(new Date()), signatory: '', designation: 'Director' });

  useEffect(() => {
    if (source !== 'test' || tests) return;
    api.get('/tests/all').then(setTests).catch(err => { setTests([]); toastError(err, t('admin.common.loadFailed')); });
  }, [source, tests, t]);

  useEffect(() => {
    if (!classId) return undefined;
    let alive = true;
    api.get(`/exams/class/${classId}`).then(e => { if (alive) setExams(e); }).catch(() => { if (alive) setExams([]); });
    return () => { alive = false; };
  }, [classId]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (source === 'test' && testId) {
        setLoadingRank(true);
        try {
          const test = (tests || []).find(x => x._id === testId);
          const res = await api.get(`/tests/${testId}/results`);
          if (!alive) return;
          setRanked(res.filter(r => r.studentId?.name).map((r, i) => ({ name: r.studentId.name, rank: i + 1, detail: `${t('admin.cert.rank')} ${i + 1} · ${r.score}/${test?.totalMarks ?? '—'} · ${test?.title || ''}` })));
          setForm(f => ({ ...f, description: f.description || t('admin.cert.descTest', { name: test?.title || '' }) }));
        } catch (err) {
          if (alive) { setRanked([]); toastError(err, t('admin.common.loadFailed')); }
        } finally {
          if (alive) setLoadingRank(false);
        }
      } else if (source === 'exam' && examId) {
        setLoadingRank(true);
        try {
          const res = await api.get(`/marks/exam-summary/${examId}`);
          if (!alive) return;
          const list = [...(res.results || [])].filter(r => r.totalObtained > 0).sort((a, b) => a.rank - b.rank);
          setRanked(list.map(r => ({ name: r.name, rank: r.rank, detail: `${t('admin.cert.rank')} ${r.rank} · ${r.percentage}% · ${res.examName}` })));
          setForm(f => ({ ...f, description: f.description || t('admin.cert.descExam', { name: res.examName || '' }) }));
        } catch (err) {
          if (alive) { setRanked([]); toastError(err, t('admin.common.loadFailed')); }
        } finally {
          if (alive) setLoadingRank(false);
        }
      } else {
        setRanked(null);
      }
    };
    run();
    return () => { alive = false; };
  }, [source, testId, examId, tests, t]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return students.filter(s => s.name?.toLowerCase().includes(q) && !picked.some(p => p._id === s._id)).slice(0, 8);
  }, [search, students, picked]);

  const recipients = source === 'pick'
    ? picked.map(s => ({ name: s.name, detail: s.classId?.name ? `${t('admin.common.class')} ${s.classId.name}` : '' }))
    : (ranked || []).slice(0, Math.max(1, Number(topN) || 1));

  const generate = () => {
    if (!recipients.length) return;
    printCertificates(recipients, { ...form, template, title: form.title || t(`admin.cert.tpl.${template}.heading`) });
  };

  return (
    <>
      <PageHeader icon={FiStar} eyebrow={t('admin.group.academics')} title={t('admin.heading.certificates')} subtitle={t('admin.cert.subtitle')}
        actions={<button type="button" onClick={generate} disabled={!recipients.length} className="ui-btn-primary"><FiPrinter /> {t('admin.cert.generate', { n: recipients.length })}</button>} />

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 md:gap-6">
        <div className="xl:col-span-3 space-y-5">
          <div className="ui-card p-5 md:p-6 space-y-5">
            <div>
              <p className={labelCls}>{t('admin.cert.template')}</p>
              <div className="grid grid-cols-3 gap-3">
                {TEMPLATES.map(tp => (
                  <button key={tp.id} type="button" aria-pressed={template === tp.id} onClick={() => setTemplate(tp.id)}
                    className={`group relative rounded-2xl p-3 text-left ring-2 transition-all ${template === tp.id ? 'ring-brand-500 shadow-brand-soft' : 'ring-gray-100 dark:ring-white/10 hover:ring-brand-200'}`}>
                    <div className={`h-16 rounded-xl ${tp.swatch} p-1.5`}>
                      <div className="h-full rounded-lg bg-white/95 flex flex-col items-center justify-center gap-1">
                        <span className="w-10 h-1 rounded bg-gray-300" /><span className="w-14 h-1.5 rounded bg-brand-400" /><span className="w-8 h-1 rounded bg-gray-200" />
                      </div>
                    </div>
                    <p className="mt-2 text-xs font-extrabold text-gray-800 dark:text-gray-100">{t(`admin.cert.tpl.${tp.id}`)}</p>
                    {template === tp.id && <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center text-[10px]"><FiCheck /></span>}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={labelCls}>{t('admin.cert.recipients')}</p>
              <Seg value={source} options={SOURCES} onChange={(v) => { setSource(v); setRanked(null); }} render={(o) => <><o.icon /> {t(`admin.cert.src.${o.id}`)}</>} />
            </div>

            {source === 'pick' && (
              <div className="space-y-3 animate-fade-in">
                <div className="relative">
                  <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input className="ui-input !pl-10" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('admin.cert.searchPh')} aria-label={t('admin.cert.searchPh')} />
                  {matches.length > 0 && (
                    <div className="absolute top-full inset-x-0 mt-2 ui-card !rounded-2xl p-1.5 z-20 animate-scale-in origin-top">
                      {matches.map(s => (
                        <button key={s._id} type="button" onClick={() => { setPicked(p => [...p, s]); setSearch(''); }} className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-brand-50 dark:hover:bg-white/5 text-left">
                          <Avatar name={s.name} size="sm" />
                          <span className="flex-1 min-w-0 text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{s.name}</span>
                          <span className="text-[11px] text-gray-500">{s.classId?.name || ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
                  {picked.length === 0 && <p className="text-sm text-gray-500">{t('admin.cert.noneSelected')}</p>}
                  {picked.map(s => (
                    <span key={s._id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-sm font-bold animate-scale-in">
                      {s.name}
                      <button type="button" onClick={() => setPicked(p => p.filter(x => x._id !== s._id))} className="w-6 h-6 rounded-lg hover:bg-brand-100 dark:hover:bg-white/10 flex items-center justify-center" aria-label={t('admin.common.remove')}><FiX /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {source === 'test' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="ct-test">{t('admin.cert.test')}</label>
                  <select id="ct-test" className={inputCls} value={testId} onChange={e => setTestId(e.target.value)} disabled={!tests}>
                    <option value="">{tests ? t('admin.cert.chooseTest') : t('admin.common.loading')}</option>
                    {(tests || []).map(x => <option key={x._id} value={x._id}>{x.title}{x.subjectId?.name ? ` · ${x.subjectId.name}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="ct-top">{t('admin.cert.topN')}</label>
                  <input id="ct-top" type="number" min="1" max="100" className={inputCls} value={topN} onChange={e => setTopN(e.target.value)} />
                </div>
              </div>
            )}

            {source === 'exam' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                <div>
                  <label className={labelCls} htmlFor="ct-class">{t('admin.common.class')}</label>
                  <select id="ct-class" className={inputCls} value={classId} onChange={e => { setClassId(e.target.value); setExamId(''); setExams([]); }}>
                    <option value="">—</option>
                    {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="ct-exam">{t('admin.cert.exam')}</label>
                  <select id="ct-exam" className={inputCls} value={examId} onChange={e => setExamId(e.target.value)} disabled={!classId}>
                    <option value="">{t('admin.cert.chooseExam')}</option>
                    {exams.map(x => <option key={x._id} value={x._id}>{x.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="ct-top2">{t('admin.cert.topN')}</label>
                  <input id="ct-top2" type="number" min="1" max="100" className={inputCls} value={topN} onChange={e => setTopN(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="ui-card p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="ct-title">{t('admin.cert.title')}</label>
              <input id="ct-title" className={inputCls} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t(`admin.cert.tpl.${template}.heading`)} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="ct-desc">{t('admin.cert.description')}</label>
              <textarea id="ct-desc" rows={2} className={`${inputCls} resize-none`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder={t('admin.cert.descPh')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="ct-date">{t('admin.common.date')}</label>
              <input id="ct-date" type="date" className={inputCls} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls} htmlFor="ct-sig">{t('admin.cert.signatory')}</label>
              <input id="ct-sig" className={inputCls} value={form.signatory} onChange={e => setForm(f => ({ ...f, signatory: e.target.value }))} placeholder={t('admin.cert.signatoryPh')} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="ct-des">{t('admin.cert.designation')}</label>
              <input id="ct-des" className={inputCls} value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} />
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 ui-card p-5 md:p-6 h-fit xl:sticky xl:top-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-gray-900 dark:text-white">{t('admin.cert.preview')}</h3>
            <Badge tone="brand">{recipients.length}</Badge>
          </div>
          {loadingRank ? <div className="space-y-2">{[0, 1, 2].map(i => <SkeletonBlock key={i} className="h-12 !rounded-xl" />)}</div>
            : recipients.length === 0 ? <EmptyState icon={FiStar} title={t('admin.cert.emptyTitle')} hint={source === 'pick' ? t('admin.cert.emptyPick') : ranked ? t('admin.cert.noResults') : t('admin.cert.emptyRank')} />
              : (
                <ol className="space-y-2 max-h-[28rem] overflow-y-auto ui-scrollbar">
                  {recipients.map((r, i) => (
                    <li key={`${r.name}-${i}`} className="flex items-center gap-3 p-2.5 rounded-2xl ring-1 ring-gray-100 dark:ring-white/10">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold ${r.rank === 1 ? 'bg-brand-gradient text-white' : r.rank ? 'bg-ink-900 text-white' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10'}`}>{r.rank ? `#${r.rank}` : i + 1}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{r.name}</span>
                        {r.detail && <span className="block text-[11px] text-gray-500 truncate">{r.detail}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
          <button type="button" onClick={generate} disabled={!recipients.length} className="ui-btn-primary w-full mt-5"><FiPrinter /> {t('admin.cert.generate', { n: recipients.length })}</button>
          <p className="text-[11px] text-gray-400 mt-2 text-center">{t('admin.cert.printHint')}</p>
        </div>
      </div>
    </>
  );
};

export default CertificateGenerator;
