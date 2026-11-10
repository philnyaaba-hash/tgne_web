'use client';

import { useEffect, useRef, useState } from 'react';
import Icon from '../land/icons';

export function ReadingProgress({ targetId }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return undefined;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const range = rect.height - window.innerHeight;
      if (range <= 0) {
        setProgress(1);
        return;
      }
      setProgress(Math.min(Math.max(-rect.top / range, 0), 1));
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [targetId]);

  return (
    <div className="tgne-article-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

export function ArticleToc({ items }) {
  const [active, setActive] = useState(items[0]?.id || '');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const headings = items.map((item) => document.getElementById(item.id)).filter(Boolean);
    if (!headings.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-110px 0px -62% 0px', threshold: 0 }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [items]);

  if (!items.length) return null;

  return (
    <nav className="tgne-article-toc" aria-label="On this page">
      <h2>On this page</h2>
      <ol>
        {items.map((item, index) => (
          <li key={item.id}>
            <a href={`#${item.id}`} className={active === item.id ? 'is-active' : ''} aria-current={active === item.id ? 'true' : undefined}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function ShareArticle({ title, url }) {
  const [state, setState] = useState('idle');
  const [canNativeShare, setCanNativeShare] = useState(false);
  const timer = useRef(null);
  const fallbackField = useRef(null);

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === 'function');
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, []);

  const flash = (next) => {
    setState(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState('idle'), 2600);
  };

  const copyLink = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        flash('copied');
        return;
      }
    } catch {
      // Fall through to the manual selection path below.
    }
    const field = fallbackField.current;
    if (field) {
      field.focus();
      field.select();
      let succeeded = false;
      try {
        succeeded = document.execCommand('copy');
      } catch {
        succeeded = false;
      }
      if (succeeded) {
        flash('copied');
        return;
      }
    }
    setState('failed');
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title, url });
    } catch {
      // Dismissing the share sheet is not an error worth surfacing.
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="tgne-article-share">
      <span className="tgne-article-share-label">Share this article</span>
      <div className="tgne-article-share-actions">
        <button type="button" className="tgne-share-copy" onClick={copyLink} aria-live="polite">
          <Icon name={state === 'copied' ? 'check' : 'document'} size={15} />
          {state === 'copied' ? 'Link copied' : 'Copy link'}
        </button>
        <a
          className="tgne-share-icon"
          href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Share on WhatsApp"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.24-.85.83-.85 2.03s.87 2.35.99 2.52c.12.16 1.71 2.61 4.15 3.66.58.25 1.03.4 1.39.51.58.19 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28z" />
          </svg>
        </a>
        <a
          className="tgne-share-icon"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Share on LinkedIn"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5zM3 9h4v12H3zM9.5 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.76-1.95 4.02 0 4.76 2.5 4.76 5.76V21h-4v-5.6c0-1.34-.03-3.06-1.9-3.06-1.9 0-2.2 1.45-2.2 2.96V21h-4z" />
          </svg>
        </a>
        <a
          className="tgne-share-icon"
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Share on Facebook"
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.12-2.41-.12-2.39 0-4.03 1.46-4.03 4.14V9.9H7.5V13h2.76v8z" />
          </svg>
        </a>
        {canNativeShare ? (
          <button type="button" className="tgne-share-icon" onClick={nativeShare} aria-label="More sharing options">
            <Icon name="arrowUpRight" size={16} />
          </button>
        ) : null}
      </div>
      {state === 'failed' ? (
        <p className="tgne-article-share-fallback">
          Copying is blocked in this browser. Select the address below and copy it manually.
          <input ref={fallbackField} type="text" readOnly value={url} onFocus={(event) => event.target.select()} aria-label="Article link" />
        </p>
      ) : (
        <input ref={fallbackField} className="tgne-ed-sr" type="text" readOnly value={url} tabIndex={-1} aria-hidden="true" />
      )}
    </div>
  );
}