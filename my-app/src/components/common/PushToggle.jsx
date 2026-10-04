/**
 * PushToggle — "Enable notifications" button with on/off state (Web Push).
 *   import PushToggle from '../components/common/PushToggle';
 *   <PushToggle />                // full button with label
 *   <PushToggle compact />        // icon-only round button for top bars
 *   <PushToggle className="w-full" />
 * Uses usePush(): asks permission, subscribes via /push/public-key + /push/subscribe,
 * clicking again when on turns notifications off. Explains blocked permission / http.
 * Renders nothing if the browser has no push support at all.
 */
import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { FiBell, FiBellOff, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { usePush } from './usePush';
import { useI18n } from '../../i18n/useI18n';

export function PushToggle({ compact = false, className = '' }) {
  const { t } = useI18n();
  const { supported, secure, permission, subscribed, loading, enable, disable } = usePush();
  const [hint, setHint] = useState('');

  if (!supported) return null;

  const blocked = permission === 'denied';
  const on = subscribed && permission === 'granted';

  const handleClick = async () => {
    setHint('');
    if (!secure) { setHint(t('push.insecure')); toast.error(t('push.insecure')); return; }
    if (on) {
      await disable();
      toast.success(t('push.off'));
      return;
    }
    const res = await enable();
    if (res.ok) toast.success(t('push.success'));
    else if (res.reason === 'denied') { setHint(t('push.blocked')); toast.error(t('push.blocked'), { duration: 6000 }); }
    else if (res.reason === 'insecure') { setHint(t('push.insecure')); toast.error(t('push.insecure')); }
    else toast.error(t('push.failed'));
  };

  const label = on ? t('push.enabled') : t('push.enable');
  const Icon = loading ? FiLoader : on ? FiBell : blocked ? FiBellOff : FiBell;
  const title = blocked ? t('push.blocked') : !secure ? t('push.insecure') : on ? t('push.disable') : t('push.enable');

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title={title}
        aria-label={title}
        aria-pressed={on}
        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          on ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 hover:text-brand-600'
        } ${className}`}
      >
        <Icon className={`w-[18px] h-[18px] ${loading ? 'animate-spin' : ''}`} />
        {on && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 ring-2 ring-white dark:ring-ink-900" />}
      </button>
    );
  }

  return (
    <div className={`inline-flex flex-col gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        title={title}
        aria-pressed={on}
        className={on ? 'ui-btn-secondary !text-brand-600 !border-brand-200' : 'ui-btn-primary'}
      >
        <Icon className={loading ? 'animate-spin' : ''} />
        <span>{label}</span>
        {on && <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />}
      </button>
      {(hint || blocked) && (
        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 max-w-xs">
          <FiAlertCircle className="mt-0.5 shrink-0" /> {hint || t('push.blocked')}
        </p>
      )}
    </div>
  );
}

export default PushToggle;
