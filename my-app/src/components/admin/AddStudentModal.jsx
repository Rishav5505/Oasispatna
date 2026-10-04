import React, { useEffect, useState } from 'react';
import { FaUserPlus } from 'react-icons/fa';
import { api, toastError, toastSuccess } from './adminApi';
import { Modal, inputCls, labelCls, primaryBtn } from './AdminUI';

const EMPTY = { name: '', email: '', phone: '', password: '', classId: '', batchId: '', fatherName: '', motherName: '', totalFee: '' };

const AddStudentModal = ({ onClose, onCreated }) => {
  const [form, setForm] = useState(EMPTY);
  const [classes, setClasses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/academics/classes').then(setClasses).catch(err => toastError(err, 'Failed to load classes'));
  }, []);

  useEffect(() => {
    if (!form.classId) return;
    let alive = true;
    api.get('/academics/batches', { classId: form.classId })
      .then(b => { if (alive) setBatches(b); })
      .catch(err => toastError(err, 'Failed to load batches'));
    return () => { alive = false; };
  }, [form.classId]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), classId: form.classId };
      ['password', 'batchId', 'fatherName', 'motherName'].forEach(k => { if (form[k]) body[k] = form[k]; });
      if (form.totalFee !== '') body.totalFee = Number(form.totalFee);
      const res = await api.post('/users/students', body);
      toastSuccess(`${form.name} added — login details emailed to the student`);
      onCreated?.(res);
      onClose();
    } catch (err) {
      toastError(err, 'Failed to add student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal icon={FaUserPlus} title="Add student" subtitle="Creates a student login and emails the credentials" onClose={onClose} maxWidth="max-w-2xl">
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelCls}>Full name *</label>
          <input required className={inputCls} value={form.name} onChange={set('name')} placeholder="Student name" />
        </div>
        <div>
          <label className={labelCls}>Email *</label>
          <input required type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="student@email.com" />
        </div>
        <div>
          <label className={labelCls}>Phone *</label>
          <input required type="tel" className={inputCls} value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" />
        </div>
        <div>
          <label className={labelCls}>Password (optional)</label>
          <input type="password" className={inputCls} value={form.password} onChange={set('password')} placeholder="Auto-generated if blank" />
        </div>
        <div>
          <label className={labelCls}>Class *</label>
          <select required className={inputCls} value={form.classId} onChange={(e) => { setForm(f => ({ ...f, classId: e.target.value, batchId: '' })); setBatches([]); }}>
            <option value="">Select class</option>
            {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Batch</label>
          <select className={inputCls} value={form.batchId} onChange={set('batchId')} disabled={!form.classId}>
            <option value="">{form.classId ? (batches.length ? 'Select batch' : 'No batches for this class') : 'Select a class first'}</option>
            {batches.map(b => <option key={b._id} value={b._id}>{b.name}{b.schedule ? ` (${b.schedule})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Father&apos;s name</label>
          <input className={inputCls} value={form.fatherName} onChange={set('fatherName')} />
        </div>
        <div>
          <label className={labelCls}>Mother&apos;s name</label>
          <input className={inputCls} value={form.motherName} onChange={set('motherName')} />
        </div>
        <div>
          <label className={labelCls}>Total course fee (₹)</label>
          <input type="number" min="0" className={inputCls} value={form.totalFee} onChange={set('totalFee')} placeholder="e.g. 50000" />
        </div>
        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="ui-btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className={primaryBtn}>
            <FaUserPlus /> {saving ? 'Creating…' : 'Create student'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddStudentModal;
