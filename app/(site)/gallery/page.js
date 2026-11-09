import GalleryBrowser from './gallery-browser';
import './gallery.css';
import { TGNE_GALLERY_ITEMS } from '../../../lib/tgne-gallery';
import { createPageMetadata } from '../../../lib/site-metadata';

export const metadata = createPageMetadata({
  title: 'Creative Gallery',
  description: 'Explore selected TGNE Solutions work across branding, print, technology, software and education in Ghana.',
  path: '/gallery'
});

export default function GalleryPage() {
  return (
    <>
      <section className="tgne-gallery-hero">
        <div className="ls-container tgne-gallery-hero-inner">
          <p className="ls-eyebrow"><span /> Selected work</p>
          <h1>Ideas made <em>visible.</em></h1>
          <p>A look at the brands, print, products and digital experiences we create with our clients.</p>
          <a className="tgne-gallery-scroll" href="#work">
            Explore the gallery <span aria-hidden="true">↓</span>
          </a>
          <div className="tgne-gallery-hero-count">
            <strong>{String(TGNE_GALLERY_ITEMS.length).padStart(2, '0')}</strong>
            <span>projects<br />and ideas</span>
          </div>
        </div>
      </section>

      <section className="tgne-gallery-section" id="work">
        <div className="ls-container">
          <div className="tgne-gallery-heading">
            <div>
              <p className="ls-eyebrow"><span /> The TGNE portfolio</p>
              <h2>Work worth a closer look.</h2>
            </div>
            <p>Browse the collection, then open any project to see it in detail.</p>
          </div>
          <GalleryBrowser items={TGNE_GALLERY_ITEMS} />
        </div>
      </section>

      <section className="tgne-gallery-cta">
        <div className="ls-container tgne-gallery-cta-inner">
          <div>
            <p className="ls-eyebrow"><span /> Have something in mind?</p>
            <h2>Let’s make your idea real.</h2>
            <p>Tell us what you’re working on. We’ll help shape the right next step.</p>
          </div>
          <a className="ls-button ls-button-primary" href="/contact">Start a conversation <span aria-hidden="true">↗</span></a>
        </div>
      </section>
    </>
  );
}
