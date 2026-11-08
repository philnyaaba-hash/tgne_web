import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { validateListing } from '../../../../../lib/land-commerce';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SIMPLE_FIELDS = new Set(['status', 'featured', 'verified']);

export async function PATCH(request, { params }) {
  const auth = await requirePermission('land.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  let input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Request must contain valid JSON.' }, { status: 400 });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ error: 'Request must be a JSON object.' }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.landListing.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

  const keys = Object.keys(input);
  const simple = keys.length > 0 && keys.every((key) => SIMPLE_FIELDS.has(key));
  let data;
  if (simple) {
    data = {};
    if (keys.includes('status')) {
      const validation = validateListing({ ...existing, status: input.status, highlights: existing.highlights, imageUrls: existing.imageUrls });
      // validateListing checks the whole record; for a status-only edit only the enum matters.
      const status = String(input.status || '').toUpperCase();
      if (!validation.ok && validation.errors.status) {
        return NextResponse.json({ error: validation.errors.status }, { status: 400 });
      }
      data.status = status;
      if (status === 'PUBLISHED' && !existing.publishedAt) data.publishedAt = new Date();
    }
    if (Object.prototype.hasOwnProperty.call(input, 'featured')) data.featured = input.featured === true;
    if (Object.prototype.hasOwnProperty.call(input, 'verified')) data.verified = input.verified === true;
  } else {
    const validation = validateListing({ ...existing, ...input });
    if (!validation.ok) {
      return NextResponse.json({ error: 'Please check the listing details.', fields: validation.errors }, { status: 400 });
    }
    data = {
      ...validation.value,
      pricePerAcre: Math.round(validation.value.price / validation.value.sizeAcres)
    };
    if (validation.value.status === 'PUBLISHED' && !existing.publishedAt) data.publishedAt = new Date();
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const listing = await tx.landListing.update({ where: { id }, data });
      await recordAudit(tx, auth.user.id, 'land.listing_updated', 'LandListing', id, {
        fields: Object.keys(data)
      });
      return listing;
    });
    return NextResponse.json({ listing: updated });
  } catch (error) {
    console.error('Land listing could not be updated.', error?.message);
    return NextResponse.json({ error: 'The listing could not be updated.' }, { status: 503 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await requirePermission('land.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.landListing.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!existing) return NextResponse.json({ error: 'Listing not found.' }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.landListing.update({ where: { id }, data: { status: 'ARCHIVED' } });
      await recordAudit(tx, auth.user.id, 'land.listing_archived', 'LandListing', id, { title: existing.title });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Land listing could not be archived.', error?.message);
    return NextResponse.json({ error: 'The listing could not be archived.' }, { status: 503 });
  }
}
