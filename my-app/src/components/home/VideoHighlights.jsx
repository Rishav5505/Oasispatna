import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiPlayCircle } from 'react-icons/fi';
import { Reveal } from '../ui/Motion';
import SectionHeading from './SectionHeading';

const AutoPlayVideo = ({ src, className = '', fit = 'object-cover', title }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => { /* autoplay blocked */ });
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.5 }
    );
    if (videoRef.current) observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-full relative">
      <video ref={videoRef} src={src} className={`w-full h-full ${fit} ${className}`} muted loop playsInline controls preload="metadata" />
      {title && (
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 text-white font-bold text-xs bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <FiPlayCircle className="text-brand-400" /> {title}
          </span>
        </div>
      )}
    </div>
  );
};

const InstagramIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.209-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
);

const VideoHighlights = ({ promoVideo, sideVideos }) => (
  <section className="pt-14 md:pt-20 pb-8 md:pb-10 w-full bg-[#fffaf5] overflow-hidden">
    <div className="max-w-7xl mx-auto px-4 sm:px-6">
      <SectionHeading
        align="left"
        className="!mb-8 md:!mb-10"
        eyebrow="Oasis in Action"
        title="Watch our"
        highlight="Growth Stories"
        subtitle="Get a glimpse of our teaching methodology and student life through our latest highlights."
        action={
          <a
            href="https://www.instagram.com/oasispatna"
            target="_blank"
            rel="noopener noreferrer"
            className="self-start md:self-auto inline-flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-bold rounded-2xl hover:scale-105 hover:shadow-xl transition-all text-sm"
          >
            <InstagramIcon /> Follow on Instagram
          </a>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <Reveal className="lg:col-span-2">
          <div className="relative aspect-video rounded-3xl overflow-hidden shadow-card-hover bg-black ring-1 ring-black/5">
            <AutoPlayVideo src={promoVideo} />
          </div>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-5">
          {sideVideos.map((video, i) => (
            <Reveal key={video.title} delay={(i + 1) * 120}>
              <div className="group relative aspect-[4/3] rounded-3xl overflow-hidden shadow-card bg-black">
                <AutoPlayVideo src={video.src} fit={video.fit} title={video.title} className="opacity-90 group-hover:opacity-100 transition-opacity" />
              </div>
            </Reveal>
          ))}
          <Reveal delay={360} className="sm:col-span-2 lg:col-span-1">
            <Link
              to="/gallery"
              className="group flex items-center justify-between gap-4 p-5 rounded-3xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 hover:bg-brand-gradient hover:border-transparent transition-all duration-300"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600 group-hover:text-white/80">More videos</p>
                <p className="font-bold text-gray-900 dark:text-white group-hover:text-white">Explore Gallery</p>
              </div>
              <span className="w-10 h-10 rounded-full bg-white text-brand-600 flex items-center justify-center shadow-sm group-hover:translate-x-1 transition-transform">
                <FiArrowRight />
              </span>
            </Link>
          </Reveal>
        </div>
      </div>
    </div>
  </section>
);

export default VideoHighlights;
