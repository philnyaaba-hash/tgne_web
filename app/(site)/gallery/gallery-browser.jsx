'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

const CATEGORIES = ['All work', 'Design & print', 'Technology', 'Education'];

export default function GalleryBrowser({ items }) {
  const [category, setCategory] = useState('All work');
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const filteredItems = useMemo(() => {
    const search = query.trim().toLowerCase();
    return items.filter((item) => {
      const inCategory = category === 'All work' || item.category === category;
      const matchesSearch = !search || `${item.title} ${item.category}`.toLowerCase().includes(search);
      return inCategory && matchesSearch;
    });
  }, [category, items, query]);

  useEffect(() => {
    if (activeIndex < 0) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActiveIndex(-1);
      if (event.key === 'ArrowRight') setActiveIndex((index) => (index + 1) % filteredItems.length);
      if (event.key === 'ArrowLeft') setActiveIndex((index) => (index - 1 + filteredItems.length) % filteredItems.length);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [activeIndex, filteredItems.length]);

  return (
    <>
      <div className="tgne-gallery-tools">
        <div className="tgne-gallery-filters" role="group" aria-label="Filter gallery by category">
          {CATEGORIES.map((item) => (
            <button
              type="button"
              key={item}
              className={category === item ? 'is-active' : ''}
              aria-pressed={category === item}
              onClick={() => {
                setCategory(item);
                setActiveIndex(-1);
              }}
            >
              {item}
              {item === 'All work' ? <span>{items.length}</span> : null}
            </button>
          ))}
        </div>
        <label className="tgne-gallery-search">
          <span aria-hidden="true">⌕</span>
          <span className="tgne-gallery-sr-only">Search projects</span>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
            }}
            placeholder="Search projects"
            type="search"
          />
          {query ? <button type="button" onClick={() => setQuery('')} aria-label="Clear search">×</button> : null}
        </label>
      </div>

      <div className="tgne-gallery-results" aria-live="polite">
        <span>{filteredItems.length} {filteredItems.length === 1 ? 'project' : 'projects'}</span>
        <span>Made with care in Tema, Ghana</span>
      </div>

      {filteredItems.length ? (
        <div className="tgne-gallery-grid">
          {filteredItems.map((item, index) => (
            <button
              type="button"
              className="tgne-gallery-card"
              key={item.src}
              onClick={() => setActiveIndex(index)}
              aria-label={`View ${item.title}, ${item.category}`}
            >
              <span className="tgne-gallery-image">
                <Image src={item.src} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw" />
                <span className="tgne-gallery-view" aria-hidden="true">View project <span>↗</span></span>
              </span>
              <span className="tgne-gallery-card-caption">
                <span><small>{item.category}</small><strong>{item.title}</strong></span>
                <span className="tgne-gallery-card-arrow" aria-hidden="true">↗</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="tgne-gallery-empty">
          <span aria-hidden="true">⌕</span>
          <h3>No projects found</h3>
          <p>Try another search or choose a different category.</p>
          <button type="button" onClick={() => { setCategory('All work'); setQuery(''); }}>Show all work</button>
        </div>
      )}

      {activeIndex >= 0 && filteredItems[activeIndex] ? (
        <div
          className="tgne-gallery-lightbox"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveIndex(-1);
          }}
        >
          <div className="tgne-gallery-dialog" role="dialog" aria-modal="true" aria-label={filteredItems[activeIndex].title}>
            <button className="tgne-gallery-close" type="button" onClick={() => setActiveIndex(-1)} aria-label="Close image viewer">×</button>
            <button
              className="tgne-gallery-previous"
              type="button"
              onClick={() => setActiveIndex((activeIndex - 1 + filteredItems.length) % filteredItems.length)}
              aria-label="Previous image"
            >←</button>
            <div className="tgne-gallery-lightbox-image">
              <Image src={filteredItems[activeIndex].src} alt={filteredItems[activeIndex].title} fill sizes="95vw" priority />
            </div>
            <button
              className="tgne-gallery-next"
              type="button"
              onClick={() => setActiveIndex((activeIndex + 1) % filteredItems.length)}
              aria-label="Next image"
            >→</button>
            <div className="tgne-gallery-lightbox-caption">
              <div><small>{filteredItems[activeIndex].category}</small><strong>{filteredItems[activeIndex].title}</strong></div>
              <span>{String(activeIndex + 1).padStart(2, '0')} / {String(filteredItems.length).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
