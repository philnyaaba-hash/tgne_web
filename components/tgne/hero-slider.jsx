import Image from 'next/image';
import Icon from '../land/icons';

const SLIDES = [
  { title: 'Technology that moves you forward.', category: 'Technology', theme: 'technology', image: '' },
  { title: 'Design that makes you stand out.', category: 'Graphic design & print', theme: 'design', image: '' },
  { title: 'Digital skills for what comes next.', category: 'Education', theme: 'education', image: '' }
];

export default function HeroSlider() {
  return (
    <section className="tgne-hero-slider" aria-label="TGNE Solutions highlights" aria-roledescription="carousel">
      {SLIDES.map((item, index) => (
        <input
          key={item.category}
          className="tgne-slider-state"
          type="radio"
          name="tgne-hero-slide"
          id={`tgne-hero-slide-${index + 1}`}
          defaultChecked={index === 0}
          aria-label={`Show slide ${index + 1}: ${item.category}`}
        />
      ))}

      <div className="tgne-slider-track">
        {SLIDES.map((item, index) => (
          <div
            key={item.category}
            className={`tgne-slider-slide tgne-slider-${item.theme}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${SLIDES.length}: ${item.category}`}
          >
            {item.image ? (
              <Image
                src={item.image}
                alt={item.title}
                fill
                priority={index === 0}
                sizes="(max-width: 820px) 100vw, 52vw"
                className="tgne-slider-image"
              />
            ) : (
              <div className="tgne-slider-placeholder" aria-hidden="true">
                <span className="tgne-slider-placeholder-grid" />
                <span className="tgne-slider-placeholder-orbit" />
                <span className="tgne-slider-placeholder-mark">TGNE</span>
              </div>
            )}
            <div className="tgne-slider-caption">
              <span className="tgne-slider-category">{item.category}</span>
              <h2>{item.title}</h2>
            </div>
          </div>
        ))}
      </div>

      <div className="tgne-slider-topline">
        <span><i /> TGNE / SOLUTIONS</span>
        <span className="tgne-slider-count">
          {SLIDES.map((item, index) => (
            <span className={`tgne-slider-count-item tgne-slider-count-${index + 1}`} key={item.category}>
              {String(index + 1).padStart(2, '0')} <i /> {String(SLIDES.length).padStart(2, '0')}
            </span>
          ))}
        </span>
      </div>

      <div className="tgne-slider-controls">
        <div className="tgne-slider-dots" role="group" aria-label="Choose a slide">
          {SLIDES.map((item, index) => (
            <label
              key={item.category}
              htmlFor={`tgne-hero-slide-${index + 1}`}
              aria-label={`Show slide ${index + 1}: ${item.category}`}
              title={`Show slide ${index + 1}: ${item.category}`}
            />
          ))}
        </div>
        <div className="tgne-slider-arrows">
          {SLIDES.map((item, index) => {
            const previousIndex = (index + SLIDES.length - 1) % SLIDES.length;
            const nextIndex = (index + 1) % SLIDES.length;
            return (
              <span className={`tgne-slider-arrow-set tgne-slider-arrow-set-${index + 1}`} key={item.category}>
                <label htmlFor={`tgne-hero-slide-${previousIndex + 1}`} aria-label="Previous slide" title="Previous slide">
                  <Icon name="arrowLeft" size={17} />
                </label>
                <label htmlFor={`tgne-hero-slide-${nextIndex + 1}`} aria-label="Next slide" title="Next slide">
                  <Icon name="arrowRight" size={17} />
                </label>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
