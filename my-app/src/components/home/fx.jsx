import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../ui/motionUtils';
import { getScroller, getScrollY, subscribeScroll } from './scroll';

const canHover = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;

// 3D tilt on mouse-move (desktop pointer only, honours reduced motion). Pure DOM writes — no re-renders.
export const TiltCard = ({ children, className = '', max = 8, glare = true }) => {
  const ref = useRef(null);
  const enabled = useRef(false);

  useEffect(() => { enabled.current = canHover() && !prefersReducedMotion(); }, []);

  const onMove = (e) => {
    const el = ref.current;
    if (!el || !enabled.current) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateZ(0)`;
    el.style.setProperty('--gx', `${px * 100}%`);
    el.style.setProperty('--gy', `${py * 100}%`);
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ''; };

  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`home-tilt relative ${className}`}>
      {children}
      {glare && <span aria-hidden="true" className="home-tilt-glare pointer-events-none absolute inset-0 rounded-[inherit] z-10" />}
    </div>
  );
};

// Element drifts slightly towards the cursor (magnetic button).
export const Magnetic = ({ children, strength = 0.25, className = '' }) => {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el || !canHover() || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transform = `translate(${x}px, ${y}px)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <span ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} className={`inline-flex transition-transform duration-300 ease-out ${className}`}>
      {children}
    </span>
  );
};

// Thin orange reading-progress bar pinned to the top of the viewport.
export const ScrollProgress = () => {
  const ref = useRef(null);
  useEffect(() => {
    const update = () => {
      const sc = getScroller();
      if (!sc || !ref.current) return;
      const max = sc.scrollHeight - sc.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, getScrollY() / max)) : 0;
      ref.current.style.transform = `scaleX(${p})`;
    };
    update();
    return subscribeScroll(update);
  }, []);
  return (
    <div className="fixed top-0 inset-x-0 h-[3px] z-[140] pointer-events-none" aria-hidden="true">
      <div ref={ref} className="h-full origin-left bg-brand-gradient shadow-brand-glow" style={{ transform: 'scaleX(0)' }} />
    </div>
  );
};

// Curved SVG section divider. `fill` is the colour of the section it flows INTO.
export const Wave = ({ fill = '#ffffff', flip = false, className = '' }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 1440 80"
    preserveAspectRatio="none"
    className={`block w-full h-10 md:h-16 ${flip ? 'rotate-180' : ''} ${className}`}
  >
    <path fill={fill} d="M0,48 C240,88 480,8 720,32 C960,56 1200,84 1440,40 L1440,80 L0,80 Z" />
  </svg>
);

// Infinite horizontal ticker. Items are duplicated once for a seamless loop.
export const Ticker = ({ items, duration = 36, reverse = false, className = '', itemClassName = '', separator = '✦' }) => (
  <div className={`home-ticker-wrap overflow-hidden ${className}`}>
    <div className={`home-ticker ${reverse ? 'home-ticker-rev' : ''} flex w-max`} style={{ '--dur': `${duration}s` }}>
      {[0, 1].map((copy) => (
        <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1}>
          {items.map((t) => (
            <li key={`${copy}-${t}`} className={`flex items-center whitespace-nowrap ${itemClassName}`}>
              {t}
              <span className="mx-5 md:mx-7 opacity-70" aria-hidden="true">{separator}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  </div>
);
