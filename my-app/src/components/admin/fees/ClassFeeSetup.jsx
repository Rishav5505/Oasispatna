import React, { useState } from 'react';
import { FiSliders, FiEdit2, FiUsers, FiAlertTriangle, FiCheckCircle, FiPlus, FiCreditCard, FiLock, FiLayers } from 'react-icons/fi';
import { formatINR } from '../adminApi';
import { Badge, ProgressBar, EmptyState, SkeletonBlock } from '../AdminUI';
import { fmtDate, pctOf, plural } from './feeUtils';
import ClassFeeModal from './ClassFeeModal';
import ApplyDialog from './ApplyDialog';
import { useI18n } from '../../../i18n/useI18n';

const ClassCard = ({ cls, canManage, onEdit, onApply, onCollect }) => {
  const { t } = useI18n();
  const st = cls.structure;
  const pct = pctOf(cls.collected, cls.expected);
  return (
    <article className="ui-card ui-card-hover p-5 flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-11 h-11 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft shrink-0"><FiLayers /></span>
          <div className="min-w-0">
            <h3 className="font-extrabold text-gray-900 dark:text-white truncate">{cls.className}</h3>
            <p className="text-xs text-gray-500 flex items-center gap-1.5"><FiUsers /> {plural(t, 'admin.fd.setup.students', cls.students)}</p>
          </div>
        </div>
        {st ? <Badge tone="green" dot>{t('admin.fd.setup.isSet')}</Badge> : <Badge tone="amber" dot pulse>{t('admin.fd.setup.notSet')}</Badge>}
      </header>

      {st ? (
        <>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('admin.fd.setup.feePerStudent')}</p>
              <p className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">{formatINR(st.totalFee)}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5">
              <Badge tone="brand">{plural(t, 'admin.fd.setup.instCount', st.installments.length)}</Badge>
              {st.gstPercent > 0 && <Badge tone="dark">GST {st.gstPercent}%</Badge>}
            </div>
          </div>
          <ol className="rounded-2xl bg-gray-50 dark:bg-white/5 divide-y divide-gray-100 dark:divide-white/5 max-h-40 overflow-y-auto ui-scrollbar">
            {st.installments.map((i, idx) => (
              <li key={idx} className="flex items-center gap-2.5 px-3 py-2 text-xs">
                <span className="w-5 h-5 rounded-md bg-white dark:bg-white/10 text-[10px] font-extrabold text-gray-500 flex items-center justify-center shrink-0">{idx + 1}</span>
                <span className="flex-1 font-semibold text-gray-700 dark:text-gray-200 truncate">{i.label}</span>
                <span className="text-gray-500">{fmtDate(i.dueDate)}</span>
                <span className="font-extrabold text-gray-900 dark:text-white tabular-nums">{formatINR(i.amount)}</span>
              </li>
            ))}
          </ol>
          {st.note && <p className="text-xs text-gray-500 italic">“{st.note}”</p>}
        </>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 p-5 text-center">
          <p className="font-bold text-sm text-gray-800 dark:text-gray-100">{t('admin.fd.setup.emptyTitle')}</p>
          <p className="text-xs text-gray-500 mt-1">{canManage ? t('admin.fd.setup.emptyHint') : t('admin.fd.setup.emptyStaff')}</p>
          {canManage && <button type="button" onClick={onEdit} className="ui-btn-primary mt-3 !py-2 !text-xs"><FiPlus /> {t('admin.fd.setup.set')}</button>}
        </div>
      )}

      {cls.students > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
            <span className="text-emerald-600">{t('admin.fd.collected', { amt: formatINR(cls.collected) })}</span>
            <span className="text-red-600">{t('admin.fd.pendingAmt', { amt: formatINR(cls.pending) })}</span>
          </div>
          <ProgressBar value={pct} barClass="bg-emerald-500" />
        </div>
      )}

      {cls.students > 0 && (cls.withoutPlan > 0 ? (
        <p className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200 text-xs font-bold">
          <FiAlertTriangle className="shrink-0" /> {plural(t, 'admin.fd.setup.noPlan', cls.withoutPlan)}
        </p>
      ) : (
        <p className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-xs font-bold">
          <FiCheckCircle className="shrink-0" /> {t('admin.fd.setup.allPlanned')}
        </p>
      ))}

      <footer className="mt-auto flex flex-wrap gap-2 pt-1">
        {canManage && st && (
          <>
            <button type="button" onClick={onApply} disabled={cls.students === 0} className={`${cls.withoutPlan > 0 ? 'ui-btn-primary' : 'ui-btn-secondary'} !py-2 !text-xs disabled:opacity-50`}><FiUsers /> {t('admin.fd.setup.apply')}</button>
            <button type="button" onClick={onEdit} className="ui-btn-secondary !py-2 !text-xs"><FiEdit2 /> {t('admin.common.edit')}</button>
          </>
        )}
        {cls.students > 0 && <button type="button" onClick={onCollect} className="ui-btn-secondary !py-2 !text-xs"><FiCreditCard /> {t('admin.fd.setup.collect')}</button>}
        {!canManage && <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 ml-auto"><FiLock /> {t('admin.fd.setup.adminOnly')}</span>}
      </footer>
    </article>
  );
};

/** Step 1 + 2 of the fees flow: one card per class with its standard fee, installments and coverage. */
const ClassFeeSetup = ({ classes, canManage, onChanged, onCollect }) => {
  const { t } = useI18n();
  const [editing, setEditing] = useState(null); // classId
  const [applying, setApplying] = useState(null); // classId
  const byId = (id) => (classes || []).find(c => String(c.classId) === String(id));

  if (classes === null) return <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{[0, 1, 2].map(i => <SkeletonBlock key={i} className="h-72" />)}</div>;
  if (classes.length === 0) return <div className="ui-card"><EmptyState icon={FiSliders} title={t('admin.fd.noClasses')} hint={t('admin.fd.noClassesHint')} /></div>;

  const editCls = editing && byId(editing);
  const applyCls = applying && byId(applying);
  const unset = classes.filter(c => !c.structure).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.fd.setup.intro')}</p>
        {unset > 0 && <Badge tone="amber">{plural(t, 'admin.fd.setup.unsetCount', unset)}</Badge>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 ui-stagger">
        {classes.map(c => (
          <ClassCard key={c.classId} cls={c} canManage={canManage} onEdit={() => setEditing(c.classId)} onApply={() => setApplying(c.classId)} onCollect={() => onCollect(c.classId)} />
        ))}
      </div>
      {editCls && (
        <ClassFeeModal
          cls={editCls}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            const id = editing;
            setEditing(null);
            await onChanged();
            if (editCls.students > 0) setApplying(id); // guide straight into step 2
          }}
        />
      )}
      {applyCls && applyCls.structure && (
        <ApplyDialog cls={applyCls} onClose={() => setApplying(null)} onApplied={() => { setApplying(null); onChanged(); }} />
      )}
    </div>
  );
};

export default ClassFeeSetup;
