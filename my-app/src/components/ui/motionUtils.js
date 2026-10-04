import { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const DEFAULT_IN_VIEW = { threshold: 0.15 };
const canObserve = () => typeof IntersectionObserver !== 'undefined';

// Fires once when the element scrolls into view.
export const useInView = (options = DEFAULT_IN_VIEW) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(() => !canObserve());

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.disconnect(); }
    }, options);
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, options]);

  return [ref, inView];
};

export const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
