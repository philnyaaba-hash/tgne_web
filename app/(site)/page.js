import Link from 'next/link';
import Image from 'next/image';
import Icon from '../../components/land/icons';
import HeroSlider from '../../components/tgne/hero-slider';
import HeroBackgroundVideo from '../../components/tgne/hero-background-video';
import { LAND_SITE } from '../../lib/land-site';
import { TGNE_SHOP_ITEMS } from '../../lib/tgne-shop';
import { TGNE_SERVICES } from '../../lib/tgne-services';
import { TGNE_HOME_SLIDES } from '../../lib/tgne-home-slides';
import { getFeaturedCaseStudies } from '../../lib/tgne-case-studies';
import { formatPostDate, getLatestPosts } from '../../lib/tgne-blog';
import { createPageMetadata } from '../../lib/site-metadata';

export const metadata = createPageMetadata({
  title: 'TGNE Solutions | Technology, design & ICT in Tema, Ghana',
  description: 'Web development, graphic design, printing, ICT solutions, hosting and digital education consultancy from TGNE Solutions in Tema, Ghana.',
  path: '/'
});

const APPROACH = [
  { number: '01', title: 'Understand', copy: 'We begin with your goals, audience and the challenge you need to solve.' },
  { number: '02', title: 'Shape', copy: 'We map a clear direction, scope and practical plan before work begins.' },
  { number: '03', title: 'Deliver', copy: 'We build, review and refine the solution with you at every key step.' },
  { number: '04', title: 'Support', copy: 'We help you launch confidently and keep moving after delivery.' }
];

