import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '../../../../components/land/icons';
import InquiryForm from '../../../../components/land/inquiry-form';
import ListingCard from '../../../../components/land/listing-card';
import {
  formatAcres,
  formatDate,
  formatGhs,
  labelFor,
  LAND_TYPES,
  reservationAmount,
  TITLE_STATUSES
} from '../../../../lib/land-commerce';
import { getPublishedListing, getRelatedListings } from '../../../../lib/land-store';
import { LAND_SITE } from '../../../../lib/land-site';
import { tgneShareImage } from '../../../../lib/site-metadata';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const listing = await getPublishedListing(slug);
  if (!listing) return { title: 'Listing not found' };
  return {
    title: listing.title + ' — ' + listing.region,
    description: listing.summary,
    openGraph: {
      title: listing.title,
      description: listing.summary,
      type: 'website',
      images: [
        tgneShareImage,
        ...(listing.imageUrls?.length ? [{ url: listing.imageUrls[0] }] : [])
      ]
    }
  };
}

export default async function ListingPage({ params }) {
  const { slug } = await params;
  const listing = await getPublishedListing(slug);
  if (!listing) notFound();

  const related = await getRelatedListings(listing, 3);
  const images = (listing.imageUrls || []).filter(Boolean);
  const cover = images[0] || '/assets/land/hero.png';
  const secondary = images.slice(1, 3);
  const fee = reservationAmount(listing.price);
  const paragraphs = String(listing.description || '').split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const mapHref = listing.coordinates
    ? 'https://www.openstreetmap.org/?mlat=' + encodeURIComponent(listing.coordinates.split(',')[0]) + '&mlon=' + encodeURIComponent(listing.coordinates.split(',')[1]) + '#map=14/' + listing.coordinates.split(',')[0] + '/' + listing.coordinates.split(',')[1]
    : '';
  const baseUrl = (process.env.APP_URL || '').replace(/\/+$/, '');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.summary,
    image: images.map((image) => (baseUrl ? baseUrl + image : image)),
    offers: {
      '@type': 'Offer',
      price: listing.price,
      priceCurrency: listing.currency || 'GHS',
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: LAND_SITE.name }
    }
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <div className="ls-container ls-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/listings">Land for sale</Link>
        <span>/</span>
        <span>{listing.title}</span>
      </div>

      <section className="ls-container ls-detail-head">
        <div>
          <div className="ls-detail-badges">
            {listing.verified ? <span className="ls-badge ls-badge-verified"><Icon name="shield" size={12} /> Title verified</span> : null}
            {listing.featured ? <span className="ls-badge ls-badge-featured">Featured plot</span> : null}
            <span className="ls-badge ls-badge-muted">{labelFor(TITLE_STATUSES, listing.titleStatus)}</span>
          </div>
          <h1>{listing.title}</h1>
          <p className="ls-detail-location">
            <Icon name="mapPin" size={15} />
            {[listing.community, listing.district, listing.region].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="ls-detail-price">
          <strong>{formatGhs(listing.price)}</strong>
          <span>{formatGhs(listing.pricePerAcre || Math.round(listing.price / listing.sizeAcres))} per acre</span>
        </div>
      </section>

      <section className={secondary.length ? 'ls-container ls-gallery has-secondary' : 'ls-container ls-gallery'}>
        <div className="ls-gallery-main">
          <Image src={cover} alt={listing.title} fill priority sizes="(max-width: 900px) 100vw, 66vw" className="ls-cover-image" />
          <span className="ls-gallery-label">{labelFor(LAND_TYPES, listing.landType)} land</span>
        </div>
        {secondary.map((image, index) => (
          <div key={image + index} className="ls-gallery-thumb">
            <Image src={image} alt={listing.title + ' — view ' + (index + 2)} fill sizes="(max-width: 900px) 50vw, 17vw" className="ls-cover-image" />
          </div>
        ))}
      </section>

      <section className="ls-container ls-detail-layout">
        <div className="ls-detail-main">
          <div className="ls-facts">
            <div><span>Size</span><strong>{formatAcres(listing.sizeAcres)}</strong></div>
            <div><span>Land use</span><strong>{labelFor(LAND_TYPES, listing.landType)}</strong></div>
            <div><span>Title</span><strong>{labelFor(TITLE_STATUSES, listing.titleStatus)}</strong></div>
            <div><span>District</span><strong>{listing.district}</strong></div>
            <div><span>Region</span><strong>{listing.region}</strong></div>
            <div><span>Listed</span><strong>{formatDate(listing.publishedAt)}</strong></div>
          </div>

          <article className="ls-prose">
            <h2>About this land</h2>
            <p className="ls-prose-lead">{listing.summary}</p>
            {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </article>

          {listing.highlights?.length ? (
            <section className="ls-panel">
              <h2>What comes with it</h2>
              <ul className="ls-highlight-grid">
                {listing.highlights.map((highlight) => (
                  <li key={highlight}><Icon name="check" size={15} /> {highlight}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="ls-panel ls-docs">
            <div className="ls-panel-head">
              <span className="ls-panel-icon"><Icon name="document" size={19} /></span>
              <div>
                <h2>Documents and checks</h2>
                <p>Ask for the document pack before you pay any fee. The office shares it before a reservation is confirmed.</p>
              </div>
            </div>
            <div className="ls-docs-grid">
              <div><strong>Title search</strong><span>{listing.verified ? 'Completed for this listing' : 'In progress — disclosed on the listing'}</span></div>
              <div><strong>Site plan</strong><span>Available from the land officer</span></div>
              <div><strong>Indenture</strong><span>{listing.titleStatus === 'CUSTOMARY' ? 'Family consent and transfer record' : 'Copy shared on request'}</span></div>
              <div><strong>Boundary report</strong><span>Walked and recorded before listing</span></div>
            </div>
            {listing.coordinates ? (
              <a className="ls-text-link" href={mapHref} target="_blank" rel="noreferrer noopener">
                View approximate location on a map
                <Icon name="arrowUpRight" size={14} />
              </a>
            ) : null}
          </section>

          <section className="ls-panel" id="enquire">
            <InquiryForm
              listingSlug={listing.slug}
              defaultType="VIEWING"
              heading="Ask about this plot"
              intro="Request the document pack, book a site visit, or ask a question about the title. A land officer replies within one business day."
            />
          </section>
        </div>

        <aside className="ls-detail-aside">
          <div className="ls-buy-card">
            <p className="ls-eyebrow">Reserve this land</p>
            <div className="ls-buy-price">
              <strong>{formatGhs(listing.price)}</strong>
              <span>{formatAcres(listing.sizeAcres)} · {listing.region}</span>
            </div>
            <p className="ls-buy-fee">
              Reservation fee <strong>{formatGhs(fee)}</strong>
              <span>5% of the price, minimum GH₵ 2,000. Credited against the purchase price if the sale completes.</span>
            </p>
            <Link href={'/reserve/' + listing.slug} className="ls-button ls-button-primary ls-button-block">
              Reserve this plot
              <Icon name="arrowRight" size={15} />
            </Link>
            <a href="#enquire" className="ls-button ls-button-secondary ls-button-block">Book a site visit</a>
            <ul className="ls-buy-checks">
              <li><Icon name="shield" size={14} /> Title status shown up front</li>
              <li><Icon name="users" size={14} /> A person reviews every reservation</li>
              <li><Icon name="document" size={14} /> Documents before payment</li>
            </ul>
            <p className="ls-buy-contact">
              Prefer to talk first?
              <a href={'mailto:' + LAND_SITE.email}>{LAND_SITE.email}</a>
            </p>
          </div>
        </aside>
      </section>

      {related.length ? (
        <section className="ls-section ls-section-tight">
          <div className="ls-container">
            <div className="ls-section-head">
              <div>
                <p className="ls-eyebrow">Nearby and similar</p>
                <h2>Other land to compare</h2>
              </div>
              <Link href="/listings" className="ls-text-link">See all listings <Icon name="arrowRight" size={14} /></Link>
            </div>
            <div className="ls-grid ls-grid-3">
              {related.map((item) => <ListingCard key={item.id} listing={item} />)}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
