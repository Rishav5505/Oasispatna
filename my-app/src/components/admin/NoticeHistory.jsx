import React, { useCallback, useEffect, useState } from 'react';
import { FiEdit2, FiRefreshCw, FiVolume2, FiClock } from 'react-icons/fi';
import { api, toastError, toastSuccess } from './adminApi';
import { ConfirmDelete, EmptyState, SkeletonBlock, Pagination, Badge, iconBtn } from './AdminUI';
import usePagination from './usePagination';

const ROLES = ['student', 'parent', 'teacher'];

const NoticeHistory = ({ reloadKey }) => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ title: '', content: '', targetRoles: [] });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.get('/notices/all');
      setNotices([...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (err) {
      toastError(err, 'Failed to load notices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, reloadKey]);

  const pg = usePagination(notices, 10);

  const startEdit = (n) => {
    setEditingId(n._id);
    setDraft({ title: n.title, content: n.content, targetRoles: n.targetRoles || [] });
  };

  const save = async () => {
    if (!draft.title.trim() || !draft.content.trim() || draft.targetRoles.length === 0) {
      toastError({ message: 'title, message and at least one audience are required' }, 'Cannot save notice');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.put(`/notices/${editingId}`, draft);
      setNotices(prev => prev.map(n => (n._id === editingId ? { ...n, ...draft, ...(updated && updated._id ? updated : {}) } : n)));
      setEditingId(null);
      toastSuccess('Notice updated');
    } catch (err) {
      toastError(err, 'Failed to update notice');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.del(`/notices/${id}`);
      setNotices(prev => prev.filter(n => n._id !== id));
      toastSuccess('Notice deleted');
    } catch (err) {
      toastError(err, 'Failed to delete notice');
    }
  };

  return (
    <div className="ui-card overflow-hidden">
      <div className="flex items-center justify-between px-5 md:px-6 py-5">
        <div>
          <h3 className="font-extrabold text-gray-900 dark:text-white">Past notices</h3>
          <p className="text-xs text-gray-500">{notices.length} published</p>
        </div>
        <button onClick={load} className={iconBtn} title="Refresh" aria-label="Refresh notices"><FiRefreshCw className={loading ? 'animate-spin' : ''} /></button>
      </div>
      <div className="px-5 md:px-6 pb-6 space-y-3 ui-stagger">
        {loading && notices.length === 0 ? (
          [0, 1, 2].map(i => <SkeletonBlock key={i} className="h-24 !rounded-2xl" />)
        ) : notices.length === 0 ? (
          <EmptyState icon={FiVolume2} title="No notices published yet" hint="Compose a broadcast above to reach students, parents and teachers." />
        ) : pg.pageItems.map(n => (
          <div key={n._id} className={`relative p-5 pl-6 rounded-2xl ring-1 transition-all before:absolute before:left-0 before:top-5 before:bottom-5 before:w-1 before:rounded-r-full before:bg-brand-gradient ${editingId === n._id ? 'ring-brand-200 bg-brand-50/40 dark:bg-white/5' : 'ring-gray-100 dark:ring-white/5 hover:ring-brand-200 hover:shadow-card'}`}>
            {editingId === n._id ? (
              <div className="space-y-3">
                <input
                  className="ui-input font-bold"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                />
                <textarea
                  rows="4"
                  className="ui-input resize-none"
                  value={draft.content}
                  onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    {ROLES.map(r => {
                      const on = draft.targetRoles.includes(r);
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setDraft({ ...draft, targetRoles: on ? draft.targetRoles.filter(x => x !== r) : [...draft.targetRoles, r] })}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${on ? 'bg-brand-gradient text-white shadow-brand-soft' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
                        >
                          {r}s
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="ui-btn-secondary">Cancel</button>
                    <button disabled={saving} onClick={save} className="ui-btn-primary">{saving ? 'Saving…' : 'Save'}</button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 dark:text-white break-words">{n.title}</h4>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5"><FiClock />
                      {new Date(n.createdAt).toLocaleString()}{n.createdBy?.name ? ` • ${n.createdBy.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(n)} className={iconBtn} title="Edit" aria-label="Edit notice"><FiEdit2 /></button>
                    <ConfirmDelete compact onConfirm={() => remove(n._id)} />
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-line break-words leading-relaxed">{n.content}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {(n.targetRoles || []).map(r => (
                    <Badge key={r} tone="gray">{r}s</Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <Pagination {...pg} label="notices" />
    </div>
  );
};

export default NoticeHistory;
