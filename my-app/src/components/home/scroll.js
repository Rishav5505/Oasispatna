// index.html gives html/body/#root `height:100%` + `overflow-x:hidden`, which makes #root (not the window)
// the element that actually scrolls. These helpers work with either.
const rootEl = () => (typeof document === 'undefined' ? null : document.getElementById('root'));

export const getScroller = () => {
  const root = rootEl();
  if (root && root.scrollHeight > root.clientHeight + 1) return root;
  return typeof document === 'undefined' ? null : document.scrollingElement || document.documentElement;
};

export const getScrollY = () => Math.max(typeof window === 'undefined' ? 0 : window.scrollY || 0, rootEl()?.scrollTop || 0);

// Scroll events don't bubble, so listen in the capture phase to hear the #root scroller too. rAF-throttled.
export const subscribeScroll = (fn) => {
  let frame = 0;
  const handler = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; fn(); });
  };
  document.addEventListener('scroll', handler, { capture: true, passive: true });
  window.addEventListener('resize', handler);
  return () => {
    document.removeEventListener('scroll', handler, { capture: true });
    window.removeEventListener('resize', handler);
    if (frame) cancelAnimationFrame(frame);
  };
};

export const scrollToTop = () => {
  const s = getScroller();
  if (s && s !== document.scrollingElement) s.scrollTo({ top: 0, behavior: 'smooth' });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
