import React from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCamera } from 'react-icons/fi';

const Photo = ({ item, tall }) => (
  <figure className={`group relative shrink-0 mx-2 md:mx-2.5 overflow-hidden rounded-2xl md:rounded-3xl bg-gray-100 ${tall ? 'w-56 h-40 md:w-80 md:h-56' : 'w-44 h-40 md:w-64 md:h-56'}`}>
    <img
      src={item.img}
      alt={item.title}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
    <figcaption className="absolute left-3 bottom-3 right-3 text-white font-bold text-xs md:text-sm leading-tight">{item.title}</figcaption>
  </figure>
);

const Row = ({ items, reverse, duration }) => (
  <div className="home-ticker-wrap overflow-hidden">
    <div className={`home-ticker ${reverse ? 'home-ticker-rev' : ''} flex w-max py-2`} style={{ '--dur': `${duration}s` }}>
      {[0, 1].map((copy) => (
        <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
          {items.map((item, i) => <Photo key={`${copy}-${item.title}`} item={item} tall={i % 2 === 0} />)}
        </div>
      ))}
    </div>
  </div>
);

// Two counter-scrolling photo rows (pauses on hover).
const EventsGallery = ({ items }) => {
  const half = Math.ceil(items.length / 2);
  return (
    <section className="pb-14 md:pb-20 w-full bg-[#fffaf5] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-5 flex items-center justify-between gap-4">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brand-600">
          <FiCamera /> Life at Oasis — events &amp; celebrations
        </p>
        <Link to="/gallery" className="shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-ink-900 hover:text-brand-600 group">
          Full gallery <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
      <div
        className="space-y-3 md:space-y-4"
        style={{ maskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, #000 5%, #000 95%, transparent)' }}
      >
        <Row items={items.slice(0, half)} duration={45} />
        <Row items={items.slice(half)} duration={50} reverse />
      </div>
    </section>
  );
};

export default EventsGallery;
