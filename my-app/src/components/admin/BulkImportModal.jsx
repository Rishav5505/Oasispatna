import React, { useMemo, useState } from 'react';
import { FiUploadCloud, FiCopy, FiCheckCircle, FiAlertTriangle, FiUsers, FiArrowLeft } from 'react-icons/fi';
import { api, toastError, toastSuccess } from './adminApi';
import { Modal, Badge, labelCls, tableScroll, theadRow, thCls, tbodyCls } from './AdminUI';
import { useI18n } from '../../i18n/useI18n';

const MAX_ROWS = 500;
const FIELDS = ['name', 'email', 'phone', 'className', 'batchName', 'fatherName', 'motherName', 'totalFee', 'parentEmail', 'parentPhone'];
const REQUIRED = ['name', 'email', 'phone', 'className'];
const TEMPLATE = FIELDS.join(',');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Header aliases -> field (compared after lower-casing and stripping non-alphanumerics)
const ALIASES = {
  name: ['name', 'studentname', 'fullname', 'student'],
  email: ['email', 'emailid', 'studentemail', 'mail'],
  phone: ['phone', 'mobile', 'phoneno', 'phonenumber', 'contact', 'mobileno', 'studentphone'],
  className: ['classname', 'class', 'grade', 'standard'],
  batchName: ['batchname', 'batch'],
  fatherName: ['fathername', 'father'],
  motherName: ['mothername', 'mother'],
  totalFee: ['totalfee', 'fee', 'fees', 'coursefee'],
  parentEmail: ['parentemail', 'guardianemail', 'fatheremail'],
  parentPhone: ['parentphone', 'guardianphone', 'fatherphone', 'parentmobile'],
};
const norm = (h) => String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const guessField = (h) => FIELDS.find(f => ALIASES[f].includes(norm(h))) || '';

// Minimal CSV/TSV parser (quotes, escaped quotes, CRLF). Delimiter: tab if present in first line (Excel paste), else comma/semicolon.
const parseDelimited = (text) => {
  const raw = String(text || '');
  const src = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1) : raw;
  const firstLine = src.split(/\r?\n/)[0] || '';
  const delim = firstLine.includes('\t') ? '\t' : (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"' && cell === '') quoted = true;
    else if (c === delim) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell.trim()); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell.trim()); rows.push(row); }
  return rows.filter(r => r.some(v => v !== ''));
};

