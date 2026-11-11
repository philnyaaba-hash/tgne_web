import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../../lib/office-auth';
import { prisma } from '../../../../../lib/prisma';
import { COMPLIANCE_STATUSES, RETIRED_COMPLIANCE_CATALOG_KEYS } from '../../../../../lib/compliance-ghana';
import { optionalString, parseDate } from '../../../../../lib/validation';

export const runtime = 'nodejs';

const INCLUDE = {
  owner: { select: { id: true, name: true, jobTitle: true } },
  filedBy: { select: { id: true, name: true } }
};

const EDITABLE_STATUSES = ['PENDING', 'IN_PROGRESS', 'FILED', 'WAIVED'];

function cleanUrl(value) {
  const text = optionalString(value, 500);
  if (!text) return null;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function PATCH(request, { params }) {
  const auth = await requirePermission('compliance.manage');
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
  const existing = await prisma.complianceObligation.findUnique({ where: { id } });
  if (!existing || RETIRED_COMPLIANCE_CATALOG_KEYS.includes(existing.catalogKey)) {
    return NextResponse.json({ error: 'Compliance obligation not found.' }, { status: 404 });
  }

  const data = {};

  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    const status = requiredStatus(input.status);
    if (!status) return NextResponse.json({ error: 'Choose a valid status.' }, { status: 400 });
    data.status = status;
    if (status === 'FILED') {
      data.filedAt = new Date();
      data.filedById = auth.user.id;
    } else if (existing.status === 'FILED') {
      data.filedAt = null;
      data.filedById = null;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'reference')) data.reference = optionalString(input.reference, 120);
  if (Object.prototype.hasOwnProperty.call(input, 'notes')) data.notes = optionalString(input.notes, 2000);

  if (Object.prototype.hasOwnProperty.call(input, 'evidenceUrl')) {
    const evidenceUrl = cleanUrl(input.evidenceUrl);
    if (evidenceUrl === null && input.evidenceUrl) {
      return NextResponse.json({ error: 'Evidence link must start with http:// or https://.' }, { status: 400 });
    }
    data.evidenceUrl = evidenceUrl;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'dueDate')) {
    if (input.dueDate == null || input.dueDate === '') {
      data.dueDate = null;
    } else {
      const dueDate = parseDate(input.dueDate);
      if (Number.isNaN(dueDate.getTime())) return NextResponse.json({ error: 'Enter a valid due date.' }, { status: 400 });
      data.dueDate = dueDate;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'ownerId')) {
    const ownerId = optionalString(input.ownerId, 50);
    if (ownerId) {
      const owner = await prisma.user.findFirst({ where: { id: ownerId, status: 'ACTIVE' }, select: { id: true } });
      if (!owner) return NextResponse.json({ error: 'Selected owner is unavailable.' }, { status: 400 });
    }
    data.ownerId = ownerId;
  }

  if (!Object.keys(data).length) return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });

  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.complianceObligation.update({ where: { id }, data, include: INCLUDE });
    const action = data.status === 'FILED' ? 'COMPLIANCE_FILED' : 'COMPLIANCE_UPDATED';
    await recordAudit(tx, auth.user.id, action, 'COMPLIANCE', id, {
      catalogKey: existing.catalogKey,
      period: existing.period,
      status: updated.status
    });
    return updated;
  });

  return NextResponse.json({ item });
}

export async function DELETE(request, { params }) {
  const auth = await requirePermission('compliance.manage');
  if (auth.response) return auth.response;
  if (!requireSameOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.complianceObligation.findUnique({ where: { id } });
  if (!existing || RETIRED_COMPLIANCE_CATALOG_KEYS.includes(existing.catalogKey)) {
    return NextResponse.json({ error: 'Compliance obligation not found.' }, { status: 404 });
  }
  if (!existing.catalogKey.startsWith('custom:')) {
    return NextResponse.json({ error: 'Statutory obligations cannot be deleted. Mark them as not applicable instead.' }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.complianceObligation.delete({ where: { id } });
    await recordAudit(tx, auth.user.id, 'COMPLIANCE_DELETED', 'COMPLIANCE', id, {
      title: existing.title,
      period: existing.period
    });
  });

  return NextResponse.json({ ok: true });
}

function requiredStatus(value) {
  const status = String(value || '').toUpperCase();
  return EDITABLE_STATUSES.includes(status) && COMPLIANCE_STATUSES[status] ? status : null;
}
