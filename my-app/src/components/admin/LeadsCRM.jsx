import React, { useState } from 'react';
import { FiMail, FiPhone, FiSearch, FiRefreshCw, FiMessageSquare, FiChevronDown, FiChevronUp, FiCalendar, FiInbox, FiList, FiColumns, FiBookOpen } from 'react-icons/fi';
import { api, toastError, toastSuccess } from './adminApi';
import { ConfirmDelete, Pagination, SkeletonRows, EmptyRow, EmptyState, Avatar, PageHeader, tableScroll, theadRow, thCls, tdCls, tbodyCls } from './AdminUI';
import usePagination from './usePagination';

const LEAD_STATUSES = [
  { id: 'new', label: 'New', cls: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-300', dot: 'bg-brand-500' },
  { id: 'contacted', label: 'Contacted', cls: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300', dot: 'bg-amber-500' },
  { id: 'interested', label: 'Interested', cls: 'bg-ink-900 text-white ring-black/10 dark:bg-white/10', dot: 'bg-ink-900 dark:bg-white' },
  { id: 'admitted', label: 'Admitted', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300', dot: 'bg-emerald-500' },
  { id: 'not_interested', label: 'Not interested', cls: 'bg-gray-100 text-gray-500 ring-gray-200 dark:bg-white/5 dark:text-gray-400', dot: 'bg-gray-400' },
];
const statusMeta = (id) => LEAD_STATUSES.find(s => s.id === (id || 'new')) || LEAD_STATUSES[0];

const toDateInput = (d) => (d ? new Date(d).toISOString().split('T')[0] : '');
const isOverdue = (d) => d && new Date(d) < new Date(new Date().toDateString());

const StatusSelect = ({ lead, busy, onChange }) => {
  const meta = statusMeta(lead.status);
  return (
    <div className="relative inline-flex">
      <select
        value={lead.status || 'new'}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Status for ${lead.name}`}
        className={`appearance-none pl-6 pr-7 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide ring-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60 ${meta.cls}`}
      >
        {LEAD_STATUSES.map(s => <option key={s.id} value={s.id} className="text-gray-900 bg-white">{s.label}</option>)}
      </select>
      <span className={`pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${meta.dot} ${(lead.status || 'new') === 'new' ? 'animate-pulse' : ''}`} />
      <FiChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] opacity-60" />
    </div>
  );
};

const FollowUp = ({ lead, busy, onChange }) => {
  const overdue = isOverdue(lead.followUpDate);
  return (
    <label className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl ring-1 text-xs font-semibold ${overdue ? 'ring-red-200 bg-red-50 text-red-600 dark:bg-red-500/10' : 'ring-gray-200 dark:ring-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300'}`}>
      <FiCalendar className={overdue ? 'text-red-500' : 'text-gray-400'} />
      <input
        type="date"
        value={toDateInput(lead.followUpDate)}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`Follow-up date for ${lead.name}`}
        className="bg-transparent focus:outline-none w-[7.5rem]"
      />
    </label>
  );
};

const LeadDetail = ({ lead, noteDraft, setNoteDraft, busy, onAddNote, compact }) => {
  const notes = lead.notes || [];
  return (
    <div className={`grid grid-cols-1 ${compact ? '' : 'lg:grid-cols-2'} gap-5 animate-fade-in`}>
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Enquiry message</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 italic leading-relaxed">{lead.message || 'No message provided.'}</p>
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Notes</p>
        <div className="space-y-2 max-h-48 overflow-y-auto ui-scrollbar mb-3">
          {notes.length === 0 && <p className="text-xs text-gray-400">No notes yet.</p>}
          {[...notes].reverse().map((n, i) => (
            <div key={n._id || i} className="p-3 bg-white dark:bg-ink-800 rounded-xl ring-1 ring-gray-100 dark:ring-white/5">
              <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{n.text}</p>
              <p className="text-[11px] text-gray-400 font-medium mt-1">
                {n.at ? new Date(n.at).toLocaleString() : ''}{n.by?.name ? ` · ${n.by.name}` : ''}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') onAddNote(); }}
            placeholder="e.g. Called, will visit on Saturday"
            className="ui-input !py-2.5"
            aria-label="New note"
          />
          <button disabled={!noteDraft.trim() || busy} onClick={onAddNote} className="ui-btn-primary shrink-0">Add</button>
        </div>
      </div>
    </div>
  );
};

const LeadsCRM = ({ leads, setLeads, loading, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [view, setView] = useState('list');

  const counts = leads.reduce((acc, l) => { const k = l.status || 'new'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const q = search.trim().toLowerCase();
  const matchesSearch = (l) => !q || [l.name, l.email, l.phone, l.course].some(v => (v || '').toLowerCase().includes(q));
  const filtered = leads.filter(l => (statusFilter === 'all' || (l.status || 'new') === statusFilter) && matchesSearch(l));
  const pg = usePagination(filtered);

  const patch = async (lead, body, successMsg) => {
    setBusyId(lead._id);
    try {
      const updated = await api.patch(`/leads/${lead._id}`, body);
      setLeads(prev => prev.map(l => (l._id === lead._id ? { ...l, ...(updated && updated._id ? updated : body) } : l)));
      if (successMsg) toastSuccess(successMsg);
      return true;
    } catch (err) {
      toastError(err, 'Failed to update lead');
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const addNote = async (lead) => {
    const text = noteDraft.trim();
    if (!text) return;
    if (await patch(lead, { note: text }, 'Note saved')) setNoteDraft('');
  };

  const remove = async (id) => {
    try {
      await api.del(`/leads/${id}`);
      setLeads(prev => prev.filter(l => l._id !== id));
      toastSuccess('Lead deleted');
    } catch (err) {
      toastError(err, 'Failed to delete lead');
    }
  };

  const setStatus = (lead, v) => patch(lead, { status: v }, `Status updated to ${statusMeta(v).label}`);
  const setFollow = (lead, v) => patch(lead, { followUpDate: v || null }, v ? 'Follow-up date saved' : 'Follow-up cleared');
  const toggle = (id) => { setExpanded(expanded === id ? null : id); setNoteDraft(''); };
  const total = leads.length || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FiInbox}
        eyebrow="Engagement"
        title="Demo requests"
        subtitle="Track every enquiry from first contact to admission"
        actions={(
          <>
            <div className="relative sm:w-72">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, phone, course…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); pg.setPage(1); }}
                className="ui-input !pl-10"
                aria-label="Search leads"
              />
            </div>
            <div className="flex gap-2">
              <div className="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-white/5" role="tablist" aria-label="View">
                {[{ id: 'list', icon: FiList, label: 'List' }, { id: 'board', icon: FiColumns, label: 'Board' }].map(t => (
                  <button key={t.id} type="button" role="tab" aria-selected={view === t.id} onClick={() => setView(t.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view === t.id ? 'bg-white dark:bg-ink-800 text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
                    <t.icon /> {t.label}
                  </button>
                ))}
              </div>
              <button onClick={onRefresh} className="ui-btn-secondary !px-3" title="Refresh" aria-label="Refresh leads">
                <FiRefreshCw className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </>
        )}
      />

      {/* Pipeline strip — doubles as the status filter */}
      <div className="ui-card p-4">
        <div className="flex h-2 rounded-full overflow-hidden bg-gray-100 dark:bg-white/5 mb-4">
          {LEAD_STATUSES.map(s => (
            <div key={s.id} className={`${s.dot} transition-all duration-700`} style={{ width: `${((counts[s.id] || 0) / total) * 100}%` }} title={`${s.label}: ${counts[s.id] || 0}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[{ id: 'all', label: 'All', dot: 'bg-gray-300' }, ...LEAD_STATUSES].map(s => {
            const on = statusFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => { setStatusFilter(s.id); pg.setPage(1); if (view === 'board') setView('list'); }}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${on ? 'bg-ink-900 text-white shadow-card dark:bg-white dark:text-ink-900' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-700'}`}
              >
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                {s.label}
                <span className={`px-1.5 rounded-md ${on ? 'bg-white/20' : 'bg-white dark:bg-white/10 text-gray-500'}`}>{s.id === 'all' ? leads.length : (counts[s.id] || 0)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {view === 'board' ? (
        <div key="board" className="overflow-x-auto ui-scrollbar pb-2 animate-fade-up">
          <div className="grid grid-cols-5 gap-4 min-w-[1100px]">
            {LEAD_STATUSES.map(s => {
              const col = leads.filter(l => (l.status || 'new') === s.id && matchesSearch(l));
              return (
                <div key={s.id} className="rounded-3xl bg-gray-100/70 dark:bg-white/[0.03] p-2.5 flex flex-col min-h-[18rem]">
                  <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                    <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-200"><span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}</span>
                    <span className="text-xs font-bold text-gray-400">{col.length}</span>
                  </div>
                  <div className="space-y-2.5 flex-1">
                    {col.length === 0 && <p className="text-center text-xs text-gray-400 pt-8">No leads</p>}
                    {col.map(lead => (
                      <div key={lead._id} className="ui-card !rounded-2xl p-3.5 hover:shadow-card-hover hover:-translate-y-0.5">
                        <div className="flex items-start gap-2.5">
                          <Avatar name={lead.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{lead.name}</p>
                            <p className="text-[11px] text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</p>
                          </div>
                          <ConfirmDelete compact onConfirm={() => remove(lead._id)} />
                        </div>
                        <div className="mt-2.5 space-y-1 text-xs text-gray-600 dark:text-gray-300">
                          <p className="flex items-center gap-1.5 font-semibold"><FiBookOpen className="text-brand-500 shrink-0" />{lead.course || 'N/A'}{lead.batchTiming ? ` · ${lead.batchTiming}` : ''}</p>
                          <a href={`tel:${lead.phone}`} className="flex items-center gap-1.5 hover:text-brand-600"><FiPhone className="text-gray-400 shrink-0" />{lead.phone}</a>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StatusSelect lead={lead} busy={busyId === lead._id} onChange={(v) => setStatus(lead, v)} />
                          {lead.followUpDate && (
                            <span className={`ui-badge ${isOverdue(lead.followUpDate) ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500 dark:bg-white/5'}`}><FiCalendar />{new Date(lead.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          )}
                        </div>
                        <button type="button" onClick={() => toggle(lead._id)} className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-white/5">
                          <FiMessageSquare /> {(lead.notes || []).length} notes {expanded === lead._id ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                        {expanded === lead._id && (
                          <div className="mt-2 pt-3 border-t border-gray-100 dark:border-white/5">
                            <FollowUp lead={lead} busy={busyId === lead._id} onChange={(v) => setFollow(lead, v)} />
                            <div className="mt-3"><LeadDetail compact lead={lead} noteDraft={noteDraft} setNoteDraft={setNoteDraft} busy={busyId === lead._id} onAddNote={() => addNote(lead)} /></div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {leads.length === 0 && !loading && <EmptyState icon={FiInbox} title="No demo requests yet" hint="Enquiries from the website appear here in real time." />}
        </div>
      ) : (
        <div key="list" className="ui-card overflow-hidden animate-fade-up">
          <div className={`${tableScroll} max-h-[70vh]`}>
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className={theadRow}>
                  <th className={thCls}>Lead</th>
                  <th className={thCls}>Contact</th>
                  <th className={thCls}>Course / Batch</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Follow-up</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className={tbodyCls}>
                {loading && leads.length === 0 ? <SkeletonRows rows={5} cols={6} /> : pg.total === 0 ? (
                  <EmptyRow colSpan={6} icon={FiInbox} title={leads.length ? 'No leads match these filters' : 'No demo requests yet'} hint={leads.length ? undefined : 'Enquiries from the website appear here in real time.'} />
                ) : pg.pageItems.map(lead => {
                  const open = expanded === lead._id;
                  const notes = lead.notes || [];
                  return (
                    <React.Fragment key={lead._id}>
                      <tr className={`group transition-colors hover:bg-brand-50/40 dark:hover:bg-white/[0.03] ${open ? 'bg-brand-50/50 dark:bg-white/[0.03]' : ''}`}>
                        <td className={tdCls}>
                          <div className="flex items-center gap-3">
                            <Avatar name={lead.name} size="md" />
                            <div className="min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white text-sm truncate">{lead.name}</p>
                              <p className="text-[11px] text-gray-400">{new Date(lead.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className={`${tdCls} space-y-1`}>
                          <a href={`tel:${lead.phone}`} className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 hover:text-brand-600"><FiPhone className="text-brand-500" /> {lead.phone}</a>
                          <a href={`mailto:${lead.email}`} className="text-xs text-gray-500 flex items-center gap-2 hover:text-brand-600 break-all"><FiMail className="text-brand-500 shrink-0" /> {lead.email}</a>
                        </td>
                        <td className={tdCls}>
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{lead.course || 'N/A'}</p>
                          <p className="text-xs text-gray-500">{lead.batchTiming || 'Any time'}</p>
                        </td>
                        <td className={tdCls}><StatusSelect lead={lead} busy={busyId === lead._id} onChange={(v) => setStatus(lead, v)} /></td>
                        <td className={tdCls}><FollowUp lead={lead} busy={busyId === lead._id} onChange={(v) => setFollow(lead, v)} /></td>
                        <td className={tdCls}>
                          <div className="flex justify-end items-center gap-1.5">
                            <button
                              onClick={() => toggle(lead._id)}
                              aria-expanded={open}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition-all ${open ? 'bg-brand-600 text-white' : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-brand-50 hover:text-brand-600'}`}
                            >
                              <FiMessageSquare /> {notes.length || ''} Notes {open ? <FiChevronUp /> : <FiChevronDown />}
                            </button>
                            <ConfirmDelete compact onConfirm={() => remove(lead._id)} />
                          </div>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-brand-50/30 dark:bg-white/[0.02]">
                          <td colSpan={6} className="px-5 py-5">
                            <LeadDetail lead={lead} noteDraft={noteDraft} setNoteDraft={setNoteDraft} busy={busyId === lead._id} onAddNote={() => addNote(lead)} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination {...pg} label="leads" />
        </div>
      )}
    </div>
  );
};

export default LeadsCRM;
