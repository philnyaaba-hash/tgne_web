import Link from 'next/link';
import ListingCard from '../../../components/land/listing-card';
import Icon from '../../../components/land/icons';
import { GHANA_REGIONS } from '../../../lib/ghana-regions';
import {
  formatAcres,
  formatGhs,
  labelFor,
  LAND_TYPES,
  parseListingFilters,
  SORT_OPTIONS,
  TITLE_STATUSES
} from '../../../lib/land-commerce';
import { listPublishedListings } from '../../../lib/land-store';
import { createPageMetadata } from '../../../lib/site-metadata';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'Land for sale in Ghana',
  description: 'Search residential, commercial and agricultural land listings managed by TGNE Solutions across Ghana by region, title status, size and price.',
  path: '/listings'
});

function hrefFor(filters, overrides = {}) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.region) params.set('region', next.region);
  if (next.landType) params.set('landType', next.landType);
  if (next.titleStatus) params.set('titleStatus', next.titleStatus);
  if (next.minPrice != null) params.set('minPrice', String(next.minPrice));
  if (next.maxPrice != null) params.set('maxPrice', String(next.maxPrice));
  if (next.minAcres != null) params.set('minAcres', String(next.minAcres));
  if (next.maxAcres != null) params.set('maxAcres', String(next.maxAcres));
  if (next.sort && next.sort !== 'featured') params.set('sort', next.sort);
  if (next.page > 1) params.set('page', String(next.page));
  const query = params.toString();
  return '/listings' + (query ? '?' + query : '');
}

function activeChips(filters) {
  const chips = [];
  if (filters.q) chips.push({ key: 'q', label: '“' + filters.q + '”', href: hrefFor(filters, { q: '', page: 1 }) });
  if (filters.region) chips.push({ key: 'region', label: filters.region, href: hrefFor(filters, { region: '', page: 1 }) });
  if (filters.landType) chips.push({ key: 'landType', label: labelFor(LAND_TYPES, filters.landType), href: hrefFor(filters, { landType: '', page: 1 }) });
  if (filters.titleStatus) chips.push({ key: 'titleStatus', label: labelFor(TITLE_STATUSES, filters.titleStatus), href: hrefFor(filters, { titleStatus: '', page: 1 }) });
  if (filters.minPrice != null || filters.maxPrice != null) {
    const label = (filters.minPrice != null ? formatGhs(filters.minPrice) : 'Any') + ' – ' + (filters.maxPrice != null ? formatGhs(filters.maxPrice) : 'Any');
    chips.push({ key: 'price', label, href: hrefFor(filters, { minPrice: null, maxPrice: null, page: 1 }) });
  }
  if (filters.minAcres != null || filters.maxAcres != null) {
    const label = (filters.minAcres != null ? filters.minAcres + ' ac' : 'Any') + ' – ' + (filters.maxAcres != null ? filters.maxAcres + ' ac' : 'Any');
    chips.push({ key: 'acres', label, href: hrefFor(filters, { minAcres: null, maxAcres: null, page: 1 }) });
  }
  return chips;
}