function OfferCard({ item, index, decorative = false }) {
  const content = (
    <>
      <span className={`tgne-offer-visual${item.image ? ' tgne-offer-visual-has-image' : ''}`}>
        {item.image ? <Image src={item.image} alt="" fill sizes="(max-width: 860px) 290px, 360px" unoptimized={/^https?:\/\//.test(item.image)} /> : null}
        <span className="tgne-offer-number">{String(index + 1).padStart(2, '0')}</span>
        <span className="tgne-offer-icon"><Icon name={item.icon} size={24} /></span>
        {!item.image ? <span className="tgne-offer-visual-word">{item.visual === 'computer' ? 'TECH' : item.visual === 'hosting' ? 'WEB' : item.visual === 'education' ? 'LEARN' : 'TGNE'}</span> : null}
      </span>
      <span className="tgne-offer-copy">
        <small>{item.category}</small>
        <strong>{item.title}</strong>
        <span>{item.description}</span>
        <span className="tgne-offer-link">Explore offering <Icon name="arrowUpRight" size={14} /></span>
      </span>
    </>
  );

  if (decorative) {
    return (
      <Link
        className={`tgne-offer-card tgne-offer-${item.visual}`}
        href={`/shop#product-${item.id}`}
        aria-hidden="true"
        tabIndex={-1}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link className={`tgne-offer-card tgne-offer-${item.visual}`} href={`/shop#product-${item.id}`}>
      {content}
    </Link>
  );
}

export default function TgnesolutionsHomePage() {
  return (
    <>
      <section className="tgne-hero">
        <HeroBackgroundVideo />
        <div className="ls-container tgne-hero-grid">
          <div className="tgne-hero-copy">
            <p className="ls-eyebrow"><span /> Technology · Design · Digital growth</p>
            <h1>Make your next move <em>matter.</em></h1>
            <p className="tgne-hero-lead">
              We bring technology and creativity together to help businesses work smarter, look sharper and grow with confidence.
            </p>
            <div className="tgne-hero-actions">
              <Link href="/contact" className="ls-button ls-button-primary">
                Start a conversation <Icon name="arrowRight" size={16} />
              </Link>
              <Link href="/services" className="ls-text-link">
                Explore our services <Icon name="arrowUpRight" size={15} />
              </Link>
            </div>
            <div className="tgne-hero-meta">
              <span><Icon name="mapPin" size={15} /> Tema, Ghana</span>
              <span><Icon name="clock" size={15} /> Mon–Fri, 8am–5pm</span>
            </div>
          </div>

          <HeroSlider slides={TGNE_HOME_SLIDES} />
        </div>
      </section>

      <section className="tgne-offerings" aria-labelledby="tgne-offerings-title">
        <div className="ls-container">
          <div className="tgne-offerings-heading">
            <div>
              <p className="ls-eyebrow"><span /> What we offer</p>
              <h2 id="tgne-offerings-title">A partner for your next step.</h2>
              <p>Explore the ideas, tools and services that help your organisation move forward.</p>
            </div>
            <Link href="/shop" className="ls-text-link">Browse all offerings <Icon name="arrowRight" size={15} /></Link>
          </div>
          <div className="tgne-offer-marquee">
            <div className="tgne-offer-track">
              <div className="tgne-offer-group">
                {TGNE_SHOP_ITEMS.map((item, index) => <OfferCard key={item.id} item={item} index={index} />)}
              </div>
              <div className="tgne-offer-group" aria-hidden="true">
                {TGNE_SHOP_ITEMS.map((item, index) => <OfferCard key={item.id} item={item} index={index} decorative />)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="ls-section tgne-services" id="services">
        <div className="ls-container">
          <div className="ls-section-head tgne-section-head">
            <div>
              <p className="ls-eyebrow"><span /> What we do</p>
              <h2>Everything you need to show up and work better.</h2>
            </div>
            <Link href="/services" className="ls-text-link">View all services <Icon name="arrowRight" size={15} /></Link>
          </div>
          <div className="tgne-service-grid">
            {TGNE_SERVICES.map((service, index) => (
              <Link className="tgne-service-card" href={`/services#${service.id}`} key={service.title}>
                <span className="tgne-service-top"><span>0{index + 1}</span><Icon name={service.icon} size={20} /></span>
                <h3>{service.title}</h3>
                <p>{service.copy}</p>
                <span className="tgne-service-link">Explore <Icon name="arrowUpRight" size={14} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="tgne-shop-section" id="shop">
        <div className="ls-container">
          <div className="tgne-shop-heading">
            <div>
              <p className="ls-eyebrow"><span /> Shop essentials</p>
              <h2>Start with the right tools.</h2>
            </div>
            <Link href="/shop" className="ls-text-link">Visit the shop <Icon name="arrowRight" size={15} /></Link>
          </div>
          <div className="tgne-shop-grid">
            {TGNE_SHOP_ITEMS.slice(0, 4).map((item) => (
              <Link className="tgne-shop-card" href={`/shop#product-${item.id}`} key={item.id}>
                <span className="tgne-shop-card-icon"><Icon name={item.icon} size={19} /></span>
                <small>{item.category}</small>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span>View offering <Icon name="arrowUpRight" size={14} /></span>
              </Link>
            ))}
          </div>
          <p className="tgne-shop-note">
            Pricing and stock availability are confirmed directly by TGNE before an order is placed.
          </p>
        </div>
      </section>

      <section className="tgne-principles">
        <div className="ls-container tgne-principles-grid">
          <div>
            <p className="ls-eyebrow"><span /> The TGNE difference</p>
            <h2>Thoughtful work.<br /><em>Solid execution.</em></h2>
            <p>
              No unnecessary complexity. Just clear advice, well-crafted work and support that makes sense for your organisation.
            </p>
            <Link href="/about" className="ls-button ls-button-light">Get to know us <Icon name="arrowRight" size={15} /></Link>
          </div>
          <div className="tgne-principles-list">
            <article><span>01</span><div><h3>Made for your goals</h3><p>We start with what you need to achieve, then choose the right tools and approach.</p></div></article>
            <article><span>02</span><div><h3>Creative and technical</h3><p>Design, technology and practical business thinking come together in one place.</p></div></article>
            <article><span>03</span><div><h3>People-first support</h3><p>Clear communication and useful guidance stay part of the work from start to finish.</p></div></article>
          </div>
        </div>
      </section>

      <section className="ls-section tgne-process" id="process">
        <div className="ls-container">
          <div className="ls-section-head tgne-section-head">
            <div>
              <p className="ls-eyebrow"><span /> How we work</p>
              <h2>A considered process. A confident result.</h2>
            </div>
            <Link href="/how-it-works" className="ls-text-link">Our approach <Icon name="arrowRight" size={15} /></Link>
          </div>
          <div className="tgne-approach-grid">
            {APPROACH.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="tgne-work" aria-labelledby="tgne-work-title">
        <div className="ls-container">
          <div className="ls-section-head tgne-section-head">
            <div>
              <p className="ls-eyebrow"><span /> Case studies</p>
              <h2 id="tgne-work-title">Proof, not promises.</h2>
            </div>
            <Link href="/case-studies" className="ls-text-link">All case studies <Icon name="arrowRight" size={15} /></Link>
          </div>
          <div className="tgne-work-grid">
            {getFeaturedCaseStudies(3).map((study) => (
              <Link className="tgne-work-card" href={`/case-studies/${study.slug}`} key={study.slug}>
                <span className="tgne-work-media">
                  <Image src={study.cover.src} alt={study.cover.alt} fill sizes="(max-width: 600px) 100vw, (max-width: 900px) 220px, 380px" />
                  <span className="tgne-work-sector">{study.sector}</span>
                </span>
                <span className="tgne-work-body">
                  <small>{study.client} · {study.year}</small>
                  <strong>{study.title}</strong>
                  <span className="tgne-work-metric">
                    <b>{study.metrics[0].value}</b>
                    <span>{study.metrics[0].label}</span>
                  </span>
                  <span className="tgne-work-link">Read the case study <Icon name="arrowUpRight" size={14} /></span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="tgne-contact-band">
        <div className="ls-container tgne-contact-band-inner">
          <div>
            <p className="ls-eyebrow"><span /> Let’s make it happen</p>
            <h2>Have a good idea?<br /><em>Let’s build on it.</em></h2>
            <p>Tell us what you’re working on. We’ll help you find the right next step.</p>
          </div>
          <div className="tgne-contact-band-actions">
            <Link href="/contact" className="ls-button ls-button-light">Talk to TGNE <Icon name="arrowRight" size={15} /></Link>
            <a href="https://wa.me/233558122767" className="tgne-contact-number">WhatsApp +233 55 812 2767</a>
          </div>
        </div>
      </section>

      <section className="tgne-journal" aria-labelledby="tgne-journal-title">
        <div className="ls-container tgne-journal-layout">
          <div className="tgne-journal-copy">
            <p className="ls-eyebrow"><span /> The TGNE journal</p>
            <h2 id="tgne-journal-title">Notes from the <em>workshop.</em></h2>
            <p>
              What we learn building websites, running print jobs, setting up networks and teaching ICT —
              written down so it is useful to someone else.
            </p>
            <Link href="/blog" className="ls-button ls-button-primary">Visit the blog <Icon name="arrowRight" size={15} /></Link>
          </div>
          <div className="tgne-journal-list">
            {getLatestPosts(3).map((post) => (
              <Link className="tgne-journal-item" href={`/blog/${post.slug}`} key={post.slug}>
                <span className="tgne-journal-thumb">
                  <Image src={post.cover.src} alt={post.cover.alt} fill sizes="(max-width: 600px) 78px, 104px" />
                </span>
                <span className="tgne-journal-copy-body">
                  <span className="tgne-journal-meta">
                    <small>{post.category}</small>
                    <i aria-hidden="true" />
                    <time dateTime={post.date}>{formatPostDate(post.date)}</time>
                    <i aria-hidden="true" />
                    {post.readingMinutes} min read
                  </span>
                  <strong>{post.title}</strong>
                </span>
                <span className="tgne-journal-arrow" aria-hidden="true"><Icon name="arrowUpRight" size={14} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="tgne-reviews" aria-labelledby="tgne-reviews-title">
        <div className="ls-container tgne-reviews-layout">
          <div className="tgne-reviews-copy">
            <p className="ls-eyebrow"><span /> Your voice matters</p>
            <h2 id="tgne-reviews-title">Good work is better when it’s <em>shared.</em></h2>
            <p>
              Have you worked with TGNE Solutions? Share an honest review on Google to help others in Tema find the
              right technology, design and education partner.
            </p>
            <div className="tgne-reviews-actions">
              <a href={LAND_SITE.googleReviewsUrl} className="ls-button ls-button-primary" target="_blank" rel="noreferrer">
                Write a Google review <Icon name="arrowUpRight" size={15} />
              </a>
              <a href={LAND_SITE.googleReviewsUrl} className="tgne-reviews-secondary" target="_blank" rel="noreferrer">
                View our Google listing <Icon name="arrowRight" size={14} />
              </a>
            </div>
          </div>
          <a className="tgne-review-card" href={LAND_SITE.googleReviewsUrl} target="_blank" rel="noreferrer">
            <span className="tgne-review-card-top">
              <span className="tgne-google-mark" aria-hidden="true">G</span>
              <span><strong>Google Reviews</strong><small>Feedback from our community</small></span>
              <Icon name="arrowUpRight" size={17} />
            </span>
            <span className="tgne-review-quote"><Icon name="quote" size={30} /></span>
            <strong className="tgne-review-card-message">Your experience can help someone take their next step.</strong>
            <span className="tgne-review-card-bottom">
              <span><i /> Communication</span>
              <span><i /> Quality of work</span>
              <span><i /> Overall experience</span>
            </span>
          </a>
        </div>
      </section>

      <section className="tgne-location">
        <div className="ls-container">
          <div className="ls-section-head tgne-section-head">
            <div>
              <p className="ls-eyebrow"><span /> Find TGNE Solutions</p>
              <h2>Rooted in Tema. Ready to work with you.</h2>
            </div>
            <p className="tgne-location-intro">
              Visit us in Tema or get in touch to arrange a conversation about your next project.
            </p>
          </div>
          <div className="tgne-location-grid">
            <div className="tgne-map-frame">
              <iframe
                title="Google Maps location for TGNE Solutions, Community 11, Tema"
                src={LAND_SITE.mapEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <span className="tgne-map-label"><Icon name="mapPin" size={14} /> MKT/A/39, Community 11, Tema</span>
            </div>
            <aside className="tgne-location-card">
              <span className="tgne-location-kicker">TGNE SOLUTIONS · GHANA</span>
              <h3>A good place<br />to start.</h3>
              <div className="tgne-location-detail">
                <Icon name="mapPin" size={17} />
                <span><strong>Our location</strong><small>{LAND_SITE.address}</small></span>
              </div>
              <div className="tgne-location-detail">
                <Icon name="clock" size={17} />
                <span><strong>Business hours</strong><small>{LAND_SITE.hours}</small></span>
              </div>
              <div className="tgne-location-detail">
                <Icon name="phone" size={17} />
                <span><strong>Call or WhatsApp</strong><small>{LAND_SITE.officePhone} · {LAND_SITE.phone} · {LAND_SITE.phoneAlt}</small></span>
              </div>
              <div className="tgne-location-actions">
                <Link href="/contact" className="ls-button ls-button-light">Plan a visit <Icon name="arrowRight" size={15} /></Link>
                <a href={LAND_SITE.mapUrl} target="_blank" rel="noreferrer">Open in Google Maps <Icon name="arrowUpRight" size={14} /></a>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
