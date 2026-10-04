import React, { useEffect, useState, useCallback } from 'react';
import { FiCheckCircle, FiXCircle, FiBell, FiSearch, FiRefreshCw, FiFileText, FiAlertTriangle } from 'react-icons/fi';
import { api, toastError, toastSuccess, formatINR } from './adminApi';
import { Pagination, SkeletonRows, EmptyRow, Avatar, Badge, ProgressBar, tableScroll, theadRow, thCls, tdCls, rowCls, tbodyCls, iconBtn } from './AdminUI';
import usePagination from './usePagination';

const PendingApprovals = ({ onChanged }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // fee id with open reason box
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get('/fees/pending'));
    } catch (err) {
      toastError(err, 'Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/fees/${id}/approve`);
      toastSuccess('Payment approved — receipt emailed');
      setItems(prev => prev.filter(p => p._id !== id));
      onChanged?.();
    } catch (err) {
      toastError(err, 'Failed to approve payment');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/fees/${id}/reject`, { reason: reason.trim() || undefined });
      toastSuccess('Payment rejected and student notified');
      setItems(prev => prev.filter(p => p._id !== id));
      setRejecting(null);
      setReason('');
      onChanged?.();
    } catch (err) {
      toastError(err, 'Failed to reject payment');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ui-card overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 md:px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft"><FiFileText /></div>
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
              Pending approvals
              {items.length > 0 && <Badge tone="brand" dot pulse>{items.length} waiting</Badge>}
            </h3>
            <p className="text-xs text-gray-500">Manual payments submitted by parents/students</p>
          </div>
        </div>
        <button onClick={load} className={iconBtn} title="Refresh" aria-label="Refresh pending approvals"><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
      </div>
      <div className={`${tableScroll} max-h-[28rem]`}>
        <table className="w-full text-left min-w-[760px]">
          <thead>
            <tr className={theadRow}>
              <th className={thCls}>Student</th>
              <th className={thCls}>Submitted</th>
              <th className={thCls}>Amount</th>
              <th className={thCls}>Mode / Txn ID</th>
              <th className={`${thCls} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {loading ? <SkeletonRows rows={3} cols={5} /> : items.length === 0 ? (
              <EmptyRow colSpan={5} icon={FiCheckCircle} title="No payments awaiting approval" hint="You're all caught up." />
            ) : items.map(p => (
              <React.Fragment key={p._id}>
                <tr className={rowCls}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-3">
                      <Avatar name={p.student?.name || '?'} size="md" />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{p.student?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{p.student?.className || 'Class N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`${tdCls} text-xs font-medium text-gray-500`}>{new Date(p.createdAt).toLocaleString()}</td>
                  <td className={`${tdCls} font-extrabold text-gray-900 dark:text-white`}>{formatINR(p.amount)}</td>
                  <td className={tdCls}>
                    <Badge tone="gray">{p.mode || '—'}</Badge>
                    <p className="text-[11px] font-mono text-gray-400 break-all mt-1">{p.transactionId || '—'}</p>
                  </td>
                  <td className={tdCls}>
                    <div className="flex justify-end gap-2">
                      <button
                        disabled={busyId === p._id}
                        onClick={() => approve(p._id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:text-emerald-300 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                      >
                        <FiCheckCircle /> Approve
                      </button>
                      <button
                        disabled={busyId === p._id}
                        onClick={() => { setRejecting(rejecting === p._id ? null : p._id); setReason(''); }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-500/10 dark:text-red-300 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                      >
                        <FiXCircle /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
                {rejecting === p._id && (
                  <tr className="bg-red-50/50 dark:bg-red-500/5 animate-fade-in">
                    <td colSpan={5} className="px-5 py-4">
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          autoFocus
                          type="text"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Reason for rejection (optional, shared with the payer)"
                          className="ui-input flex-1"
                        />
                        <button disabled={busyId === p._id} onClick={() => reject(p._id)} className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 active:scale-95">Confirm reject</button>
                        <button onClick={() => setRejecting(null)} className="ui-btn-secondary">Cancel</button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Defaulters = ({ reloadKey }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(null);
  const [reminded, setReminded] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.get('/fees/defaulters'));
    } catch (err) {
      toastError(err, 'Failed to load defaulters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter(d => [d.name, d.className, d.phone].some(v => (v || '').toLowerCase().includes(q)))
    : items;
  const pg = usePagination(filtered);
  const totalPending = filtered.reduce((a, d) => a + (d.pending || 0), 0);

  const remind = async (d) => {
    setSending(d.studentId);
    try {
      await api.post(`/fees/remind/${d.studentId}`);
      setReminded(prev => ({ ...prev, [d.studentId]: true }));
      toastSuccess(`Reminder sent to ${d.name}`);
    } catch (err) {
      toastError(err, 'Failed to send reminder');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="ui-card overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 md:px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 flex items-center justify-center"><FiAlertTriangle /></div>
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white">Fee defaulters</h3>
            <p className="text-xs text-gray-500">
              {filtered.length} students · <span className="font-bold text-red-600">{formatINR(totalPending)}</span> outstanding
            </p>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search name, class, phone…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); pg.setPage(1); }}
              className="ui-input !pl-10"
              aria-label="Search defaulters"
            />
          </div>
          <button onClick={load} className={iconBtn} title="Refresh" aria-label="Refresh defaulters"><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>
      <div className={`${tableScroll} max-h-[36rem]`}>
        <table className="w-full text-left min-w-[860px]">
          <thead>
            <tr className={theadRow}>
              <th className={thCls}>Student</th>
              <th className={thCls}>Phone</th>
              <th className={thCls}>Paid / Total</th>
              <th className={thCls}>Pending</th>
              <th className={`${thCls} text-right`}>Action</th>
            </tr>
          </thead>
          <tbody className={tbodyCls}>
            {loading ? <SkeletonRows rows={4} cols={5} /> : pg.total === 0 ? (
              <EmptyRow colSpan={5} icon={FiCheckCircle} title={q ? 'No defaulters match your search' : 'No pending dues'} hint={q ? undefined : 'Every student is fully paid up.'} />
            ) : pg.pageItems.map(d => {
              const pct = d.totalFee > 0 ? Math.round(((d.paid || 0) / d.totalFee) * 100) : 0;
              return (
                <tr key={d.studentId} className={rowCls}>
                  <td className={tdCls}>
                    <div className="flex items-center gap-3">
                      <Avatar name={d.name} size="md" />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{d.name}</p>
                        <p className="text-xs text-gray-500">{d.className || 'Class N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`${tdCls} text-sm font-medium text-gray-600 dark:text-gray-300`}>{d.phone || '—'}</td>
                  <td className={`${tdCls} min-w-[12rem]`}>
                    <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                      <span className="text-emerald-600">{formatINR(d.paid)}</span>
                      <span className="text-gray-400">of {formatINR(d.totalFee)}</span>
                    </div>
                    <ProgressBar value={pct} barClass="bg-emerald-500" />
                  </td>
                  <td className={tdCls}><Badge tone="red">{formatINR(d.pending)}</Badge></td>
                  <td className={`${tdCls} text-right`}>
                    <button
                      disabled={sending === d.studentId}
                      onClick={() => remind(d)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 disabled:opacity-50 ${reminded[d.studentId] ? 'bg-gray-100 text-gray-500 dark:bg-white/5' : 'bg-brand-50 text-brand-700 hover:bg-brand-600 hover:text-white dark:bg-brand-500/10 dark:text-brand-300'}`}
                    >
                      <FiBell /> {sending === d.studentId ? 'Sending…' : reminded[d.studentId] ? 'Sent — resend' : 'Send reminder'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination {...pg} label="defaulters" />
    </div>
  );
};

const FeeApprovals = ({ onChanged }) => {
  const [reloadKey, setReloadKey] = useState(0);
  const handleChanged = () => {
    setReloadKey(k => k + 1);
    onChanged?.();
  };
  return (
    <div className="space-y-6">
      <PendingApprovals onChanged={handleChanged} />
      <Defaulters reloadKey={reloadKey} />
    </div>
  );
};

export default FeeApprovals;
