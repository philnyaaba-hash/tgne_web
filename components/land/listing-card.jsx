import Image from 'next/image';
import Link from 'next/link';
import Icon from './icons';
import { formatAcres, formatGhs, labelFor, TITLE_STATUSES } from '../../lib/land-commerce';

export default function ListingCard({ listing, priority = false }) {
  const cover = (listing.imageUrls && listing.imageUrls[0]) || '/assets/land/hero.png';
  const verified = listing.verified === true;

  return (
    <article className="ls-card">
      <Link href={'/listings/' + listing.slug} className="ls-card-media" aria-label={'View ' + listing.title}>
        <Image
          src={cover}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={priority}
          className="ls-card-image"
        />
        <span className="ls-card-badges">
          {verified ? <span className="ls-badge ls-badge-verified"><Icon name="shield" size={12} /> Title verified</span> : null}
          {listing.featured ? <span className="ls-badge ls-badge-featured">Featured</span> : null}
        </span>
        <span className="ls-card-price">{formatGhs(listing.price)}</span>
      </Link>

      <div className="ls-card-body">
        <p className="ls-card-location">
          <Icon name="mapPin" size={13} />
          {[listing.community, listing.district, listing.region].filter(Boolean).join(' · ')}
        </p>
        <h3><Link href={'/listings/' + listing.slug}>{listing.title}</Link></h3>
        <p className="ls-card-summary">{listing.summary}</p>
        <div className="ls-card-meta">
          <span><Icon name="ruler" size={13} /> {formatAcres(listing.sizeAcres)}</span>
          <span>{labelFor(TITLE_STATUSES, listing.titleStatus)}</span>
          <span>{formatGhs(listing.pricePerAcre || Math.round(listing.price / listing.sizeAcres))}<small>/acre</small></span>
        </div>
        <Link href={'/listings/' + listing.slug} className="ls-card-link">
          View this land
          <Icon name="arrowRight" size={14} />
        </Link>
      </div>
    </article>
  );
}