export default async function ListingsPage({ searchParams }) {
  const params = await searchParams;
  const filters = parseListingFilters(params);
  const result = await listPublishedListings(filters);
  const chips = activeChips(filters);
  const start = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const end = Math.min(result.page * result.pageSize, result.total);
  const pages = Array.from({ length: result.pageCount }, (_, index) => index + 1).filter(
    (page) => page === 1 || page === result.pageCount || Math.abs(page - result.page) <= 1
  );

  return (
    <>
      <section className="ls-page-head">
        <div className="ls-container">
          <p className="ls-eyebrow">The land list</p>
          <div className="ls-page-head-row">
            <h1>Land for sale</h1>
            <p>{result.total} published {result.total === 1 ? 'plot' : 'plots'} across Ghana, each with its title status shown.</p>
          </div>
        </div>
      </section>

      <section className="ls-container ls-listings-layout">
        <form className="ls-filters" action="/listings" method="get">
          <div className="ls-filters-head">
            <h2>Refine the list</h2>
            {chips.length ? <Link href="/listings">Reset all</Link> : null}
          </div>

          <div className="ls-field">
            <label htmlFor="filter-q">Search</label>
            <input id="filter-q" name="q" type="search" defaultValue={filters.q} placeholder="Town, district or listing" />
          </div>

          <div className="ls-field">
            <label htmlFor="filter-region">Region</label>
            <select id="filter-region" name="region" defaultValue={filters.region}>
              <option value="">All regions</option>
              {GHANA_REGIONS.map((region) => <option key={region} value={region}>{region}</option>)}
            </select>
          </div>

          <div className="ls-field">
            <label htmlFor="filter-type">Land use</label>
            <select id="filter-type" name="landType" defaultValue={filters.landType}>
              <option value="">Any use</option>
              {LAND_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>

          <div className="ls-field">
            <label htmlFor="filter-title">Title status</label>
            <select id="filter-title" name="titleStatus" defaultValue={filters.titleStatus}>
              <option value="">Any title</option>
              {TITLE_STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>

          <div className="ls-field-pair">
            <div className="ls-field">
              <label htmlFor="filter-min-price">Min price (GH₵)</label>
              <input id="filter-min-price" name="minPrice" type="number" min="0" step="1000" defaultValue={filters.minPrice ?? ''} placeholder="0" />
            </div>
            <div className="ls-field">
              <label htmlFor="filter-max-price">Max price (GH₵)</label>
              <input id="filter-max-price" name="maxPrice" type="number" min="0" step="1000" defaultValue={filters.maxPrice ?? ''} placeholder="No limit" />
            </div>
          </div>

          <div className="ls-field-pair">
            <div className="ls-field">
              <label htmlFor="filter-min-acres">Min size (acres)</label>
              <input id="filter-min-acres" name="minAcres" type="number" min="0" step="0.05" defaultValue={filters.minAcres ?? ''} placeholder="Any" />
            </div>
            <div className="ls-field">
              <label htmlFor="filter-max-acres">Max size (acres)</label>
              <input id="filter-max-acres" name="maxAcres" type="number" min="0" step="0.05" defaultValue={filters.maxAcres ?? ''} placeholder="Any" />
            </div>
          </div>

          <div className="ls-field">
            <label htmlFor="filter-sort">Order by</label>
            <select id="filter-sort" name="sort" defaultValue={filters.sort}>
              {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <button type="submit" className="ls-button ls-button-primary ls-button-block">
            Apply filters
            <Icon name="arrowRight" size={15} />
          </button>
        </form>

        <div className="ls-results">
          <div className="ls-results-bar">
            <p>
              {result.total ? <>Showing <strong>{start}–{end}</strong> of <strong>{result.total}</strong></> : 'No plots match these filters'}
            </p>
            <span>{labelFor(SORT_OPTIONS, filters.sort)}</span>
          </div>

          {chips.length ? (
            <div className="ls-chips">
              {chips.map((chip) => (
                <Link key={chip.key} href={chip.href} className="ls-chip">
                  {chip.label}
                  <Icon name="close" size={12} />
                </Link>
              ))}
            </div>
          ) : null}

          {result.listings.length ? (
            <div className="ls-grid ls-grid-list">
              {result.listings.map((listing, index) => <ListingCard key={listing.id} listing={listing} priority={index < 3} />)}
            </div>
          ) : (
            <div className="ls-empty">
              <span className="ls-empty-icon"><Icon name="mapPin" size={24} /></span>
              <h2>Nothing matches yet</h2>
              <p>Try a wider price range, a different region, or clear the filters to see every published plot.</p>
              <Link href="/listings" className="ls-button ls-button-secondary">Clear filters</Link>
            </div>
          )}

          {result.pageCount > 1 ? (
            <nav className="ls-pagination" aria-label="Listing pages">
              {result.page > 1 ? (
                <Link href={hrefFor(filters, { page: result.page - 1 })} className="ls-page-btn">
                  <Icon name="arrowLeft" size={14} /> Previous
                </Link>
              ) : <span className="ls-page-btn is-disabled"><Icon name="arrowLeft" size={14} /> Previous</span>}

              <div className="ls-page-numbers">
                {pages.map((page, index) => (
                  <span key={page} className="ls-page-number-wrap">
                    {index > 0 && page - pages[index - 1] > 1 ? <span className="ls-page-gap">…</span> : null}
                    <Link
                      href={hrefFor(filters, { page })}
                      className={page === result.page ? 'ls-page-number is-current' : 'ls-page-number'}
                      aria-current={page === result.page ? 'page' : undefined}
                    >
                      {page}
                    </Link>
                  </span>
                ))}
              </div>

              {result.page < result.pageCount ? (
                <Link href={hrefFor(filters, { page: result.page + 1 })} className="ls-page-btn">
                  Next <Icon name="arrowRight" size={14} />
                </Link>
              ) : <span className="ls-page-btn is-disabled">Next <Icon name="arrowRight" size={14} /></span>}
            </nav>
          ) : null}

          <p className="ls-results-note">
            <Icon name="info" size={14} />
            Listings show the title status we have confirmed. Ask for the document pack before paying any fee.
          </p>
        </div>
      </section>
    </>
  );
}
