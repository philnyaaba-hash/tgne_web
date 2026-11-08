import { NextResponse } from 'next/server';
import { recordAudit, requirePermission, requireSameOrigin } from '../../../../lib/office-auth';
import { prisma } from '../../../../lib/prisma';
import {
  CONSENT_STATUSES,
  GHANA_REGIONS,
  INDUSTRIES,
  LAWFUL_BASES,
  PROSPECT_SOURCES,
  PROSPECT_STAGES,
  consentCoversMarketing,
  growthStats,
  nextAction,
  normalizeEmail,
  normalizedWebsite,
  scoreProspect,
  outreachEligibility
} from '../../../../lib/growth';
import { getGrowthSettings } from '../../../../lib/growth-settings';
import { isPhone, optionalString, requiredString } from '../../../../lib/validation';

export const runtime = 'nodejs';

const PROSPECT_INCLUDE = {
  owner: { select: { id: true, name: true, jobTitle: true } },
  createdBy: { select: { id: true, name: true } },
  activities: { orderBy: { createdAt: 'desc' }, take: 8 }
};

const CAMPAIGN_INCLUDE = {
  approvedBy: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  _count: { select: { recipients: true } }
};

function emptyDelivery() {
  return { sent: 0, failed: 0, skipped: 0, queued: 0, replied: 0 };
}

export async function GET() {
  const auth = await requirePermission('growth.view');
  if (auth.response) return auth.response;

  const canManage = auth.user.permissions.includes('growth.manage');
  const canSend = auth.user.permissions.includes('growth.send');
  const settings = await getGrowthSettings();

  const [prospects, campaigns, members, recipientCounts, repliedRecipients] = await Promise.all([
    prisma.prospect.findMany({ include: PROSPECT_INCLUDE, orderBy: { updatedAt: 'desc' }, take: 500 }),
    prisma.outreachCampaign.findMany({ include: CAMPAIGN_INCLUDE, orderBy: { createdAt: 'desc' }, take: 100 }),
    canManage
      ? prisma.user.findMany({ where: { status: 'ACTIVE' }, select: { id: true, name: true, jobTitle: true }, orderBy: { name: 'asc' }, take: 200 })
      : Promise.resolve([]),
    prisma.campaignRecipient.groupBy({ by: ['campaignId', 'status'], _count: { _all: true } }).catch(() => []),
    prisma.campaignRecipient.findMany({ where: { prospect: { repliedAt: { not: null } } }, select: { campaignId: true } }).catch(() => [])
  ]);

  const counts = new Map();
  for (const row of recipientCounts) {
    const current = counts.get(row.campaignId) || emptyDelivery();
    const value = row._count._all;
    if (row.status === 'SENT') current.sent += value;
    else if (row.status === 'FAILED') current.failed += value;
    else if (row.status === 'SKIPPED' || row.status === 'UNSUBSCRIBED') current.skipped += value;
    else current.queued += value;
    counts.set(row.campaignId, current);
  }
  for (const row of repliedRecipients) {
    const current = counts.get(row.campaignId) || emptyDelivery();
    current.replied += 1;
    counts.set(row.campaignId, current);
  }

  return NextResponse.json({
    prospects: prospects.map((prospect) => ({
      ...prospect,
      eligibility: outreachEligibility(prospect),
      nextAction: nextAction(prospect)
    })),
    campaigns: campaigns.map((campaign) => ({ ...campaign, delivery: counts.get(campaign.id) || emptyDelivery() })),
    members,
    settings,
    stats: growthStats(prospects, campaigns),
    canManage,
    canSend,
    stages: PROSPECT_STAGES,
    sources: PROSPECT_SOURCES,
    industries: INDUSTRIES,
    regions: GHANA_REGIONS,
    consentStatuses: CONSENT_STATUSES,
    lawfulBases: LAWFUL_BASES
  });
}

