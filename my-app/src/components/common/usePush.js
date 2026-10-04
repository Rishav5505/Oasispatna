/**
 * usePush() — Web Push subscription state for the logged-in user.
 *   const { supported, secure, permission, subscribed, loading, enable, disable, sendTest } = usePush();
 *   - supported: browser has ServiceWorker + PushManager + Notification
 *   - secure: page is https or localhost (push only works there)
 *   - permission: 'default' | 'granted' | 'denied'
 *   - enable(): asks permission, subscribes with the VAPID key from GET /push/public-key,
 *               saves it via POST /push/subscribe. Resolves { ok, reason? } where reason is
 *               'unsupported' | 'insecure' | 'denied' | 'error'.
 *   - disable(): unsubscribes locally + POST /push/unsubscribe.
 *   - sendTest(): POST /push/test.
 * The service worker is the one registered by vite-plugin-pwa (it imports /push-sw.js).
 */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API, authHeaders } from './api';

const hasWindow = typeof window !== 'undefined';

export const isPushSupported = () =>
  hasWindow && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const isSecureForPush = () =>
  hasWindow && (window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname));

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
};

// Waits for the PWA service worker (registered by vite-plugin-pwa) with a timeout.
const getRegistration = async (timeoutMs = 10000) => {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker not ready')), timeoutMs)),
  ]);
};

export function usePush() {
  const supported = isPushSupported();
  const secure = isSecureForPush();
  const [permission, setPermission] = useState(supported ? Notification.permission : 'default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detect an existing subscription on mount.
  useEffect(() => {
    if (!supported || !secure) return undefined;
    let cancelled = false;
    navigator.serviceWorker.getRegistration()
      .then((reg) => (reg ? reg.pushManager.getSubscription() : null))
      .then((sub) => { if (!cancelled) setSubscribed(!!sub && Notification.permission === 'granted'); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [supported, secure]);

  const enable = useCallback(async () => {
    if (!supported) return { ok: false, reason: 'unsupported' };
    if (!secure) return { ok: false, reason: 'insecure' };
    setLoading(true);
    try {
      let perm = Notification.permission;
      if (perm === 'default') perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return { ok: false, reason: 'denied' };

      const reg = await getRegistration();
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const { data } = await axios.get(`${API}/push/public-key`);
        if (!data?.publicKey) throw new Error('No public key');
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.publicKey),
        });
      }
      await axios.post(`${API}/push/subscribe`, { subscription: sub.toJSON() }, { headers: authHeaders() });
      setSubscribed(true);
      return { ok: true };
    } catch (err) {
      console.error('Push enable failed:', err);
      return { ok: false, reason: 'error', error: err };
    } finally {
      setLoading(false);
    }
  }, [supported, secure]);

  const disable = useCallback(async () => {
    if (!supported) return { ok: false, reason: 'unsupported' };
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        const { endpoint } = sub;
        await sub.unsubscribe().catch(() => {});
        await axios.post(`${API}/push/unsubscribe`, { endpoint }, { headers: authHeaders() }).catch(() => {});
      }
      setSubscribed(false);
      return { ok: true };
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const sendTest = useCallback(
    () => axios.post(`${API}/push/test`, {}, { headers: authHeaders() }),
    [],
  );

  return { supported, secure, permission, subscribed, loading, enable, disable, sendTest };
}

export default usePush;
