import { prisma } from './prisma';
import { clientCode, portfolioSummary, withGain } from './client-portal';

const LISTING_SUMMARY = {
  id: true,
  slug: true,
  title: true,
  region: true,
  district: true,
  community: true,
  landType: true,
  titleStatus: true,
  sizeAcres: true,
  price: true,
  currency: true,
  summary: true,
  imageUrls: true,
  verified: true,
  featured: true,
  status: true
};

export async function ensureClientProfile(user) {
  const existing = await prisma.clientProfile.findUnique({ where: { userId: user.id } });
  if (existing) return existing;
  let profile;
  try {
    profile = await prisma.clientProfile.create({ data: { userId: user.id, clientCode: clientCode() } });
  } catch (error) {
    if (error?.code === 'P2002') {
      const retried = await prisma.clientProfile.findUnique({ where: { userId: user.id } });
      if (retried) return retried;
    }
    throw error;
  }
  try {
    await prisma.landReservation.updateMany({
      where: { email: { equals: user.email, mode: 'insensitive' }, clientId: null },
      data: { clientId: profile.id }
    });
  } catch (error) {
    console.error('Client reservation backfill skipped.', error?.message);
  }
  return profile;
}

export function reservationWhere(profile, user) {
  return { OR: [{ clientId: profile.id }, { email: { equals: user.email, mode: 'insensitive' } }] };
}

export function reservationInvoiceNumber(reference) {
  const value = String(reference || '');
  return /^LL-\d{4}-[A-Z0-9]{6}$/.test(value) ? 'INV-' + value.slice(3) : '';
}

export async function getClientWorkspace(user) {
  const profile = await ensureClientProfile(user);
  const reservations = await prisma.landReservation.findMany({
    where: reservationWhere(profile, user),
    include: { listing: { select: { id: true, slug: true, title: true, region: true, district: true, imageUrls: true, price: true, sizeAcres: true } } },
    orderBy: { createdAt: 'desc' },
    take: 60
  });
  const services = await prisma.serviceRequest.findMany({
    where: { clientId: profile.id },
    include: {
      holding: { select: { id: true, title: true } },
      assignedTo: { select: { id: true, name: true, jobTitle: true } },
      updates: { orderBy: { createdAt: 'asc' }, take: 60 }
    },
    orderBy: { createdAt: 'desc' },
    take: 60
  });
  const [holdings, resales, documents, watches] = await Promise.all([
    prisma.landHolding.findMany({
      where: { clientId: profile.id },
      include: { _count: { select: { documents: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200
    }),
    prisma.resaleRequest.findMany({
      where: { clientId: profile.id },
      include: {
        holding: { select: { id: true, title: true } },
        listing: { select: { id: true, slug: true, status: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 60
    }),
    prisma.clientDocument.findMany({
      where: { clientId: profile.id },
      include: { holding: { select: { id: true, title: true } }, verifiedBy: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    }),
    prisma.landWatch.findMany({
      where: { clientId: profile.id },
      include: { listing: { select: LISTING_SUMMARY } },
      orderBy: { createdAt: 'desc' }
    })
  ]);

  const references = reservations.map((reservation) => reservation.reference);
  const derivedNumbers = [
    ...references.map(reservationInvoiceNumber).filter(Boolean),
    ...services.map((service) => service.invoiceNumber).filter(Boolean)
  ];
  const invoiceFilters = [{ customerEmail: { equals: user.email, mode: 'insensitive' } }];
  if (derivedNumbers.length) invoiceFilters.push({ number: { in: derivedNumbers } });
  const invoices = await prisma.invoice.findMany({
    where: { OR: invoiceFilters },
    orderBy: { issueDate: 'desc' },
    take: 100
  });
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const payments = await prisma.payment.findMany({
    where: {
      OR: [
        ...(invoiceIds.length ? [{ invoiceId: { in: invoiceIds } }] : []),
        ...(references.length ? [{ reference: { in: references } }] : [])
      ]
    },
    include: { invoice: { select: { number: true, description: true } } },
    orderBy: { receivedAt: 'desc' },
    take: 100
  });

  const activeHoldings = holdings.filter((holding) => holding.status !== 'SOLD');
  const portfolio = withGain(portfolioSummary(activeHoldings));
  const totalInvoiced = invoices
    .filter((invoice) => invoice.status !== 'VOID')
    .reduce((total, invoice) => total + Number(invoice.amount || 0), 0);
  const totalPaid = payments.reduce((total, payment) => total + Number(payment.amount || 0), 0);

  return {
    profile,
    user: { name: user.name, email: user.email, phone: user.phone || '' },
    holdings,
    reservations,
    resales,
    services,
    documents,
    watches,
    invoices,
    payments,
    stats: {
      reserveCount: reservations.filter((reservation) => ['PENDING', 'CONFIRMED'].includes(reservation.status)).length,
      activeHoldings: activeHoldings.length,
      openServices: services.filter((service) => !['COMPLETED', 'CANCELLED'].includes(service.status)).length,
      liveResales: resales.filter((resale) => ['SUBMITTED', 'APPROVED', 'LIVE'].includes(resale.status)).length,
      unverifiedDocuments: documents.filter((document) => document.status === 'PENDING').length,
      portfolio,
      totalInvoiced,
      totalPaid,
      outstanding: Math.max(0, totalInvoiced - totalPaid)
    }
  };
}

export async function getClientMarketplace(profile, filters = {}) {
  const match = String(filters.query || '').trim().slice(0, 80);
  const region = String(filters.region || '').trim().slice(0, 60);
  const landType = String(filters.landType || '').trim().toUpperCase().slice(0, 24);
  const where = { status: 'PUBLISHED' };
  if (region) where.region = region;
  if (landType) where.landType = landType;
  if (match) {
    where.OR = [
      { title: { contains: match, mode: 'insensitive' } },
      { region: { contains: match, mode: 'insensitive' } },
      { district: { contains: match, mode: 'insensitive' } },
      { community: { contains: match, mode: 'insensitive' } },
      { summary: { contains: match, mode: 'insensitive' } }
    ];
  }
  const listings = await prisma.landListing.findMany({
    where,
    select: { ...LISTING_SUMMARY, description: true, pricePerAcre: true, highlights: true, coordinates: true, sellerName: true, sellerPhone: true },
    orderBy: [{ featured: 'desc' }, { verified: 'desc' }, { publishedAt: 'desc' }],
    take: 60
  });
  const watchRows = await prisma.landWatch.findMany({
    where: { clientId: profile.id, listingId: { in: listings.map((listing) => listing.id) } },
    select: { listingId: true }
  });
  const watched = new Set(watchRows.map((row) => row.listingId));
  return { listings: listings.map((listing) => ({ ...listing, watched: watched.has(listing.id) })) };
}

export async function clientOwnedHolding(profile, holdingId) {
  if (!holdingId) return null;
  return prisma.landHolding.findFirst({ where: { id: holdingId, clientId: profile.id } });
}

export async function clientOwnedService(profile, serviceId) {
  if (!serviceId) return null;
  return prisma.serviceRequest.findFirst({ where: { id: serviceId, clientId: profile.id } });
}

export async function clientOwnedResale(profile, resaleId) {
  if (!resaleId) return null;
  return prisma.resaleRequest.findFirst({
    where: { id: resaleId, clientId: profile.id },
    include: { listing: { select: { id: true, status: true } }, holding: true }
  });
}
