/**
 * /admission — public online admission form (POST /api/admissions, multipart) + status checker
 * (GET /api/admissions/status?applicationNo=&phone=). Multi-step: student → parent → academics →
 * documents → review. Text fields are kept as a local draft (per browser) until submitted.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FiUser, FiUsers, FiBookOpen, FiUploadCloud, FiCheckCircle, FiArrowRight, FiArrowLeft, FiCopy, FiSearch,
  FiFileText, FiX, FiEdit2, FiShield, FiClock, FiPhoneCall, FiImage, FiAlertCircle, FiHome,
} from 'react-icons/fi';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import config from '../../config';
import { PROGRAM_BY_CLASS, CLASSES } from '../../components/home/programs';

const API = config.API_URL;
const DRAFT_KEY = 'oasis_admission_draft';
const MB = 1024 * 1024;

const STEPS = [
  { key: 'student', label: 'Student', icon: FiUser },
  { key: 'parent', label: 'Parent', icon: FiUsers },
  { key: 'academics', label: 'Academics', icon: FiBookOpen },
  { key: 'documents', label: 'Documents', icon: FiUploadCloud },
  { key: 'review', label: 'Review', icon: FiCheckCircle },
];

const DOCS = [
  { key: 'photo', label: 'Passport-size photo', hint: 'JPG or PNG, up to 5 MB', accept: 'image/*', max: 5 * MB, required: true },
  { key: 'marksheet', label: 'Last marksheet', hint: 'Image or PDF, up to 10 MB', accept: 'image/*,application/pdf', max: 10 * MB, required: false },
  { key: 'id_proof', label: 'ID proof (Aadhaar / school ID)', hint: 'Image or PDF, up to 10 MB', accept: 'image/*,application/pdf', max: 10 * MB, required: false },
];

const EMPTY = {
  studentName: '', dob: '', gender: '', phone: '', email: '',
  fatherName: '', motherName: '', parentPhone: '', parentEmail: '', address: '',
  schoolName: '', classApplying: '', courseInterest: '', previousMarksPct: '',
};

const PHONE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const cleanPhone = (v) => String(v || '').replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');

const STATUS_META = {
  submitted: { label: 'Submitted', cls: 'bg-gray-100 text-gray-700', note: 'We have received your application. Our team will review it shortly.' },
  under_review: { label: 'Under review', cls: 'bg-amber-100 text-amber-800', note: 'Our admissions team is reviewing your documents.' },
  approved: { label: 'Approved', cls: 'bg-green-100 text-green-700', note: 'Congratulations! Login details will be sent to your email.' },
  rejected: { label: 'Not approved', cls: 'bg-red-100 text-red-700', note: 'Please contact the office for more details.' },
};

const readDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
};

const isObjectId = (v) => /^[a-f\d]{24}$/i.test(String(v || ''));

function validateStep(step, f, files) {
  const e = {};
  if (step === 0) {
    if (f.studentName.trim().length < 2) e.studentName = "Please enter the student's full name";
    if (!f.dob) e.dob = 'Date of birth is required';
    else {
      const age = (Date.now() - new Date(f.dob).getTime()) / (365.25 * 86400000);
      if (Number.isNaN(age) || age < 8 || age > 25) e.dob = 'Please check the date of birth';
    }
    if (!f.gender) e.gender = 'Please select gender';
    if (!PHONE_RE.test(cleanPhone(f.phone))) e.phone = 'Enter a valid 10-digit mobile number';
    if (!EMAIL_RE.test(f.email.trim())) e.email = 'Enter a valid email address';
  }
  if (step === 1) {
    if (f.fatherName.trim().length < 2) e.fatherName = "Please enter father's / guardian's name";
    if (!PHONE_RE.test(cleanPhone(f.parentPhone))) e.parentPhone = 'Enter a valid 10-digit mobile number';
    if (f.parentEmail.trim() && !EMAIL_RE.test(f.parentEmail.trim())) e.parentEmail = 'Enter a valid email address';
    if (f.address.trim().length < 8) e.address = 'Please enter the full address';
  }
  if (step === 2) {
    if (f.schoolName.trim().length < 2) e.schoolName = 'Please enter the current school name';
    if (!f.classApplying) e.classApplying = 'Please choose a class';
    if (f.previousMarksPct !== '') {
      const n = Number(f.previousMarksPct);
      if (!Number.isFinite(n) || n < 0 || n > 100) e.previousMarksPct = 'Enter a percentage between 0 and 100';
    }
  }
  if (step === 3) {
    DOCS.forEach((d) => { if (d.required && !files[d.key]) e[d.key] = `${d.label} is required`; });
  }
  return e;
}

// ---------- small presentational pieces ----------
const Field = ({ label, error, required, hint, children, className = '' }) => (
  <label className={`block ${className}`}>
    <span className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-1.5">
      {label}{required ? <span className="text-brand-600">*</span> : <span className="font-medium text-gray-400">(optional)</span>}
    </span>
    {children}
    {error ? (
      <span role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600"><FiAlertCircle className="shrink-0" /> {error}</span>
    ) : hint ? <span className="mt-1.5 block text-[11px] text-gray-400">{hint}</span> : null}
  </label>
);

const inputCls = (err) => `ui-input ${err ? '!border-red-400 focus:!ring-red-500/10' : ''}`;

function FilePicker({ doc, file, error, onPick, onClear }) {
  const ref = useRef(null);
  const [preview, setPreview] = useState('');
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) return undefined;
    const url = URL.createObjectURL(file);
    const raf = requestAnimationFrame(() => setPreview(url));
    return () => { cancelAnimationFrame(raf); URL.revokeObjectURL(url); setPreview(''); };
  }, [file]);

  const handle = (f) => { if (f) onPick(doc, f); };
  const isImg = file && file.type.startsWith('image/');

  return (
    <div>
      <span className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-1.5">
        {doc.label}{doc.required ? <span className="text-brand-600">*</span> : <span className="font-medium text-gray-400">(optional)</span>}
      </span>
      {file ? (
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-brand-200 bg-brand-50/50 animate-fade-in">
          {isImg && preview ? (
            <img src={preview} alt={`${doc.label} preview`} className="w-16 h-16 rounded-xl object-cover border border-white shadow-sm" />
          ) : (
            <span className="w-16 h-16 rounded-xl bg-white text-brand-600 flex items-center justify-center border border-brand-100"><FiFileText className="w-6 h-6" /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / MB).toFixed(2)} MB</p>
            <button type="button" onClick={() => ref.current?.click()} className="mt-1 text-xs font-bold text-brand-600 hover:underline">Change</button>
          </div>
          <button type="button" onClick={() => onClear(doc.key)} aria-label={`Remove ${doc.label}`} className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"><FiX /></button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files?.[0]); }}
          className={`w-full flex flex-col items-center justify-center gap-1.5 p-5 rounded-2xl border-2 border-dashed transition-all text-center ${
            drag ? 'border-brand-500 bg-brand-50' : error ? 'border-red-300 bg-red-50/40' : 'border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/40'
          }`}
        >
          <span className="w-11 h-11 rounded-full bg-white shadow-sm text-brand-600 flex items-center justify-center">{doc.accept === 'image/*' ? <FiImage className="w-5 h-5" /> : <FiUploadCloud className="w-5 h-5" />}</span>
          <span className="text-sm font-bold text-gray-800">Tap to upload<span className="hidden sm:inline"> or drag & drop</span></span>
          <span className="text-[11px] text-gray-400">{doc.hint}</span>
        </button>
      )}
      <input ref={ref} type="file" accept={doc.accept} className="hidden" onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ''; }} />
      {error && <span role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600"><FiAlertCircle /> {error}</span>}
    </div>
  );
}

function StatusChecker({ initialNo = '', initialPhone = '' }) {
  const [no, setNo] = useState(initialNo);
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const check = async (e) => {
    e.preventDefault();
    setError(''); setResult(null);
    if (!no.trim()) { setError('Enter your application number'); return; }
    if (!PHONE_RE.test(cleanPhone(phone))) { setError('Enter the 10-digit mobile number used in the form'); return; }
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/admissions/status`, { params: { applicationNo: no.trim().toUpperCase(), phone: cleanPhone(phone) } });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.message || (err?.response?.status === 404 ? 'No application found with these details' : 'Could not check status right now'));
    } finally {
      setLoading(false);
    }
  };

  const meta = result ? (STATUS_META[result.status] || STATUS_META.submitted) : null;

  return (
    <div id="status" className="ui-card p-5 sm:p-6 scroll-mt-28">
      <h3 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-gray-900">
        <span className="w-9 h-9 rounded-xl bg-ink-900 text-white flex items-center justify-center"><FiSearch /></span>
        Check application status
      </h3>
      <p className="mt-1 text-sm text-gray-500">Already applied? Track your application here.</p>
      <form onSubmit={check} className="mt-4 space-y-3">
        <input className="ui-input uppercase placeholder:normal-case" value={no} onChange={(e) => setNo(e.target.value)} placeholder="Application number" aria-label="Application number" />
        <input className="ui-input" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="Student mobile number" aria-label="Mobile number" maxLength={14} />
        <button type="submit" disabled={loading} className="ui-btn-dark w-full py-3">{loading ? 'Checking…' : 'Check status'} {!loading && <FiArrowRight />}</button>
      </form>
      {error && <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm font-semibold text-red-600 animate-fade-in"><FiAlertCircle className="mt-0.5 shrink-0" /> {error}</p>}
      {result && meta && (
        <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 animate-scale-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-gray-900">{result.studentName}</p>
            <span className={`ui-badge ${meta.cls}`}>{meta.label}</span>
          </div>
          <p className="mt-2 text-sm text-gray-600">{meta.note}</p>
          {result.reviewNote && <p className="mt-2 text-sm text-gray-700 bg-white rounded-xl px-3 py-2 border border-gray-100"><span className="font-bold">Note from office:</span> {result.reviewNote}</p>}
        </div>
      )}
    </div>
  );
}

// ---------- page ----------
export default function Admission() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(readDraft);
  const [files, setFiles] = useState({});
  const [errors, setErrors] = useState({});
  const [classes, setClasses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null); // { applicationNo, message }
  const topRef = useRef(null);

  useEffect(() => { document.title = 'Online Admission | Oasis JEE Classes'; }, []);

  // Real classes from the backend (ids); falls back to plain labels below if unavailable.
  useEffect(() => {
    let cancelled = false;
    axios.get(`${API}/public/classes`)
      .then(({ data }) => {
        if (cancelled || !Array.isArray(data)) return;
        setClasses(data.filter((c) => c?._id && c?.name).map((c) => ({ value: c._id, label: c.name })));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Fallback (no batches published yet): plain class numbers.
  const classOptions = useMemo(
    () => (classes.length ? classes : CLASSES.map((c) => ({ value: `Class ${c}`, label: `Class ${c}` }))),
    [classes],
  );

  // Persist text fields as a per-browser draft.
  useEffect(() => {
    if (done) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* ignore */ }
  }, [form, done]);

  const set = (k) => (e) => {
    const v = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const chooseClass = (value) => {
    const label = classOptions.find((c) => c.value === value)?.label || '';
    const num = parseInt(String(label).replace(/\D+/g, ''), 10);
    setForm((f) => ({ ...f, classApplying: value, courseInterest: PROGRAM_BY_CLASS[num] || f.courseInterest }));
    if (errors.classApplying) setErrors((er) => ({ ...er, classApplying: undefined }));
  };

  const pickFile = (doc, f) => {
    const okType = doc.accept === 'image/*' ? f.type.startsWith('image/') : (f.type.startsWith('image/') || f.type === 'application/pdf');
    if (!okType) { toast.error(doc.accept === 'image/*' ? 'Please choose an image file' : 'Please choose an image or PDF'); return; }
    if (f.size > doc.max) { toast.error(`File too large — max ${doc.max / MB} MB`); return; }
    setFiles((fs) => ({ ...fs, [doc.key]: f }));
    setErrors((er) => ({ ...er, [doc.key]: undefined }));
  };
  const clearFile = (key) => setFiles((fs) => { const n = { ...fs }; delete n[key]; return n; });

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const goTo = (target) => {
    // Moving forward validates every step in between.
    for (let s = step; s < target; s += 1) {
      const e = validateStep(s, form, files);
      if (Object.keys(e).length) {
        setErrors(e);
        setStep(s);
        toast.error('Please fix the highlighted fields');
        scrollTop();
        return;
      }
    }
    setErrors({});
    setStep(target);
    scrollTop();
  };

  const submit = async () => {
    for (let s = 0; s < 4; s += 1) {
      const e = validateStep(s, form, files);
      if (Object.keys(e).length) { setErrors(e); setStep(s); toast.error('Please complete this step'); scrollTop(); return; }
    }
    const fd = new FormData();
    const payload = {
      ...form,
      studentName: form.studentName.trim(),
      email: form.email.trim().toLowerCase(),
      phone: cleanPhone(form.phone),
      parentPhone: cleanPhone(form.parentPhone),
      parentEmail: form.parentEmail.trim().toLowerCase(),
    };
    Object.entries(payload).forEach(([k, v]) => {
      if (k === 'classApplying' && !isObjectId(v)) {
        fd.append('classApplyingName', v);
        return;
      }
      if (v !== '' && v != null) fd.append(k, typeof v === 'string' ? v.trim() : v);
    });
    if (!isObjectId(form.classApplying) && !form.courseInterest) fd.append('courseInterest', form.classApplying);
    DOCS.forEach((d) => { if (files[d.key]) fd.append(d.key, files[d.key]); });

    setSubmitting(true);
    try {
      const { data } = await axios.post(`${API}/admissions`, fd);
      setDone({ applicationNo: data?.applicationNo, message: data?.message, phone: payload.phone, name: payload.studentName, email: payload.email });
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      scrollTop();
    } catch (err) {
      const status = err?.response?.status;
      toast.error(err?.response?.data?.message || (status === 429 ? 'Too many attempts — please try again later' : 'Could not submit the application. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setForm(EMPTY); setFiles({}); setErrors({}); setStep(0); setDone(null);
    scrollTop();
  };

  const copyNo = async () => {
    try {
      await navigator.clipboard.writeText(done.applicationNo);
      toast.success('Application number copied');
    } catch {
      toast.error('Copy failed — please note it down');
    }
  };

  const classLabel = classOptions.find((c) => c.value === form.classApplying)?.label || form.classApplying;
  const pct = Math.round((step / (STEPS.length - 1)) * 100);

  // ---------- step bodies ----------
  const stepBody = () => {
    if (step === 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Student's full name" required error={errors.studentName} className="sm:col-span-2">
            <input className={inputCls(errors.studentName)} value={form.studentName} onChange={set('studentName')} autoComplete="name" placeholder="As on school records" />
          </Field>
          <Field label="Date of birth" required error={errors.dob}>
            <input type="date" className={inputCls(errors.dob)} value={form.dob} onChange={set('dob')} max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Gender" required error={errors.gender}>
            <div className="grid grid-cols-3 gap-2">
              {['Male', 'Female', 'Other'].map((g) => (
                <button key={g} type="button" onClick={() => set('gender')(g)} aria-pressed={form.gender === g}
                  className={`py-3 rounded-xl text-sm font-bold border transition ${form.gender === g ? 'bg-brand-gradient text-white border-transparent shadow-brand-soft' : `bg-gray-50 text-gray-600 hover:border-brand-300 ${errors.gender ? 'border-red-300' : 'border-gray-200'}`}`}>
                  {g}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Student mobile" required error={errors.phone} hint="We'll use this to verify your application status">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">+91</span>
              <input className={`${inputCls(errors.phone)} pl-12`} value={form.phone} onChange={set('phone')} inputMode="numeric" autoComplete="tel" maxLength={14} placeholder="98765 43210" />
            </div>
          </Field>
          <Field label="Email" required error={errors.email} hint="Confirmation & login details are sent here">
            <input type="email" className={inputCls(errors.email)} value={form.email} onChange={set('email')} autoComplete="email" placeholder="student@example.com" />
          </Field>
        </div>
      );
    }
    if (step === 1) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Father's / guardian's name" required error={errors.fatherName}>
            <input className={inputCls(errors.fatherName)} value={form.fatherName} onChange={set('fatherName')} />
          </Field>
          <Field label="Mother's name" error={errors.motherName}>
            <input className={inputCls(errors.motherName)} value={form.motherName} onChange={set('motherName')} />
          </Field>
          <Field label="Parent mobile" required error={errors.parentPhone}>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">+91</span>
              <input className={`${inputCls(errors.parentPhone)} pl-12`} value={form.parentPhone} onChange={set('parentPhone')} inputMode="numeric" maxLength={14} placeholder="98765 43210" />
            </div>
          </Field>
          <Field label="Parent email" error={errors.parentEmail} hint="Add it to get a parent login to track progress">
            <input type="email" className={inputCls(errors.parentEmail)} value={form.parentEmail} onChange={set('parentEmail')} placeholder="parent@example.com" />
          </Field>
          <Field label="Full address" required error={errors.address} className="sm:col-span-2">
            <textarea className={`${inputCls(errors.address)} min-h-[90px] resize-y`} value={form.address} onChange={set('address')} autoComplete="street-address" placeholder="House no., street, locality, city, PIN" />
          </Field>
        </div>
      );
    }
    if (step === 2) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Current school" required error={errors.schoolName} className="sm:col-span-2">
            <input className={inputCls(errors.schoolName)} value={form.schoolName} onChange={set('schoolName')} placeholder="School name, city" />
          </Field>
          <div className="sm:col-span-2">
            <span className="flex items-center gap-1 text-xs font-bold text-gray-600 mb-1.5">Class applying for <span className="text-brand-600">*</span></span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {classOptions.map((c) => (
                <button key={c.value} type="button" onClick={() => chooseClass(c.value)} aria-pressed={form.classApplying === c.value}
                  className={`px-2 py-3 rounded-xl text-sm font-bold border transition truncate ${form.classApplying === c.value ? 'bg-brand-gradient text-white border-transparent shadow-brand-soft' : `bg-gray-50 text-gray-700 hover:border-brand-300 ${errors.classApplying ? 'border-red-300' : 'border-gray-200'}`}`}>
                  {c.label}
                </button>
              ))}
            </div>
            {errors.classApplying && <span role="alert" className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-red-600"><FiAlertCircle /> {errors.classApplying}</span>}
          </div>
          <Field label="Course / program" error={errors.courseInterest} hint="Auto-filled from the class — change if needed">
            <select className={inputCls(errors.courseInterest)} value={form.courseInterest} onChange={set('courseInterest')}>
              <option value="">Not sure yet</option>
              {Object.entries(PROGRAM_BY_CLASS).map(([cls, name]) => <option key={name} value={name}>{name} (Class {cls})</option>)}
              <option value="JEE Dropper">JEE Dropper batch</option>
            </select>
          </Field>
          <Field label="Last exam percentage" error={errors.previousMarksPct}>
            <div className="relative">
              <input className={`${inputCls(errors.previousMarksPct)} pr-10`} value={form.previousMarksPct} onChange={set('previousMarksPct')} inputMode="decimal" placeholder="e.g. 86.5" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">%</span>
            </div>
          </Field>
        </div>
      );
    }
    if (step === 3) {
      return (
        <div className="space-y-4">
          {DOCS.map((d) => <FilePicker key={d.key} doc={d} file={files[d.key]} error={errors[d.key]} onPick={pickFile} onClear={clearFile} />)}
          <p className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-3"><FiShield className="mt-0.5 shrink-0 text-brand-600" /> Documents are only used for admission verification and are visible to the Oasis office only.</p>
        </div>
      );
    }
    const rows = [
      ['Student', 0, [['Name', form.studentName], ['Date of birth', form.dob ? new Date(form.dob).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''], ['Gender', form.gender], ['Mobile', cleanPhone(form.phone)], ['Email', form.email]]],
      ['Parent', 1, [["Father's / guardian's name", form.fatherName], ["Mother's name", form.motherName], ['Parent mobile', cleanPhone(form.parentPhone)], ['Parent email', form.parentEmail], ['Address', form.address]]],
      ['Academics', 2, [['School', form.schoolName], ['Class', classLabel], ['Program', form.courseInterest], ['Last exam %', form.previousMarksPct ? `${form.previousMarksPct}%` : '']]],
    ];
    return (
      <div className="space-y-4">
        {rows.map(([title, s, items]) => (
          <div key={title} className="rounded-2xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-extrabold text-gray-900">{title}</h4>
              <button type="button" onClick={() => { setErrors({}); setStep(s); }} className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"><FiEdit2 /> Edit</button>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              {items.filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{k}</dt>
                  <dd className="text-sm font-semibold text-gray-800 break-words">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        <div className="rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-extrabold text-gray-900">Documents</h4>
            <button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline"><FiEdit2 /> Edit</button>
          </div>
          <ul className="flex flex-wrap gap-2">
            {DOCS.map((d) => (
              <li key={d.key} className={`ui-badge !normal-case !text-xs ${files[d.key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {files[d.key] ? <FiCheckCircle /> : <FiX />} {d.label}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-gray-500">By submitting, you confirm the details above are correct. Our team will contact you on the parent mobile number.</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fffaf5] flex flex-col selection:bg-orange-500 selection:text-white">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-36 md:pt-44 pb-24 md:pb-28 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[520px] h-[520px] bg-orange-600/15 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[520px] h-[520px] bg-orange-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/3" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <span className="inline-flex items-center gap-2 text-orange-500 font-bold uppercase tracking-widest text-[11px] mb-5 bg-orange-600/10 px-4 py-1.5 rounded-full border border-orange-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Admissions open 2026–27
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4 leading-tight tracking-tight">
            Apply online in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-400">5 minutes</span>
          </h1>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed font-medium">
            Fill the form, upload documents and get your application number instantly. No queues, no paperwork.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-gray-300">
            <span className="inline-flex items-center gap-1.5"><FiClock className="text-orange-500" /> Reply within 24 hours</span>
            <span className="inline-flex items-center gap-1.5"><FiShield className="text-orange-500" /> Documents kept private</span>
            <a href="#status" className="inline-flex items-center gap-1.5 hover:text-white"><FiSearch className="text-orange-500" /> Track status</a>
          </div>
        </div>
      </section>

      <section ref={topRef} className="relative z-20 -mt-14 pb-20 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
          {/* Main card */}
          <div className="ui-card !rounded-[28px] overflow-hidden">
            {done ? (
              <div className="p-6 sm:p-10 text-center animate-scale-in">
                <span className="mx-auto w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center shadow-[0_0_0_10px_rgba(34,197,94,0.08)] animate-glow">
                  <FiCheckCircle className="w-10 h-10" />
                </span>
                <h2 className="mt-6 text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Application submitted!</h2>
                <p className="mt-2 text-gray-500 max-w-md mx-auto">{done.message || `Thank you, ${done.name}. We've emailed a confirmation to ${done.email}.`}</p>
                {done.applicationNo && (
                  <div className="mt-6 inline-flex flex-col sm:flex-row items-center gap-3 p-4 sm:pl-6 rounded-2xl bg-brand-50 border border-brand-100">
                    <div className="text-center sm:text-left">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-brand-700">Application number</p>
                      <p className="text-2xl font-extrabold tracking-wider text-gray-900 font-mono break-all">{done.applicationNo}</p>
                    </div>
                    <button type="button" onClick={copyNo} className="ui-btn-primary"><FiCopy /> Copy</button>
                  </div>
                )}
                <ol className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                  {[
                    ['1', 'Review', 'Our team checks your details and documents.'],
                    ['2', 'Call', 'We call the parent to confirm batch & fees.'],
                    ['3', 'Login', 'Student & parent logins are emailed to you.'],
                  ].map(([n, t, d]) => (
                    <li key={n} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <span className="w-7 h-7 rounded-full bg-ink-900 text-white text-xs font-extrabold flex items-center justify-center">{n}</span>
                      <p className="mt-2 text-sm font-extrabold text-gray-900">{t}</p>
                      <p className="text-xs text-gray-500">{d}</p>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
                  <Link to="/" className="ui-btn-secondary py-3"><FiHome /> Back to home</Link>
                  <button type="button" onClick={resetAll} className="ui-btn-dark py-3">Apply for another student</button>
                </div>
              </div>
            ) : (
              <>
                {/* Progress */}
                <div className="px-5 sm:px-8 pt-6 sm:pt-8">
                  <div className="flex items-center justify-between mb-4 sm:hidden">
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Step {step + 1} of {STEPS.length}</p>
                    <p className="text-sm font-extrabold text-gray-900">{STEPS[step].label}</p>
                  </div>
                  <ol className="relative flex items-start justify-between">
                    <span className="absolute left-5 right-5 top-5 h-1 rounded-full bg-gray-100" aria-hidden="true" />
                    <span className="absolute left-5 top-5 h-1 rounded-full bg-brand-gradient transition-all duration-700 ease-out" style={{ width: `calc((100% - 2.5rem) * ${pct / 100})` }} aria-hidden="true" />
                    {STEPS.map((s, i) => {
                      const Icon = s.icon;
                      const state = i < step ? 'done' : i === step ? 'current' : 'todo';
                      return (
                        <li key={s.key} className="relative z-10 flex flex-col items-center gap-2 w-10">
                          <button
                            type="button"
                            onClick={() => (i < step ? (setErrors({}), setStep(i)) : i > step ? goTo(i) : null)}
                            aria-label={`Step ${i + 1}: ${s.label}`}
                            aria-current={state === 'current' ? 'step' : undefined}
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                              state === 'done' ? 'bg-brand-gradient border-transparent text-white'
                                : state === 'current' ? 'bg-white border-brand-500 text-brand-600 shadow-brand-glow scale-110'
                                  : 'bg-white border-gray-200 text-gray-400'
                            }`}
                          >
                            {state === 'done' ? <FiCheckCircle /> : <Icon />}
                          </button>
                          <span className={`hidden sm:block text-xs font-bold whitespace-nowrap ${state === 'todo' ? 'text-gray-400' : 'text-gray-900'}`}>{s.label}</span>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                <div className="px-5 sm:px-8 pt-6 pb-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-gray-900">
                    {['Student details', 'Parent / guardian details', 'Academic details', 'Upload documents', 'Review & submit'][step]}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {[
                      'Tell us about the student joining Oasis.',
                      'We will reach out to the parent for counselling.',
                      'Helps us place the student in the right batch.',
                      'Clear photos work fine — scans are not required.',
                      'Check everything once before submitting.',
                    ][step]}
                  </p>
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); if (step < STEPS.length - 1) goTo(step + 1); else submit(); }}
                  noValidate
                >
                  <div key={step} className="px-5 sm:px-8 py-5 animate-fade-up">{stepBody()}</div>
                  <div className="sticky bottom-0 flex items-center justify-between gap-3 px-5 sm:px-8 py-4 border-t border-gray-100 bg-white/95 backdrop-blur pb-[max(1rem,env(safe-area-inset-bottom))]">
                    <button type="button" onClick={() => { setErrors({}); setStep((s) => Math.max(0, s - 1)); scrollTop(); }} disabled={step === 0}
                      className="ui-btn-secondary py-3 disabled:opacity-0 disabled:pointer-events-none">
                      <FiArrowLeft /> Back
                    </button>
                    {step < STEPS.length - 1 ? (
                      <button type="submit" className="ui-btn-primary py-3 px-6">Continue <FiArrowRight /></button>
                    ) : (
                      <button type="submit" disabled={submitting} className="ui-btn-primary py-3 px-6 shadow-brand-glow">
                        {submitting ? 'Submitting…' : 'Submit application'} {!submitting && <FiCheckCircle />}
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6 lg:sticky lg:top-28">
            <StatusChecker initialNo={done?.applicationNo || ''} initialPhone={done?.phone || ''} key={done?.applicationNo || 'blank'} />
            <div className="ui-card p-5 sm:p-6 bg-brand-sunset !border-0 text-white overflow-hidden relative">
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
              <h3 className="relative text-lg font-extrabold">Need help with the form?</h3>
              <p className="relative mt-1 text-sm text-white/80">Talk to our admission counsellor — Mon to Sat, 9 AM to 7 PM.</p>
              <a href="tel:+918825198919" className="relative mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-gray-900 text-sm font-bold hover:-translate-y-0.5 transition-transform">
                <FiPhoneCall className="text-brand-600" /> 8825198919
              </a>
            </div>
          </aside>
        </div>
      </section>

      <Footer />
    </div>
  );
}
