/**
 * ChatPanel — full parent ↔ teacher (↔ admin) chat UI backed by /api/chat.
 *   import ChatPanel from '../components/common/ChatPanel';
 *   <ChatPanel />                               // opens its own socket with the session token
 *   <ChatPanel socket={socket} />               // reuse the dashboard's socket.io connection
 *   <ChatPanel initialUserId={teacherUserId} /> // jump straight into a chat with that user
 *   <ChatPanel className="h-[calc(100dvh-10rem)]" />  // override height (default ~70vh, min 460px)
 * Desktop: conversations list + thread side by side. Mobile: list, tap → thread with back button.
 * Features: contacts picker (GET /chat/contacts) to start a chat, optimistic send, image/PDF
 * attachments (multipart 'attachment', ≤10 MB), live updates via socket 'chat:message',
 * read receipts (POST /chat/conversations/:id/read; "Seen" when message.readAt is set).
 * Nav badges: see ChatBadge.jsx / useChatUnread.js.
 */
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import {
  FiSend, FiPaperclip, FiArrowLeft, FiPlus, FiSearch, FiX, FiMessageSquare, FiFileText, FiCheck, FiAlertCircle, FiRefreshCw, FiUsers,
} from 'react-icons/fi';
import { AuthContext } from '../../contexts/AuthContext';
import { API, SOCKET_URL, authHeaders, getToken, errMsg, resolveUrl, isPdfUrl } from './api';
import { useI18n } from '../../i18n/useI18n';
import { notifyChatUnreadChanged } from './useChatUnread';

const PAGE = 30;
const MAX_FILE = 10 * 1024 * 1024;
const idOf = (x) => String(x?._id ?? x?.id ?? x?.userId ?? x ?? '');
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

const Avatar = ({ name, size = 'w-10 h-10', className = '' }) => (
  <span className={`${size} shrink-0 rounded-full bg-brand-gradient text-white font-extrabold text-sm flex items-center justify-center shadow-brand-soft ${className}`}>
    {initials(name)}
  </span>
);

const ROLE_BADGE = {
  teacher: 'bg-ink-900 text-white dark:bg-white/15',
  parent: 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  admin: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  staff: 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300',
};

