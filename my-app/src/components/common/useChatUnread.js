/**
 * useChatUnread({ socket?, intervalMs? }) -> { count, refresh }
 *   const { count } = useChatUnread();          // polls GET /chat/unread-count (default every 45s)
 *   const { count } = useChatUnread({ socket }); // also bumps instantly on socket 'chat:message'
 * Also refreshes when ChatPanel dispatches the window event 'oasis:chat-unread' (after reading/receiving).
 */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API, authHeaders, getToken } from './api';

export const CHAT_UNREAD_EVENT = 'oasis:chat-unread';

// Lets ChatPanel tell every badge to re-check the unread count.
export const notifyChatUnreadChanged = () => {
  try { window.dispatchEvent(new Event(CHAT_UNREAD_EVENT)); } catch { /* ignore */ }
};

export function useChatUnread({ socket, intervalMs = 45000 } = {}) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const { data } = await axios.get(`${API}/chat/unread-count`, { headers: authHeaders() });
      setCount(Number(data?.count) || 0);
    } catch { /* keep last value */ }
  }, []);

  useEffect(() => {
    const first = setTimeout(refresh, 0);
    const id = setInterval(refresh, intervalMs);
    const onEvt = () => refresh();
    window.addEventListener(CHAT_UNREAD_EVENT, onEvt);
    window.addEventListener('focus', onEvt);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      window.removeEventListener(CHAT_UNREAD_EVENT, onEvt);
      window.removeEventListener('focus', onEvt);
    };
  }, [refresh, intervalMs]);

  useEffect(() => {
    if (!socket) return undefined;
    const onMsg = () => refresh();
    socket.on('chat:message', onMsg);
    return () => socket.off('chat:message', onMsg);
  }, [socket, refresh]);

  return { count, refresh };
}

export default useChatUnread;
