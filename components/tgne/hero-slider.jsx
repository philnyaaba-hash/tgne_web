'use client';

import Image from 'next/image';
import Icon from '../land/icons';
import { useEffect, useState } from 'react';

export default function HeroSlider({ slides }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeSlide = slides[activeIndex];

  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);

  const showPrevious = () => setActiveIndex((index) => (index - 1 + slides.length) % slides.length);
  const showNext = () => setActiveIndex((index) => (index + 1) % slides.length);

  return (
    <section
      className="tgne-hero-slider"
      aria-label="TGNE Solutions highlights"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div className="tgne-slider-slide" role="group" aria-roledescription="slide" aria-label={`${activeIndex + 1} of ${slides.length}: ${activeSlide.title}`}>
        <Image
          key={activeSlide.src}
          src={activeSlide.src}
          alt={activeSlide.title}
          fill
          priority={activeIndex === 0}
          sizes="(max-width: 820px) 100vw, 52vw"
          className="tgne-slider-image"
        />
        <div className="tgne-slider-caption">
          <span className="tgne-slider-category">{activeSlide.category}</span>
          <h2>{activeSlide.title}</h2>
        </div>
      </div>

      <div className="tgne-slider-topline">
        <span><i /> TGNE / SOLUTIONS</span>
        <span className="tgne-slider-count">{String(activeIndex + 1).padStart(2, '0')} <i /> {String(slides.length).padStart(2, '0')}</span>
      </div>

      <div className="tgne-slider-controls">
        <div className="tgne-slider-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${(activeIndex + 1) / slides.length})` }} />
        </div>
        <div className="tgne-slider-controls-actions">
          <button type="button" className="tgne-slider-play" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>
            {paused ? 'Play' : 'Pause'}
          </button>
          <div className="tgne-slider-arrows">
            <button type="button" onClick={showPrevious} aria-label="Previous image"><Icon name="arrowLeft" size={17} /></button>
            <button type="button" onClick={showNext} aria-label="Next image"><Icon name="arrowRight" size={17} /></button>
          </div>
        </div>
      </div>
    </section>
  );
}
