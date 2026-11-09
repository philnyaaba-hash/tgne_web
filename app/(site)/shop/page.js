import Link from 'next/link';
import Image from 'next/image';
import Icon from '../../../components/land/icons';
import { LAND_SITE } from '../../../lib/land-site';
import { TGNE_AFFILIATE, TGNE_SHOP_CATEGORIES, TGNE_SHOP_ITEMS } from '../../../lib/tgne-shop';
import { createPageMetadata } from '../../../lib/site-metadata';

const SHOP_METADATA = {
  all: {
    title: 'Products and services',
    description: 'Explore TGNE Solutions technology, software and AI, branding and print, web hosting, and ICT education services.'
  },
  technology: {
    title: 'Technology and AI solutions',
    description: 'Explore TGNE Solutions software and AI services, computers, ICT support, and practical technology for Ghanaian businesses.'
  },
  'design-print': {
    title: 'Graphic design and print',
    description: 'Browse TGNE Solutions brand identity, brochures, printed products, signage, and creative services.'
  },
  'web-services': {
    title: 'Domains and web hosting',
    description: 'Find domain registration and hosting support from TGNE Solutions in Tema, Ghana.'
  },
  education: {
    title: 'ICT education consultancy',
    description: 'Explore practical ICT training, education consultancy, and digital learning support from TGNE Solutions.'
  }
};

export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const requestedCategory = typeof params?.category === 'string' ? params.category : 'all';
  const category = TGNE_SHOP_CATEGORIES.find((item) => item.id === requestedCategory) || TGNE_SHOP_CATEGORIES[0];
  const details = SHOP_METADATA[category.id];
  const query = typeof params?.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const canonicalPath = category.id === 'all' ? '/shop' : `/shop?category=${encodeURIComponent(category.id)}`;

  if (query) {
    return createPageMetadata({
      title: `Search results for ${query}`,
      description: `Search TGNE Solutions offerings for ${query}, including technology, design, print, hosting and education services.`,
      path: canonicalPath,
      robots: { index: false, follow: true }
    });
  }

  return createPageMetadata({ ...details, path: canonicalPath });
}

