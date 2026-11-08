import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { slugify, validateListing } from '../../../../lib/land-commerce';
import { LAND_SITE } from '../../../../lib/land-site';
import { optionalString } from '../../../../lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LISTING_INCLUDE = {
  _count: { select: { reservations: true, inquiries: true } }
};

async function getOverview() {
  const [listings, reservations, inquiries] = await Promise.all([
    prisma.landListing.findMany({ include: LISTING_INCLUDE, orderBy: [{ featured: 'desc' }, { updatedAt: 'desc' }], take: 200 }),
    prisma.landReservation.findMany({
      include: { listing: { select: { title: true, slug: true, region: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    }),
    prisma.landInquiry.findMany({
      include: { listing: { select: { title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
  ]);
  return { listings, reservations, inquiries };
}

export async function GET() {
  const auth = await requirePermission('land.view');
  if (auth.response) return auth.response;

  try {
    const data = await getOverview();
    const published = data.listings.filter((listing) => listing.status === 'PUBLISHED').length;
    return NextResponse.json({
      ...data,
      ready: true,
      canManage: auth.user.permissions.includes('land.manage'),
      stats: {
        listings: data.listings.length,
        published,
        pendingReservations: data.reservations.filter((reservation) => reservation.status === 'PENDING').length,
        newInquiries: data.inquiries.filter((inquiry) => inquiry.status === 'NEW').length
      }
    });
  } catch (error) {
    console.error('Land storefront admin query failed.', error?.message);
    return NextResponse.json({
      listings: [],
      reservations: [],
      inquiries: [],
      ready: false,
      canManage: auth.user.permissions.includes('land.manage'),
      stats: { listings: 0, published: 0, pendingReservations: 0, newInquiries: 0 },
      error: 'The storefront tables are not available yet. Apply the latest database migration.'
    });
  }
}

async function uniqueSlug(title) {
  const base = slugify(title) || 'land-listing';
  let candidate = base;
  let suffix = 2;
  while (await prisma.landListing.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = base + '-' + suffix;
    suffix += 1;
    if (suffix > 50) return base + '-' + Date.now();
  }
  return candidate;
}

export async function POST(request) {
  const auth = await requirePermission('land.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const validation = validateListing(input);
  if (!validation.ok) {
    return NextResponse.json({ error: 'Please check the listing details.', fields: validation.errors }, { status: 400 });
  }

  const slug = await uniqueSlug(validation.value.title);
  const { price } = validation.value;
  const data = {
    ...validation.value,
    slug,
    pricePerAcre: Math.round(price / validation.value.sizeAcres),
    sellerName: optionalString(input.sellerName, 120) || LAND_SITE.name,
    sellerPhone: optionalString(input.sellerPhone, 40),
    sellerEmail: optionalString(input.sellerEmail, 254) || LAND_SITE.email,
    publishedAt: new Date()
  };

  try {
    const created = await prisma.$transaction(async (tx) => {
      const listing = await tx.landListing.create({ data });
      await recordAudit(tx, auth.user.id, 'land.listing_created', 'LandListing', listing.id, {
        title: listing.title,
        status: listing.status
      });
      return listing;
    });
    return NextResponse.json({ listing: created }, { status: 201 });
  } catch (error) {
    console.error('Land listing could not be created.', error?.message);
    return NextResponse.json({ error: 'The listing could not be saved.' }, { status: 503 });
  }
}