const BulkImportModal = ({ onClose, onImported, classes = [] }) => {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const [mapping, setMapping] = useState([]);
  const [step, setStep] = useState('input'); // input | preview | done
  const [sendEmails, setSendEmails] = useState(true);
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState(null);

  const parsed = useMemo(() => parseDelimited(text), [text]);
  const header = parsed[0] || [];
  const body = parsed.slice(1);

  const classNames = useMemo(() => new Set(classes.map(c => norm(c.name))), [classes]);

  const records = useMemo(() => body.map((cells, idx) => {
    const rec = {};
    mapping.forEach((field, col) => { if (field && cells[col] !== undefined && cells[col] !== '') rec[field] = cells[col]; });
    const issues = [];
    REQUIRED.forEach(f => { if (!rec[f]) issues.push(t('admin.bulk.missing', { field: t(`admin.bulk.f.${f}`) })); });
    if (rec.email && !EMAIL_RE.test(rec.email)) issues.push(t('admin.bulk.badEmail'));
    if (rec.className && classNames.size && !classNames.has(norm(rec.className))) issues.push(t('admin.bulk.unknownClass', { name: rec.className }));
    if (rec.totalFee && !Number.isFinite(Number(String(rec.totalFee).replace(/[,₹\s]/g, '')))) issues.push(t('admin.bulk.badFee'));
    return { row: idx + 1, rec, issues };
  }), [body, mapping, classNames, t]);

  const dupEmails = useMemo(() => {
    const seen = new Map();
    records.forEach(r => { const e = (r.rec.email || '').toLowerCase(); if (e) seen.set(e, (seen.get(e) || 0) + 1); });
    return new Set([...seen].filter(([, n]) => n > 1).map(([e]) => e));
  }, [records]);

  const validRows = records.filter(r => r.issues.length === 0);
  const mappedRequired = REQUIRED.every(f => mapping.includes(f));

  const goPreview = () => {
    if (parsed.length < 2) { toastError({ message: t('admin.bulk.needRows') }, t('admin.bulk.title')); return; }
    if (body.length > MAX_ROWS) { toastError({ message: t('admin.bulk.tooMany', { n: MAX_ROWS }) }, t('admin.bulk.title')); return; }
    setMapping(header.map(guessField));
    setStep('preview');
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(f);
    e.target.value = '';
  };

  const submit = async () => {
    setSending(true);
    try {
      const students = validRows.map(({ rec }) => {
        const out = { ...rec };
        if (out.totalFee) out.totalFee = Number(String(out.totalFee).replace(/[,₹\s]/g, ''));
        return out;
      });
      const res = await api.post('/users/students/bulk', { students, sendEmails });
      // Map server row numbers (1-based within the sent array) back to sheet rows
      const sheetRows = validRows.map(r => r.row);
      setReport({ ...res, skipped: (res.skipped || []).map(s => ({ ...s, sheetRow: sheetRows[s.row - 1] ?? s.row })) });
      setStep('done');
      if (res.created > 0) { toastSuccess(t('admin.bulk.createdToast', { n: res.created })); onImported?.(); }
    } catch (err) {
      toastError(err, t('admin.bulk.failed'));
    } finally {
      setSending(false);
    }
  };

  const copyTemplate = async () => {
    try { await navigator.clipboard.writeText(TEMPLATE); toastSuccess(t('admin.bulk.copied')); } catch { /* clipboard unavailable */ }
  };

  const footer = step === 'input' ? (
    <>
      <button type="button" onClick={onClose} className="ui-btn-secondary">{t('admin.common.cancel')}</button>
      <button type="button" onClick={goPreview} disabled={!text.trim()} className="ui-btn-primary">{t('admin.bulk.preview')}</button>
    </>
  ) : step === 'preview' ? (
    <>
      <button type="button" onClick={() => setStep('input')} className="ui-btn-secondary"><FiArrowLeft /> {t('admin.common.back')}</button>
      <button type="button" onClick={submit} disabled={sending || !mappedRequired || validRows.length === 0} className="ui-btn-primary">
        {sending ? t('admin.bulk.importing') : <><FiUploadCloud /> {t('admin.bulk.importN', { n: validRows.length })}</>}
      </button>
    </>
  ) : <button type="button" onClick={onClose} className="ui-btn-primary">{t('admin.common.done')}</button>;

  return (
    <Modal icon={FiUploadCloud} title={t('admin.bulk.title')} subtitle={t('admin.bulk.subtitle', { n: MAX_ROWS })} onClose={onClose} maxWidth="max-w-5xl" footer={footer}>
      {step === 'input' && (
        <div className="space-y-5">
          <div>
            <p className={labelCls}>{t('admin.bulk.template')}</p>
            <div className="flex items-stretch gap-2">
              <code className="flex-1 min-w-0 overflow-x-auto ui-scrollbar whitespace-nowrap px-3.5 py-2.5 rounded-xl bg-ink-950 text-brand-300 text-xs font-mono">{TEMPLATE}</code>
              <button type="button" onClick={copyTemplate} className="ui-btn-secondary !py-2 shrink-0"><FiCopy /> {t('admin.bulk.copy')}</button>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{t('admin.bulk.templateHint')}</p>
          </div>
          <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-brand-200 dark:border-white/10 bg-brand-50/40 dark:bg-white/5 cursor-pointer hover:border-brand-400 transition-colors">
            <FiUploadCloud className="text-3xl text-brand-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{t('admin.bulk.upload')}</span>
            <span className="text-xs text-gray-500">.csv · .tsv · .txt</span>
            <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="sr-only" onChange={onFile} />
          </label>
          <div>
            <label className={labelCls} htmlFor="bulk-text">{t('admin.bulk.paste')}</label>
            <textarea id="bulk-text" rows={8} value={text} onChange={e => setText(e.target.value)} placeholder={`${TEMPLATE}\nRahul Kumar,rahul@example.com,9876543210,11,B1,Suresh Kumar,,60000,suresh@example.com,9876500000`} className="ui-input font-mono text-xs resize-y" />
            {parsed.length > 0 && <p className="text-xs text-gray-500 mt-1.5">{t('admin.bulk.detected', { n: Math.max(0, parsed.length - 1), c: header.length })}</p>}
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">{t('admin.bulk.validN', { n: validRows.length })}</Badge>
            {records.length - validRows.length > 0 && <Badge tone="red">{t('admin.bulk.invalidN', { n: records.length - validRows.length })}</Badge>}
            {dupEmails.size > 0 && <Badge tone="amber">{t('admin.bulk.dupN', { n: dupEmails.size })}</Badge>}
            {!mappedRequired && <Badge tone="red">{t('admin.bulk.mapRequired')}</Badge>}
          </div>
          <div className="rounded-2xl ring-1 ring-gray-100 dark:ring-white/10 overflow-hidden">
            <div className={`${tableScroll} max-h-[50vh]`}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={theadRow}>
                    <th className={`${thCls} !px-3`}>#</th>
                    {header.map((h, col) => (
                      <th key={col} className={`${thCls} !px-2 min-w-[9rem]`}>
                        <span className="block normal-case text-gray-400 truncate mb-1">{h || `#${col + 1}`}</span>
                        <select value={mapping[col] || ''} onChange={e => setMapping(m => m.map((v, i) => (i === col ? e.target.value : v)))} className="ui-input !py-1 !px-2 !text-[11px] font-bold" aria-label={t('admin.bulk.mapFor', { h })}>
                          <option value="">{t('admin.bulk.ignore')}</option>
                          {FIELDS.map(f => <option key={f} value={f} disabled={mapping.includes(f) && mapping[col] !== f}>{t(`admin.bulk.f.${f}`)}{REQUIRED.includes(f) ? ' *' : ''}</option>)}
                        </select>
                      </th>
                    ))}
                    <th className={`${thCls} !px-3`}>{t('admin.bulk.check')}</th>
                  </tr>
                </thead>
                <tbody className={tbodyCls}>
                  {records.slice(0, 200).map((r) => {
                    const cells = body[r.row - 1];
                    const dup = dupEmails.has((r.rec.email || '').toLowerCase());
                    return (
                      <tr key={r.row} className={r.issues.length ? 'bg-red-50/50 dark:bg-red-500/5' : ''}>
                        <td className="px-3 py-2 font-bold text-gray-400">{r.row}</td>
                        {header.map((_, col) => <td key={col} className={`px-2 py-2 truncate max-w-[12rem] ${mapping[col] ? 'text-gray-800 dark:text-gray-100' : 'text-gray-300 dark:text-gray-600'}`}>{cells[col] || ''}</td>)}
                        <td className="px-3 py-2 min-w-[12rem]">
                          {r.issues.length ? <span className="text-red-600 font-semibold">{r.issues.join(' · ')}</span>
                            : dup ? <span className="text-amber-600 font-semibold">{t('admin.bulk.dupRow')}</span>
                              : <FiCheckCircle className="text-emerald-500" />}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {records.length > 200 && <p className="px-4 py-2 text-xs text-gray-500 border-t border-gray-100 dark:border-white/5">{t('admin.bulk.previewLimit', { n: records.length })}</p>}
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 dark:text-gray-200 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-brand-500" checked={sendEmails} onChange={e => setSendEmails(e.target.checked)} />
            {t('admin.bulk.sendEmails')}
          </label>
        </div>
      )}

      {step === 'done' && report && (
        <div className="space-y-5 animate-scale-in">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 p-4 text-center"><p className="text-3xl font-extrabold text-emerald-600">{report.created}</p><p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">{t('admin.bulk.created')}</p></div>
            <div className="rounded-2xl bg-red-50 dark:bg-red-500/10 p-4 text-center"><p className="text-3xl font-extrabold text-red-600">{report.skipped.length + (records.length - validRows.length)}</p><p className="text-[11px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">{t('admin.bulk.skipped')}</p></div>
            <div className="rounded-2xl bg-brand-50 dark:bg-brand-500/10 p-4 text-center"><p className="text-3xl font-extrabold text-brand-600">{report.parentsLinked || 0}</p><p className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">{t('admin.bulk.parents')}</p></div>
          </div>
          {(report.skipped.length > 0 || records.length > validRows.length) ? (
            <div className="rounded-2xl ring-1 ring-gray-100 dark:ring-white/10 overflow-hidden">
              <p className="px-4 py-3 text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2"><FiAlertTriangle className="text-amber-500" /> {t('admin.bulk.skippedRows')}</p>
              <ul className="max-h-64 overflow-y-auto ui-scrollbar divide-y divide-gray-100 dark:divide-white/5 text-sm">
                {records.filter(r => r.issues.length).map(r => <li key={`c${r.row}`} className="px-4 py-2 flex gap-3"><span className="font-bold text-gray-400 w-14">#{r.row}</span><span className="flex-1 truncate">{r.rec.email || r.rec.name || '—'}</span><span className="text-red-600 font-semibold">{r.issues.join(' · ')}</span></li>)}
                {report.skipped.map((s, i) => <li key={`s${i}`} className="px-4 py-2 flex gap-3"><span className="font-bold text-gray-400 w-14">#{s.sheetRow}</span><span className="flex-1 truncate">{s.email || '—'}</span><span className="text-red-600 font-semibold">{s.reason}</span></li>)}
              </ul>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300"><FiUsers /> {t('admin.bulk.allDone')}</p>
          )}
        </div>
      )}
    </Modal>
  );
};

export default BulkImportModal;
