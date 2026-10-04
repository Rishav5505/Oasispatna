/**
 * Modal — design-system dialog used by the common components.
 *   <Modal open={open} onClose={close} title="Add event" footer={<button…/>}>…body…</Modal>
 * Backdrop blur + scale-in panel, Escape to close, body scroll lock, sticky footer.
 * On phones it docks to the bottom as a sheet.
 */
import React, { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full ${maxWidth} ui-card !rounded-b-none sm:!rounded-3xl animate-scale-in flex flex-col max-h-[92dvh]`}>
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3">
          <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-white/5 transition-colors">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 sm:px-6 pb-5 overflow-y-auto ui-scrollbar">{children}</div>
        {footer && (
          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 px-5 sm:px-6 py-4 border-t border-gray-100 dark:border-white/5 bg-white/90 dark:bg-ink-900/90 backdrop-blur rounded-b-3xl pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
