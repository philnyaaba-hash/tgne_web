import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import { COMPLIANCE_CATEGORIES, COMPLIANCE_FREQUENCIES, complianceStats } from '../../../../lib/compliance-ghana';
import { ensureComplianceItems } from '../../../../lib/compliance';
import { optionalString, parseDate, requiredString } from '../../../../lib/validation';

export const runtime = 'nodejs';

const INCLUDE = {
  owner: { select: { id: true, name: true, jobTitle: true } },
  filedBy: { select: { id: true, name: true } }
};

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

export async function GET() {
  const auth = await requirePermission('compliance.view');
  if (auth.response) return auth.response;
  await ensureComplianceItems();

  const canManage = auth.user.permissions.includes('compliance.manage');
  const [items, members] = await Promise.all([
    prisma.complianceObligation.findMany({ include: INCLUDE, take: 500 }),
    canManage
      ? prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, jobTitle: true }, orderBy: { name: 'asc' }, take: 200 })
      : Promise.resolve([])
  ]);

  items.sort((a, b) => {
    if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.title.localeCompare(b.title);
  });

  return NextResponse.json({
    items,
    members,
    canManage,
    stats: complianceStats(items),
    categories: COMPLIANCE_CATEGORIES,
    frequencies: COMPLIANCE_FREQUENCIES,
    today: new Date().toISOString()
  });
}

export async function POST(request) {
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

  const title = requiredString(input.title, 160);
  const authority = requiredString(input.authority, 120);
  const category = requiredString(input.category, 40).toUpperCase();
  const frequency = requiredString(input.frequency, 20).toUpperCase() || 'ONCE';
  const notes = optionalString(input.notes, 2000);
  const evidenceUrl = cleanUrl(input.evidenceUrl);
  const ownerId = optionalString(input.ownerId, 50);
  const dueDate = input.dueDate ? parseDate(input.dueDate) : null;

  if (title.length < 3) return NextResponse.json({ error: 'Give the obligation a title of at least 3 characters.' }, { status: 400 });
  if (!authority) return NextResponse.json({ error: 'Name the authority responsible for this obligation.' }, { status: 400 });
  if (!COMPLIANCE_CATEGORIES[category]) return NextResponse.json({ error: 'Choose a valid compliance category.' }, { status: 400 });
  if (!COMPLIANCE_FREQUENCIES[frequency]) return NextResponse.json({ error: 'Choose a valid frequency.' }, { status: 400 });
  if (dueDate && Number.isNaN(dueDate.getTime())) return NextResponse.json({ error: 'Enter a valid due date.' }, { status: 400 });
  if (evidenceUrl === null && input.evidenceUrl) return NextResponse.json({ error: 'Evidence link must start with http:// or https://.' }, { status: 400 });

  if (ownerId) {
    const owner = await prisma.user.findFirst({ where: { id: ownerId, status: 'ACTIVE' }, select: { id: true } });
    if (!owner) return NextResponse.json({ error: 'Selected owner is unavailable.' }, { status: 400 });
  }

  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.complianceObligation.create({
      data: {
        catalogKey: 'custom:' + randomUUID(),
        period: 'CUSTOM',
        title,
        authority,
        category,
        statute: optionalString(input.statute, 200),
        frequency,
        dueDate,
        notes,
        evidenceUrl,
        ownerId
      },
      include: INCLUDE
    });
    await recordAudit(tx, auth.user.id, 'COMPLIANCE_CREATED', 'COMPLIANCE', created.id, {
      title,
      category,
      frequency
    });
    return created;
  });

  return NextResponse.json({ item }, { status: 201 });
}