export async function POST(request) {
  const auth = await requirePermission('growth.manage');
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

  const company = requiredString(input.company, 160);
  const contactName = optionalString(input.contactName, 120);
  const email = input.email ? normalizeEmail(input.email) : '';
  const phone = optionalString(input.phone, 40);
  const industry = optionalString(input.industry, 40);
  const source = optionalString(input.source, 30) || 'MANUAL';
  const stage = optionalString(input.stage, 30) || 'NEW';
  const consentStatus = optionalString(input.consentStatus, 20) || 'UNKNOWN';
  const lawfulBasis = optionalString(input.lawfulBasis, 30);
  const consentPurpose = optionalString(input.consentPurpose, 120);
  const consentEvidence = optionalString(input.consentEvidence, 2000);
  const ownerId = optionalString(input.ownerId, 50);

  if (company.length < 2) return NextResponse.json({ error: 'Enter the company or organisation name.' }, { status: 400 });
  if (input.email && !email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (phone && !isPhone(phone)) return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 });
  if (input.website && !normalizedWebsite(input.website)) return NextResponse.json({ error: 'Website must be a valid http(s) address.' }, { status: 400 });
  if (industry && !INDUSTRIES[industry]) return NextResponse.json({ error: 'Choose a valid industry.' }, { status: 400 });
  if (!PROSPECT_SOURCES[source]) return NextResponse.json({ error: 'Choose a valid source.' }, { status: 400 });
  if (!PROSPECT_STAGES[stage]) return NextResponse.json({ error: 'Choose a valid stage.' }, { status: 400 });
  if (!CONSENT_STATUSES[consentStatus]) return NextResponse.json({ error: 'Choose a valid consent status.' }, { status: 400 });
  if (lawfulBasis && !LAWFUL_BASES[lawfulBasis]) return NextResponse.json({ error: 'Choose a valid lawful basis.' }, { status: 400 });

  const granting = consentStatus === 'GRANTED';
  if (granting) {
    if (!['CONSENT', 'LEGITIMATE_INTEREST'].includes(lawfulBasis)) {
      return NextResponse.json({ error: 'Choose consent or legitimate interest as the lawful basis.' }, { status: 400 });
    }
    if (!consentCoversMarketing({ consentPurpose })) {
      return NextResponse.json({ error: 'Record consent that explicitly covers marketing email.' }, { status: 400 });
    }
    if (!consentEvidence || consentEvidence.length < 5) {
      return NextResponse.json({ error: 'Record where and how consent was captured.' }, { status: 400 });
    }
  }

  if (email) {
    const existing = await prisma.prospect.findUnique({ where: { email }, select: { id: true, company: true } });
    if (existing) return NextResponse.json({ error: 'That email is already on the prospect list (' + existing.company + ').' }, { status: 409 });
  }
  if (ownerId) {
    const owner = await prisma.user.findFirst({ where: { id: ownerId, status: 'ACTIVE' }, select: { id: true } });
    if (!owner) return NextResponse.json({ error: 'Selected owner is unavailable.' }, { status: 400 });
  }

  const suppressed = consentStatus === 'WITHDRAWN' || input.suppressed === true;
  const prospectData = {
    company,
    contactName,
    jobTitle: optionalString(input.jobTitle, 120),
    email: email || null,
    phone,
    website: input.website ? normalizedWebsite(input.website) : null,
    location: optionalString(input.location, 120),
    industry,
    source,
    sourceDetail: optionalString(input.sourceDetail, 300),
    stage: suppressed ? 'SUPPRESSED' : stage,
    consentStatus,
    consentPurpose: granting ? 'MARKETING' : consentPurpose,
    consentAt: granting ? new Date() : null,
    consentEvidence: granting ? consentEvidence : optionalString(input.consentEvidence, 2000),
    lawfulBasis,
    suppressed,
    suppressedAt: suppressed ? new Date() : null,
    suppressionReason: suppressed ? optionalString(input.suppressionReason, 300) || 'Recorded as do not contact' : null,
    researchNotes: optionalString(input.researchNotes, 4000),
    notes: optionalString(input.notes, 4000),
    ownerId,
    createdById: auth.user.id
  };
  const scored = scoreProspect({ ...prospectData, email: prospectData.email || '' }, (await getGrowthSettings()).target);

  const created = await prisma.$transaction(async (tx) => {
    const prospect = await tx.prospect.create({
      data: { ...prospectData, score: scored.score, scoreBand: scored.band, scoreReasons: scored.reasons },
      include: PROSPECT_INCLUDE
    });
    await tx.prospectActivity.create({
      data: {
        prospectId: prospect.id,
        userId: auth.user.id,
        type: 'CREATED',
        summary: 'Added to the prospect list',
        detail: 'Source: ' + PROSPECT_SOURCES[source] + (granting ? ' · marketing consent recorded' : '')
      }
    });
    await recordAudit(tx, auth.user.id, 'growth.prospect_created', 'Prospect', prospect.id, { company, consentStatus });
    return prospect;
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
