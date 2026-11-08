import { prisma } from './prisma';
import { DEMO_LISTINGS } from './land-demo';
import { buildListingWhere, listingOrderBy } from './land-commerce';

function demoFiltered(filters) {
  const query = filters.q.toLowerCase();
  return DEMO_LISTINGS.filter((listing) => {
    if (listing.status !== 'PUBLISHED') return false;
    if (filters.region && listing.region !== filters.region) return false;
    if (filters.landType && listing.landType !== filters.landType) return false;
    if (filters.titleStatus && listing.titleStatus !== filters.titleStatus) return false;
    if (filters.minPrice != null && listing.price < filters.minPrice) return false;
    if (filters.maxPrice != null && listing.price > filters.maxPrice) return false;
    if (filters.minAcres != null && listing.sizeAcres < filters.minAcres) return false;
    if (filters.maxAcres != null && listing.sizeAcres > filters.maxAcres) return false;
    if (!query) return true;
    return [listing.title, listing.region, listing.district, listing.community, listing.summary]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
}

function demoSorted(listings, sort) {
  const items = [...listings];
  if (sort === 'newest') return items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  if (sort === 'price_asc') return items.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') return items.sort((a, b) => b.price - a.price);
  if (sort === 'size_desc') return items.sort((a, b) => b.sizeAcres - a.sizeAcres);
  return items.sort((a, b) => Number(b.featured) - Number(a.featured) || Number(b.verified) - Number(a.verified));
}

function paginate(items, filters) {
  const start = (filters.page - 1) * filters.pageSize;
  return {
    listings: items.slice(start, start + filters.pageSize),
    total: items.length,
    page: filters.page,
    pageSize: filters.pageSize,
    pageCount: Math.max(1, Math.ceil(items.length / filters.pageSize)),
    source: 'demo'
  };
}

export async function listPublishedListings(filters) {
  try {
    const where = buildListingWhere(filters);
    const [listings, total] = await Promise.all([
      prisma.landListing.findMany({
        where,
        orderBy: listingOrderBy(filters.sort),
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize
      }),
      prisma.landListing.count({ where })
    ]);
    if (total > 0) {
      return {
        listings,
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        pageCount: Math.max(1, Math.ceil(total / filters.pageSize)),
        source: 'db'
      };
    }
    const published = await prisma.landListing.count({ where: { status: 'PUBLISHED' } });
    if (published > 0) {
      return {
        listings,
        total,
        page: filters.page,
        pageSize: filters.pageSize,
        pageCount: 1,
        source: 'db'
      };
    }
  } catch (error) {
    console.warn('Land storefront database query failed; using the curated catalogue.', error?.message);
  }
  return paginate(demoSorted(demoFiltered(filters), filters.sort), filters);
}

export async function getPublishedListing(slug) {
  try {
    const listing = await prisma.landListing.findFirst({ where: { slug, status: 'PUBLISHED' } });
    if (listing) return listing;
  } catch (error) {
    console.warn('Land storefront detail query failed; using the curated catalogue.', error?.message);
  }
  return DEMO_LISTINGS.find((listing) => listing.slug === slug && listing.status === 'PUBLISHED') || null;
}

export async function getFeaturedListings(limit = 3) {
  try {
    const listings = await prisma.landListing.findMany({
      where: { status: 'PUBLISHED', featured: true },
      orderBy: [{ verified: 'desc' }, { publishedAt: 'desc' }],
      take: limit
    });
    if (listings.length) return listings;
  } catch (error) {
    console.warn('Land storefront featured query failed; using the curated catalogue.', error?.message);
  }
  return demoSorted(DEMO_LISTINGS.filter((listing) => listing.status === 'PUBLISHED'), 'featured').slice(0, limit);
}

export async function getLatestListings(limit = 6) {
  try {
    const listings = await prisma.landListing.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      take: limit
    });
    if (listings.length) return listings;
  } catch (error) {
    console.warn('Land storefront latest query failed; using the curated catalogue.', error?.message);
  }
  return demoSorted(DEMO_LISTINGS.filter((listing) => listing.status === 'PUBLISHED'), 'newest').slice(0, limit);
}

export async function getStorefrontTotals() {
  try {
    const [listings, regions, acres] = await Promise.all([
      prisma.landListing.count({ where: { status: 'PUBLISHED' } }),
      prisma.landListing.findMany({ where: { status: 'PUBLISHED' }, distinct: ['region'], select: { region: true } }),
      prisma.landListing.aggregate({ where: { status: 'PUBLISHED' }, _sum: { sizeAcres: true } })
    ]);
    if (listings > 0) {
      return { listings, regions: regions.length, acres: Math.round(acres._sum.sizeAcres || 0) };
    }
  } catch (error) {
    console.warn('Land storefront totals query failed; using the curated catalogue.', error?.message);
  }
  const demo = DEMO_LISTINGS.filter((listing) => listing.status === 'PUBLISHED');
  return {
    listings: demo.length,
    regions: new Set(demo.map((listing) => listing.region)).size,
    acres: Math.round(demo.reduce((total, listing) => total + listing.sizeAcres, 0))
  };
}

export async function getRelatedListings(listing, limit = 3) {
  try {
    const listings = await prisma.landListing.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: listing.id },
        OR: [{ region: listing.region }, { landType: listing.landType }]
      },
      orderBy: [{ region: 'asc' }, { featured: 'desc' }],
      take: limit
    });
    if (listings.length) return listings;
  } catch (error) {
    console.warn('Land storefront related query failed; using the curated catalogue.', error?.message);
  }
  return DEMO_LISTINGS
    .filter((item) => item.status === 'PUBLISHED' && item.id !== listing.id && (item.region === listing.region || item.landType === listing.landType))
    .slice(0, limit);
}

export async function getReservationByReference(reference) {
  if (!/^LL-\d{4}-[A-Z0-9]{6}$/.test(String(reference || ''))) return null;
  try {
    return await prisma.landReservation.findUnique({ where: { reference }, include: { listing: true } });
  } catch (error) {
    console.warn('Reservation lookup failed.', error?.message);
    return null;
  }
}

export async function findReservation(reference, email) {
  const reservation = await getReservationByReference(reference);
  if (!reservation) return null;
  if (String(reservation.email).toLowerCase() !== String(email || '').trim().toLowerCase()) return null;
  return reservation;
}
