'use client';

import Icon from './icons';

export default function ScrollControls() {
  const scrollToEdge = (edge) => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const top = edge === 'top' ? 0 : document.documentElement.scrollHeight;
    window.scrollTo({ top, behavior });
  };

  return (
    <div className="ls-scroll-controls" role="group" aria-label="Page scroll controls">
      <button type="button" onClick={() => scrollToEdge('top')} aria-label="Scroll to top" title="Scroll to top">
        <Icon name="arrowRight" size={17} />
      </button>
      <button type="button" onClick={() => scrollToEdge('bottom')} aria-label="Scroll to bottom" title="Scroll to bottom">
        <Icon name="arrowRight" size={17} />
      </button>
    </div>
  );
}