import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../../lib/office-auth';
import { prisma } from '../../../../../../lib/prisma';
import { isTitleStatus, slugify } from '../../../../../../lib/land-commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function clean(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function uniqueSlug(tx, title) {
  const base = slugify(title) || 'resale-land';
  let candidate = base;
  let suffix = 2;
  while (await tx.landListing.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = base + '-' + suffix;
    suffix += 1;
    if (suffix > 60) return base + '-' + Date.now();
  }
  return candidate;
}

function listingData(resale, slug) {
  const holding = resale.holding;
  const titleStatus = holding && isTitleStatus(holding.titleStatus) ? holding.titleStatus : 'PENDING';
  const summary = resale.description.length > 260 ? resale.description.slice(0, 257) + '…' : resale.description;
  return {
    slug,
    title: resale.title,
    region: resale.region,
    district: resale.district,
    community: resale.community,
    landType: 'RESIDENTIAL',
    titleStatus,
    sizeAcres: resale.sizeAcres,
    price: resale.askingPrice,
    pricePerAcre: resale.sizeAcres > 0 ? Math.round(resale.askingPrice / resale.sizeAcres) : null,
    currency: 'GHS',
    summary,
    description: resale.description,
    highlights: [
      resale.sizeAcres + (resale.sizeAcres === 1 ? ' acre' : ' acres'),
      resale.district + ', ' + resale.region,
      'Resale by a verified LandLedger client'
    ],
    imageUrls: ['/assets/land/residential.png'],
    coordinates: holding?.coordinates || null,
    sellerName: resale.client.user.name,
    sellerPhone: resale.client.user.phone || null,
    sellerEmail: resale.client.user.email,
    verified: false,
    featured: false,
    status: 'PUBLISHED',
    publishedAt: new Date()
  };
}

export async function PATCH(request, { params }) {
  const auth = await requirePermission('client.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  const action = String(input?.action || '').toLowerCase();
  const note = clean(input?.note, 2000);
  if (!['approve', 'reject', 'sold', 'note'].includes(action)) {
    return NextResponse.json({ error: 'Choose a valid resale action.' }, { status: 400 });
  }

  const existing = await prisma.resaleRequest.findUnique({
    where: { id },
    include: {
      client: { include: { user: { select: { name: true, email: true, phone: true } } } },
      holding: true,
      listing: { select: { id: true, slug: true, status: true } }
    }
  });
  if (!existing) return NextResponse.json({ error: 'Resale request not found.' }, { status: 404 });

  try {
    const resale = await prisma.$transaction(async (tx) => {
      if (action === 'approve') {
        if (!['SUBMITTED', 'APPROVED', 'REJECTED'].includes(existing.status)) {
          throw Object.assign(new Error('This resale can no longer be approved.'), { status: 409 });
        }
        let listingId = existing.listingId;
        if (listingId) {
          await tx.landListing.update({
            where: { id: listingId },
            data: {
              title: existing.title,
              region: existing.region,
              district: existing.district,
              community: existing.community,
              sizeAcres: existing.sizeAcres,
              price: existing.askingPrice,
              pricePerAcre: existing.sizeAcres > 0 ? Math.round(existing.askingPrice / existing.sizeAcres) : null,
              description: existing.description,
              status: 'PUBLISHED',
              publishedAt: new Date()
            }
          });
        } else {
          const slug = await uniqueSlug(tx, existing.title);
          const listing = await tx.landListing.create({ data: listingData(existing, slug) });
          listingId = listing.id;
        }
        const updated = await tx.resaleRequest.update({
          where: { id },
          data: { status: 'LIVE', listingId, reviewNote: note || null, reviewedById: auth.user.id, reviewedAt: new Date() }
        });
        if (existing.holdingId) {
          await tx.landHolding.update({ where: { id: existing.holdingId }, data: { status: 'RESALE' } });
        }
        await recordAudit(tx, auth.user.id, 'client.resale_approved', 'ResaleRequest', id, {
          reference: existing.reference,
          listingId
        });
        return updated;
      }

      if (action === 'reject') {
        if (!['SUBMITTED', 'APPROVED', 'LIVE'].includes(existing.status)) {
          throw Object.assign(new Error('This resale cannot be returned for changes.'), { status: 409 });
        }
        if (existing.listingId) {
          await tx.landListing.update({ where: { id: existing.listingId }, data: { status: 'ARCHIVED' } });
        }
        const updated = await tx.resaleRequest.update({
          where: { id },
          data: { status: 'REJECTED', reviewNote: note || 'Please update the resale details.', reviewedById: auth.user.id, reviewedAt: new Date() }
        });
        if (existing.holdingId) {
          await tx.landHolding.update({ where: { id: existing.holdingId }, data: { status: 'ACTIVE' } });
        }
        await recordAudit(tx, auth.user.id, 'client.resale_rejected', 'ResaleRequest', id, { reference: existing.reference });
        return updated;
      }

      if (action === 'sold') {
        if (!['LIVE', 'APPROVED'].includes(existing.status)) {
          throw Object.assign(new Error('Only a live resale can be marked sold.'), { status: 409 });
        }
        if (existing.listingId) {
          await tx.landListing.update({ where: { id: existing.listingId }, data: { status: 'SOLD' } });
        }
        const updated = await tx.resaleRequest.update({
          where: { id },
          data: { status: 'SOLD', reviewNote: note || null, reviewedById: auth.user.id, reviewedAt: new Date() }
        });
        if (existing.holdingId) {
          await tx.landHolding.update({ where: { id: existing.holdingId }, data: { status: 'SOLD' } });
        }
        await recordAudit(tx, auth.user.id, 'client.resale_sold', 'ResaleRequest', id, { reference: existing.reference });
        return updated;
      }

      const updated = await tx.resaleRequest.update({ where: { id }, data: { reviewNote: note || null } });
      await recordAudit(tx, auth.user.id, 'client.resale_note', 'ResaleRequest', id, { reference: existing.reference });
      return updated;
    }, { timeout: 15000 });

    return NextResponse.json({ resale });
  } catch (error) {
    if (error?.status) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Client desk resale action failed.', error?.message);
    return NextResponse.json({ error: 'The resale request could not be updated.' }, { status: 503 });
  }
}