export function ChatPanel({ socket: externalSocket, initialUserId, className = '' }) {
  const { t, lang } = useI18n();
  const locale = lang === 'hi' ? 'hi-IN' : 'en-IN';
  const { user } = useContext(AuthContext) || {};
  const myId = String(user?.id || user?._id || '');

  const [conversations, setConversations] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState(null);
  const [contactQuery, setContactQuery] = useState('');
  const [listQuery, setListQuery] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [ownSocket, setOwnSocket] = useState(null);

  const socket = externalSocket || ownSocket;
  const activeRef = useRef(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const stickBottom = useRef(true);
  const openedInitial = useRef(false);

  const convsRef = useRef(null);
  useEffect(() => { activeRef.current = activeId; }, [activeId]);
  useEffect(() => { convsRef.current = conversations; }, [conversations]);

  // ---- data loading ----
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/chat/conversations`, { headers: authHeaders() });
      setConversations(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      setConversations([]);
      toast.error(errMsg(err, t('common.error')));
      return [];
    }
  }, [t]);

  const loadContacts = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/chat/contacts`, { headers: authHeaders() });
      setContacts(Array.isArray(data) ? data : []);
    } catch (err) {
      setContacts([]);
      toast.error(errMsg(err, t('common.error')));
    }
  }, [t]);

  const markRead = useCallback(async (convId) => {
    if (!convId) return;
    setConversations((list) => (list || []).map((c) => (idOf(c) === convId ? { ...c, unread: 0 } : c)));
    try {
      await axios.post(`${API}/chat/conversations/${convId}/read`, {}, { headers: authHeaders() });
    } catch { /* non-fatal */ }
    notifyChatUnreadChanged();
  }, []);

  const loadMessages = useCallback(async (convId, before) => {
    setLoadingMsgs(true);
    try {
      const { data } = await axios.get(`${API}/chat/conversations/${convId}/messages`, {
        headers: authHeaders(),
        params: { limit: PAGE, ...(before ? { before } : {}) },
      });
      const list = Array.isArray(data) ? data : data?.messages || [];
      const sorted = [...list].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      if (activeRef.current !== convId) return;
      setHasMore(list.length >= PAGE);
      if (before) {
        const el = scrollRef.current;
        const prevHeight = el?.scrollHeight || 0;
        stickBottom.current = false;
        setMessages((cur) => [...sorted.filter((m) => !cur.some((c) => idOf(c) === idOf(m))), ...cur]);
        requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; });
      } else {
        stickBottom.current = true;
        setMessages(sorted);
      }
    } catch (err) {
      toast.error(errMsg(err, t('common.error')));
    } finally {
      setLoadingMsgs(false);
    }
  }, [t]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const openConversation = useCallback((convId) => {
    activeRef.current = convId;
    setActiveId(convId);
    setMessages([]);
    setHasMore(false);
    setShowContacts(false);
    loadMessages(convId);
    markRead(convId);
  }, [loadMessages, markRead]);

  const startWith = useCallback(async (userId, fallback) => {
    try {
      const { data } = await axios.post(`${API}/chat/conversations`, { userId }, { headers: authHeaders() });
      const conv = data?.conversation || data;
      const convId = idOf(conv);
      const list = await loadConversations();
      if (!list.some((c) => idOf(c) === convId)) {
        setConversations((cur) => [{ _id: convId, other: conv.other || fallback || { userId }, lastMessage: '', unread: 0 }, ...(cur || [])]);
      }
      openConversation(convId);
    } catch (err) {
      toast.error(errMsg(err, t('common.error')));
    }
  }, [loadConversations, openConversation, t]);

  // Deep-link: open a chat with `initialUserId` once.
  useEffect(() => {
    if (!initialUserId || openedInitial.current || conversations === null) return;
    openedInitial.current = true;
    const existing = conversations.find((c) => idOf(c.other?.userId ?? c.other) === String(initialUserId));
    if (existing) openConversation(idOf(existing));
    else startWith(initialUserId);
  }, [initialUserId, conversations, openConversation, startWith]);

  // ---- socket ----
  useEffect(() => {
    if (externalSocket) return undefined;
    const token = getToken();
    if (!token) return undefined;
    const s = io(SOCKET_URL, { auth: { token } });
    s.on('connect', () => s.emit('join', token));
    setOwnSocket(s);
    return () => { s.disconnect(); setOwnSocket(null); };
  }, [externalSocket]);

  useEffect(() => {
    if (!socket) return undefined;
    const onMessage = (payload) => {
      const convId = String(payload?.conversationId || payload?.message?.conversationId || '');
      const msg = payload?.message;
      if (!convId || !msg) return;
      if (activeRef.current === convId) {
        stickBottom.current = true;
        setMessages((cur) => (cur.some((m) => idOf(m) === idOf(msg)) ? cur : [...cur, msg]));
        markRead(convId);
      }
      const known = (convsRef.current || []).some((c) => idOf(c) === convId);
      setConversations((list) => {
        const arr = list || [];
        const updated = arr.map((c) => (idOf(c) === convId ? {
          ...c,
          lastMessage: msg.text || t('chat.attachment'),
          lastMessageAt: msg.createdAt || new Date().toISOString(),
          unread: activeRef.current === convId ? 0 : (Number(c.unread) || 0) + 1,
        } : c));
        return updated.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
      });
      if (!known) loadConversations();
      notifyChatUnreadChanged();
    };
    const onRead = (payload) => {
      const convId = String(payload?.conversationId || '');
      if (convId && activeRef.current === convId) {
        const at = payload.readAt || new Date().toISOString();
        setMessages((cur) => cur.map((m) => (String(m.senderId?._id ?? m.senderId) === myId && !m.readAt ? { ...m, readAt: at } : m)));
      }
    };
    socket.on('chat:message', onMessage);
    socket.on('chat:read', onRead);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:read', onRead);
    };
  }, [socket, markRead, loadConversations, myId, t]);

  // Keep the thread pinned to the bottom when new messages arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Object URL for image previews.
  useEffect(() => {
    if (!file || !file.type.startsWith('image/')) { setFilePreview(''); return undefined; }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // ---- sending ----
  const pickFile = (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!(f.type.startsWith('image/') || f.type === 'application/pdf')) { toast.error(t('chat.attach')); return; }
    if (f.size > MAX_FILE) { toast.error(t('chat.fileTooBig')); return; }
    setFile(f);
  };

  const deliver = async (convId, tempId, body, attachment) => {
    try {
      let res;
      if (attachment) {
        const fd = new FormData();
        fd.append('text', body);
        fd.append('attachment', attachment);
        res = await axios.post(`${API}/chat/conversations/${convId}/messages`, fd, { headers: authHeaders() });
      } else {
        res = await axios.post(`${API}/chat/conversations/${convId}/messages`, { text: body }, { headers: authHeaders() });
      }
      const saved = res.data?.message || res.data;
      if (activeRef.current === convId) {
        setMessages((cur) => {
          if (cur.some((m) => idOf(m) === idOf(saved))) return cur.filter((m) => m._tempId !== tempId);
          return cur.map((m) => (m._tempId === tempId ? saved : m));
        });
      }
      setConversations((list) => (list || []).map((c) => (idOf(c) === convId
        ? { ...c, lastMessage: saved.text || t('chat.attachment'), lastMessageAt: saved.createdAt || new Date().toISOString() }
        : c)).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)));
    } catch (err) {
      setMessages((cur) => cur.map((m) => (m._tempId === tempId ? { ...m, _status: 'failed' } : m)));
      toast.error(errMsg(err, t('chat.failed')));
    }
  };

  const send = (e) => {
    e?.preventDefault();
    const body = text.trim();
    if ((!body && !file) || !activeId) return;
    const tempId = `tmp-${Date.now()}`;
    const optimistic = {
      _tempId: tempId,
      _status: 'sending',
      _file: file,
      senderId: myId,
      text: body,
      attachmentUrl: file ? (filePreview || file.name) : undefined,
      _isPdf: file?.type === 'application/pdf',
      createdAt: new Date().toISOString(),
    };
    stickBottom.current = true;
    setMessages((cur) => [...cur, optimistic]);
    setText('');
    const f = file;
    setFile(null);
    deliver(activeId, tempId, body, f);
  };

  const retry = (m) => {
    setMessages((cur) => cur.map((x) => (x._tempId === m._tempId ? { ...x, _status: 'sending' } : x)));
    deliver(activeId, m._tempId, m.text || '', m._file);
  };

  // ---- derived ----
  const active = useMemo(() => (conversations || []).find((c) => idOf(c) === activeId), [conversations, activeId]);
  const filteredConvs = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return (conversations || []).filter((c) => !q || (c.other?.name || '').toLowerCase().includes(q));
  }, [conversations, listQuery]);
  const filteredContacts = useMemo(() => {
    const q = contactQuery.trim().toLowerCase();
    return (contacts || []).filter((c) => !q || `${c.name} ${c.subtitle || ''}`.toLowerCase().includes(q));
  }, [contacts, contactQuery]);

  const lastMineIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (String(messages[i].senderId?._id ?? messages[i].senderId) === myId) return i;
    }
    return -1;
  }, [messages, myId]);

  const timeLabel = (d) => {
    if (!d) return '';
    const x = new Date(d);
    const now = new Date();
    if (x.toDateString() === now.toDateString()) return x.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    return x.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };
  const dayLabel = (d) => new Date(d).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  const openContacts = () => {
    setShowContacts(true);
    setContactQuery('');
    if (contacts === null) loadContacts();
  };

  // ---- render ----
  const listPane = (
    <div className={`${activeId ? 'hidden md:flex' : 'flex'} flex-col min-h-0 border-r border-gray-100 dark:border-white/5`}>
      <div className="p-4 pb-3 space-y-3 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white">{showContacts ? t('chat.newChat') : t('chat.title')}</h3>
          {showContacts ? (
            <button type="button" onClick={() => setShowContacts(false)} aria-label={t('common.close')} className="w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-brand-600"><FiX /></button>
          ) : (
            <button type="button" onClick={openContacts} className="ui-btn-primary !px-3 !py-2 !text-xs"><FiPlus /> {t('chat.newChat')}</button>
          )}
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          {showContacts ? (
            <input value={contactQuery} onChange={(e) => setContactQuery(e.target.value)} placeholder={t('chat.searchContacts')} aria-label={t('chat.searchContacts')} className="ui-input !py-2.5 pl-10" autoFocus />
          ) : (
            <input value={listQuery} onChange={(e) => setListQuery(e.target.value)} placeholder={t('common.search')} aria-label={t('common.search')} className="ui-input !py-2.5 pl-10" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto ui-scrollbar p-2">
        {showContacts ? (
          contacts === null ? (
            <div className="space-y-2 p-2">{[0, 1, 2, 3].map((i) => <div key={i} className="ui-skeleton h-14" />)}</div>
          ) : filteredContacts.length === 0 ? (
            <EmptyState icon={FiUsers} text={t('chat.noContacts')} />
          ) : (
            <ul className="space-y-1 animate-fade-in">
              {filteredContacts.map((c) => (
                <li key={idOf(c.userId ?? c)}>
                  <button type="button" onClick={() => startWith(idOf(c.userId ?? c), c)} className="w-full flex items-center gap-3 p-2.5 rounded-2xl text-left hover:bg-brand-50/60 dark:hover:bg-white/5 transition-colors">
                    <Avatar name={c.name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{c.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{c.subtitle || c.role}</p>
                    </div>
                    {c.role && <span className={`ui-badge !text-[10px] ${ROLE_BADGE[c.role] || ROLE_BADGE.staff}`}>{c.role}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : conversations === null ? (
          <div className="space-y-2 p-2">{[0, 1, 2, 3].map((i) => <div key={i} className="ui-skeleton h-14" />)}</div>
        ) : filteredConvs.length === 0 ? (
          <EmptyState icon={FiMessageSquare} text={t('chat.noConversations')} action={<button type="button" onClick={openContacts} className="ui-btn-primary"><FiPlus /> {t('chat.newChat')}</button>} />
        ) : (
          <ul className="space-y-1">
            {filteredConvs.map((c) => {
              const id = idOf(c);
              const isActive = id === activeId;
              const unread = Number(c.unread) || 0;
              return (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => openConversation(id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-2xl text-left transition-colors ${isActive ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                  >
                    <Avatar name={c.other?.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${unread ? 'font-extrabold text-gray-900 dark:text-white' : 'font-bold text-gray-800 dark:text-gray-200'}`}>{c.other?.name || '—'}</p>
                        <span className={`text-[11px] shrink-0 ${unread ? 'text-brand-600 font-bold' : 'text-gray-400'}`}>{timeLabel(c.lastMessageAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${unread ? 'text-gray-700 dark:text-gray-200 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}>{c.lastMessage || (c.other?.role || '')}</p>
                        {unread > 0 && <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-brand-gradient text-white text-[10px] font-extrabold flex items-center justify-center">{unread > 99 ? '99+' : unread}</span>}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  let lastDay = '';
  const threadPane = (
    <div className={`${activeId ? 'flex' : 'hidden md:flex'} flex-col min-h-0 min-w-0 bg-gray-50/60 dark:bg-ink-950/40`}>
      {!activeId ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <EmptyState icon={FiMessageSquare} text={t('chat.startHint')} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 px-3 sm:px-5 py-3 border-b border-gray-100 dark:border-white/5 bg-white dark:bg-ink-900">
            <button type="button" onClick={() => setActiveId(null)} aria-label={t('common.back')} className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"><FiArrowLeft /></button>
            <Avatar name={active?.other?.name} size="w-9 h-9" />
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-gray-900 dark:text-white truncate">{active?.other?.name || '—'}</p>
              {active?.other?.role && <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{active.other.role}</p>}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto ui-scrollbar px-3 sm:px-5 py-4 space-y-1.5">
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button type="button" disabled={loadingMsgs} onClick={() => loadMessages(activeId, messages.find((m) => !m._tempId)?.createdAt)} className="text-xs font-bold text-brand-600 px-3 py-1.5 rounded-full bg-white dark:bg-ink-900 border border-gray-200 dark:border-white/10 hover:border-brand-300">
                  {loadingMsgs ? t('common.loading') : t('chat.loadOlder')}
                </button>
              </div>
            )}
            {loadingMsgs && messages.length === 0 && (
              <div className="space-y-3">
                <div className="ui-skeleton h-10 w-2/3" />
                <div className="ui-skeleton h-10 w-1/2 ml-auto" />
                <div className="ui-skeleton h-10 w-3/5" />
              </div>
            )}
            {messages.map((m, i) => {
              const mine = String(m.senderId?._id ?? m.senderId) === myId;
              const day = m.createdAt ? new Date(m.createdAt).toDateString() : '';
              const showDay = day && day !== lastDay;
              lastDay = day || lastDay;
              const url = m.attachmentUrl ? (m._tempId ? m.attachmentUrl : resolveUrl(m.attachmentUrl)) : '';
              const pdf = m._isPdf || isPdfUrl(m.attachmentUrl);
              return (
                <React.Fragment key={m._tempId || idOf(m) || i}>
                  {showDay && (
                    <div className="flex justify-center py-2">
                      <span className="text-[11px] font-bold text-gray-500 bg-white dark:bg-ink-900 border border-gray-100 dark:border-white/5 rounded-full px-3 py-1">{dayLabel(m.createdAt)}</span>
                    </div>
                  )}
                  <div className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-fade-up`}>
                    <div className={`max-w-[82%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-sm ${
                      mine ? 'bg-brand-gradient text-white rounded-br-md' : 'bg-white dark:bg-ink-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/5 rounded-bl-md'
                    } ${m._status === 'failed' ? 'opacity-70' : ''}`}>
                      {url && (pdf ? (
                        <a href={m._tempId ? undefined : url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 mb-1 px-3 py-2 rounded-xl text-xs font-bold ${mine ? 'bg-white/15' : 'bg-gray-50 dark:bg-white/5 text-brand-600'}`}>
                          <FiFileText className="w-4 h-4 shrink-0" /> <span className="truncate">{m._file?.name || 'PDF'}</span>
                        </a>
                      ) : (
                        <a href={m._tempId ? undefined : url} target="_blank" rel="noopener noreferrer" className="block mb-1">
                          <img src={url} alt={t('chat.attachment')} className="rounded-xl max-h-60 w-auto object-cover" loading="lazy" />
                        </a>
                      ))}
                      {m.text && <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>}
                      <div className={`flex items-center justify-end gap-1 mt-0.5 text-[10px] ${mine ? 'text-white/80' : 'text-gray-400'}`}>
                        <span>{m.createdAt ? new Date(m.createdAt).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' }) : ''}</span>
                        {mine && m._status === 'sending' && <span>· {t('chat.sending')}</span>}
                        {mine && !m._status && i === lastMineIdx && (
                          <span className="inline-flex items-center gap-0.5">· <FiCheck className="w-3 h-3" />{m.readAt && <FiCheck className="w-3 h-3 -ml-2" />} {m.readAt ? t('chat.seen') : t('chat.sent')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {mine && m._status === 'failed' && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => retry(m)} className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:underline">
                        <FiAlertCircle /> {t('chat.failed')} · <FiRefreshCw className="w-3 h-3" /> {t('common.retry')}
                      </button>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <form onSubmit={send} className="border-t border-gray-100 dark:border-white/5 bg-white dark:bg-ink-900 p-2.5 sm:p-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
            {file && (
              <div className="flex items-center gap-3 mb-2 p-2 rounded-2xl bg-gray-50 dark:bg-white/5 animate-fade-up">
                {filePreview ? <img src={filePreview} alt="" className="w-12 h-12 rounded-xl object-cover" /> : <span className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><FiFileText className="w-5 h-5" /></span>}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{file.name}</p>
                  <p className="text-[11px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={() => setFile(null)} aria-label={t('common.delete')} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-600 hover:bg-red-50"><FiX /></button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={pickFile} />
              <button type="button" onClick={() => fileRef.current?.click()} aria-label={t('chat.attach')} title={t('chat.attach')} className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:text-brand-600 transition-colors">
                <FiPaperclip />
              </button>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                maxLength={2000}
                placeholder={t('chat.placeholder')}
                aria-label={t('chat.placeholder')}
                className="ui-input !py-3 resize-none max-h-32 min-h-[44px]"
              />
              <button type="submit" disabled={!text.trim() && !file} aria-label={t('chat.send')} className="ui-btn-primary !w-11 !h-11 !p-0 shrink-0 !rounded-xl">
                <FiSend />
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );

  return (
    <div className={`ui-card overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] h-[70vh] min-h-[460px] ${className}`}>
      {listPane}
      {threadPane}
    </div>
  );
}

function EmptyState({ icon, text, action }) {
  const Icon = icon;
  return (
    <div className="py-10 px-4 flex flex-col items-center text-center gap-3">
      <span className="w-14 h-14 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center"><Icon className="w-6 h-6" /></span>
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{text}</p>
      {action}
    </div>
  );
}

export default ChatPanel;
