import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Icon from '../../../../components/land/icons';
import ReservationForm from '../../../../components/land/reservation-form';
import { formatAcres, formatGhs, labelFor, TITLE_STATUSES } from '../../../../lib/land-commerce';
import { getPublishedListing } from '../../../../lib/land-store';
import { LAND_SITE } from '../../../../lib/land-site';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const listing = await getPublishedListing(slug);
  return { title: listing ? 'Reserve ' + listing.title : 'Reserve land' };
}

export default async function ReservePage({ params }) {
  const { slug } = await params;
  const listing = await getPublishedListing(slug);
  if (!listing) notFound();
  const cover = listing.imageUrls?.[0] || '/assets/land/hero.png';

  return (
    <>
      <div className="ls-container ls-breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/listings">Land for sale</Link>
        <span>/</span>
        <Link href={'/listings/' + listing.slug}>{listing.title}</Link>
        <span>/</span>
        <span>Reserve</span>
      </div>

      <section className="ls-page-head ls-page-head-small">
        <div className="ls-container">
          <p className="ls-eyebrow">Secure the plot</p>
          <div className="ls-page-head-row">
            <h1>Reserve {listing.title}</h1>
            <p>Send a reservation request. The office reviews it and replies within one business day with payment instructions.</p>
          </div>
        </div>
      </section>

      <section className="ls-container ls-reserve-layout">
        <div className="ls-reserve-main">
          <div className="ls-reserve-steps">
            <span className="is-current"><em>1</em> Your details</span>
            <span><em>2</em> Office review</span>
            <span><em>3</em> Payment and documents</span>
          </div>
          <ReservationForm listing={listing} />
        </div>

        <aside className="ls-reserve-aside">
          <div className="ls-summary-card">
            <div className="ls-summary-media">
              <Image src={cover} alt={listing.title} fill sizes="(max-width: 900px) 100vw, 32vw" className="ls-cover-image" />
            </div>
            <div className="ls-summary-body">
              <span className="ls-badge ls-badge-verified"><Icon name="shield" size={12} /> {listing.verified ? 'Title verified' : labelFor(TITLE_STATUSES, listing.titleStatus)}</span>
              <h2>{listing.title}</h2>
              <p>{[listing.community, listing.district, listing.region].filter(Boolean).join(' · ')}</p>
              <dl>
                <div><dt>Plot size</dt><dd>{formatAcres(listing.sizeAcres)}</dd></div>
                <div><dt>Full price</dt><dd>{formatGhs(listing.price)}</dd></div>
                <div className="is-total"><dt>Reservation fee</dt><dd>{formatGhs(Math.max(2000, Math.round((listing.price * 0.05) / 100) * 100))}</dd></div>
              </dl>
              <p className="ls-summary-note">
                The reservation fee is credited against the purchase price if the sale completes. It is refundable only
                under the terms shared before payment.
              </p>
            </div>
          </div>

          <div className="ls-aside-help">
            <h3>Before you reserve</h3>
            <ul className="ls-check-list is-compact">
              <li><Icon name="check" size={14} /> Ask for the document pack</li>
              <li><Icon name="check" size={14} /> Walk the boundary with the surveyor</li>
              <li><Icon name="check" size={14} /> Confirm the payment schedule in writing</li>
            </ul>
            <p>Questions first? <a href={'mailto:' + LAND_SITE.email}>{LAND_SITE.email}</a></p>
          </div>
        </aside>
      </section>
    </>
  );
}