export default async function ShopPage({ searchParams }) {
  const params = await searchParams;
  const requestedCategory = typeof params?.category === 'string' ? params.category : 'all';
  const category = TGNE_SHOP_CATEGORIES.some((item) => item.id === requestedCategory) ? requestedCategory : 'all';
  const query = typeof params?.q === 'string' ? params.q.trim().slice(0, 100) : '';
  const normalizedQuery = query.toLowerCase();
  const filteredItems = TGNE_SHOP_ITEMS.filter((item) => {
    const matchesCategory = category === 'all' || item.categoryId === category;
    const matchesQuery = !normalizedQuery ||
      `${item.title} ${item.category} ${item.description}`.toLowerCase().includes(normalizedQuery);
    return matchesCategory && matchesQuery;
  });

  return (
    <>
      <section className="tgne-page-hero tgne-shop-hero">
        <div className="ls-container tgne-page-hero-inner">
          <p className="ls-eyebrow"><span /> TGNE Shop</p>
          <h1>Find the right solution for your next move.</h1>
          <p>Explore technology, creative services, web essentials and education support from the TGNE team.</p>
          <div className="tgne-shop-trust">
            <span><Icon name="mapPin" size={15} /> Tema, Ghana</span>
            <span><Icon name="phone" size={15} /> Local support from TGNE</span>
          </div>
        </div>
      </section>

      <section className="tgne-store-section">
        <div className="ls-container">
          <div className="tgne-shop-heading">
            <div>
              <p className="ls-eyebrow"><span /> The TGNE collection</p>
              <h2>Browse our products & services.</h2>
            </div>
            <p>Not sure where to start? Filter by category or search the catalogue.</p>
          </div>
          <div className="tgne-store-toolbar">
            <nav className="tgne-store-categories" aria-label="Filter offerings by category">
              {TGNE_SHOP_CATEGORIES.map((item) => {
                const categoryParams = new URLSearchParams();
                if (item.id !== 'all') categoryParams.set('category', item.id);
                if (query) categoryParams.set('q', query);
                const search = categoryParams.toString();
                return (
                  <Link
                    key={item.id}
                    href={search ? `/shop?${search}` : '/shop'}
                    className={category === item.id ? 'is-active' : ''}
                    aria-current={category === item.id ? 'page' : undefined}
                  >
                    {item.label}
                    {item.id === 'all' ? <span>{TGNE_SHOP_ITEMS.length}</span> : null}
                  </Link>
                );
              })}
            </nav>
            <form className="tgne-store-search" action="/shop" method="get" role="search">
              <Icon name="search" size={17} />
              <label className="tgne-visually-hidden" htmlFor="tgne-shop-query">Search shop offerings</label>
              <input
                id="tgne-shop-query"
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search the catalogue"
              />
              {category !== 'all' ? <input type="hidden" name="category" value={category} /> : null}
              <button type="submit" className="tgne-store-search-submit">Search</button>
            </form>
          </div>

          <div className="tgne-store-results">
            <span>{filteredItems.length} {filteredItems.length === 1 ? 'offering' : 'offerings'}</span>
            <span>Availability and pricing confirmed on enquiry</span>
          </div>

          {filteredItems.length ? (
            <div className="tgne-product-grid">
              {filteredItems.map((item, index) => {
                const message = `Hello TGNE Solutions, I am interested in ${item.title}. Please share current availability, pricing, and how to order.`;
                const enquiryUrl = `https://wa.me/233558122767?text=${encodeURIComponent(message)}`;
                return (
                  <article className="tgne-product-card" id={`product-${item.id}`} key={item.id}>
                    <div className={`tgne-product-visual tgne-product-visual-${item.visual}${item.image ? ' tgne-product-visual-has-image' : ''}`} aria-hidden="true">
                      <span className="tgne-product-visual-index">{String(index + 1).padStart(2, '0')}</span>
                      {item.image ? (
                        <Image src={item.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 33vw" />
                      ) : (
                        <div className="tgne-product-art">
                          <span>{item.label}</span>
                          <strong>{item.visual === 'computer' ? 'TECH' : item.visual === 'hosting' ? 'WEB' : item.visual === 'education' ? 'LEARN' : 'TGNE'}</strong>
                          <i />
                        </div>
                      )}
                      <span className="tgne-product-visual-icon"><Icon name={item.icon} size={19} /></span>
                    </div>
                    <div className="tgne-product-content">
                      <div className="tgne-product-meta">
                        <span>{item.category}</span>
                        <span><i /> Enquire</span>
                      </div>
                      <h2>{item.title}</h2>
                      <p>{item.description}</p>
                      <div className="tgne-product-card-footer">
                        <span>Made for your needs</span>
                        <a href={enquiryUrl} target="_blank" rel="noreferrer" aria-label={`${item.action} about ${item.title}`}>
                          {item.action} <Icon name="arrowUpRight" size={15} />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="tgne-store-empty">
              <span><Icon name="search" size={21} /></span>
              <h2>No matching offerings</h2>
              <p>Try a different search or choose another category.</p>
              <Link href="/shop" className="ls-button ls-button-secondary">Show all offerings</Link>
            </div>
          )}

          <p className="tgne-shop-note">
            Catalogue offerings are based on TGNE’s published services. Specific product stock, specifications and prices may change; contact TGNE to confirm details and request a quote before ordering.
          </p>
        </div>
      </section>

      <section className="tgne-affiliate-section">
        <div className="ls-container">
          <div className="tgne-affiliate">
            <div>
              <p className="ls-eyebrow"><span /> Partner with TGNE</p>
              <h2>Affiliate programme</h2>
              <p>
                The archived site described a {TGNE_AFFILIATE.archivedCommission} commission on referred sales, with monthly payouts,
                an affiliate dashboard and dedicated support. {TGNE_AFFILIATE.note}
              </p>
              <ul>
                {TGNE_AFFILIATE.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
              </ul>
            </div>
            <a
              href={'https://wa.me/233558122767?text=' + encodeURIComponent('Hello TGNE Solutions, I would like to ask about your current affiliate programme and terms.')}
              className="ls-button ls-button-light"
              target="_blank"
              rel="noreferrer"
            >
              Ask about the programme <Icon name="arrowUpRight" size={15} />
            </a>
          </div>
        </div>
      </section>

      <section className="tgne-shop-contact tgne-shop-contact-footer-gap">
        <div className="ls-container tgne-shop-contact-inner">
          <div>
            <p className="ls-eyebrow"><span /> Need something specific?</p>
            <h2>Talk to the team before you order.</h2>
            <p>Call {LAND_SITE.officePhone}, {LAND_SITE.phone}, or {LAND_SITE.phoneAlt} during business hours.</p>
          </div>
          <Link href="/contact" className="ls-button ls-button-primary">Contact TGNE <Icon name="arrowRight" size={15} /></Link>
        </div>
      </section>
    </>
  );
}
