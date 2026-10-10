import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronRight, FiLayers, FiUsers, FiArrowLeft, FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';
import { api, toastError, formatINR } from '../adminApi';
import { Badge, EmptyState, ProgressBar, SkeletonBlock } from '../AdminUI';
import StudentPicker from './StudentPicker';
import StudentPayPanel from './StudentPayPanel';
import { pctOf, plural } from './feeUtils';
import { useI18n } from '../../../i18n/useI18n';

const Stepper = ({ step, labels, onStep }) => (
  <ol className="flex items-center gap-1.5 sm:gap-3 ui-card !rounded-2xl p-2.5 sm:p-3 overflow-x-auto ui-scrollbar">
    {labels.map((l, i) => {
      const n = i + 1;
      const done = n < step;
      const on = n === step;
      return (
        <React.Fragment key={l.title}>
          {i > 0 && <li aria-hidden="true" className={`flex-1 min-w-[1rem] h-0.5 rounded-full ${done || on ? 'bg-brand-500' : 'bg-gray-200 dark:bg-white/10'}`} />}
          <li className="shrink-0">
            <button type="button" disabled={!done} onClick={() => onStep(n)} aria-current={on ? 'step' : undefined}
              className={`flex items-center gap-2.5 px-2 sm:px-3 py-1.5 rounded-xl text-left transition-colors ${done ? 'hover:bg-brand-50 dark:hover:bg-white/5 cursor-pointer' : 'cursor-default'}`}>
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold shrink-0 ${done ? 'bg-emerald-500 text-white' : on ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-100 text-gray-400 dark:bg-white/10'}`}>{done ? <FiCheck /> : n}</span>
              <span className="min-w-0">
                <span className={`block text-xs sm:text-sm font-extrabold ${on || done ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>{l.title}</span>
                {l.value && <span className="block text-[11px] font-semibold text-brand-600 truncate max-w-[9rem]">{l.value}</span>}
              </span>
            </button>
          </li>
        </React.Fragment>
      );
    })}
  </ol>
);

const ClassChips = ({ classes, onPick }) => {
  const { t } = useI18n();
  if (classes === null) return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{[0, 1, 2].map(i => <SkeletonBlock key={i} className="h-36" />)}</div>;
  if (classes.length === 0) return <div className="ui-card"><EmptyState icon={FiLayers} title={t('admin.fd.noClasses')} hint={t('admin.fd.noClassesHint')} /></div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 ui-stagger">
      {classes.map(c => (
        <button key={c.classId} type="button" onClick={() => onPick(c.classId)} disabled={c.students === 0}
          className="group ui-card ui-card-hover p-5 text-left disabled:opacity-60 disabled:cursor-not-allowed">
          <span className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-brand-gradient text-white flex items-center justify-center text-xl shadow-brand-soft shrink-0 transition-transform group-hover:scale-110 group-hover:rotate-3"><FiLayers /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-extrabold text-gray-900 dark:text-white truncate">{c.className}</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500"><FiUsers /> {plural(t, 'admin.fd.setup.students', c.students)}</span>
            </span>
            <FiChevronRight className="text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all" />
          </span>
          <span className="flex items-end justify-between gap-2 mt-4 mb-1.5">
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('admin.plan.pending')}</span>
              <span className={`block text-xl font-extrabold tabular-nums ${c.pending > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatINR(c.pending)}</span>
            </span>
            <span className="text-[11px] font-semibold text-gray-500 text-right">{t('admin.fd.collected', { amt: formatINR(c.collected) })}</span>
          </span>
          <ProgressBar value={pctOf(c.collected, c.expected)} barClass="bg-emerald-500" className="!h-1.5" />
          {c.students > 0 && c.withoutPlan > 0 && <Badge tone="amber" className="mt-3"><FiAlertTriangle /> {plural(t, 'admin.fd.setup.noPlan', c.withoutPlan)}</Badge>}
        </button>
      ))}
    </div>
  );
};

/** Guided flow: 1 choose class → 2 choose student → 3 collect. Selection lives in the parent (`sel`). */
const CollectPayment = ({ classes, sel, setSel, canManage, onPaid }) => {
  const { t } = useI18n();
  const [data, setData] = useState({ classId: null, rows: null, failed: false });
  const { classId, studentId } = sel;
  const top = useRef(null);
  // Move between steps and bring the stepper back into view (lists can be long).
  const goSel = useCallback((next) => {
    setSel(next);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [setSel]);

  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce(n => n + 1), []);

  useEffect(() => {
    if (!classId) return undefined;
    let alive = true;
    api.get(`/finance/class-fees/${classId}/students`)
      .then(rows => { if (alive) setData({ classId, rows, failed: false }); })
      .catch(err => {
        if (!alive) return;
        setData({ classId, rows: [], failed: true });
        toastError(err, t('admin.common.loadFailed'));
      });
    return () => { alive = false; };
  }, [classId, nonce, t]);

  const cls = (classes || []).find(c => String(c.classId) === String(classId));
  const students = data.classId === classId ? data.rows : null;
  const failed = data.classId === classId && data.failed;
  const student = studentId && students ? students.find(s => String(s.studentId) === String(studentId)) : null;
  const step = !classId ? 1 : !studentId ? 2 : 3;

  const refresh = useCallback(() => { reload(); onPaid?.(); }, [reload, onPaid]);

  const labels = [
    { title: t('admin.fd.step.class'), value: cls?.className },
    { title: t('admin.fd.step.student'), value: student?.name },
    { title: t('admin.fd.step.collect') },
  ];

  return (
    <div className="space-y-5 scroll-mt-24" ref={top}>
      <Stepper step={step} labels={labels} onStep={(n) => goSel(n === 1 ? { classId: null, studentId: null } : { classId, studentId: null })} />

      {step === 1 && (
        <div className="space-y-3 animate-fade-up">
          <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">{t('admin.fd.step.classQ')}</h3>
          <ClassChips classes={classes} onPick={(id) => goSel({ classId: id, studentId: null })} />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">{t('admin.fd.step.studentQ', { cls: cls?.className || '' })}</h3>
            <button type="button" onClick={() => goSel({ classId: null, studentId: null })} className="ui-btn-secondary !py-2 !text-xs"><FiArrowLeft /> {t('admin.fd.changeClass')}</button>
          </div>
          {failed
            ? <div className="ui-card"><EmptyState icon={FiAlertTriangle} title={t('admin.common.loadFailed')} action={<button type="button" onClick={reload} className="ui-btn-secondary"><FiRefreshCw /> {t('admin.common.retry')}</button>} /></div>
            : <StudentPicker key={classId} students={students} onPick={(id) => goSel({ classId, studentId: id })} />}
        </div>
      )}

      {step === 3 && (
        !students ? <SkeletonBlock className="h-64" />
          : !student ? (
            <div className="ui-card"><EmptyState icon={FiAlertTriangle} title={t('admin.fd.studentGone')} action={<button type="button" onClick={() => goSel({ classId, studentId: null })} className="ui-btn-secondary"><FiArrowLeft /> {t('admin.fd.backToList')}</button>} /></div>
          ) : (
            <StudentPayPanel
              key={student.studentId}
              student={student}
              cls={cls}
              canManage={canManage}
              onBack={() => goSel({ classId, studentId: null })}
              onPaid={refresh}
              onPlanChanged={refresh}
            />
          )
      )}
    </div>
  );
};

export default CollectPayment;
